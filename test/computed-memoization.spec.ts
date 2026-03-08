import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { component, html, ref, computed, useProps } from '../src/lib';
import { flushDOMUpdates } from '../src/lib/runtime/scheduler';

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  if (container) {
    document.body.removeChild(container);
  }
});

describe('🧮 computed() memoization', () => {
  it('should return the correct cached value on repeated .value accesses', () => {
    const count = ref(0);
    const doubled = computed(() => count.value * 2);

    const v1 = doubled.value;
    const v2 = doubled.value;
    const v3 = doubled.value;

    expect(v1).toBe(0);
    expect(v2).toBe(0);
    expect(v3).toBe(0);
  });

  it('should re-compute when a tracked reactive dependency changes', () => {
    const x = ref(2);
    const triple = computed(() => x.value * 3);

    expect(triple.value).toBe(6);

    x.value = 5;
    // After dep change, value should be recomputed on next access
    expect(triple.value).toBe(15);
  });

  it('should return stale value when unrelated state changes', () => {
    const a = ref(1);
    const b = ref(10);
    const doubleA = computed(() => a.value * 2);

    expect(doubleA.value).toBe(2);

    // Change b — doubleA does NOT depend on b, value stays the same
    b.value = 99;
    expect(doubleA.value).toBe(2);

    // Change a — value should update
    a.value = 5;
    expect(doubleA.value).toBe(10);
  });

  it('should support chained computed values', () => {
    const base = ref(3);
    const doubled = computed(() => base.value * 2);
    const quadrupled = computed(() => doubled.value * 2);

    expect(quadrupled.value).toBe(12);

    base.value = 5;
    expect(quadrupled.value).toBe(20);
  });

  it('should trigger component re-render when accessed dep changes', async () => {
    const count = ref(0);
    const renders: number[] = [];

    component('test-computed-memo', () => {
      const doubled = computed(() => count.value * 2);
      renders.push(doubled.value);
      return html`<div>${doubled.value}</div>`;
    });

    container.innerHTML = '<test-computed-memo></test-computed-memo>';
    await new Promise((r) => setTimeout(r, 50));

    const before = renders.length;
    count.value = 5;
    flushDOMUpdates();
    await new Promise((r) => setTimeout(r, 50));

    expect(renders.length).toBeGreaterThan(before);
    const el = container.querySelector('test-computed-memo') as HTMLElement;
    expect(el.shadowRoot?.querySelector('div')?.textContent?.trim()).toBe('10');
  });

  it('should compute correctly with useProps inside a component', async () => {
    const computeCalls = vi.fn();

    component('test-computed-props', () => {
      const props = useProps({ value: 1 });
      const doubled = computed(() => {
        computeCalls();
        return (props.value as number) * 2;
      });
      return html`<span>${doubled.value}</span>`;
    });

    container.innerHTML =
      '<test-computed-props value="4"></test-computed-props>';
    await new Promise((r) => setTimeout(r, 50));

    const el = container.querySelector('test-computed-props') as HTMLElement;
    expect(el.shadowRoot?.querySelector('span')?.textContent).toBe('8');
  });
});
