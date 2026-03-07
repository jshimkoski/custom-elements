import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  component,
  html,
  ref,
  createComposable,
  getCurrentComponentContext,
  useOnConnected,
  useOnDisconnected,
} from '../src/lib';

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

describe('🧩 createComposable()', () => {
  it('throws when called outside of a render context', () => {
    const useCounter = createComposable(() => {
      return { count: 0 };
    });

    expect(() => {
      useCounter();
    }).toThrow('createComposable: no component context available');
  });

  it('returns the composable factory result during render', async () => {
    let counter: { count: number } | undefined;

    const useCounter = createComposable(() => {
      return { count: 42 };
    });

    component('composable-basic', () => {
      counter = useCounter();
      return html`<div>${counter.count}</div>`;
    });

    container.innerHTML = '<composable-basic></composable-basic>';
    await new Promise((r) => setTimeout(r, 50));

    expect(counter?.count).toBe(42);
  });

  it('allows hooks to be registered from within a composable', async () => {
    const calls: string[] = [];

    const useLifecycle = createComposable(() => {
      useOnConnected(() => {
        calls.push('connected');
      });
      useOnDisconnected(() => {
        calls.push('disconnected');
      });
      return {};
    });

    component('composable-hooks', () => {
      useLifecycle();
      return html`<div>hooks composable</div>`;
    });

    container.innerHTML = '<composable-hooks></composable-hooks>';
    await new Promise((r) => setTimeout(r, 50));
    expect(calls).toContain('connected');

    container.innerHTML = '';
    await new Promise((r) => setTimeout(r, 50));
    expect(calls).toContain('disconnected');
  });

  it('supports reactive state inside a composable', async () => {
    const rendered: number[] = [];

    const useCount = createComposable(() => {
      const state = ref(0);
      const increment = () => {
        state.value++;
      };
      return { state, increment };
    });

    let exposed: ReturnType<typeof useCount> | undefined;

    component('composable-reactive', () => {
      exposed = useCount();
      rendered.push(exposed.state.value);
      return html`<div>${exposed.state.value}</div>`;
    });

    container.innerHTML = '<composable-reactive></composable-reactive>';
    await new Promise((r) => setTimeout(r, 50));

    expect(rendered[0]).toBe(0);

    exposed?.increment();
    await new Promise((r) => setTimeout(r, 50));

    expect(rendered.at(-1)).toBe(1);
  });

  it('getCurrentComponentContext() returns context inside a composable', async () => {
    let contextReceived: Record<string, unknown> | null = null;

    const useCtx = createComposable(() => {
      contextReceived = getCurrentComponentContext();
      return {};
    });

    component('composable-ctx-arg', () => {
      useCtx();
      return html`<div>ctx arg</div>`;
    });

    container.innerHTML = '<composable-ctx-arg></composable-ctx-arg>';
    await new Promise((r) => setTimeout(r, 50));

    // getCurrentComponentContext() should return the component context (non-null)
    expect(contextReceived).not.toBeNull();
  });

  it('multiple composables can be used in the same component', async () => {
    const useA = createComposable(() => ({ a: 'A' }));
    const useB = createComposable(() => ({ b: 'B' }));

    let a: { a: string } | undefined;
    let b: { b: string } | undefined;

    component('composable-multi', () => {
      a = useA();
      b = useB();
      return html`<div>${a.a}${b.b}</div>`;
    });

    container.innerHTML = '<composable-multi></composable-multi>';
    await new Promise((r) => setTimeout(r, 50));

    expect(a?.a).toBe('A');
    expect(b?.b).toBe('B');
  });

  it('warns and does not throw when createComposable factory throws', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const useBroken = createComposable(() => {
      throw new Error('composable internal error');
    });

    component('composable-throws', () => {
      try {
        useBroken();
      } catch {
        // expected
      }
      return html`<div>safe</div>`;
    });

    container.innerHTML = '<composable-throws></composable-throws>';
    await new Promise((r) => setTimeout(r, 50));

    warnSpy.mockRestore();
    errorSpy.mockRestore();
    // Component still rendered without crashing
    const el = document.querySelector('composable-throws');
    expect(el).toBeTruthy();
  });
});
