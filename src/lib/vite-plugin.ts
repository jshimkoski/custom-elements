/**
 * Vite plugins for build-time JIT CSS generation, SSR configuration, and
 * per-page component code splitting.
 *
 * Three plugins are exported:
 *
 * - **`cerJITCSS`** — Scans source files for utility class names and emits
 *   pre-generated CSS, eliminating all runtime parsing cost for projects with
 *   static class lists.
 *
 * - **`cerPlugin`** — All-in-one plugin combining `cerJITCSS` with SSR
 *   configuration. Exposes a `virtual:cer-ssr-config` module containing the
 *   resolved SSR render options so server entry files can import and use them
 *   without duplication.
 *
 * - **`cerComponentImports`** — Transform plugin that scans each app file for
 *   custom element tags used in `html\`` template literals and injects static
 *   `import` statements pointing to the corresponding component source files.
 *   This gives Rollup the module graph edges it needs to automatically
 *   code-split components per page chunk.
 *
 * Three build-time utilities are also exported:
 *
 * - **`resolveTagName`** — Normalize a component name to its registered tag name.
 * - **`extractTemplateTagNames`** — Extract hyphenated tag names from `html\`` sources.
 * - **`extractComponentRegistrations`** — Extract registered tag names from `component()` calls.
 *
 * @example cerJITCSS only
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import { cerJITCSS } from '@jasonshimmy/custom-elements-runtime/vite-plugin';
 *
 * export default defineConfig({
 *   plugins: [
 *     cerJITCSS({
 *       content: ['./src/**\/*.{ts,tsx,html}'],
 *       output: 'src/generated-jit.css',
 *       extendedColors: true,
 *     }),
 *   ],
 * });
 * ```
 *
 * @example cerPlugin with SSR
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import { cerPlugin } from '@jasonshimmy/custom-elements-runtime/vite-plugin';
 *
 * export default defineConfig({
 *   plugins: [
 *     cerPlugin({
 *       content: ['./src/**\/*.{ts,tsx,html}'],
 *       ssr: {
 *         dsd: true,
 *         jit: { extendedColors: true },
 *       },
 *     }),
 *   ],
 * });
 * ```
 *
 * Then in your server entry:
 * ```ts
 * import ssrConfig from 'virtual:cer-ssr-config';
 * import { renderToStringWithJITCSS } from '@jasonshimmy/custom-elements-runtime/ssr';
 *
 * const { htmlWithStyles } = renderToStringWithJITCSS(appVNode, ssrConfig);
 * ```
 *
 * @example cerComponentImports for per-page code splitting
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import { cerComponentImports } from '@jasonshimmy/custom-elements-runtime/vite-plugin';
 *
 * export default defineConfig({
 *   plugins: [
 *     cerComponentImports({
 *       componentsDir: '/absolute/path/to/app/components',
 *       appRoot: '/absolute/path/to/app',
 *     }),
 *   ],
 * });
 * ```
 */

