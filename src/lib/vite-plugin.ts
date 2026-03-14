/**
 * Vite plugin for build-time JIT CSS generation.
 *
 * Scans source files for utility class names and emits pre-generated CSS,
 * eliminating all runtime parsing cost for projects with static class lists.
 *
 * @example
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
