import { component } from '../../src/lib/runtime';
import { describe, it, expect, vi } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Debug Mode', () => {
  it('logs warnings and errors when debug is enabled', () => {
    const config = getTestConfig();
    config.debug = true;
    config.onError = vi.fn();
    config.template = () => { throw new Error('Debug error'); };
    component('debug-mode-element', config);
    const el = document.createElement('debug-mode-element');
    document.body.appendChild(el);
    expect(config.onError).toHaveBeenCalled();
    document.body.removeChild(el);
  });
});
