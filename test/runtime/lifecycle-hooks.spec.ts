import { component } from '../../src/lib/runtime';
import { describe, it, expect, vi } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Lifecycle Hooks', () => {
  it('calls onMounted and onUnmounted correctly', () => {
    const config = getTestConfig();
    config.onMounted = vi.fn();
    config.onUnmounted = vi.fn();
    component('lifecycle-test-element', config);
    const el = document.createElement('lifecycle-test-element');
    document.body.appendChild(el);
    expect(config.onMounted).toHaveBeenCalled();
    document.body.removeChild(el);
    expect(config.onUnmounted).toHaveBeenCalled();
  });

  it('ignores lifecycle hooks during SSR', () => {
    // Simulate SSR by not attaching to DOM
    const config = getTestConfig();
    config.onMounted = vi.fn();
    config.onUnmounted = vi.fn();
    component('ssr-lifecycle-element', config);
    // No DOM operations
    expect(config.onMounted).not.toHaveBeenCalled();
    expect(config.onUnmounted).not.toHaveBeenCalled();
  });

  it('handles async lifecycle hooks and errors', async () => {
    const config = getTestConfig();
    config.onMounted = vi.fn(async () => { throw new Error('Async mount error'); });
    config.onUnmounted = vi.fn(async () => { throw new Error('Async unmount error'); });
    config.onError = vi.fn();
    component('async-lifecycle-element', config);
    const el = document.createElement('async-lifecycle-element');
    document.body.appendChild(el);
    await new Promise(requestAnimationFrame);
    expect(config.onMounted).toHaveBeenCalled();
    expect(config.onError).toHaveBeenCalled();
    document.body.removeChild(el);
    await new Promise(requestAnimationFrame);
    expect(config.onUnmounted).toHaveBeenCalled();
    expect(config.onError).toHaveBeenCalled();
  });
});
