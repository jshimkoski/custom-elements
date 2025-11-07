import { describe, it, expect, vi } from 'vitest';
import { ref, watch } from '../src/lib/runtime/reactive';

describe('watch compatibility (ref overload + immediate semantics)', () => {
  it('accepts a ref directly as the source', () => {
    const count = ref(0);
    const cb = vi.fn();

    watch(count as any, cb);

    count.value = 1;
    expect(cb).toHaveBeenCalledWith(1, 0);
  });

  it('immediate option passes undefined as oldValue', () => {
    const count = ref(5);
    const cb = vi.fn();

    watch(count as any, cb, { immediate: true });

    expect(cb).toHaveBeenCalledWith(5, undefined);
  });

  it('cleanup stops watcher from receiving updates', () => {
    const count = ref(0);
    const cb = vi.fn();

    const stop = watch(count as any, cb);
    count.value = 2;
    expect(cb).toHaveBeenCalledWith(2, 0);

    stop();
    cb.mockClear();
    count.value = 3;
    expect(cb).not.toHaveBeenCalled();
  });

  it('works with getter sources as before', () => {
    const count = ref(10);
    const cb = vi.fn();

    watch(() => count.value, cb, { immediate: true });
    expect(cb).toHaveBeenCalledWith(10, undefined);

    count.value = 11;
    expect(cb).toHaveBeenCalledWith(11, 10);
  });
});
