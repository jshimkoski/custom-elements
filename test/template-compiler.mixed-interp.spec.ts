import { describe, it, expect } from 'vitest';
import { html } from '../src/lib/runtime/template-compiler';
import type { VNode } from '../src/lib/runtime/types';

describe('mixed interpolation in static attributes', () => {
  it('resolves a class attribute that mixes a literal prefix with an interpolated value', () => {
    const size = 'sm';
    const vnode = html`<div class="loader ${size}"></div>` as VNode;
    expect(vnode.tag).toBe('div');
    expect(vnode.props?.attrs?.class).toBe('loader sm');
  });

  it('resolves a class attribute that mixes multiple interpolated segments', () => {
    const base = 'btn';
    const variant = 'primary';
    const vnode = html`<span
      class="${base} ${variant} active"
    ></span>` as VNode;
    expect(vnode.tag).toBe('span');
    expect(vnode.props?.attrs?.class).toBe('btn primary active');
  });

  it('resolves a non-class attribute with mixed interpolation', () => {
    const id = '42';
    const vnode = html`<div data-id="item-${id}"></div>` as VNode;
    expect(vnode.tag).toBe('div');
    expect(vnode.props?.attrs?.['data-id']).toBe('item-42');
  });

  it('handles undefined interpolated values gracefully by treating them as empty strings', () => {
    const size: string | undefined = undefined;
    const vnode = html`<div class="loader ${size}"></div>` as VNode;
    expect(vnode.props?.attrs?.class).toBe('loader ');
  });

  it('preserves a plain static class attribute without interpolation', () => {
    const vnode = html`<div class="loader"></div>` as VNode;
    expect(vnode.props?.attrs?.class).toBe('loader');
  });
});
