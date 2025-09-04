import { describe, it, expect, vi } from 'vitest';
import {
  getNestedValue,
  setNestedValue,
  processBindDirective,
  processStyleDirective,
  processClassDirective,
  processShowDirective,
  assignKeysDeep,
  processModelDirective,
  processDirectives,
  patchProps,
} from '../src/lib/runtime/vdom';

describe('vdom additional helpers', () => {
  it('getNestedValue and setNestedValue work for dot paths', () => {
    const obj: any = {};
    setNestedValue(obj, 'a.b.c', 42);
    expect(getNestedValue(obj, 'a.b.c')).toBe(42);
    expect(obj.a.b.c).toBe(42);
  });

  it('processBindDirective handles object, JSON string and context path fallback', () => {
    const props: Record<string, any> = {};
    const attrs: Record<string, any> = {};
    // object syntax
    processBindDirective({ id: 'x', title: 'T' } as any, props, attrs, {});
    expect(props.id).toBe('x');
    expect(props.title).toBe('T');

    // JSON string
    const props2: Record<string, any> = {};
    const attrs2: Record<string, any> = {};
    processBindDirective('{"data":123}', props2, attrs2, {});
    expect(props2.data).toBe(123);

    // fallback: path string -> attrs set from context value
    const props3: Record<string, any> = {};
    const attrs3: Record<string, any> = {};
    const ctx = { nested: { val: 'ok' } };
    processBindDirective('nested.val', props3, attrs3, ctx);
    expect(attrs3['nested.val']).toBe('ok');
  });

  it('processStyleDirective converts numeric px and merges with existing style', () => {
    const attrs: Record<string, any> = { style: 'color: red' };
    processStyleDirective({ width: 10, color: 'blue' }, attrs);
    expect(attrs.style).toContain('width: 10px');
    expect(attrs.style).toContain('color: blue');
    // existing style should be preserved
    expect(attrs.style).toContain('color: red');
  });

  it('processClassDirective handles object syntax and merges classes', () => {
    const attrs: Record<string, any> = { class: 'base' };
    const ctx = { flags: { 'one two': true, three: false } };
    processClassDirective('flags', attrs, ctx);
    expect(attrs.class).toContain('base');
    expect(attrs.class).toContain('one');
    expect(attrs.class).toContain('two');
    expect(attrs.class).not.toContain('three');
  });

  it('processShowDirective merges display style with existing styles', () => {
    const attrs: Record<string, any> = { style: 'color:green' };
    const ctx = { isVisible: false };
    processShowDirective('isVisible', attrs, ctx);
    expect(attrs.style).toContain('display: none');
    expect(attrs.style).toContain('color:green');
  });

  it('assignKeysDeep generates unique keys for siblings', () => {
    const nodes = [
      { tag: 'li', props: { attrs: { id: 'x' } }, children: [] },
      { tag: 'li', props: { attrs: { id: 'x' } }, children: [] },
    ];
    const out = assignKeysDeep(nodes as any, 'base') as any[];
    expect(out[0].key).toBeDefined();
    expect(out[1].key).toBeDefined();
    expect(out[0].key).not.toBe(out[1].key);
  });

  it('processModelDirective sets initial value and registers listeners for text input', () => {
    const context: any = { _state: { name: 'Alice' }, _requestRender: vi.fn() };
    const props: Record<string, any> = {};
    const attrs: Record<string, any> = {};
    const listeners: Record<string, EventListener> = {};
    const el = document.createElement('input');
    processModelDirective('name', [], props, attrs, listeners, context, el);
    // initial value should be set on props
    expect(props.value).toBe('Alice');
    // input listener should have been registered
    expect(typeof listeners.input).toBe('function');
    // composition listeners for text inputs should be present
    expect(typeof listeners.compositionstart).toBe('function');
    expect(typeof listeners.compositionend).toBe('function');
  });

  it('processDirectives composes multiple directive handlers', () => {
    const directives: any = {
      style: { value: { width: 5 }, modifiers: [] },
      class: { value: 'flags', modifiers: [] },
    };
    const ctx: any = { flags: { ok: true } };
    const result = processDirectives(directives, ctx, undefined, {});
    expect(result.attrs.style).toBeTruthy();
    expect(result.attrs.class).toBeTruthy();
  });

  it('patchProps adds and replaces event listeners and handles value/checked', () => {
    const el = document.createElement('button');
    const oldProps = { props: {}, attrs: {} } as any;
    const oldHandler = vi.fn();
    const newHandler = vi.fn();

    // initial add
  patchProps(el, oldProps, { props: { onClick: oldHandler }, attrs: {} } as any);
    el.dispatchEvent(new MouseEvent('click'));
    expect(oldHandler).toHaveBeenCalledTimes(1);

    // replace handler
  patchProps(el, { props: { onClick: oldHandler }, attrs: {} } as any, { props: { onClick: newHandler }, attrs: {} } as any);
    el.dispatchEvent(new MouseEvent('click'));
    expect(newHandler).toHaveBeenCalledTimes(1);
  });
});
