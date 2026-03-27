/**
 * Tests for P0-4: cleanup() must cascade to registered child watchers.
 *
 * When a component is destroyed (disconnectedCallback → reactiveSystem.cleanup),
 * any watchers (watchEffect, watch, computed) it registered during render must
 * also be cleaned up so they do not keep reactive state subscriptions alive.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { reactiveSystem, ref, watchEffect } from '../src/lib/runtime/reactive';

// Reset the shared reactiveSystem singleton state between tests by cleaning up
// any component IDs we registered.
const TEST_PARENT = '__test-parent__';

beforeEach(() => {
  // Ensure no leftover state from a previous test.
  try {
    reactiveSystem.cleanup(TEST_PARENT);
  } catch {
    /* already clean */
  }
});

describe('reactiveSystem.cleanup() — watcher cascade', () => {
  it('cascades cleanup to a watchEffect registered under the parent', () => {
    const count = ref(0);
    let runCount = 0;

    // Simulate a component render context.
    reactiveSystem.setCurrentComponent(TEST_PARENT, () => {});

    // watchEffect registers its internal effectId under TEST_PARENT and
    // subscribes to `count` as a dependency.
    watchEffect(() => {
      void count.value;
      runCount++;
    });

    reactiveSystem.clearCurrentComponent();

    // Initial run — confirms effect is active.
    expect(runCount).toBe(1);

    // Destroy the parent component.
    reactiveSystem.cleanup(TEST_PARENT);

    // Update the ref — the effect must NOT re-run because it was cascade-cleaned.
    count.value = 99;
    expect(runCount).toBe(1);
  });

  it('cascades cleanup to multiple watchEffect calls registered under the parent', () => {
    const a = ref(0);
    const b = ref(0);
    let runA = 0;
    let runB = 0;

    reactiveSystem.setCurrentComponent(TEST_PARENT, () => {});

    watchEffect(() => {
      void a.value;
      runA++;
    });
    watchEffect(() => {
      void b.value;
      runB++;
    });

    reactiveSystem.clearCurrentComponent();

    expect(runA).toBe(1);
    expect(runB).toBe(1);

    reactiveSystem.cleanup(TEST_PARENT);

    a.value = 1;
    b.value = 1;

    // Neither effect should have re-run.
    expect(runA).toBe(1);
    expect(runB).toBe(1);
  });

  it('does not throw when cleanup is called with no registered watchers', () => {
    reactiveSystem.setCurrentComponent(TEST_PARENT, () => {});
    reactiveSystem.clearCurrentComponent();
    expect(() => reactiveSystem.cleanup(TEST_PARENT)).not.toThrow();
  });

  it('does not throw when cleanup is called on an unknown component id', () => {
    expect(() => reactiveSystem.cleanup('__nonexistent__')).not.toThrow();
  });

  it('allows re-registration of the same component after cleanup', () => {
    const count = ref(0);
    let runCount = 0;

    // First lifecycle.
    reactiveSystem.setCurrentComponent(TEST_PARENT, () => {});
    watchEffect(() => {
      void count.value;
      runCount++;
    });
    reactiveSystem.clearCurrentComponent();
    reactiveSystem.cleanup(TEST_PARENT);

    count.value = 1; // Should NOT trigger — effect cleaned up.
    expect(runCount).toBe(1);

    // Second lifecycle (component re-mounted).
    reactiveSystem.setCurrentComponent(TEST_PARENT, () => {});
    watchEffect(() => {
      void count.value;
      runCount++;
    });
    reactiveSystem.clearCurrentComponent();

    count.value = 2; // Should trigger — new effect active.
    expect(runCount).toBe(3); // initial run (2nd lifecycle) + triggered run

    reactiveSystem.cleanup(TEST_PARENT); // clean up after test
  });

  it('watcher stop() function remains safe to call after parent cleanup', () => {
    const count = ref(0);

    reactiveSystem.setCurrentComponent(TEST_PARENT, () => {});
    const stop = watchEffect(() => {
      void count.value;
    });
    reactiveSystem.clearCurrentComponent();

    reactiveSystem.cleanup(TEST_PARENT);

    // stop() was returned before cleanup — calling it after should not throw.
    expect(() => stop()).not.toThrow();
  });
});
