import { DevTools } from '../../src/lib/dev-tools';
import { describe, it, expect, vi } from 'vitest';
import { DevPerformance } from '../../src/lib/dev-tools';

describe('dev-tools', () => {
  it('should export expected functions', () => {
    expect(typeof DevTools.log).toBe('function');
    expect(typeof DevTools.warn).toBe('function');
    expect(typeof DevTools.error).toBe('function');
    expect(typeof DevTools.debug).toBe('function');
    expect(typeof DevTools.group).toBe('function');
    expect(typeof DevTools.groupEnd).toBe('function');
    expect(typeof DevTools.inspectComponent).toBe('function');
    expect(typeof DevTools.trackStateChanges).toBe('function');
    expect(typeof DevTools.startTiming).toBe('function');
  });

  it('should inspect a component and return expected structure', () => {
    const el = document.createElement('div');
    (el as any).state = { foo: 'bar' };
    el.setAttribute('data-test', '123');
    const result = DevTools.inspectComponent(el);
    expect(result.tagName).toBe('div');
    expect(result.state).toEqual({ foo: 'bar' });
    expect(Array.isArray(result.attributes)).toBe(true);
    expect(result.computedStyle).toBeInstanceOf(CSSStyleDeclaration);
  });

  it('should track state changes and call callback on event', () => {
    const el = document.createElement('div');
    let called = false;
    const off = DevTools.trackStateChanges(el, (detail) => {
      called = true;
      expect(detail).toEqual({ updated: true });
    });
    el.dispatchEvent(new CustomEvent('component-state-change', { detail: { updated: true } }));
    expect(called).toBe(true);
    off();
  });

  it('should start timing and return elapsed time', async () => {
    const timer = DevTools.startTiming('test');
    expect(typeof timer).toBe('function');
    await new Promise((r) => setTimeout(r, 10));
    const elapsed = timer();
    // Allow a margin for event loop variability
    expect(elapsed).toBeGreaterThanOrEqual(8);
  });

  it('should log messages', () => {
    const spy = vi.spyOn(console, 'log');
    DevTools.log('test log');
    expect(spy).toHaveBeenCalledWith('[DEV]', 'test log');
    spy.mockRestore();
  });

  it('should warn messages', () => {
    const spy = vi.spyOn(console, 'warn');
    DevTools.warn('test warn');
    expect(spy).toHaveBeenCalledWith('[DEV]', 'test warn');
    spy.mockRestore();
  });

  it('should error messages', () => {
    const spy = vi.spyOn(console, 'error');
    DevTools.error('test error');
    expect(spy).toHaveBeenCalledWith('[DEV]', 'test error');
    spy.mockRestore();
  });

  it('should debug messages', () => {
    const spy = vi.spyOn(console, 'debug');
    DevTools.debug('test debug');
    expect(spy).toHaveBeenCalledWith('[DEV]', 'test debug');
    spy.mockRestore();
  });

  it('should group and groupEnd', () => {
    const groupSpy = vi.spyOn(console, 'group');
    const endSpy = vi.spyOn(console, 'groupEnd');
    DevTools.group('test group');
    expect(groupSpy).toHaveBeenCalledWith('[DEV]', 'test group');
    DevTools.groupEnd();
    expect(endSpy).toHaveBeenCalled();
    groupSpy.mockRestore();
    endSpy.mockRestore();
  });

  it('should inspect component with no state or attributes', () => {
    const el = document.createElement('span');
    const result = DevTools.inspectComponent(el);
    expect(result.tagName).toBe('span');
    expect(result.state).toEqual({});
    expect(Array.isArray(result.attributes)).toBe(true);
    expect(result.computedStyle).toBeInstanceOf(CSSStyleDeclaration);
  });

  it('should inspect component with no style', () => {
    const el = document.createElement('div');
    el.removeAttribute('style');
    const result = DevTools.inspectComponent(el);
    expect(result.computedStyle).toBeInstanceOf(CSSStyleDeclaration);
  });

  it('should handle log functions with undefined/null', () => {
    const logSpy = vi.spyOn(console, 'log');
    DevTools.log(undefined);
    DevTools.log(null);
    expect(logSpy).toHaveBeenCalledWith('[DEV]', undefined);
    expect(logSpy).toHaveBeenCalledWith('[DEV]', null);
    logSpy.mockRestore();
    const warnSpy = vi.spyOn(console, 'warn');
    DevTools.warn(undefined);
    DevTools.warn(null);
    expect(warnSpy).toHaveBeenCalledWith('[DEV]', undefined);
    expect(warnSpy).toHaveBeenCalledWith('[DEV]', null);
    warnSpy.mockRestore();
    const errorSpy = vi.spyOn(console, 'error');
    DevTools.error(undefined);
    DevTools.error(null);
    expect(errorSpy).toHaveBeenCalledWith('[DEV]', undefined);
    expect(errorSpy).toHaveBeenCalledWith('[DEV]', null);
    errorSpy.mockRestore();
    const debugSpy = vi.spyOn(console, 'debug');
    DevTools.debug(undefined);
    DevTools.debug(null);
    expect(debugSpy).toHaveBeenCalledWith('[DEV]', undefined);
    expect(debugSpy).toHaveBeenCalledWith('[DEV]', null);
    debugSpy.mockRestore();
  });

  it('should handle group logging with no label', () => {
    const groupSpy = vi.spyOn(console, 'group');
    DevTools.group();
    expect(groupSpy).toHaveBeenCalledWith('[DEV]', undefined);
    groupSpy.mockRestore();
  });

  it('should trackStateChanges with no callback', () => {
    const el = document.createElement('div');
    const off = DevTools.trackStateChanges(el, undefined as any);
    el.dispatchEvent(new CustomEvent('component-state-change', { detail: { updated: true } }));
    expect(typeof off).toBe('function');
    off();
  });

  it('should start timing and call timer immediately', () => {
    const timer = DevTools.startTiming('immediate');
    expect(typeof timer).toBe('function');
    const elapsed = timer();
    expect(elapsed).toBeGreaterThanOrEqual(0);
  });

  it('should handle getComputedStyle throwing error', () => {
    const el = document.createElement('div');
    const originalGetComputedStyle = window.getComputedStyle;
    // Simulate getComputedStyle throwing
    (window as any).getComputedStyle = () => { throw new Error('fail'); };
    expect(() => DevTools.inspectComponent(el)).toThrow('fail');
    (window as any).getComputedStyle = originalGetComputedStyle;
  });

  it('should handle getComputedStyle unavailable', () => {
    const el = document.createElement('div');
    const originalGetComputedStyle = window.getComputedStyle;
    // Simulate getComputedStyle undefined
    (window as any).getComputedStyle = undefined;
    expect(() => DevTools.inspectComponent(el)).toThrow();
    (window as any).getComputedStyle = originalGetComputedStyle;
  });

  it('should handle performance.now unavailable in startTiming', () => {
    const originalNow = performance.now;
    (performance as any).now = undefined;
    const timer = DevTools.startTiming('test');
    expect(typeof timer).toBe('function');
    expect(typeof timer()).toBe('number');
    (performance as any).now = originalNow;
  });

  it('should not fail if trackStateChanges called on non-HTMLElement', () => {
    const fake = {} as any;
    expect(() => DevTools.trackStateChanges(fake, () => {})).toThrow();
  });

  it('should not fail if inspectComponent called on non-HTMLElement', () => {
    expect(() => DevTools.inspectComponent({} as any)).toThrow();
  });
});

