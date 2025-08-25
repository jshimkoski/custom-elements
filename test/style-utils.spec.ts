import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  StyleCache,
  minifyCSS,
  createStateHash,
  deduplicateCSS,
  createDebouncer,
  extractCSSVariables,
  scopeCSS,
  cssAnimations,
  cssUtilities,
  StylePerformanceMonitor,
} from '../src/lib/style-utils';

describe('StyleCache', () => {
  let cache: StyleCache;
  beforeEach(() => {
    cache = new StyleCache(2);
  });

  it('should set and get cache entries', () => {
    cache.set('a', 'cssA');
    expect(cache.get('a')).toBe('cssA');
  });

  it('should evict oldest when maxSize exceeded', () => {
    cache.set('a', 'cssA');
    cache.set('b', 'cssB');
    cache.set('c', 'cssC');
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBe('cssB');
    expect(cache.get('c')).toBe('cssC');
  });

  it('should invalidate by dependency', () => {
    cache.set('a', 'cssA', ['dep1']);
    cache.set('b', 'cssB', ['dep2']);
    cache.invalidate('dep1');
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBe('cssB');
  });

  it('should clear cache', () => {
    cache.set('a', 'cssA');
    cache.clear();
    expect(cache.get('a')).toBeNull();
  });

  it('should report stats', () => {
    cache.set('a', 'cssA');
    const stats = cache.getStats();
    expect(stats.size).toBe(1);
    expect(stats.maxSize).toBe(2);
  });
});

describe('minifyCSS', () => {
  it('should minify CSS', () => {
    const css = 'div { color: red;  } /* comment */';
    expect(minifyCSS(css)).toBe('div{color:red}');
  });
});

describe('createStateHash', () => {
  it('should create hash from values', () => {
    expect(createStateHash([1, 'a', true])).toContain('1');
    expect(createStateHash([{ x: 1 }])).toContain('x');
  });
});

describe('deduplicateCSS', () => {
  it('should deduplicate CSS rules', () => {
    const css = 'div{color:red;}div{color:red;}span{color:blue;}';
    expect(deduplicateCSS(css)).toContain('span{color:blue;');
    expect(deduplicateCSS(css).match(/div{color:red;}/g)?.length).toBe(1);
  });
});

describe('createDebouncer', () => {
  it('should debounce function calls', async () => {
    const fn = vi.fn();
    const debounced = createDebouncer(fn, 10);
    debounced();
    debounced();
    await new Promise(r => setTimeout(r, 20));
    expect(fn).toHaveBeenCalledTimes(1);
    debounced.cancel();
  });
});

describe('extractCSSVariables', () => {
  it('should extract CSS variables', () => {
    const css = ':root { --main: red; --secondary: blue; }';
    const vars = extractCSSVariables(css);
    expect(vars.main).toBe('red');
    expect(vars.secondary).toBe('blue');
  });
});

describe('scopeCSS', () => {
  it('should prefix selectors with scope', () => {
    const css = 'div { color: red; }';
    const scoped = scopeCSS(css, '.scoped');
    expect(scoped).toContain('.scoped div');
  });
});

describe('cssAnimations', () => {
  it('should contain keyframes', () => {
    expect(cssAnimations.fadeIn).toContain('@keyframes fadeIn');
    expect(cssAnimations.fadeOut).toContain('@keyframes fadeOut');
  });
});

describe('cssUtilities', () => {
  it('should contain utility classes', () => {
    expect(cssUtilities).toContain('.flex');
    expect(cssUtilities).toContain('.text-center');
  });
});

describe('StylePerformanceMonitor', () => {
  it.skip('should record and report metrics', async () => {
    const monitor = new StylePerformanceMonitor();
    const stop = monitor.startTimer('op');
    await new Promise(r => setTimeout(r, 5));
    stop();
    const stats = monitor.getStats();
    // Expect stats.op to be an object with count, average, min, max
    expect(stats && typeof stats.op === 'object').toBe(true);
    expect(stats?.op.count).toBeGreaterThan(0);
    expect(stats?.op.average).toBeGreaterThan(0);
    expect(stats?.op.min).toBeGreaterThan(0);
    expect(stats?.op.max).toBeGreaterThan(0);
    monitor.reset('op');
    const resetStats = monitor.getStats();
    // After reset, op may be undefined or have count 0
    if (resetStats && resetStats.op) {
      expect(resetStats.op.count).toBe(0);
    } else {
      expect(resetStats?.op).toBeUndefined();
    }
  });
});