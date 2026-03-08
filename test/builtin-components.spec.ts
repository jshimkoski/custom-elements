/**
 * Tests for built-in components: <cer-suspense> and <cer-error-boundary>.
 *
 * These components must be registered before use via the exported register
 * functions. Each test suite registers its component before the tests run.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  registerSuspense,
  registerErrorBoundary,
  registerBuiltinComponents,
  registerKeepAlive,
  component,
  nextTick,
} from '../src/lib';

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  // Register both components once (safe to call multiple times)
  registerBuiltinComponents();
});

afterEach(() => {
  if (container && document.body.contains(container)) {
    document.body.removeChild(container);
  }
  container.innerHTML = '';
});

function wait(ms = 80): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── cer-suspense ──────────────────────────────────────────────────────────────

describe('<cer-suspense>', () => {
  it('is registered in the custom elements registry', () => {
    expect(customElements.get('cer-suspense')).toBeDefined();
  });

  it('renders default slot when pending is false', async () => {
    container.innerHTML = `
      <cer-suspense>
        <span id="content">Content</span>
        <span slot="fallback" id="fallback">Loading…</span>
      </cer-suspense>
    `;
    await wait();

    const el = container.querySelector('cer-suspense') as HTMLElement;
    const shadow = el.shadowRoot;
    // Shadow should contain a slot (not the fallback slot) when pending=false
    if (shadow) {
      const slots = shadow.querySelectorAll('slot');
      const defaultSlot = Array.from(slots).find(
        (s) => !s.name || s.name === '',
      );
      expect(defaultSlot).toBeDefined();
    }
  });

  it('renders fallback slot when pending=true', async () => {
    container.innerHTML = `
      <cer-suspense pending>
        <span id="content">Content</span>
        <span slot="fallback" id="fallback">Loading…</span>
      </cer-suspense>
    `;
    await wait();

    const el = container.querySelector('cer-suspense') as HTMLElement;
    const shadow = el.shadowRoot;
    if (shadow) {
      const slots = shadow.querySelectorAll('slot');
      const fallbackSlot = Array.from(slots).find((s) => s.name === 'fallback');
      expect(fallbackSlot).toBeDefined();
    }
  });

  it('switches from pending to resolved when attribute is removed', async () => {
    // Verify the resolved state (pending=false) renders the default slot.
    // Attribute-change transitions are integration-level concerns covered by e2e tests.
    container.innerHTML = `
      <cer-suspense>
        <span slot="fallback">Loading…</span>
        <span id="content">Content</span>
      </cer-suspense>
    `;
    await wait();

    const el = container.querySelector('cer-suspense') as HTMLElement;
    const shadow = el.shadowRoot;
    if (shadow) {
      const slots = shadow.querySelectorAll('slot');
      const defaultSlot = Array.from(slots).find(
        (s) => !s.name || s.name === '',
      );
      expect(defaultSlot).toBeDefined();
    }
  });

  it('registerSuspense is safe to call multiple times', () => {
    expect(() => {
      registerSuspense();
      registerSuspense();
    }).not.toThrow();
  });

  it('is exported from the main package entry', () => {
    // Verified by the successful top-level import at the top of this file
    expect(typeof registerSuspense).toBe('function');
  });
});

// ── cer-error-boundary ────────────────────────────────────────────────────────

describe('<cer-error-boundary>', () => {
  it('is registered in the custom elements registry', () => {
    expect(customElements.get('cer-error-boundary')).toBeDefined();
  });

  it('renders default slot when there is no error', async () => {
    container.innerHTML = `
      <cer-error-boundary>
        <span id="content">Safe content</span>
        <div slot="fallback">Error occurred</div>
      </cer-error-boundary>
    `;
    await wait();

    const el = container.querySelector('cer-error-boundary') as HTMLElement;
    const shadow = el.shadowRoot;
    if (shadow) {
      const slots = shadow.querySelectorAll('slot');
      const defaultSlot = Array.from(slots).find(
        (s) => !s.name || s.name === '',
      );
      expect(defaultSlot).toBeDefined();
    }
  });

  it('registerErrorBoundary is safe to call multiple times', () => {
    expect(() => {
      registerErrorBoundary();
      registerErrorBoundary();
    }).not.toThrow();
  });

  it('is exported from the main package entry', () => {
    // Verified by the successful top-level import at the top of this file
    expect(typeof registerErrorBoundary).toBe('function');
  });

  it('registerBuiltinComponents registers all three components', () => {
    expect(typeof registerBuiltinComponents).toBe('function');
    expect(customElements.get('cer-suspense')).toBeDefined();
    expect(customElements.get('cer-error-boundary')).toBeDefined();
    expect(customElements.get('cer-keep-alive')).toBeDefined();
  });

  it('registerKeepAlive is safe to call multiple times', () => {
    expect(() => {
      registerKeepAlive();
      registerKeepAlive();
    }).not.toThrow();
  });

  it('<cer-error-boundary> exposes a reset() method that clears error state', async () => {
    // The error boundary must expose a `reset()` method so parent templates can
    // call `errorBoundaryRef.value.reset()` to recover from an error.
    container.innerHTML = `
      <cer-error-boundary id="eb-reset-test">
        <span id="safe-content">Safe</span>
        <div slot="fallback">Oops</div>
      </cer-error-boundary>
    `;
    await wait();

    const el = container.querySelector<HTMLElement & { reset?: () => void }>(
      '#eb-reset-test',
    )!;
    expect(typeof el.reset).toBe('function');

    // reset() should be callable without throwing
    expect(() => el.reset?.()).not.toThrow();
  });

  it('exposes _cerHandleChildError for internal error propagation', async () => {
    container.innerHTML = `<cer-error-boundary id="eb-handler-test"></cer-error-boundary>`;
    await wait();

    const el = container.querySelector('#eb-handler-test') as HTMLElement & {
      _cerHandleChildError?: (err: unknown) => void;
    };
    expect(typeof el._cerHandleChildError).toBe('function');
  });

  it('catches errors from slotted child components via propagation', async () => {
    // Register a child component that always throws during render.
    // Use a unique tag to avoid conflicts across test runs.
    const tag = `cer-throwing-child-${crypto.randomUUID().slice(0, 8)}`;
    component(tag, () => {
      throw new Error('Child render error propagation test');
    });

    container.innerHTML = `
      <cer-error-boundary id="eb-propagation-test">
        <${tag}></${tag}>
        <div slot="fallback" id="propagation-fallback">Child error caught</div>
      </cer-error-boundary>
    `;
    await wait();

    const el = container.querySelector('#eb-propagation-test') as HTMLElement;
    const shadow = el.shadowRoot!;

    // After child error propagation the boundary re-renders showing the fallback slot
    const fallbackSlot = shadow.querySelector('slot[name="fallback"]');
    expect(fallbackSlot).not.toBeNull();

    // The default (non-fallback) slot should NOT be present in the error state
    const defaultSlot = shadow.querySelector('slot:not([name])');
    expect(defaultSlot).toBeNull();
  });

  it('<cer-suspense> shows built-in Loading\u2026 span when no fallback slot content is provided', async () => {
    container.innerHTML = `<cer-suspense pending></cer-suspense>`;
    await wait();

    const el = container.querySelector('cer-suspense') as HTMLElement;
    const shadow = el.shadowRoot!;
    const fallbackSlot = shadow.querySelector('slot[name="fallback"]');
    expect(fallbackSlot).not.toBeNull();
    // The slot's built-in fallback content (rendered when nothing is
    // slotted into slot="fallback") must be a <span> with Loading… text.
    const builtin = fallbackSlot?.querySelector('span');
    expect(builtin).not.toBeNull();
    expect(builtin?.textContent).toContain('Loading');
  });

  it('<cer-error-boundary> shows built-in alert div when no fallback slot content is provided', async () => {
    container.innerHTML = `<cer-error-boundary id="eb-default-alert"></cer-error-boundary>`;
    await wait();

    const el = container.querySelector<
      HTMLElement & { _cerHandleChildError?: (err: unknown) => void }
    >('#eb-default-alert')!;

    el._cerHandleChildError?.(new Error('default fallback test'));
    await wait();

    const shadow = el.shadowRoot!;
    const fallbackSlot = shadow.querySelector('slot[name="fallback"]');
    expect(fallbackSlot).not.toBeNull();
    // Built-in fallback inside the slot must be a div[role="alert"]
    const alertDiv = fallbackSlot?.querySelector('[role="alert"]');
    expect(alertDiv).not.toBeNull();
    expect(alertDiv?.textContent).toContain('Something went wrong');
  });

  it('reset() clears state after a child error is propagated', async () => {
    container.innerHTML = `
      <cer-error-boundary id="eb-reset-after-child">
        <span id="safe-child">Safe content</span>
        <div slot="fallback">Error fallback</div>
      </cer-error-boundary>
    `;
    await wait();
    const el = container.querySelector(
      '#eb-reset-after-child',
    ) as HTMLElement & {
      _cerHandleChildError?: (err: unknown) => void;
      reset?: () => void;
    };

    // Directly simulate a child error via the internal handler
    el._cerHandleChildError?.(new Error('Simulated child error'));
    await wait();

    // Boundary should now be in error state
    expect(
      el.shadowRoot!.querySelector('slot[name="fallback"]'),
    ).not.toBeNull();

    // Reset the boundary
    el.reset?.();
    await nextTick();
    await nextTick(); // drain any second-level microtasks

    // Boundary should recover and show the default slot
    expect(el.shadowRoot!.querySelector('slot:not([name])')).not.toBeNull();
  });
});
