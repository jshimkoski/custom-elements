import { test, expect } from 'vitest';
import { vdomRenderer } from '../src/lib/runtime/vdom';
import { ref } from '../src/lib/runtime/reactive';
import type { VNode, VDomRefs } from '../src/lib/runtime/types';

function vnode(tag: any, children: any, key: any, props: any): VNode {
  return { tag, children, key, props };
}

test('ref directive with reactive state objects', () => {
  const root = document.createElement('div').attachShadow({ mode: 'open' });
  const refs: VDomRefs = {};
  const elementRef = ref<HTMLElement | null>(null);

  // Create a VNode with a reactive ref
  const tree = vnode(
    'div',
    [
      vnode('button', 'Click me', undefined, {
        attrs: { id: 'test-button' },
        reactiveRef: elementRef,
      }),
    ],
    undefined,
    undefined,
  );

  vdomRenderer(root, tree, {}, refs);

  // The reactive ref should be assigned
  expect(elementRef.value).toBeTruthy();
  expect(elementRef.value!.tagName).toBe('BUTTON');
  expect(elementRef.value!.id).toBe('test-button');
});

test('ref directive with string refs (legacy)', () => {
  const root = document.createElement('div').attachShadow({ mode: 'open' });
  const refs: VDomRefs = {};

  // Create a VNode with a string ref
  const tree = vnode(
    'div',
    [
      vnode('button', 'Click me', undefined, {
        attrs: { id: 'test-button' },
        ref: 'testButton',
      }),
    ],
    undefined,
    undefined,
  );

  vdomRenderer(root, tree, {}, refs);

  // The string ref should be assigned to refs object
  expect(refs.testButton).toBeTruthy();
  expect(refs.testButton!.tagName).toBe('BUTTON');
  expect(refs.testButton!.id).toBe('test-button');
});

test('ref directive with nested props', () => {
  const root = document.createElement('div').attachShadow({ mode: 'open' });
  const refs: VDomRefs = {};
  const elementRef = ref<HTMLElement | null>(null);

  // Create a VNode with ref in nested props (from template compiler)
  const tree = vnode(
    'div',
    [
      vnode('button', 'Click me', undefined, {
        props: {
          reactiveRef: elementRef,
        },
        attrs: { id: 'test-button' },
      }),
    ],
    undefined,
    undefined,
  );

  vdomRenderer(root, tree, {}, refs);

  // The reactive ref should be assigned
  expect(elementRef.value).toBeTruthy();
  expect(elementRef.value!.tagName).toBe('BUTTON');
  expect(elementRef.value!.id).toBe('test-button');
});

test('ref directive mixed reactive and string refs', () => {
  const root = document.createElement('div').attachShadow({ mode: 'open' });
  const refs: VDomRefs = {};
  const elementRef = ref<HTMLElement | null>(null);

  // Create a VNode tree with both reactive and string refs
  const tree = vnode(
    'div',
    [
      vnode('button', 'Reactive Ref', undefined, {
        attrs: { id: 'reactive-button' },
        reactiveRef: elementRef,
      }),
      vnode('span', 'String Ref', undefined, {
        attrs: { id: 'string-span' },
        ref: 'stringRef',
      }),
    ],
    undefined,
    undefined,
  );

  vdomRenderer(root, tree, {}, refs);

  // Both refs should be assigned correctly
  expect(elementRef.value).toBeTruthy();
  expect(elementRef.value!.tagName).toBe('BUTTON');
  expect(elementRef.value!.id).toBe('reactive-button');

  expect(refs.stringRef).toBeTruthy();
  expect(refs.stringRef!.tagName).toBe('SPAN');
  expect(refs.stringRef!.id).toBe('string-span');
});

test('ref directive reactivity during updates', () => {
  const root = document.createElement('div').attachShadow({ mode: 'open' });
  const refs: VDomRefs = {};
  const elementRef = ref<HTMLElement | null>(null);

  // Initial render with ref
  const tree1 = vnode(
    'div',
    [
      vnode('button', 'First Button', undefined, {
        attrs: { id: 'first-button' },
        reactiveRef: elementRef,
      }),
    ],
    undefined,
    undefined,
  );

  vdomRenderer(root, tree1, {}, refs);

  // Check initial ref assignment
  expect(elementRef.value).toBeTruthy();
  expect(elementRef.value!.id).toBe('first-button');
  const firstElement = elementRef.value;

  // Update with new element
  const tree2 = vnode(
    'div',
    [
      vnode('span', 'New Span', undefined, {
        attrs: { id: 'new-span' },
        reactiveRef: elementRef,
      }),
    ],
    undefined,
    undefined,
  );

  vdomRenderer(root, tree2, {}, refs);

  // Ref should now point to the new element
  expect(elementRef.value).toBeTruthy();
  expect(elementRef.value!.tagName).toBe('SPAN');
  expect(elementRef.value!.id).toBe('new-span');
  expect(elementRef.value).not.toBe(firstElement);
});
