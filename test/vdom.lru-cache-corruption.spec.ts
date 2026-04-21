/**
 * Regression tests for the writebackAttr / LRU-cache corruption bug.
 *
 * Background:
 *   The `html` tagged-template compiler returns the SAME vnode object on
 *   every call for a given template literal (LRU cache).  Before this fix,
 *   `vdomRenderer` stored child vnodes by reference inside `_prevVNode`.
 *   During a subsequent patch cycle, `patchProps` called `writebackAttr` on
 *   those stored children, which mutated the shared LRU-cached vnode's
 *   `props.attrs` object.  The next render that returned the same cached
 *   vnode then called `patchProps` with the corrupted attrs as *new* props,
 *   producing the wrong class on the DOM element.
 *
 * Concrete symptom (search-sheet):
 *   1. Open search → renders empty-state div  (class "flex flex-col …")
 *   2. Type a query → results render          (class "flex flex-col …" changes to list)
 *   3. Navigate away, reopen search           → query is reset, should show empty-state again
 *   BUG: The outer div rendered with class "flex justify-center py-12"
 *        (the loading-state class) even though the content was the empty state.
 */
import { describe, it, expect } from 'vitest';
import { vdomRenderer } from '../src/lib/runtime/vdom';
import type { VNode } from '../src/lib/runtime/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRoot(): ShadowRoot {
  return document.createElement('div').attachShadow({ mode: 'open' });
}

// ---------------------------------------------------------------------------
// Core regression: child attrs must not be mutated on the shared vnode object
// ---------------------------------------------------------------------------

describe('vdomRenderer — writebackAttr does not corrupt LRU-cached child vnodes', () => {
  it('shared child vnode attrs are not mutated when a sibling state is patched', () => {
    // Simulate two LRU-cached child vnodes that are reused across renders.
    // In the real app these are the `html` template-literal objects returned
    // by the ternary branches inside search-sheet.
    const sharedChildA: VNode = {
      tag: 'div',
      props: { attrs: { class: 'state-a' } },
      children: 'Content A',
    };
    const sharedChildB: VNode = {
      tag: 'div',
      props: { attrs: { class: 'state-b' } },
      children: 'Content B',
    };

    const makeVNodeA = (): VNode => ({
      tag: 'div',
      props: { attrs: { class: 'root' } },
      children: [sharedChildA],
    });
    const makeVNodeB = (): VNode => ({
      tag: 'div',
      props: { attrs: { class: 'root' } },
      children: [sharedChildB],
    });

    const root = makeRoot();

    // --- Render 1: state A ---
    vdomRenderer(root, makeVNodeA());
    expect(root.querySelector('.state-a')).not.toBeNull();
    expect(root.querySelector('.state-b')).toBeNull();
    // Shared vnode must not have been touched.
    expect(sharedChildA.props!.attrs!.class).toBe('state-a');

    // --- Render 2: state B (patches the DOM, writebackAttr writes into the
    //     stored _prevVNode children — must NOT touch sharedChildA) ---
    vdomRenderer(root, makeVNodeB());
    expect(root.querySelector('.state-b')).not.toBeNull();
    expect(root.querySelector('.state-a')).toBeNull();

    // Critical assertion: the shared state-A vnode must be unmodified.
    // Before the fix this was 'state-b' because writebackAttr mutated
    // sharedChildA.props.attrs directly.
    expect(sharedChildA.props!.attrs!.class).toBe('state-a');

    // --- Render 3: state A again (same LRU vnode — simulates reopening the
    //     search sheet after a reset) ---
    vdomRenderer(root, makeVNodeA());

    // Before the fix: the DOM showed class="state-b" because patchProps used
    // the corrupted sharedChildA.props.attrs.class ('state-b') as newProps.
    expect(root.querySelector('.state-a')).not.toBeNull();
    expect(root.querySelector('.state-b')).toBeNull();
    expect(root.firstElementChild?.firstElementChild?.className).toBe('state-a');
  });

  it('class attribute is correctly restored on the third render after two state transitions', () => {
    // Three distinct states, cycling A → B → A → C → A to stress-test the fix.
    const childA: VNode = {
      tag: 'p',
      props: { attrs: { class: 'empty-state', id: 'a' } },
      children: 'empty',
    };
    const childB: VNode = {
      tag: 'p',
      props: { attrs: { class: 'loading-state', id: 'b' } },
      children: 'loading',
    };
    const childC: VNode = {
      tag: 'p',
      props: { attrs: { class: 'results-state', id: 'c' } },
      children: 'results',
    };

    const wrap = (child: VNode): VNode => ({
      tag: 'section',
      props: { attrs: { class: 'wrapper' } },
      children: [child],
    });

    const root = makeRoot();

    // A → B → A
    vdomRenderer(root, wrap(childA));
    expect(root.querySelector('.empty-state')).not.toBeNull();

    vdomRenderer(root, wrap(childB));
    expect(root.querySelector('.loading-state')).not.toBeNull();
    expect(childA.props!.attrs!.class).toBe('empty-state'); // must be intact

    vdomRenderer(root, wrap(childA));
    expect(root.querySelector('.empty-state')).not.toBeNull();
    expect(root.querySelector('.loading-state')).toBeNull();

    // A → C → A
    vdomRenderer(root, wrap(childC));
    expect(root.querySelector('.results-state')).not.toBeNull();
    expect(childA.props!.attrs!.class).toBe('empty-state'); // still intact

    vdomRenderer(root, wrap(childA));
    expect(root.querySelector('.empty-state')).not.toBeNull();
    expect(root.querySelector('.results-state')).toBeNull();
  });

  it('deeply nested child attrs are not corrupted', () => {
    // The bug affects any depth, not just direct children.
    const deepChild: VNode = {
      tag: 'span',
      props: { attrs: { class: 'deep-a' } },
      children: 'deep',
    };
    const altChild: VNode = {
      tag: 'span',
      props: { attrs: { class: 'deep-b' } },
      children: 'alt',
    };

    const wrapDeep = (inner: VNode): VNode => ({
      tag: 'div',
      props: { attrs: { class: 'outer' } },
      children: [
        {
          tag: 'div',
          props: { attrs: { class: 'middle' } },
          children: [inner],
        },
      ],
    });

    const root = makeRoot();

    vdomRenderer(root, wrapDeep(deepChild));
    expect(root.querySelector('.deep-a')).not.toBeNull();

    vdomRenderer(root, wrapDeep(altChild));
    expect(root.querySelector('.deep-b')).not.toBeNull();
    expect(deepChild.props!.attrs!.class).toBe('deep-a'); // must survive

    vdomRenderer(root, wrapDeep(deepChild));
    expect(root.querySelector('.deep-a')).not.toBeNull();
    expect(root.querySelector('.deep-b')).toBeNull();
  });
});
