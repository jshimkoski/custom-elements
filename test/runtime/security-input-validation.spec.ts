import { component } from '../../src/lib/runtime';
import { vi, describe, it, expect } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Security & Input Validation', () => {
  it('sanitizes user input to prevent XSS', () => {
    const config = getTestConfig();
    config.state.name = '<img src=x onerror=alert(1)>';
    component('xss-element', config);
    const el = document.createElement('xss-element');
    document.body.appendChild(el);
    // @ts-ignore
    expect(el.shadowRoot?.innerHTML).not.toContain('onerror');
    document.body.removeChild(el);
  });
});