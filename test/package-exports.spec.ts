import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import viteConfig from '../vite.config';

interface PackageExport {
  require?: string;
}

interface PackageManifest {
  main: string;
  exports: Record<string, PackageExport | string>;
}

describe('published package entry points', () => {
  it('uses real .cjs files for every CommonJS entry', () => {
    const manifest = JSON.parse(
      readFileSync('package.json', 'utf8'),
    ) as PackageManifest;

    expect(manifest.main).toMatch(/\.cjs$/);
    for (const entry of Object.values(manifest.exports)) {
      if (typeof entry === 'object' && entry.require) {
        expect(entry.require).toMatch(/\.cjs$/);
      }
    }

    const fileName = viteConfig.build?.lib &&
      typeof viteConfig.build.lib === 'object'
      ? viteConfig.build.lib.fileName
      : undefined;
    expect(typeof fileName).toBe('function');
    if (typeof fileName === 'function') {
      expect(fileName('cjs', 'main')).toBe('custom-elements-runtime.cjs');
      expect(fileName('cjs', 'router')).toBe(
        'custom-elements-runtime.router.cjs',
      );
    }
  });
});
