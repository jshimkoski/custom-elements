import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, reactiveSystem } from '../src/lib/runtime/reactive';

describe('per-component warning throttle', () => {
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    // cleanup reactiveSystem internals if necessary
  });

  it('throttles warnings per component', () => {
    const compId = 'comp-throttle-test';

    // Simulate rendering context
    reactiveSystem.setCurrentComponent(compId, () => {});

    const state = reactiveSystem.getOrCreateState(0);

    // First write during render should warn
    state.value = 1;
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

    // Immediate second write should be throttled
    state.value = 2;
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

    // Advance time beyond throttle and write again
    const future = Date.now() + 1500;
    vi.setSystemTime(future);

    state.value = 3;
    expect(consoleWarnSpy).toHaveBeenCalledTimes(2);

    reactiveSystem.clearCurrentComponent();
  });
});
