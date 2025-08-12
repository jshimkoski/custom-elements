import { component } from '../../src/lib/runtime';
import { describe, it, expect, vi } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Async Lifecycle Hooks', () => {
  it('supports async onMounted and handles promise rejection', async () => {
    const config = getTestConfig();
    config.onMounted = vi.fn(async () => { throw new Error('Async mount error'); });
    config.onError = vi.fn();
    component('async-mount-element', config);
    const el = document.createElement('async-mount-element');
    document.body.appendChild(el);
    await new Promise(requestAnimationFrame);
    expect(config.onMounted).toHaveBeenCalled();
    expect(config.onError).toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it('supports async onUnmounted and handles promise rejection', async () => {
    const config = getTestConfig();
    config.onUnmounted = vi.fn(async () => { throw new Error('Async unmount error'); });
    config.onError = vi.fn();
    component('async-unmount-element', config);
    const el = document.createElement('async-unmount-element');
    document.body.appendChild(el);
    document.body.removeChild(el);
    await new Promise(requestAnimationFrame);
    expect(config.onUnmounted).toHaveBeenCalled();
    expect(config.onError).toHaveBeenCalled();
  });
});
