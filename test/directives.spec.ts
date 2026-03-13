import { describe, it, expect } from 'vitest';
import { when, each, match, resetWhenCounter } from '../src/lib/directives';
import type { VNode } from '../src/lib/runtime/types';

function getChildren(v: VNode | VNode[]) {
  if (Array.isArray(v)) return v;
  if (v && Array.isArray(v.children)) return v.children;
  return [];
}

describe('directives', () => {
  it('when returns anchor block with children if condition is true', () => {
    const vnode = when(true, { tag: 'div', children: 'ok' } as VNode);
    expect(vnode.tag).toBe('#anchor');
    expect((vnode.children ?? []).length).toBe(1);
    expect(
      vnode.children &&
        typeof vnode.children[0] === 'object' &&
        vnode.children[0] !== null &&
        'tag' in vnode.children[0] &&
        (vnode.children[0] as VNode).tag,
    ).toBe('div');
  });

  it('when returns anchor block with empty children if condition is false', () => {
    const vnode = when(false, { tag: 'div', children: 'fail' } as VNode);
    expect(vnode.tag).toBe('#anchor');
    expect((vnode.children ?? []).length).toBe(0);
  });

  it('each returns array of anchor blocks for primitives', () => {
    const arr = each([1, 2, 3], (item) => ({
      tag: 'span',
      children: String(item),
    }));
    expect(Array.isArray(arr)).toBe(true);
    expect(arr.length).toBe(3);
    arr.forEach((v, i) => {
      expect(v.tag).toBe('#anchor');
      expect(v.key).toBe(`each-${i + 1}`);
      expect(getChildren(v)[0].tag).toBe('span');
      expect(getChildren(v)[0].children).toBe(String(i + 1));
    });
  });

  it('each returns array of anchor blocks for objects with key/id', () => {
    const items = [
      { id: 'a', name: 'A' },
      { key: 'b', name: 'B' },
    ];
    const arr = each(items, (item) => ({ tag: 'div', children: item.name }));
    expect(arr.length).toBe(2);
    expect(arr[0].key).toBe('each-a');
    expect(arr[1].key).toBe('each-b');
    expect(getChildren(arr[0])[0].children).toBe('A');
    expect(getChildren(arr[1])[0].children).toBe('B');
  });

  it('match returns first true branch as anchor block', () => {
    const m = match()
      .when(false, { tag: 'div', children: 'no' })
      .when(1 === 1, { tag: 'span', children: 'yes' })
      .otherwise({ tag: 'div', children: 'never' })
      .done();
    expect(Array.isArray(m)).toBe(true);
    expect(m[0].tag).toBe('#anchor');
    expect(getChildren(m[0])[0].tag).toBe('span');
    expect(getChildren(m[0])[0].children).toBe('yes');
  });

  it('match returns otherwise branch if no condition is true', () => {
    const m = match()
      .when(false, { tag: 'div', children: 'no' })
      .otherwise({ tag: 'span', children: 'default' })
      .done();
    expect(m[0].tag).toBe('#anchor');
    expect(getChildren(m[0])[0].tag).toBe('span');
    expect(getChildren(m[0])[0].children).toBe('default');
  });

  it('match returns empty anchor block if no branches', () => {
    const m = match().done();
    expect(m[0]?.tag).toBe('#anchor');
    expect(Array.isArray(m[0]?.children) ? m[0].children.length : 0).toBe(0);
  });

  it('when uses default key "when-block"', () => {
    const vnode = when(true, { tag: 'div', children: 'test' } as VNode);
    expect(vnode.key).toMatch(/^when-block-\d+$/);
  });

  it('when accepts a custom key to disambiguate sibling when() calls', () => {
    const a = when(true, { tag: 'div', children: 'a' } as VNode, 'branch-a');
    const b = when(false, { tag: 'div', children: 'b' } as VNode, 'branch-b');
    expect(a.key).toBe('branch-a');
    expect(b.key).toBe('branch-b');
  });

  it('two when() calls without explicit keys get unique positional keys', () => {
    // Simulate what the component renderer does before each render pass
    resetWhenCounter();
    const first = when(true, { tag: 'div', children: 'x' } as VNode);
    const second = when(false, { tag: 'div', children: 'y' } as VNode);
    expect(first.key).toBe('when-block-0');
    expect(second.key).toBe('when-block-1');
    expect(first.key).not.toBe(second.key);
  });

  it('counter resets to 0 on each render pass so keys are stable across re-renders', () => {
    resetWhenCounter();
    const a1 = when(true, { tag: 'div', children: 'x' } as VNode);
    const b1 = when(false, { tag: 'div', children: 'y' } as VNode);

    // Simulate a second render pass
    resetWhenCounter();
    const a2 = when(true, { tag: 'div', children: 'x' } as VNode);
    const b2 = when(false, { tag: 'div', children: 'y' } as VNode);

    expect(a1.key).toBe(a2.key);
    expect(b1.key).toBe(b2.key);
  });
});