describe('Performance', () => {
  it('should export expected functions', () => {
    expect(typeof DevPerformance.measureRender).toBe('function');
    expect(typeof DevPerformance.getMemoryInfo).toBe('function');
    expect(typeof DevPerformance.log).toBe('function');
    expect(typeof DevPerformance.warn).toBe('function');
    expect(typeof DevPerformance.error).toBe('function');
    expect(typeof DevPerformance.debug).toBe('function');
    expect(typeof DevPerformance.group).toBe('function');
    expect(typeof DevPerformance.groupEnd).toBe('function');
  });

  it('should measure render time with performance.mark', () => {
    const spyMark = vi.spyOn(performance, 'mark');
    const spyMeasure = vi.spyOn(performance, 'measure');
    const result = DevPerformance.measureRender('test', () => 42);
    expect(result).toBe(42);
    expect(spyMark).toHaveBeenCalledTimes(2);
    expect(spyMeasure).toHaveBeenCalledTimes(1);
    spyMark.mockRestore();
    spyMeasure.mockRestore();
  });

  it('should fallback if performance.mark is unavailable', () => {
    const originalMark = performance.mark;
    (performance as any).mark = undefined;
    const result = DevPerformance.measureRender('test', () => 99);
    expect(result).toBe(99);
    (performance as any).mark = originalMark;
  });

  it('should get memory info if available', () => {
    (performance as any).memory = { usedJSHeapSize: 123 };
    expect(DevPerformance.getMemoryInfo()).toEqual({ usedJSHeapSize: 123 });
    (performance as any).memory = undefined;
    expect(DevPerformance.getMemoryInfo()).toBeNull();
  });

  it('should log messages', () => {
    const spy = vi.spyOn(console, 'log');
    DevPerformance.log('perf log');
    expect(spy).toHaveBeenCalledWith('[DEV]', 'perf log');
    spy.mockRestore();
  });

  it('should warn messages', () => {
    const spy = vi.spyOn(console, 'warn');
    DevPerformance.warn('perf warn');
    expect(spy).toHaveBeenCalledWith('[DEV]', 'perf warn');
    spy.mockRestore();
  });

  it('should error messages', () => {
    const spy = vi.spyOn(console, 'error');
    DevPerformance.error('perf error');
    expect(spy).toHaveBeenCalledWith('[DEV]', 'perf error');
    spy.mockRestore();
  });

  it('should debug messages', () => {
    const spy = vi.spyOn(console, 'debug');
    DevPerformance.debug('perf debug');
    expect(spy).toHaveBeenCalledWith('[DEV]', 'perf debug');
    spy.mockRestore();
  });

  it('should group and groupEnd', () => {
    const groupSpy = vi.spyOn(console, 'group');
    const endSpy = vi.spyOn(console, 'groupEnd');
    DevPerformance.group('perf group');
    expect(groupSpy).toHaveBeenCalledWith('[DEV]', 'perf group');
    DevPerformance.groupEnd();
    expect(endSpy).toHaveBeenCalled();
    groupSpy.mockRestore();
    endSpy.mockRestore();
  });
});
