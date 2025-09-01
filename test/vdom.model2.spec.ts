import { describe, it, expect } from 'vitest';
import { processModelDirective } from '../src/lib/runtime/vdom';

describe('vdom.model.extra', () => {
  it('checkbox array handling sets props.checked correctly', () => {
    const ctx: any = { list: ['a'] };
    const props: any = {};
    const attrs: any = { value: 'a' };
    const listeners: any = {};
    const el = document.createElement('input');
    el.type = 'checkbox';
    processModelDirective('list', [], props, attrs, listeners, ctx, el);
    expect(props.checked).toBe(true);
  });

  it('radio handling sets checked based on attrs.value', () => {
    const ctx: any = { sel: 'x' };
    const props: any = {};
    const attrs: any = { value: 'x' };
    const listeners: any = {};
    const el = document.createElement('input');
    el.type = 'radio';
    processModelDirective('sel', [], props, attrs, listeners, ctx, el);
    expect(props.checked).toBe(true);
  });

  it('text input attaches input listener and composition handlers when needed', () => {
    const ctx: any = { name: 'john' };
    const props: any = {};
    const attrs: any = {};
    const listeners: any = {};
    const el = document.createElement('input');
    el.type = 'text';
    processModelDirective('name', ['trim','number'], props, attrs, listeners, ctx, el);
    // Should create input or change listeners
    expect(typeof listeners.input === 'function' || typeof listeners.change === 'function').toBe(true);
    // Should also register composition handlers
    expect(typeof listeners.compositionstart === 'function').toBe(true);
    expect(typeof listeners.compositionend === 'function').toBe(true);
  });
});
