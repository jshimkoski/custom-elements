import { describe, it, expect } from 'vitest';
import { when, each, match } from '../src/lib/directives';
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
});
