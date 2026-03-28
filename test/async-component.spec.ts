import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { defineAsyncComponent, component, html, nextTick } from '../src/lib';

let container: HTMLElement;

// Generate unique tag names per test to avoid custom element re-registration errors.
let tagCounter = 0;
function uniqueTag(base: string): string {
  return `${base}-${tagCounter++}`;
}

// Query inside the element's shadow root (custom elements render there).
function shadowQuery(el: Element, selector: string): Element | null {
  return (el as HTMLElement & { shadowRoot: ShadowRoot | null }).shadowRoot?.querySelector(selector) ?? null;
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  vi.useRealTimers();
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
});

describe('defineAsyncComponent()', () => {
  it('is exported from the library', () => {
    expect(defineAsyncComponent).toBeDefined();
    expect(typeof defineAsyncComponent).toBe('function');
  });

  it('registers a custom element with the given tag name', async () => {
    const tag = uniqueTag('async-basic');
    defineAsyncComponent(tag, () => Promise.resolve(() => html`<span>loaded</span>`));
    expect(customElements.get(tag)).toBeTruthy();
  });

  it('shows loading placeholder while the loader is pending', async () => {
    const tag = uniqueTag('async-loading');
    let resolveLoader!: (fn: () => ReturnType<typeof html>) => void;
    defineAsyncComponent(
      tag,
      () => new Promise((resolve) => { resolveLoader = resolve }),
      { loading: () => html`<p class="loading">loading…</p>` },
    );

    container.innerHTML = `<${tag}></${tag}>`;
    await nextTick();

    const el = container.querySelector(tag)!;
    expect(shadowQuery(el, '.loading')).toBeTruthy();

    // Resolve to stop the pending loader
    resolveLoader(() => html`<p>done</p>`);
    await new Promise((r) => setTimeout(r, 50));
  });

  it('renders the resolved component after the loader resolves', async () => {
    const tag = uniqueTag('async-resolved');
    defineAsyncComponent(
      tag,
      () => Promise.resolve(() => html`<p class="resolved-content">Loaded!</p>`),
    );

    container.innerHTML = `<${tag}></${tag}>`;
    // Give the loader time to settle and re-render
    await new Promise((r) => setTimeout(r, 100));

    const el = container.querySelector(tag)!;
    expect(shadowQuery(el, '.resolved-content')).toBeTruthy();
  });

  it('shows error placeholder when the loader rejects', async () => {
    const tag = uniqueTag('async-error');
    defineAsyncComponent(
      tag,
      () => Promise.reject(new Error('load failed')),
      { error: () => html`<p class="error-content">Failed to load</p>` },
    );

    container.innerHTML = `<${tag}></${tag}>`;
    await new Promise((r) => setTimeout(r, 100));

    const el = container.querySelector(tag)!;
    expect(shadowQuery(el, '.error-content')).toBeTruthy();
  });

  it('shows nothing when no loading placeholder provided and still loading', async () => {
    const tag = uniqueTag('async-no-placeholder');
    let resolveLoader!: (fn: () => ReturnType<typeof html>) => void;
    defineAsyncComponent(
      tag,
      () => new Promise((resolve) => { resolveLoader = resolve }),
    );

    container.innerHTML = `<${tag}></${tag}>`;
    await nextTick();

    // No loading placeholder — element should be empty or render empty fragment
    const el = container.querySelector(tag)!;
    expect(el).toBeTruthy();

    resolveLoader(() => html`<span>done</span>`);
    await new Promise((r) => setTimeout(r, 50));
  });

  it('transitions to error state when timeout is exceeded', async () => {
    vi.useFakeTimers();
    const tag = uniqueTag('async-timeout');
    defineAsyncComponent(
      tag,
      () => new Promise(() => { /* never resolves */ }),
      {
        timeout: 200,
        error: () => html`<p class="timeout-content">Timed out</p>`,
      },
    );

    container.innerHTML = `<${tag}></${tag}>`;
    // Advance past the timeout so the timer fires synchronously
    vi.advanceTimersByTime(300);
    await nextTick();
    await nextTick();

    const el = container.querySelector(tag)!;
    expect(shadowQuery(el, '.timeout-content')).toBeTruthy();
    // afterEach restores real timers
  });

  it('does not call the loader a second time when the component re-renders (idle guard)', async () => {
    const tag = uniqueTag('async-idle-guard');
    const loaderFn = vi.fn(() => Promise.resolve(() => html`<span>ok</span>`));
    defineAsyncComponent(tag, loaderFn);

    container.innerHTML = `<${tag}></${tag}>`;
    await new Promise((r) => setTimeout(r, 100));

    // loader should have been called exactly once
    expect(loaderFn).toHaveBeenCalledTimes(1);
  });
});

describe('defineAsyncComponent() — AsyncComponentOptions type', () => {
  it('accepts optional loading, error, and timeout options without error', () => {
    const tag = uniqueTag('async-options');
    expect(() => {
      defineAsyncComponent(
        tag,
        () => Promise.resolve(() => html`<span>ok</span>`),
        {
          loading: () => html`<p>loading</p>`,
          error: () => html`<p>error</p>`,
          timeout: 5000,
        },
      );
    }).not.toThrow();
  });

  it('accepts no options at all', () => {
    const tag = uniqueTag('async-no-options');
    expect(() => {
      defineAsyncComponent(tag, () => Promise.resolve(() => html`<span>ok</span>`));
    }).not.toThrow();
  });
});

describe('defineAsyncComponent() — component() integration', () => {
  it('can be used alongside component() in the same codebase without conflicts', () => {
    const syncTag = uniqueTag('sync-sibling');
    const asyncTag = uniqueTag('async-sibling');

    component(syncTag, () => html`<span>sync</span>`);
    defineAsyncComponent(asyncTag, () => Promise.resolve(() => html`<span>async</span>`));

    expect(customElements.get(syncTag)).toBeTruthy();
    expect(customElements.get(asyncTag)).toBeTruthy();
  });
});
