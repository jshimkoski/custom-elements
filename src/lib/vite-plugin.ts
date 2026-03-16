/**
 * Vite plugins for build-time JIT CSS generation and SSR configuration.
 *
 * Two plugins are exported:
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
 */

import type { Plugin } from 'vite';
import { readFileSync, writeFileSync, mkdirSync, globSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import {
  jitCSS,
  enableJITCSS,
  extractClassesFromHTML,
  type JITCSSOptions,
} from './runtime/style';

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
