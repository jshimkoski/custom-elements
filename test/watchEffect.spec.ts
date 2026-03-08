import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, watchEffect } from '../src/lib';

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  if (container) {
    document.body.removeChild(container);
  }
});

describe('⚡ watchEffect()', () => {
  it('runs the effect immediately on creation', () => {
    const count = ref(0);
    const calls: number[] = [];

    const stop = watchEffect(() => {
      calls.push(count.value);
    });

    expect(calls).toEqual([0]);
    stop();
  });

  it('re-runs when a tracked reactive dep changes', () => {
    const x = ref(1);
    const results: number[] = [];

    const stop = watchEffect(() => {
      results.push(x.value * 2);
    });

    expect(results).toEqual([2]);

    x.value = 5;
    expect(results).toEqual([2, 10]);

    x.value = 10;
    expect(results).toEqual([2, 10, 20]);

    stop();
  });

  it('stops tracking after stop() is called', () => {
    const y = ref(0);
    const calls = vi.fn();

    const stop = watchEffect(() => {
      calls(y.value);
    });

    expect(calls.mock.calls.length).toBe(1);

    stop();

    y.value = 99;
    // Should NOT have been called again
    expect(calls.mock.calls.length).toBe(1);
  });

  it('tracks multiple reactive dependencies', () => {
    const a = ref(1);
    const b = ref(10);
    const sums: number[] = [];

    const stop = watchEffect(() => {
      sums.push(a.value + b.value);
    });

    expect(sums).toEqual([11]);

    a.value = 2;
    expect(sums).toEqual([11, 12]);

    b.value = 20;
    expect(sums).toEqual([11, 12, 22]);

    stop();
  });

  it('does not re-run when an untracked ref changes', () => {
    const tracked = ref(0);
    const untracked = ref(100);
    const calls = vi.fn();

    const stop = watchEffect(() => {
      // Only access tracked
      calls(tracked.value);
    });

    expect(calls.mock.calls.length).toBe(1);

    untracked.value = 999;
    // watchEffect only re-runs when tracked changes
    expect(calls.mock.calls.length).toBe(1);

    tracked.value = 1;
    expect(calls.mock.calls.length).toBe(2);

    stop();
  });

  it('returns a stop function that is callable multiple times without error', () => {
    const z = ref(0);
    const stop = watchEffect(() => void z.value);

    expect(() => {
      stop();
      stop();
      stop();
    }).not.toThrow();
  });

  it('tracks object reactive state accessed inside the effect', () => {
    const user = ref({ name: 'Alice', age: 30 });
    const names: string[] = [];

    const stop = watchEffect(() => {
      names.push(user.value.name);
    });

    expect(names).toEqual(['Alice']);

    user.value = { name: 'Bob', age: 25 };
    expect(names).toEqual(['Alice', 'Bob']);

    stop();
  });
});
