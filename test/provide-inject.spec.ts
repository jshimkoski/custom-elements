import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { component, html, provide, inject } from '../src/lib';

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

describe('🏝️ provide() / inject()', () => {
  it('throws when provide() is called outside render', () => {
    expect(() => {
      provide('key', 'value');
    }).toThrow('provide must be called during component render');
  });

  it('throws when inject() is called outside render', () => {
    expect(() => {
      inject('key');
    }).toThrow('inject must be called during component render');
  });

  it('returns default value when no provider exists in ancestor chain', async () => {
    let received: string | undefined;

    component('pi-consumer-default', () => {
      received = inject<string>('no-provider-key', 'fallback');
      return html`<div>${received}</div>`;
    });

    container.innerHTML = '<pi-consumer-default></pi-consumer-default>';
    await new Promise((r) => setTimeout(r, 50));

    expect(received).toBe('fallback');
  });

  it('returns undefined when no provider and no default value given', async () => {
    let received: unknown = 'sentinel';

    component('pi-no-default', () => {
      received = inject('unknown-key-xyz');
      return html`<div>no default</div>`;
    });

    container.innerHTML = '<pi-no-default></pi-no-default>';
    await new Promise((r) => setTimeout(r, 50));

    expect(received).toBeUndefined();
  });

  it('provide() does not throw when called inside render', async () => {
    component('pi-provider-only', () => {
      // Should not throw — valid to call provide during render
      expect(() => provide('test-key', 'test-value')).not.toThrow();
      return html`<div>provider</div>`;
    });

    container.innerHTML = '<pi-provider-only></pi-provider-only>';
    await new Promise((r) => setTimeout(r, 50));

    const el = container.querySelector('pi-provider-only');
    expect(el).toBeTruthy();
  });

  it('supports string keys with provide()', async () => {
    const storedValue: unknown[] = [];

    component('pi-str-key', () => {
      provide('greeting', 'Hello World');
      storedValue.push('provided');
      return html`<div>str key</div>`;
    });

    container.innerHTML = '<pi-str-key></pi-str-key>';
    await new Promise((r) => setTimeout(r, 50));

    expect(storedValue).toContain('provided');
  });

  it('supports symbol keys with provide()', async () => {
    const TOKEN = Symbol.for('test-pi-token');
    const storedValue: unknown[] = [];

    component('pi-sym-key', () => {
      provide(TOKEN, 42);
      storedValue.push('provided');
      return html`<div>sym key</div>`;
    });

    container.innerHTML = '<pi-sym-key></pi-sym-key>';
    await new Promise((r) => setTimeout(r, 50));

    expect(storedValue).toContain('provided');
  });

  it('inject() with symbol keys returns fallback when traversal finds no provider', async () => {
    const someToken = Symbol.for('test-pi-inject-fallback-sym');
    let received: number | undefined;

    component('pi-inject-sym-fallback', () => {
      received = inject<number>(someToken, 99);
      return html`<div>sym inject fallback</div>`;
    });

    container.innerHTML = '<pi-inject-sym-fallback></pi-inject-sym-fallback>';
    await new Promise((r) => setTimeout(r, 50));

    expect(received).toBe(99);
  });

  it('inject() finds provided value through light-DOM ancestor chain', async () => {
    // Provider is a light-DOM parent of consumer (slotted pattern).
    // inject() must traverse up through regular element ancestors, not just
    // ShadowRoot boundaries, to find the provided value.
    let received: string | undefined = 'not-set';

    component('pi-provider-ld', () => {
      provide('ld-theme', 'dark');
      return html`<slot></slot>`;
    });

    component('pi-consumer-ld', () => {
      received = inject<string>('ld-theme', 'light');
      return html`<div class="result">${received}</div>`;
    });

    container.innerHTML = `
      <pi-provider-ld>
        <pi-consumer-ld></pi-consumer-ld>
      </pi-provider-ld>
    `;
    await new Promise((r) => setTimeout(r, 80));

    expect(received).toBe('dark');
  });

  it('inject() returns default when provider exists but key is different', async () => {
    let received: string | undefined = 'not-set';

    component('pi-provider-other-key', () => {
      provide('ld-other-key', 'something');
      return html`<slot></slot>`;
    });

    component('pi-consumer-wrong-key', () => {
      received = inject<string>('ld-different-key', 'fallback');
      return html`<div>${received}</div>`;
    });

    container.innerHTML = `
      <pi-provider-other-key>
        <pi-consumer-wrong-key></pi-consumer-wrong-key>
      </pi-provider-other-key>
    `;
    await new Promise((r) => setTimeout(r, 80));

    expect(received).toBe('fallback');
  });
});
