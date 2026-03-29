import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ref, computed } from '../src/lib';
import { updateScheduler } from '../src/lib/runtime/scheduler';

describe('computed() synchronous invalidation (regression)', () => {
  let origTestEnv: unknown;

  beforeEach(() => {
    // Force the scheduler into a production-like (deferred) mode so that
    // scheduleFlush does NOT synchronously flush microtasks like it does
    // in the default test environment. This ensures we reproduce the
    // stale-computed behaviour seen in production when invalidation is
    // deferred by the scheduler.
    origTestEnv = (updateScheduler as any).testEnv;
    (updateScheduler as any).testEnv = {
      isTest: false,
      isVitest: false,
      isCypress: false,
    };
  });

  afterEach(() => {
    // Restore original test env to avoid affecting other tests
    (updateScheduler as any).testEnv = origTestEnv;
  });

  it('recomputes synchronously after dependency mutation', () => {
    const x = ref(1);
    let calls = 0;
    const doubled = computed(() => {
      calls++;
      return x.value * 2;
    });

    // initial
    expect(doubled.value).toBe(2);
    expect(calls).toBe(1);

    // mutate dependency and immediately read — with the old buggy
    // implementation (deferred invalidation) this would return the stale
    // cached value. Our fix must ensure immediate reads observe the update.
    x.value = 5;
    expect(doubled.value).toBe(10);
    expect(calls).toBe(2);
  });

  it('does not rely on scheduler flush to observe updated computed values', () => {
    const a = ref(10);
    const plusOne = computed(() => a.value + 1);

    expect(plusOne.value).toBe(11);

    a.value = 20;
    // immediate read must observe the updated computed result
    expect(plusOne.value).toBe(21);
  });
});
