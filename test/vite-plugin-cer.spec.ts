/**
 * Tests for the cerPlugin (combined JIT CSS + SSR config) Vite plugin and
 * the cerJITCSS plugin.
 *
 * Covers:
 *  - cerPlugin returns an array of plugins
 *  - virtual:cer-ssr-config resolves and loads the SSR options JSON
 *  - Default SSR option values (dsd: true, dsdPolyfill: true)
 *  - Custom SSR option values are preserved
 *  - Without content, only the SSR plugin is returned
 *  - With content, both JIT CSS and SSR plugins are returned
 *  - cerJITCSS handleHotUpdate: re-generates CSS and invalidates virtual module
 *    when a watched file changes; ignores non-watched files
 */
import { resolve } from 'path';
import { describe, it, expect, vi } from 'vitest';
import { cerPlugin, cerJITCSS } from '../src/lib/vite-plugin';

const VIRTUAL_SSR_ID = 'virtual:cer-ssr-config';
const RESOLVED_SSR_ID = '\0virtual:cer-ssr-config';

// ---------------------------------------------------------------------------
// Helper: find the SSR config plugin in the array
// ---------------------------------------------------------------------------

function findSSRPlugin(plugins: ReturnType<typeof cerPlugin>) {
  return plugins.find(
    (p) => (p as { name?: string }).name === 'cer-ssr-config',
  ) as
    | {
        name: string;
        resolveId(id: string): string | undefined;
        load(id: string): string | undefined;
      }
    | undefined;
}

function findJITPlugin(plugins: ReturnType<typeof cerPlugin>) {
  return plugins.find(
    (p) => (p as { name?: string }).name === 'cer-jit-css',
  );
}

// ---------------------------------------------------------------------------
// cerPlugin shape
// ---------------------------------------------------------------------------

