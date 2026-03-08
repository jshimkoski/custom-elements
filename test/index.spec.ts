import { describe, it, expect } from 'vitest';
import * as index from '../src/lib/index';
import * as ssr from '../src/lib/ssr';

describe('index.ts', () => {
  it('should export runtime types', () => {
    expect(index).toHaveProperty('component');
    expect(index).toHaveProperty('css');
    expect(index).toHaveProperty('html');
  });

  it('should not throw when importing all exports', () => {
    expect(() => {
      void index;
    }).not.toThrow();
  });

  it('should export reactive system helpers', () => {
    expect(typeof index.isReactiveState).toBe('function');
    expect(typeof index.ReactiveState).toBe('function');
    expect(typeof index.ref).toBe('function');
    expect(typeof index.computed).toBe('function');
    expect(typeof index.watch).toBe('function');
    expect(typeof index.watchEffect).toBe('function');
  });

  it('should export VNode as a type-only export (no runtime value)', () => {
    // VNode is a TypeScript type — it has no runtime value
    expect(index).not.toHaveProperty('VNode');
  });

  it('should export logger utilities', () => {
    expect(typeof index.setDevMode).toBe('function');
    expect(typeof index.devLog).toBe('function');
  });
});

describe('ssr.ts', () => {
  it('should export entity map utilities', () => {
    expect(typeof ssr.registerEntityMap).toBe('function');
    expect(typeof ssr.loadEntityMap).toBe('function');
    expect(typeof ssr.clearRegisteredEntityMap).toBe('function');
    expect(typeof ssr.renderToString).toBe('function');
  });
});