import type { Plugin, ViteDevServer } from 'vite';
import { readFileSync, writeFileSync, mkdirSync, globSync, existsSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import {
  jitCSS,
  enableJITCSS,
  extractClassesFromHTML,
  type JITCSSOptions,
} from './runtime/style';
import { resolveTagName as _resolveTagName } from './runtime/tag-utils';

// --- Re-export extractClassesFromHTML for plugin consumers ---

/**
 * Options for the `cerJITCSS` Vite plugin.
 */
export interface CerJITCSSPluginOptions extends JITCSSOptions {
  /**
   * Glob patterns (relative to `process.cwd()`) that identify which source
   * files the plugin should scan for utility class names.
   *
   * @example `['./src/**\/*.{ts,html}', './index.html']`
   */
  content: string[];
  /**
   * File path (relative to `process.cwd()`) where the generated CSS will
   * be written. When omitted the plugin only emits a virtual module.
   */
  output?: string;
  /**
   * Whether to emit a virtual module `virtual:cer-jit-css` that resolves to
   * the generated CSS text. Defaults to `true`.
   */
  virtualModule?: boolean;
}

const VIRTUAL_ID = 'virtual:cer-jit-css';
const RESOLVED_VIRTUAL_ID = '\0virtual:cer-jit-css';

function generateFromFiles(
  contentPatterns: string[],
  jitOptions: JITCSSOptions,
): string {
  if (jitOptions && Object.keys(jitOptions).length > 0) {
    enableJITCSS(jitOptions);
  }

  const cwd = process.cwd();
  const files: string[] = [];

  for (const pattern of contentPatterns) {
    const matches = globSync(pattern, { cwd }).map((f) => resolve(cwd, f));
    files.push(...matches);
  }

  // Deduplicate files
  const uniqueFiles = [...new Set(files)];

  // Aggregate all class names across all files
  const allClasses = new Set<string>();

  for (const file of uniqueFiles) {
    try {
      const content = readFileSync(file, 'utf-8');
      const classes = extractClassesFromHTML(content);
      for (const cls of classes) allClasses.add(cls);
    } catch {
      // Skip unreadable files
    }
  }

  if (allClasses.size === 0) return '';

  // Build a fake HTML string containing all discovered classes so jitCSS()
  // can process the full set in one pass.
  const fakeHTML = `<div class="${[...allClasses].join(' ')}"></div>`;
  return jitCSS(fakeHTML);
}

// ---------------------------------------------------------------------------
// cerPlugin — combined JIT CSS + SSR configuration plugin
// ---------------------------------------------------------------------------

/**
 * SSR render options exposed via `virtual:cer-ssr-config`.
 */
export interface CerSSROptions {
  /**
   * Emit Declarative Shadow DOM output for registered custom elements.
   * @default true
   */
  dsd?: boolean;
  /**
   * Append the DSD polyfill `<script>` for browsers without native support.
   * @default true
   */
  dsdPolyfill?: boolean;
  /**
   * JIT CSS options forwarded to the SSR render pass.
   */
  jit?: JITCSSOptions;
}

/**
 * Options for the combined {@link cerPlugin}.
 */
export interface CerPluginOptions extends Partial<CerJITCSSPluginOptions> {
  /**
   * SSR configuration. When provided, a `virtual:cer-ssr-config` module is
   * registered so server entry files can import the resolved render options:
   *
   * ```ts
   * import ssrConfig from 'virtual:cer-ssr-config';
   * import { renderToStringWithJITCSS } from '@jasonshimmy/custom-elements-runtime/ssr';
   *
   * const { htmlWithStyles } = renderToStringWithJITCSS(appVNode, ssrConfig);
   * ```
   */
  ssr?: CerSSROptions;
}

const VIRTUAL_SSR_ID = 'virtual:cer-ssr-config';
const RESOLVED_VIRTUAL_SSR_ID = '\0virtual:cer-ssr-config';

/**
 * All-in-one Vite plugin combining build-time JIT CSS generation with SSR
 * configuration. Returns an array of plugins so it can be spread directly
 * into the `plugins` array without nesting.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * export default defineConfig({
 *   plugins: [
 *     cerPlugin({
 *       content: ['./src/**\/*.{ts,html}'],
 *       ssr: { dsd: true, jit: { extendedColors: true } },
 *     }),
 *   ],
 * });
 * ```
 */
export function cerPlugin(options: CerPluginOptions): Plugin[] {
  const plugins: Plugin[] = [];

  // JIT CSS plugin — only added when a `content` glob is provided
  if (options.content && options.content.length > 0) {
    plugins.push(
      cerJITCSS({
        content: options.content,
        output: options.output,
        virtualModule: options.virtualModule,
        extendedColors: options.extendedColors,
        customColors: options.customColors,
        disableVariants: options.disableVariants,
      }),
    );
  }

  // SSR config virtual module — registered whenever `ssr` is provided
  if (options.ssr) {
    const ssrConfig = options.ssr;
    const resolvedConfig = {
      dsd: ssrConfig.dsd ?? true,
      dsdPolyfill: ssrConfig.dsdPolyfill ?? true,
      ...(ssrConfig.jit ? { jit: ssrConfig.jit } : {}),
    };

    plugins.push({
      name: 'cer-ssr-config',
      resolveId(id: string) {
        if (id === VIRTUAL_SSR_ID) return RESOLVED_VIRTUAL_SSR_ID;
        return undefined;
      },
      load(id: string) {
        if (id === RESOLVED_VIRTUAL_SSR_ID) {
          return `export default ${JSON.stringify(resolvedConfig)};`;
        }
        return undefined;
      },
    });
  }

  return plugins;
}

// ---------------------------------------------------------------------------
// cerJITCSS — build-time JIT CSS plugin
// ---------------------------------------------------------------------------

/**
 * Vite plugin that performs a build-time scan of source files and emits
 * pre-generated JIT CSS as a file and/or `virtual:cer-jit-css` module.
 */
export function cerJITCSS(options: CerJITCSSPluginOptions): Plugin {
  const {
    content,
    output,
    virtualModule = true,
    extendedColors,
    customColors,
    disableVariants,
  } = options;

  const jitOptions: JITCSSOptions = {
    extendedColors,
    customColors,
    disableVariants,
  };

  let generatedCSS = '';
  // Resolved file set built in buildStart and reused in handleHotUpdate to
  // avoid re-running globSync for every HMR file-change event.
  let watchedFiles: Set<string> | null = null;

  return {
    name: 'cer-jit-css',

    buildStart() {
      const cwd = process.cwd();
      const resolved = new Set<string>();
      for (const pattern of content) {
        globSync(pattern, { cwd }).forEach((f) => resolved.add(resolve(cwd, f)));
      }
      watchedFiles = resolved;

      generatedCSS = generateFromFiles(content, jitOptions);

      if (output) {
        const outputPath = resolve(process.cwd(), output);
        mkdirSync(dirname(outputPath), { recursive: true });
        writeFileSync(outputPath, generatedCSS, 'utf-8');
      }
    },

    resolveId(id: string) {
      if (virtualModule && id === VIRTUAL_ID) {
        return RESOLVED_VIRTUAL_ID;
      }
      return undefined;
    },

    load(id: string) {
      if (id === RESOLVED_VIRTUAL_ID) {
        return `export default ${JSON.stringify(generatedCSS)};`;
      }
      return undefined;
    },

    handleHotUpdate({ file, server }: { file: string; server: unknown }) {
      // Re-generate when a watched source file changes.
      // Use the cached file set from buildStart to avoid re-globbing.
      const isWatched = watchedFiles?.has(file) ?? false;

      if (!isWatched) return;

      generatedCSS = generateFromFiles(content, jitOptions);

      if (output) {
        const outputPath = resolve(process.cwd(), output);
        writeFileSync(outputPath, generatedCSS, 'utf-8');
      }

      if (virtualModule) {
        // Invalidate the virtual module so HMR triggers a reload
        const viteServer = server as {
          moduleGraph: { getModuleById: (id: string) => unknown };
          reloadModule: (mod: unknown) => void;
        };
        const mod = viteServer.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
        if (mod) viteServer.reloadModule(mod);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Tag resolution utilities (build-time)
// ---------------------------------------------------------------------------

/**
 * Resolves a component() tag argument to the actual registered tag name.
 * Re-exported from runtime/tag-utils so consumers have a single import surface.
 *
 * Rules:
 *   camelCase → kebab-case   (myButton  → my-button)
 *   no hyphen  → cer- prefix (app       → cer-app)
 *   has hyphen → unchanged   (ks-badge  → ks-badge)
 */
export const resolveTagName = _resolveTagName;

/**
 * Scan TypeScript source text for all custom element tag names referenced
 * in html`` template literals.
 *
 * Strips line (//) and block (/* *\/) comments first to avoid false
 * positives from commented-out code.
 *
 * Returns a Set of already-hyphenated tag names as they appear in the source
 * (e.g. "ks-badge", "cer-app"). Single-word names that would receive a
 * "cer-" prefix at runtime never appear as bare tags in templates — they
 * always appear as "cer-something" — so no normalization is needed here.
 *
 * Closing tags (</ks-badge>) do NOT match because the regex requires the
 * first character after < to be [a-z], not /.
 */
export function extractTemplateTagNames(source: string): Set<string> {
  const stripped = source
    .replace(/\/\/[^\n]*/g, '')        // line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // block comments

  const tags = new Set<string>();
  // Requires at least one hyphen-segment: matches custom elements only,
  // never native HTML elements like <div> or <span>.
  for (const m of stripped.matchAll(/<([a-z][a-z0-9]*(?:-[a-z0-9]+)+)/g)) {
    tags.add(m[1]);
  }
  return tags;
}

/**
 * Extract all component tag names registered in a component source file.
 * Handles files that call component() more than once (returns all of them).
 *
 * Uses \bcomponent\( so it matches the standalone function name but not
 * names like importComponent( or registerComponent(.
 *
 * Returns resolved (normalized) tag names, ready to match against the output
 * of extractTemplateTagNames().
 */
export function extractComponentRegistrations(source: string): string[] {
  const stripped = source
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  const tags: string[] = [];
  for (const m of stripped.matchAll(/\bcomponent\(\s*['"`]([^'"`]+)['"`]/g)) {
    tags.push(resolveTagName(m[1]));
  }
  return tags;
}

// ---------------------------------------------------------------------------
// cerComponentImports — per-page component code splitting plugin
// ---------------------------------------------------------------------------

/**
 * Options for the {@link cerComponentImports} Vite plugin.
 */
export interface CerComponentImportsOptions {
  /**
   * Absolute path to the directory containing component files.
   * Every .ts file found here is scanned for component() registrations.
   */
  componentsDir: string;
  /**
   * Absolute path to the app source root. The transform is restricted to
   * files under this directory so node_modules and generated files are skipped.
   */
  appRoot: string;
}

/**
 * Vite plugin that injects static `import` statements for custom element
 * components used in each page/layout/component file.
 *
 * Replaces the eager `virtual:cer-components` side-effect import with
 * per-file static imports, giving Rollup graph edges it needs to
 * automatically code-split components per page chunk.
 *
 * Must be used with `enforce: 'pre'` (already set internally) to ensure
 * the transform sees the original TypeScript source before esbuild runs.
 */
export function cerComponentImports(options: CerComponentImportsOptions): Plugin {
  // Normalize both roots to forward slashes + trailing slash for reliable
  // startsWith checks that don't accidentally match sibling directories.
  const componentsDir = options.componentsDir.replace(/\\/g, '/').replace(/\/?$/, '/');
  const appRoot      = options.appRoot.replace(/\\/g, '/').replace(/\/?$/, '/');

  // tag name → absolute file path (forward-slash normalized)
  const manifest = new Map<string, string>();

  function addFileToManifest(absPath: string): void {
    const normalized = absPath.replace(/\\/g, '/');
    try {
      const src = readFileSync(normalized, 'utf-8');
      for (const tag of extractComponentRegistrations(src)) {
        manifest.set(tag, normalized);
      }
    } catch {
      // Skip unreadable files
    }
  }

  function removeFileFromManifest(absPath: string): void {
    const normalized = absPath.replace(/\\/g, '/');
    for (const [tag, path] of manifest.entries()) {
      if (path === normalized) manifest.delete(tag);
    }
  }

  function buildManifest(): void {
    manifest.clear();
    if (!existsSync(options.componentsDir)) return;
    for (const rel of globSync('**/*.ts', { cwd: options.componentsDir })) {
      addFileToManifest(resolve(options.componentsDir, rel));
    }
  }

  return {
    name: 'cer-component-imports',
    // Must run before esbuild/TypeScript compilation so we always see the
    // original html`` template literal strings, not compiled output.
    enforce: 'pre',

    buildStart() {
      buildManifest();
    },

    // watchChange fires for file create/delete/update events in both dev and build.
    watchChange(id: string, { event }: { event: 'create' | 'update' | 'delete' }) {
      const normalized = id.replace(/\\/g, '/');
      if (!normalized.startsWith(componentsDir) || !normalized.endsWith('.ts')) return;

      if (event === 'delete') {
        removeFileFromManifest(normalized);
      } else {
        // 'create' or 'update': remove stale entries then re-add
        removeFileFromManifest(normalized);
        addFileToManifest(normalized);
      }
    },

    transform(code: string, id: string) {
      // Strip Vite query strings (?v=abc, ?t=123, ?import, etc.) before checks.
      const cleanId = id.split('?')[0].replace(/\\/g, '/');

      // Only transform .ts files inside the app source root.
      if (!cleanId.endsWith('.ts') || !cleanId.startsWith(appRoot)) return null;

      // Quick bail-out: if the file has no html`` calls it cannot reference
      // components via templates. Avoids running the regex on utility files.
      if (!code.includes('html`')) return null;

      const usedTags = extractTemplateTagNames(code);
      if (usedTags.size === 0) return null;

      const injections: string[] = [];
      for (const tag of usedTags) {
        const componentFile = manifest.get(tag);
        if (componentFile) {
          // Use a path relative to the transformed file rather than an
          // absolute path to avoid exposing machine-local paths in build output.
          const rel = relative(dirname(cleanId), componentFile).replace(/\\/g, '/');
          const importPath = rel.startsWith('.') ? rel : `./${rel}`;
          injections.push(`import ${JSON.stringify(importPath)};`);
        }
      }
      if (injections.length === 0) return null;

      const prefix = injections.join('\n') + '\n';
      const newCode = prefix + code;

      // Zero-dependency source map for the "prepend N lines" case.
      //
      // Because enforce:'pre' guarantees no prior source map exists, the
      // mapping has an exact known structure:
      //   • N injected lines → N semicolons (empty segments, no source pos)
      //   • original line 1  → "AAAA" (all deltas = 0)
      //   • original line k  → "AACA" (col 0, src 0, +1 line, col 0)
      const injectedLineCount = injections.length;
      const originalLineCount = code.split('\n').length;
      const mappings =
        ';'.repeat(injectedLineCount) +
        'AAAA' +
        ';AACA'.repeat(originalLineCount - 1);

      return {
        code: newCode,
        map: {
          version: 3 as const,
          sources: [cleanId],
          sourcesContent: [code],
          names: [],
          mappings,
        },
      };
    },

    handleHotUpdate({ file, server }: { file: string; server: ViteDevServer }) {
      const normalized = file.replace(/\\/g, '/');
      if (!normalized.startsWith(componentsDir) || !normalized.endsWith('.ts')) return;

      // Snapshot the manifest tags for this file before and after the update.
      const before = new Set(
        [...manifest.entries()].filter(([, p]) => p === normalized).map(([t]) => t),
      );

      removeFileFromManifest(normalized);
      addFileToManifest(normalized);

      const after = new Set(
        [...manifest.entries()].filter(([, p]) => p === normalized).map(([t]) => t),
      );

      // If tag names didn't change, Vite's standard HMR propagation handles it.
      const manifestChanged =
        before.size !== after.size ||
        [...before].some((t) => !after.has(t));

      if (!manifestChanged) return;

      // Tag names changed — injected imports in consumer files are stale.
      // Invalidate all app .ts modules so the transform re-runs on next request.
      for (const [filePath, mods] of server.moduleGraph.fileToModulesMap) {
        const normalizedPath = filePath.replace(/\\/g, '/');
        if (normalizedPath.startsWith(appRoot) && normalizedPath.endsWith('.ts')) {
          for (const mod of mods) {
            server.moduleGraph.invalidateModule(mod);
          }
        }
      }
      server.ws.send({ type: 'full-reload' });
    },
  };
}
