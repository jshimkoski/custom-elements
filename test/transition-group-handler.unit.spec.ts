import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleTransitionGroup } from '../src/lib/runtime/transition-group-handler';
import * as tu from '../src/lib/runtime/transition-utils';
import { setNodeKey } from '../src/lib/runtime/node-metadata';

describe('handleTransitionGroup', () => {
  beforeEach(() => {
    // Make RAF synchronous for tests
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0 as unknown as number;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns false when there are no keys', () => {
    const parent = document.createElement('div');
    const res = handleTransitionGroup({
      parent,
      oldNodesCache: [],
      oldVNodes: [{ tag: 'div', props: {}, children: [] } as any],
      newChildren: [{ tag: 'div', props: {}, children: [] } as any],
      transitionGroup: {},
      createElement: () => document.createElement('div'),
      patch: () => document.createElement('div'),
    });
    expect(res).toBe(false);
  });

  it('creates new node and calls enter when appear is true', async () => {
    const parent = document.createElement('div');
    const enterSpy = vi.spyOn(tu, 'performEnterTransition').mockResolvedValue();

    const res = handleTransitionGroup({
      parent,
      oldNodesCache: [],
      oldVNodes: [],
      newChildren: [{ tag: 'div', key: 'k1', props: {}, children: [] } as any],
      transitionGroup: { appear: true },
      createElement: () => document.createElement('div'),
      patch: () => document.createElement('div'),
    });

    expect(res).toBe(true);
    expect(parent.children.length).toBe(1);
    // performEnterTransition called for appear
    expect(enterSpy).toHaveBeenCalled();
  });

  it('performs FLIP moveClass animation when position changes', () => {
    const parent = document.createElement('div');

    // Prepare an existing element in cache with a key
    const oldEl = document.createElement('div');
    setNodeKey(oldEl, 'k1');
    parent.appendChild(oldEl);

    // Stub bounding rects: old position left=0, new position left=10
    oldEl.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => {},
      }) as unknown as DOMRect;

    // Patch returns the same node (in-place patch) but updates its bounding rect
    const patch = (n: Node) => {
      (n as HTMLElement).getBoundingClientRect = () =>
        ({
          left: 10,
          top: 0,
          right: 0,
          bottom: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          toJSON: () => {},
        }) as unknown as DOMRect;
      return n;
    };

    // Ensure we spy on performLeaveTransition so it doesn't run unexpectedly
    vi.spyOn(tu, 'performLeaveTransition').mockResolvedValue();

    const res = handleTransitionGroup({
      parent,
      oldNodesCache: [oldEl],
      oldVNodes: [{ tag: 'div', key: 'k1', props: {}, children: [] } as any],
      newChildren: [{ tag: 'div', key: 'k1', props: {}, children: [] } as any],
      transitionGroup: { moveClass: 'mv duration-123 ease-in' },
      createElement: () => document.createElement('div'),
      patch,
      refs: undefined,
    });

    expect(res).toBe(true);
    // After synchronous RAFs, transition style should be set
    const moved = parent.querySelector('div') as HTMLElement | null;
    // style.transition should have been assigned a transform rule containing 123ms and ease-in
    if (moved) {
      expect(moved.style.transition.includes('123ms')).toBe(true);
      expect(moved.style.transition.includes('ease-in')).toBe(true);
    }
  });

  it('calls leave transitions and removes unused nodes', async () => {
    const parent = document.createElement('div');
    const oldEl = document.createElement('div');
    setNodeKey(oldEl, 'unused');
    parent.appendChild(oldEl);

    const leaveSpy = vi.spyOn(tu, 'performLeaveTransition').mockResolvedValue();

    const res = handleTransitionGroup({
      parent,
      oldNodesCache: [oldEl],
      oldVNodes: [
        { tag: 'div', key: 'unused', props: {}, children: [] } as any,
      ],
      newChildren: [],
      transitionGroup: {},
      createElement: () => document.createElement('div'),
      patch: () => document.createElement('div'),
    });

    expect(res).toBe(true);
    // leave transition should be invoked for the unused node
    expect(leaveSpy).toHaveBeenCalled();
  });
});
