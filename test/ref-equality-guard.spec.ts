/**
 * Tests for the ReactiveState equality guard:
 * setting .value to the same raw value must NOT schedule a re-render.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, computed } from '../src/lib/runtime/reactive';
import { component, html } from '../src/lib';
import { flushDOMUpdates } from '../src/lib/runtime/scheduler';

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  document.body.removeChild(container);
});

describe('🔒 ref() equality guard', () => {
  it('does not trigger re-render when setting the same primitive value', async () => {
    const count = ref(42);
    let renders = 0;

    component('test-eq-guard-same-prim', () => {
      renders++;
      return html`<span>${count.value}</span>`;
    });

    container.innerHTML = '<test-eq-guard-same-prim></test-eq-guard-same-prim>';
    await new Promise((r) => setTimeout(r, 50));
    const after = renders;

    // Setting the same value must be a no-op
    count.value = 42;
    flushDOMUpdates();
    await new Promise((r) => setTimeout(r, 50));

    expect(renders).toBe(after);
  });

  it('triggers re-render when setting a different primitive value', async () => {
    const count = ref(1);
    let renders = 0;

    component('test-eq-guard-diff-prim', () => {
      renders++;
      return html`<span>${count.value}</span>`;
    });

    container.innerHTML = '<test-eq-guard-diff-prim></test-eq-guard-diff-prim>';
    await new Promise((r) => setTimeout(r, 50));
    const after = renders;

    count.value = 2;
    flushDOMUpdates();
    await new Promise((r) => setTimeout(r, 50));

    expect(renders).toBeGreaterThan(after);
  });

  it('does not trigger re-render when assigning the same object reference', async () => {
    const obj = { x: 1 };
    const state = ref(obj);
    let renders = 0;

    component('test-eq-guard-same-obj', () => {
      renders++;
      return html`<span>${state.value.x}</span>`;
    });

    container.innerHTML = '<test-eq-guard-same-obj></test-eq-guard-same-obj>';
    await new Promise((r) => setTimeout(r, 50));
    const after = renders;

    // Re-assigning the exact same object reference must be a no-op
    state.value = obj;
    flushDOMUpdates();
    await new Promise((r) => setTimeout(r, 50));

    expect(renders).toBe(after);
  });

  it('triggers re-render when assigning a new object reference', async () => {
    const state = ref({ x: 1 });
    let renders = 0;

    component('test-eq-guard-new-obj', () => {
      renders++;
      return html`<span>${state.value.x}</span>`;
    });

    container.innerHTML = '<test-eq-guard-new-obj></test-eq-guard-new-obj>';
    await new Promise((r) => setTimeout(r, 50));
    const after = renders;

    state.value = { x: 1 }; // structurally equal but different reference
    flushDOMUpdates();
    await new Promise((r) => setTimeout(r, 50));

    expect(renders).toBeGreaterThan(after);
  });

  it('returns the correct value after a same-value set', () => {
    const x = ref('hello');
    x.value = 'hello'; // no-op
    expect(x.value).toBe('hello');
  });

  it('handles NaN equality correctly (Object.is(NaN,NaN) === true)', () => {
    const calls = vi.fn();
    const x = ref(NaN);

    // Read once to establish value
    expect(isNaN(x.value)).toBe(true);

    // NaN === NaN is false in JS but Object.is(NaN, NaN) is true, so setting
    // NaN again must NOT fire an update.
    // We verify via a computed that tracks x: its fn should NOT be re-run.
    let fnCalls = 0;
    const derived = computed(() => {
      fnCalls++;
      return isNaN(x.value) ? 0 : 1;
    });
    void derived.value; // establish dep
    const before = fnCalls;

    x.value = NaN; // same NaN — must be a no-op
    void derived.value; // if dirty it would re-run fn
    expect(fnCalls).toBe(before);
    void calls;
  });

  it('does not trigger when setting boolean ref to the same value', () => {
    let updateCount = 0;
    const flag = ref(true);
    // Track via a watcher-style computed
    const derived = computed(() => {
      updateCount++;
      return flag.value;
    });
    void derived.value; // seed
    const before = updateCount;

    flag.value = true; // same value — no-op
    void derived.value;
    expect(updateCount).toBe(before);
  });
});
