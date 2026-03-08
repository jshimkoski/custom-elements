/**
 * Tests for the useExpose() hook.
 *
 * useExpose() allows a component to publish a public API (methods + properties)
 * onto its host element so parent components can access them via a template ref.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { component, html, ref, useExpose, useProps } from '../src/lib';

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  if (container && document.body.contains(container)) {
    document.body.removeChild(container);
  }
});

function wait(ms = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('useExpose()', () => {
  it('exposes a method on the host element', async () => {
    let timesIncremented = 0;

    component('expose-counter', () => {
      const count = ref(0);

      useExpose({
        increment() {
          count.value++;
          timesIncremented++;
        },
        get count() {
          return count.value;
        },
      });

      return html`<span>${count.value}</span>`;
    });

    container.innerHTML = '<expose-counter></expose-counter>';
    await wait();

    const el = container.querySelector('expose-counter') as HTMLElement & {
      increment: () => void;
      count: number;
    };

    expect(typeof el.increment).toBe('function');
    el.increment();
    expect(timesIncremented).toBe(1);
  });

  it('exposes a property getter on the host element', async () => {
    component('expose-value', () => {
      const value = ref(42);

      useExpose({
        get value() {
          return value.value;
        },
      });

      return html`<div>${value.value}</div>`;
    });

    container.innerHTML = '<expose-value></expose-value>';
    await wait();

    const el = container.querySelector('expose-value') as HTMLElement & {
      value: number;
    };

    expect(el.value).toBe(42);
  });

  it('exposes multiple values at once', async () => {
    component('expose-multi', () => {
      useExpose({
        foo: 'bar',
        answer: 42,
        greet: (name: string) => `Hello, ${name}!`,
      });

      return html`<div>multi</div>`;
    });

    container.innerHTML = '<expose-multi></expose-multi>';
    await wait();

    const el = container.querySelector('expose-multi') as HTMLElement &
      Record<string, unknown>;

    expect(el['foo']).toBe('bar');
    expect(el['answer']).toBe(42);
    expect(typeof el['greet']).toBe('function');
    expect((el['greet'] as (n: string) => string)('World')).toBe(
      'Hello, World!',
    );
  });

  it('throws when called outside render context', () => {
    expect(() => {
      useExpose({ foo: 'bar' });
    }).toThrow('useExpose must be called during component render');
  });

  it('expose works alongside useProps', async () => {
    component('expose-with-props', () => {
      const { label } = useProps({ label: 'default' });

      useExpose({
        getLabel: () => label,
      });

      return html`<span>${label}</span>`;
    });

    container.innerHTML =
      '<expose-with-props label="hello"></expose-with-props>';
    await wait();

    const el = container.querySelector('expose-with-props') as HTMLElement & {
      getLabel: () => string;
    };

    expect(typeof el.getLabel).toBe('function');
  });

  it('useExpose is exported from the main package entry', () => {
    // Verified by the successful top-level import at the top of this file
    expect(typeof useExpose).toBe('function');
  });
});
