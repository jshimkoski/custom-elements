/**
 * Tests for cerComponentImports, resolveTagName, extractTemplateTagNames,
 * and extractComponentRegistrations utilities added to vite-plugin.ts.
 *
 * The cerComponentImports plugin interacts directly with the real filesystem
 * (via globSync and readFileSync from node:fs). Tests use a temporary directory
 * so that real file I/O can be exercised without mocking — consistent with the
 * existing vite-plugin-cer.spec.ts approach in this project.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'path';

import {
  cerComponentImports,
  resolveTagName,
  extractTemplateTagNames,
  extractComponentRegistrations,
} from '../src/lib/vite-plugin';

// ---------------------------------------------------------------------------
// resolveTagName
// ---------------------------------------------------------------------------

describe('resolveTagName()', () => {
  it('prefixes single-word names with cer-', () => {
    expect(resolveTagName('app')).toBe('cer-app');
  });

  it('converts camelCase to kebab-case and keeps hyphen', () => {
    expect(resolveTagName('myButton')).toBe('my-button');
  });

  it('leaves already-kebab names unchanged', () => {
    expect(resolveTagName('ks-badge')).toBe('ks-badge');
  });

  it('converts PascalCase to kebab-case', () => {
    expect(resolveTagName('MyCard')).toBe('my-card');
  });

  it('prefixes a single-word name that resolves without a hyphen', () => {
    expect(resolveTagName('button')).toBe('cer-button');
  });
});

// ---------------------------------------------------------------------------
// extractTemplateTagNames
// ---------------------------------------------------------------------------

describe('extractTemplateTagNames()', () => {
  it('extracts a basic hyphenated tag', () => {
    const tags = extractTemplateTagNames('return html`<ks-badge>v1</ks-badge>`');
    expect(tags.has('ks-badge')).toBe(true);
  });

  it('excludes tags in line comments', () => {
    const tags = extractTemplateTagNames('// <ks-badge>');
    expect(tags.size).toBe(0);
  });

  it('excludes tags in block comments', () => {
    const tags = extractTemplateTagNames('/* <ks-badge> */');
    expect(tags.size).toBe(0);
  });

  it('does not match closing tags', () => {
    const tags = extractTemplateTagNames('</ks-badge>');
    expect(tags.size).toBe(0);
  });

  it('does not match native single-word tags', () => {
    const tags = extractTemplateTagNames('<div><span><p>');
    expect(tags.size).toBe(0);
  });

  it('matches self-closing custom elements', () => {
    const tags = extractTemplateTagNames('<ks-badge />');
    expect(tags.has('ks-badge')).toBe(true);
  });

  it('extracts multiple distinct tags', () => {
    const tags = extractTemplateTagNames('<ks-badge></ks-badge><ks-card></ks-card>');
    expect(tags.has('ks-badge')).toBe(true);
    expect(tags.has('ks-card')).toBe(true);
  });

  it('deduplicates repeated tags', () => {
    const tags = extractTemplateTagNames('<ks-badge><ks-badge><ks-badge>');
    expect(tags.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// extractComponentRegistrations
// ---------------------------------------------------------------------------

describe('extractComponentRegistrations()', () => {
  it('extracts a tag from single quotes', () => {
    expect(extractComponentRegistrations("component('ks-badge', () => {})")).toEqual(['ks-badge']);
  });

  it('extracts a tag from double quotes', () => {
    expect(extractComponentRegistrations('component("my-btn", () => {})')).toEqual(['my-btn']);
  });

  it('normalizes camelCase argument', () => {
    expect(extractComponentRegistrations("component('myBtn', () => {})")).toEqual(['my-btn']);
  });

  it('handles whitespace after the opening paren', () => {
    expect(extractComponentRegistrations("component(\n  'ks-badge',\n  () => {}\n)")).toEqual(['ks-badge']);
  });

  it('returns all tags when multiple component() calls are present', () => {
    const src = "component('ks-badge', () => {})\ncomponent('ks-card', () => {})";
    expect(extractComponentRegistrations(src)).toEqual(['ks-badge', 'ks-card']);
  });

  it('ignores commented-out component() calls', () => {
    expect(extractComponentRegistrations("// component('old-name', () => {})")).toEqual([]);
  });

  it('does not match importComponent() or similar non-standalone names', () => {
    expect(extractComponentRegistrations("importComponent('ks-badge', () => {})")).toEqual([]);
  });

  it('prefixes single-word tags with cer-', () => {
    expect(extractComponentRegistrations("component('app', () => {})")).toEqual(['cer-app']);
  });
});

// ---------------------------------------------------------------------------
// cerComponentImports plugin — filesystem-based tests
// ---------------------------------------------------------------------------

type TestPlugin = {
  buildStart(): void;
  watchChange(id: string, meta: { event: 'create' | 'update' | 'delete' }): void;
  transform(code: string, id: string): { code: string; map: unknown } | null;
  handleHotUpdate(ctx: { file: string; server: unknown }): void;
};

let tempDir: string;
let componentsDir: string;
let appDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'cer-test-'));
  componentsDir = join(tempDir, 'components');
  appDir = join(tempDir, 'app');
  mkdirSync(componentsDir, { recursive: true });
  mkdirSync(join(appDir, 'pages'), { recursive: true });
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function makePlugin(): TestPlugin {
  return cerComponentImports({
    componentsDir,
    appRoot: appDir,
  }) as unknown as TestPlugin;
}

describe('cerComponentImports()', () => {
  // ─── transform — basic injection ─────────────────────────────────────────

  it('injects a relative import for a known tag', () => {
    writeFileSync(join(componentsDir, 'ks-badge.ts'), "component('ks-badge', () => {})");

    const plugin = makePlugin();
    plugin.buildStart();

    const pageId = resolve(join(appDir, 'pages/index.ts'));
    const result = plugin.transform('return html`<ks-badge>v1</ks-badge>`', pageId);

    expect(result).not.toBeNull();
    expect(result!.code).toContain('import ');
    expect(result!.code).toContain('ks-badge.ts');
  });

  it('returns null when file has no html` template literal', () => {
    writeFileSync(join(componentsDir, 'ks-badge.ts'), "component('ks-badge', () => {})");

    const plugin = makePlugin();
    plugin.buildStart();

    const pageId = resolve(join(appDir, 'pages/index.ts'));
    const result = plugin.transform('export const x = 1', pageId);
    expect(result).toBeNull();
  });

  it('returns null when file is outside appRoot', () => {
    writeFileSync(join(componentsDir, 'ks-badge.ts'), "component('ks-badge', () => {})");

    const plugin = makePlugin();
    plugin.buildStart();

    const outsideId = resolve(join(tmpdir(), 'other/file.ts'));
    const result = plugin.transform('return html`<ks-badge>v1</ks-badge>`', outsideId);
    expect(result).toBeNull();
  });

  it('returns null when the tag is not in the manifest', () => {
    const plugin = makePlugin();
    plugin.buildStart();

    const pageId = resolve(join(appDir, 'pages/index.ts'));
    const result = plugin.transform('return html`<unknown-tag></unknown-tag>`', pageId);
    expect(result).toBeNull();
  });

  it('strips Vite query strings from the module id', () => {
    writeFileSync(join(componentsDir, 'ks-badge.ts'), "component('ks-badge', () => {})");

    const plugin = makePlugin();
    plugin.buildStart();

    const pageIdWithQuery = resolve(join(appDir, 'pages/index.ts')) + '?v=abc123';
    const result = plugin.transform('return html`<ks-badge>v1</ks-badge>`', pageIdWithQuery);
    expect(result).not.toBeNull();
  });

  // ─── transform — source map ───────────────────────────────────────────────

  it('source map has N leading semicolons matching the number of injected imports', () => {
    writeFileSync(join(componentsDir, 'ks-badge.ts'), "component('ks-badge', () => {})");

    const plugin = makePlugin();
    plugin.buildStart();

    const pageId = resolve(join(appDir, 'pages/index.ts'));
    const result = plugin.transform('return html`<ks-badge>v1</ks-badge>`', pageId);

    expect(result?.map).toBeDefined();
    const map = result!.map as { mappings: string };
    // 1 injected import → 1 leading semicolon, then AAAA for original line 1
    expect(map.mappings.startsWith(';')).toBe(true);
    expect(map.mappings).toContain('AAAA');
  });

  it('includes the original source in sourcesContent', () => {
    writeFileSync(join(componentsDir, 'ks-badge.ts'), "component('ks-badge', () => {})");

    const plugin = makePlugin();
    plugin.buildStart();

    const pageId = resolve(join(appDir, 'pages/index.ts'));
    const code = 'return html`<ks-badge>v1</ks-badge>`';
    const result = plugin.transform(code, pageId);

    const map = result!.map as { sourcesContent: string[] };
    expect(map.sourcesContent).toEqual([code]);
  });

  // ─── watchChange ──────────────────────────────────────────────────────────

  it('adds a tag to the manifest on watchChange create event', () => {
    const plugin = makePlugin();
    plugin.buildStart(); // empty componentsDir — manifest starts empty

    // Write the file first (so readFileSync can find it), then notify the plugin
    const newFile = join(componentsDir, 'ks-new.ts');
    writeFileSync(newFile, "component('ks-new', () => {})");
    plugin.watchChange(newFile, { event: 'create' });

    const pageId = resolve(join(appDir, 'pages/index.ts'));
    const result = plugin.transform('return html`<ks-new>x</ks-new>`', pageId);
    expect(result).not.toBeNull();
  });

  it('removes a tag from the manifest on watchChange delete event', () => {
    writeFileSync(join(componentsDir, 'ks-badge.ts'), "component('ks-badge', () => {})");

    const plugin = makePlugin();
    plugin.buildStart();

    const badgeFile = join(componentsDir, 'ks-badge.ts');
    plugin.watchChange(badgeFile, { event: 'delete' });

    const pageId = resolve(join(appDir, 'pages/index.ts'));
    const result = plugin.transform('return html`<ks-badge>v1</ks-badge>`', pageId);
    expect(result).toBeNull();
  });

  // ─── handleHotUpdate ──────────────────────────────────────────────────────

  it('does NOT send full-reload when tag names are unchanged', () => {
    writeFileSync(join(componentsDir, 'ks-badge.ts'), "component('ks-badge', () => {})");

    const plugin = makePlugin();
    plugin.buildStart();

    // Update file with same tag name
    writeFileSync(join(componentsDir, 'ks-badge.ts'), "component('ks-badge', () => { /* updated */ })");

    const wsSend = vi.fn();
    const mockServer = {
      moduleGraph: { fileToModulesMap: new Map() },
      ws: { send: wsSend },
    };

    plugin.handleHotUpdate({ file: join(componentsDir, 'ks-badge.ts'), server: mockServer });
    expect(wsSend).not.toHaveBeenCalled();
  });

  it('sends full-reload and invalidates app modules when tag names change', () => {
    writeFileSync(join(componentsDir, 'ks-badge.ts'), "component('ks-badge', () => {})");

    const plugin = makePlugin();
    plugin.buildStart();

    // Rename the component's registered tag
    writeFileSync(join(componentsDir, 'ks-badge.ts'), "component('ks-badge-v2', () => {})");

    const invalidateModule = vi.fn();
    const wsSend = vi.fn();
    const mockMod = { id: resolve(join(appDir, 'pages/index.ts')) };
    const mockServer = {
      moduleGraph: {
        fileToModulesMap: new Map([
          [resolve(join(appDir, 'pages/index.ts')), new Set([mockMod])],
        ]),
        invalidateModule,
      },
      ws: { send: wsSend },
    };

    plugin.handleHotUpdate({ file: join(componentsDir, 'ks-badge.ts'), server: mockServer });
    expect(wsSend).toHaveBeenCalledWith({ type: 'full-reload' });
    expect(invalidateModule).toHaveBeenCalledWith(mockMod);
  });

  it('ignores handleHotUpdate for files outside componentsDir', () => {
    const plugin = makePlugin();
    plugin.buildStart();

    const wsSend = vi.fn();
    const mockServer = {
      moduleGraph: { fileToModulesMap: new Map() },
      ws: { send: wsSend },
    };

    plugin.handleHotUpdate({ file: resolve('/other/dir/file.ts'), server: mockServer });
    expect(wsSend).not.toHaveBeenCalled();
  });
});
