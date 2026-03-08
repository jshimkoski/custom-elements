import { describe, it, expect, vi } from 'vitest';
import { ref, watch } from '../src/lib/runtime/reactive';

describe('watch() with { deep: true }', () => {
  it('fires callback when a top-level property of an object ref is mutated', () => {
    const user = ref({ name: 'Alice', age: 30 });
    const cb = vi.fn();

    watch(user, cb, { deep: true });

    user.value.name = 'Bob';

    expect(cb).toHaveBeenCalledOnce();
    expect(cb.mock.calls[0][0]).toEqual({ name: 'Bob', age: 30 });
    expect(cb.mock.calls[0][1]).toEqual({ name: 'Alice', age: 30 });
  });

  it('fires callback for deeply nested property mutation', () => {
    const data = ref({ user: { address: { city: 'NYC' } } });
    const cb = vi.fn();

    watch(data, cb, { deep: true });

    data.value.user.address.city = 'LA';

    expect(cb).toHaveBeenCalledOnce();
    expect(cb.mock.calls[0][0]).toEqual({ user: { address: { city: 'LA' } } });
    expect(cb.mock.calls[0][1]).toEqual({
      user: { address: { city: 'NYC' } },
    });
  });

  it('fires callback when an array element is pushed', () => {
    const items = ref([1, 2, 3]);
    const cb = vi.fn();

    watch(items, cb, { deep: true });

    items.value.push(4);

    expect(cb).toHaveBeenCalledOnce();
    expect(cb.mock.calls[0][0]).toEqual([1, 2, 3, 4]);
    expect(cb.mock.calls[0][1]).toEqual([1, 2, 3]);
  });

  it('fires callback when a property of an array item is mutated', () => {
    const list = ref([{ name: 'a' }, { name: 'b' }]);
    const cb = vi.fn();

    watch(list, cb, { deep: true });

    list.value[0].name = 'z';

    expect(cb).toHaveBeenCalledOnce();
    expect(cb.mock.calls[0][0]).toEqual([{ name: 'z' }, { name: 'b' }]);
    expect(cb.mock.calls[0][1]).toEqual([{ name: 'a' }, { name: 'b' }]);
  });

  it('provides rolling snapshots across multiple mutations', () => {
    const data = ref({ count: 0 });
    const cb = vi.fn();

    watch(data, cb, { deep: true });

    data.value.count = 1;
    data.value.count = 2;
    data.value.count = 3;

    expect(cb).toHaveBeenCalledTimes(3);
    // Each call should see the correct before/after pair
    expect(cb.mock.calls[0][1]).toEqual({ count: 0 });
    expect(cb.mock.calls[0][0]).toEqual({ count: 1 });
    expect(cb.mock.calls[1][1]).toEqual({ count: 1 });
    expect(cb.mock.calls[1][0]).toEqual({ count: 2 });
    expect(cb.mock.calls[2][1]).toEqual({ count: 2 });
    expect(cb.mock.calls[2][0]).toEqual({ count: 3 });
  });

  it('new and old snapshot values are independent references', () => {
    const data = ref({ x: 1 });
    let capturedNew: unknown;
    let capturedOld: unknown;

    watch(
      data,
      (newVal, oldVal) => {
        capturedNew = newVal;
        capturedOld = oldVal;
      },
      { deep: true },
    );

    data.value.x = 2;
    // Mutate again — capturedOld from the first callback should remain { x: 1 }
    data.value.x = 3;

    expect(capturedOld).toEqual({ x: 2 });
    expect(capturedNew).toEqual({ x: 3 });
    expect(capturedNew).not.toBe(capturedOld);
  });

  it('works with { deep: true, immediate: true } — first call has undefined oldVal', () => {
    const user = ref({ name: 'Alice' });
    const cb = vi.fn();

    watch(user, cb, { deep: true, immediate: true });

    // Immediate invocation
    expect(cb).toHaveBeenCalledOnce();
    expect(cb.mock.calls[0][0]).toEqual({ name: 'Alice' });
    expect(cb.mock.calls[0][1]).toBeUndefined();

    // Subsequent nested mutation
    user.value.name = 'Bob';
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb.mock.calls[1][0]).toEqual({ name: 'Bob' });
    expect(cb.mock.calls[1][1]).toEqual({ name: 'Alice' });
  });

  it('stop function cancels the deep watcher', () => {
    const data = ref({ count: 0 });
    const cb = vi.fn();

    const stop = watch(data, cb, { deep: true });
    stop();

    data.value.count = 99;

    expect(cb).not.toHaveBeenCalled();
  });

  it('shallow watch (no deep option) does NOT fire for nested mutations', () => {
    // Baseline to confirm existing behaviour is unchanged
    const user = ref({ name: 'Alice' });
    const cb = vi.fn();

    watch(user, cb);

    user.value.name = 'Bob'; // same proxy reference → no callback

    expect(cb).not.toHaveBeenCalled();
  });

  it('handles nested arrays inside objects', () => {
    const state = ref({ tags: ['a', 'b'] });
    const cb = vi.fn();

    watch(state, cb, { deep: true });

    state.value.tags.push('c');

    expect(cb).toHaveBeenCalledOnce();
    expect(cb.mock.calls[0][0]).toEqual({ tags: ['a', 'b', 'c'] });
    expect(cb.mock.calls[0][1]).toEqual({ tags: ['a', 'b'] });
  });

  it('works with a getter function source and deep: true', () => {
    const store = ref({ user: { score: 10 } });
    const cb = vi.fn();

    // getter function form — deep should still work
    watch(() => store.value, cb, { deep: true });

    store.value.user.score = 42;

    expect(cb).toHaveBeenCalledOnce();
    expect(cb.mock.calls[0][0]).toEqual({ user: { score: 42 } });
    expect(cb.mock.calls[0][1]).toEqual({ user: { score: 10 } });
  });

  it('circular reference in data does not throw during deep watch', () => {
    type Node = { name: string; self?: Node };
    const node: Node = { name: 'root' };
    node.self = node; // circular

    const state = ref(node);
    const cb = vi.fn();

    // Should not throw when setting up or firing
    expect(() => {
      watch(state, cb, { deep: true });
      state.value.name = 'updated';
    }).not.toThrow();

    expect(cb).toHaveBeenCalledOnce();
  });
});
