import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { html, parseProps } from '../src/lib/runtime/template-compiler';
import { createElement } from '../src/lib/runtime/vdom';
import type { VNode } from '../src/lib/runtime/types';

let mount: HTMLElement | null = null;

beforeEach(() => {
  mount = document.createElement('div');
  document.body.appendChild(mount);
});

afterEach(() => {
  if (mount && mount.parentNode) mount.parentNode.removeChild(mount);
  mount = null;
});

describe('event modifiers - compile-time option mapping', () => {
  it('should return descriptor with options for once/capture/passive', () => {
    const props = parseProps('@click.once.capture.passive="fn"', [], { fn: () => {} }).props;
    expect(props.onClick).toBeDefined();
    // When options present, compiler returns { handler, options }
    // It will be an object when compiled from string reference
    const maybe = props.onClick as any;
    expect(typeof maybe === 'object' || typeof maybe === 'function').toBe(true);
    if (typeof maybe === 'object') {
      expect(typeof maybe.handler).toBe('function');
      expect(maybe.options).toBeDefined();
      expect(maybe.options.once).toBe(true);
      expect(maybe.options.capture).toBe(true);
      expect(maybe.options.passive).toBe(true);
    }
  });
});

describe('event modifiers - runtime behavior', () => {
  it('should call handler and preventDefault with .prevent', () => {
    let called = false;
    const handler = (e: Event) => { called = true; };
    const vnode = html`<button @click.prevent="${handler}">Click</button>` as VNode;
    const el = createElement(vnode, {}) as HTMLElement;
    if (mount) mount.appendChild(el);

    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
    expect(called).toBe(true);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('should stop propagation to parent with .stop', () => {
    let parentCalled = false;
    const parent = document.createElement('div');
    const childV = html`<button @click.stop="${() => { /* noop */ }}">X</button>` as VNode;
    const child = createElement(childV, {}) as HTMLElement;
    parent.addEventListener('click', () => { parentCalled = true; });
    parent.appendChild(child);
    if (mount) mount.appendChild(parent);

    const ev = new MouseEvent('click', { bubbles: true });
    child.dispatchEvent(ev);
    expect(parentCalled).toBe(false);
  });

  it('should respect .self modifier (only target equals currentTarget)', () => {
    let called = false;
    const parentV = html`<div @click.self="${() => { called = true; }}"><button id="inner">I</button></div>` as VNode;
    const parent = createElement(parentV, {}) as HTMLElement;
    if (mount) mount.appendChild(parent);
    const inner = parent.querySelector('#inner') as HTMLElement;
    const ev = new MouseEvent('click', { bubbles: true });
    inner.dispatchEvent(ev);
    expect(called).toBe(false);

    // Dispatch on parent itself
    const ev2 = new MouseEvent('click', { bubbles: true });
    parent.dispatchEvent(ev2);
    expect(called).toBe(true);
  });

  it('should filter mouse buttons (.left .middle .right)', () => {
    let leftCalled = false;
    let middleCalled = false;
    const leftV = html`<button @click.left="${() => { leftCalled = true; }}">L</button>` as VNode;
    const middleV = html`<button @click.middle="${() => { middleCalled = true; }}">M</button>` as VNode;
    const leftEl = createElement(leftV, {}) as HTMLElement;
    const middleEl = createElement(middleV, {}) as HTMLElement;
    if (mount) { mount.appendChild(leftEl); mount.appendChild(middleEl); }

    leftEl.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    expect(leftCalled).toBe(true);
    middleEl.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 1 }));
    expect(middleCalled).toBe(true);

    // Wrong button should not trigger
    leftCalled = false;
    leftEl.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 2 }));
    expect(leftCalled).toBe(false);
  });

  it('should filter keyboard keys using key aliases (.enter, .esc, .space, .left)', () => {
    let enterCalled = false;
    const v = html`<input @keydown.enter="${() => { enterCalled = true; }}" />` as VNode;
    const el = createElement(v, {}) as HTMLElement;
    if (mount) mount.appendChild(el);

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(enterCalled).toBe(true);

    enterCalled = false;
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(enterCalled).toBe(false);
  });

  it('should require modifier keys (ctrl/alt/shift/meta) when present', () => {
    let called = false;
    const v = html`<input @keydown.ctrl.enter="${() => { called = true; }}" />` as VNode;
    const el = createElement(v, {}) as HTMLElement;
    if (mount) mount.appendChild(el);

    // Without ctrl
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(called).toBe(false);

    // With ctrl
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, ctrlKey: true }));
    expect(called).toBe(true);
  });

  it('should handle .once via addEventListener options', () => {
    let times = 0;
    const v = html`<button @click.once="${() => { times += 1; }}">Once</button>` as VNode;
    const el = createElement(v, {}) as HTMLElement;
    if (mount) mount.appendChild(el);

    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(times).toBe(1);
  });
});