describe('cerPlugin()', () => {
  it('returns an array', () => {
    expect(Array.isArray(cerPlugin({}))).toBe(true);
  });

  it('returns an empty array when neither content nor ssr are provided', () => {
    expect(cerPlugin({}).length).toBe(0);
  });

  it('returns only the SSR plugin when ssr is provided without content', () => {
    const plugins = cerPlugin({ ssr: { dsd: true } });
    expect(plugins.length).toBe(1);
    expect(findSSRPlugin(plugins)).toBeDefined();
    expect(findJITPlugin(plugins)).toBeUndefined();
  });

  it('returns both plugins when content and ssr are provided', () => {
    const plugins = cerPlugin({
      content: ['./src/**/*.ts'],
      ssr: { dsd: true },
    });
    expect(plugins.length).toBe(2);
    expect(findSSRPlugin(plugins)).toBeDefined();
    expect(findJITPlugin(plugins)).toBeDefined();
  });

  it('returns only JIT CSS plugin when content is provided without ssr', () => {
    const plugins = cerPlugin({ content: ['./src/**/*.ts'] });
    expect(plugins.length).toBe(1);
    expect(findJITPlugin(plugins)).toBeDefined();
    expect(findSSRPlugin(plugins)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// virtual:cer-ssr-config
// ---------------------------------------------------------------------------

describe('cerPlugin() — virtual:cer-ssr-config', () => {
  it('resolveId maps virtual ID to internal resolved ID', () => {
    const plugins = cerPlugin({ ssr: {} });
    const ssrPlugin = findSSRPlugin(plugins);
    expect(ssrPlugin?.resolveId(VIRTUAL_SSR_ID)).toBe(RESOLVED_SSR_ID);
  });

  it('resolveId returns undefined for unknown IDs', () => {
    const plugins = cerPlugin({ ssr: {} });
    const ssrPlugin = findSSRPlugin(plugins);
    expect(ssrPlugin?.resolveId('some-other-module')).toBeUndefined();
  });

  it('load returns a default-export module string for the resolved ID', () => {
    const plugins = cerPlugin({ ssr: {} });
    const ssrPlugin = findSSRPlugin(plugins);
    const src = ssrPlugin?.load(RESOLVED_SSR_ID);
    expect(src).toBeDefined();
    expect(src).toContain('export default');
  });

  it('load returns undefined for unknown IDs', () => {
    const plugins = cerPlugin({ ssr: {} });
    const ssrPlugin = findSSRPlugin(plugins);
    expect(ssrPlugin?.load('something-else')).toBeUndefined();
  });

  it('defaults dsd to true when not specified', () => {
    const plugins = cerPlugin({ ssr: {} });
    const ssrPlugin = findSSRPlugin(plugins);
    const src = ssrPlugin!.load(RESOLVED_SSR_ID)!;
    const config = JSON.parse(src.replace('export default ', '').replace(';', ''));
    expect(config.dsd).toBe(true);
  });

  it('defaults dsdPolyfill to true when not specified', () => {
    const plugins = cerPlugin({ ssr: {} });
    const ssrPlugin = findSSRPlugin(plugins);
    const src = ssrPlugin!.load(RESOLVED_SSR_ID)!;
    const config = JSON.parse(src.replace('export default ', '').replace(';', ''));
    expect(config.dsdPolyfill).toBe(true);
  });

  it('preserves explicit dsd: false', () => {
    const plugins = cerPlugin({ ssr: { dsd: false } });
    const ssrPlugin = findSSRPlugin(plugins);
    const src = ssrPlugin!.load(RESOLVED_SSR_ID)!;
    const config = JSON.parse(src.replace('export default ', '').replace(';', ''));
    expect(config.dsd).toBe(false);
  });

  it('preserves explicit dsdPolyfill: false', () => {
    const plugins = cerPlugin({ ssr: { dsdPolyfill: false } });
    const ssrPlugin = findSSRPlugin(plugins);
    const src = ssrPlugin!.load(RESOLVED_SSR_ID)!;
    const config = JSON.parse(src.replace('export default ', '').replace(';', ''));
    expect(config.dsdPolyfill).toBe(false);
  });

  it('includes jit options when provided', () => {
    const plugins = cerPlugin({
      ssr: { jit: { extendedColors: true } },
    });
    const ssrPlugin = findSSRPlugin(plugins);
    const src = ssrPlugin!.load(RESOLVED_SSR_ID)!;
    const config = JSON.parse(src.replace('export default ', '').replace(';', ''));
    expect(config.jit).toEqual({ extendedColors: true });
  });

  it('omits jit key when not specified', () => {
    const plugins = cerPlugin({ ssr: {} });
    const ssrPlugin = findSSRPlugin(plugins);
    const src = ssrPlugin!.load(RESOLVED_SSR_ID)!;
    const config = JSON.parse(src.replace('export default ', '').replace(';', ''));
    expect('jit' in config).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// cerJITCSS — handleHotUpdate (HMR)
// ---------------------------------------------------------------------------

describe('cerJITCSS() — handleHotUpdate', () => {
  // Use the same resolution as buildStart() does: resolve(process.cwd(), pattern)
  const watchedFile = resolve(process.cwd(), 'src/lib/index.ts');

  function makePlugin() {
    const plugin = cerJITCSS({
      content: ['src/lib/index.ts'],
      virtualModule: true,
    }) as {
      buildStart(): void;
      load(id: string): string | undefined;
      handleHotUpdate(ctx: { file: string; server: unknown }): void;
    };
    // Populate watchedFiles by running buildStart
    plugin.buildStart();
    return plugin;
  }

  it('invalidates the virtual module when a watched file changes', () => {
    const plugin = makePlugin();
    const reloadModule = vi.fn();
    const getModuleById = vi.fn().mockReturnValue({ id: 'mod' });
    const server = { moduleGraph: { getModuleById }, reloadModule };

    plugin.handleHotUpdate({ file: watchedFile, server });

    expect(getModuleById).toHaveBeenCalledWith('\0virtual:cer-jit-css');
    expect(reloadModule).toHaveBeenCalledWith({ id: 'mod' });
  });

  it('does not invalidate the virtual module for non-watched files', () => {
    const plugin = makePlugin();
    const reloadModule = vi.fn();
    const getModuleById = vi.fn();
    const server = { moduleGraph: { getModuleById }, reloadModule };

    plugin.handleHotUpdate({ file: '/some/unrelated/file.ts', server });

    expect(getModuleById).not.toHaveBeenCalled();
    expect(reloadModule).not.toHaveBeenCalled();
  });

  it('returns the updated CSS via load() after a hot update', () => {
    const plugin = makePlugin();
    const reloadModule = vi.fn();
    const getModuleById = vi.fn().mockReturnValue(null);
    const server = { moduleGraph: { getModuleById }, reloadModule };

    // Trigger HMR for the watched file
    plugin.handleHotUpdate({ file: watchedFile, server });

    // load() must still return a valid CSS module string after regeneration
    const src = plugin.load('\0virtual:cer-jit-css');
    expect(src).toBeDefined();
    expect(src).toContain('export default');
  });
});
