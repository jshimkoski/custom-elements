import { component } from '../../src/lib/runtime';
import { vi, describe, it, expect } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Performance & Memory', () => {
  it('mounts and unmounts repeatedly without leaks', () => {
    const config = getTestConfig();
    component('perf-element', config);
    for (let i = 0; i < 10; i++) {
      const el = document.createElement('perf-element');
      document.body.appendChild(el);
      document.body.removeChild(el);
    }
    expect(config.onMounted).toHaveBeenCalledTimes(10);
    expect(config.onUnmounted).toHaveBeenCalledTimes(10);
  });
});