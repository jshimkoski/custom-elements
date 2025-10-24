import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initWatchers, triggerWatchers } from '../src/lib/runtime/watchers';
import { getNestedValue } from '../src/lib/runtime/helpers';

interface Ctx {
  foo?: string;
  bar?: { baz?: number; arr?: number[] };
}

describe('watchers.ts', () => {
  let context: Ctx;
  let watchers: Map<string, any>;

  beforeEach(() => {
    context = { foo: 'a', bar: { baz: 1, arr: [1, 2] } };
    watchers = new Map();
  });

  describe('getNestedValue', () => {
    it('gets top-level value', () => {
      expect(getNestedValue(context, 'foo')).toBe('a');
    });
    it('gets nested value', () => {
      expect(getNestedValue(context, 'bar.baz')).toBe(1);
    });
    it('returns undefined for missing path', () => {
      expect(getNestedValue(context, 'bar.missing')).toBeUndefined();
    });
  });

  describe('initWatchers', () => {
    it('initializes watcher with callback', () => {
      const cb = vi.fn();
      initWatchers(context, watchers, { foo: cb });
      expect(watchers.has('foo')).toBe(true);
      expect(watchers.get('foo').callback).toBe(cb);
    });
    it('initializes watcher with array config', () => {
      const cb = vi.fn();
      initWatchers(context, watchers, { 'bar.baz': [cb, { immediate: true }] });
      expect(watchers.get('bar.baz').options.immediate).toBe(true);
      expect(cb).toHaveBeenCalledWith(1, undefined, context);
    });
    it('handles missing watchConfig', () => {
      expect(() =>
        initWatchers(context, watchers, undefined as any),
      ).not.toThrow();
    });
    it('handles error in immediate callback', () => {
      const cb = vi.fn(() => {
        throw new Error('fail');
      });
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      initWatchers(context, watchers, { foo: [cb, { immediate: true }] });
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('Error in immediate watcher'),
        expect.any(Error),
      );
      spy.mockRestore();
    });
  });

  describe('triggerWatchers', () => {
    it('calls watcher callback on value change', () => {
      const cb = vi.fn();
      initWatchers(context, watchers, { foo: cb });
      triggerWatchers(context, watchers, 'foo', 'b');
      expect(cb).toHaveBeenCalledWith('b', 'a', context);
      expect(watchers.get('foo').oldValue).toBe('b');
    });
    it('does not call callback if value unchanged', () => {
      const cb = vi.fn();
      initWatchers(context, watchers, { foo: cb });
      triggerWatchers(context, watchers, 'foo', 'a');
      expect(cb).not.toHaveBeenCalled();
    });
    it('handles error in watcher callback', () => {
      const cb = vi.fn(() => {
        throw new Error('fail');
      });
      initWatchers(context, watchers, { foo: cb });
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      triggerWatchers(context, watchers, 'foo', 'b');
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('Error in watcher'),
        expect.any(Error),
      );
      spy.mockRestore();
    });
    it('calls deep watcher on nested change', () => {
      const cb = vi.fn();
      initWatchers(context, watchers, { bar: [cb, { deep: true }] });
      context.bar = { baz: 2, arr: [1, 2] };
      triggerWatchers(context, watchers, 'bar.baz', 2);
      expect(cb).toHaveBeenCalledWith(
        context.bar,
        { baz: 1, arr: [1, 2] },
        context,
      );
      expect(watchers.get('bar').oldValue).toEqual({ baz: 2, arr: [1, 2] });
    });
    it('does not call deep watcher if value unchanged', () => {
      const cb = vi.fn();
      initWatchers(context, watchers, { bar: [cb, { deep: true }] });
      triggerWatchers(context, watchers, 'bar.baz', 1);
      expect(cb).not.toHaveBeenCalled();
    });
    it('handles error in deep watcher callback', () => {
      const cb = vi.fn(() => {
        throw new Error('fail');
      });
      initWatchers(context, watchers, { bar: [cb, { deep: true }] });
      context.bar = { baz: 2, arr: [1, 2] };
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      triggerWatchers(context, watchers, 'bar.baz', 2);
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('Error in deep watcher'),
        expect.any(Error),
      );
      spy.mockRestore();
    });
    it('compares arrays deeply', () => {
      const cb = vi.fn();
      initWatchers(context, watchers, { 'bar.arr': cb });
      triggerWatchers(context, watchers, 'bar.arr', [1, 2]);
      expect(cb).not.toHaveBeenCalled();
      triggerWatchers(context, watchers, 'bar.arr', [1, 2, 3]);
      expect(cb).toHaveBeenCalledWith([1, 2, 3], [1, 2], context);
    });
    it('compares objects deeply', () => {
      const cb = vi.fn();
      initWatchers(context, watchers, { bar: cb });
      triggerWatchers(context, watchers, 'bar', { baz: 1, arr: [1, 2] });
      expect(cb).not.toHaveBeenCalled();
      triggerWatchers(context, watchers, 'bar', { baz: 2, arr: [1, 2] });
      expect(cb).toHaveBeenCalledWith(
        { baz: 2, arr: [1, 2] },
        { baz: 1, arr: [1, 2] },
        context,
      );
    });
  });
});
