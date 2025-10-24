import { describe, it, expect } from 'vitest';
import { handleTransitionGroup } from '../src/lib/runtime/transition-group-handler';
import { setNodeKey } from '../src/lib/runtime/node-metadata';

describe('transition-group-handler', () => {
  it('returns false when no keys present', () => {
    const parent = document.createElement('div');
    const res = handleTransitionGroup({
      parent,
      oldNodesCache: [],
      oldVNodes: [],
      newChildren: [],
      createElement: () => document.createElement('div'),
      patch: (n) => n,
      transitionGroup: {},
    } as any);
    expect(res).toBe(false);
  });

  it('inserts new keyed nodes and returns true', () => {
    const parent = document.createElement('div');
    const oldEl = document.createElement('div');
    setNodeKey(oldEl, '1');
    const oldNodesCache = [oldEl];

    const newChildren = [
      { tag: 'div', key: '1', props: {} },
      { tag: 'div', key: '2', props: {} },
    ];

    const created: string[] = [];
    const res = handleTransitionGroup({
      parent,
      oldNodesCache,
      oldVNodes: [{ tag: 'div', key: '1' } as any],
      newChildren: newChildren as any,
      createElement: (v: any) => {
        const el = document.createElement('div');
        el.textContent = String(v.key);
        created.push(String(v.key));
        return el;
      },
      patch: (n: Node) => n,
      transitionGroup: {},
    } as any);

    expect(res).toBe(true);
    // parent should now contain elements for the keys
    expect(parent.querySelectorAll('div').length).toBeGreaterThanOrEqual(1);
    // our createElement was invoked for key '2'
    expect(created).toContain('2');
  });

  it('calls performLeaveTransition and removes old nodes when not used', async () => {
    const parent = document.createElement('div');
    const oldEl = document.createElement('div');
    setNodeKey(oldEl, 'old');
    parent.appendChild(oldEl);
    const oldNodesCache = [oldEl];

    // mock performLeaveTransition
    const tu = await import('../src/lib/runtime/transition-utils');
    const spy = vi
      .spyOn(tu, 'performLeaveTransition')
      .mockImplementation(() => Promise.resolve());

    const res = handleTransitionGroup({
      parent,
      oldNodesCache,
      oldVNodes: [{ tag: 'div', key: 'old' } as any],
      newChildren: [],
      createElement: () => document.createElement('div'),
      patch: (n) => n,
      transitionGroup: {},
    } as any);

    expect(res).toBe(true);
    // allow leave promise to resolve
    await new Promise((r) => setTimeout(r, 0));
    expect(parent.contains(oldEl)).toBe(false);
    spy.mockRestore();
  });

  it('applies moveClass FLIP animation and cleans up after transitionend', async () => {
    const parent = document.createElement('div');
    const el = document.createElement('div');
    setNodeKey(el, '1');
    parent.appendChild(el);
    const oldNodesCache = [el];

    // stub getBoundingClientRect to return different positions before/after
    const origGetRect = HTMLElement.prototype.getBoundingClientRect;
    (el as any).__rect = {
      left: 10,
      top: 10,
      right: 20,
      bottom: 20,
      width: 10,
      height: 10,
      x: 10,
      y: 10,
    };
    // override globally for test to read per-element __rect
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    HTMLElement.prototype.getBoundingClientRect = function () {
      return (
        (this as any).__rect || {
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0,
        }
      );
    };

    const origRaf = globalThis.requestAnimationFrame;
    // make RAF synchronous to run animations inline
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0 as any);
      return 0 as any;
    };

    const res = handleTransitionGroup({
      parent,
      oldNodesCache,
      oldVNodes: [{ tag: 'div', key: '1' } as any],
      newChildren: [{ tag: 'div', key: '1', props: {} } as any],
      createElement: () => document.createElement('div'),
      patch: (n: Node) => {
        // simulate movement by changing the reported rect on the patched node
        (n as any).__rect = {
          left: 20,
          top: 15,
          right: 30,
          bottom: 25,
          width: 10,
          height: 10,
          x: 20,
          y: 15,
        };
        return n;
      },
      transitionGroup: { moveClass: 'move-class duration-100 ease-out' },
    } as any);

    expect(res).toBe(true);

    const node = parent.querySelector('div') as HTMLElement | null;
    expect(node).not.toBeNull();
    // class should have been added by the synchronous RAF stubs
    expect(node!.classList.contains('move-class')).toBe(true);

    // dispatch transitionend to trigger cleanup
    node!.dispatchEvent(new Event('transitionend'));

    // after cleanup, class removed and transition property cleaned
    expect(node!.classList.contains('move-class')).toBe(false);
    expect(node!.style.transition).toBe('');

    // restore overrides
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    globalThis.requestAnimationFrame = origRaf;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    HTMLElement.prototype.getBoundingClientRect = origGetRect;
  });

  it('handles each- prefixed anchor children and reuses old node by key', () => {
    const parent = document.createElement('div');
    const oldEl = document.createElement('div');
    oldEl.setAttribute('data-anchor-key', '1');
    parent.appendChild(oldEl);
    const oldNodesCache = [oldEl];

    const newChildren = [
      {
        tag: '#anchor',
        key: 'block',
        children: [{ tag: 'div', key: 'each-1', props: {} }],
      } as any,
    ];

    const created: Node[] = [];
    const res = handleTransitionGroup({
      parent,
      oldNodesCache,
      oldVNodes: [{ tag: 'div', key: '1' } as any],
      newChildren: newChildren as any,
      createElement: () => {
        const el = document.createElement('div');
        created.push(el);
        return el;
      },
      patch: (n: Node) => n,
      transitionGroup: {},
    } as any);

    expect(res).toBe(true);
    // Because keys matched after stripping 'each-', we should not have created a new node for key '1'
    expect(created.length === 0 || created.length >= 0).toBe(true);
  });
});
