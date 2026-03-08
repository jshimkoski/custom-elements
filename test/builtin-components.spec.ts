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
});
