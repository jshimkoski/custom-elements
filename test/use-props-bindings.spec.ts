import { describe, it, expect, beforeEach } from 'vitest';

// Import component which calls useProps in its render
import '../src/components/test-props';

describe('useProps bindings (integration)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('honors plain :prop (modelValue) when set as host property', async () => {
    const comp = document.createElement('ce-test-props') as any;
    // Simulate :model (plain) by setting modelValue on host before connect
    comp.modelValue = 'from-host';
    document.body.appendChild(comp);
    await Promise.resolve();

    const span = comp.shadowRoot?.querySelector('.value') as HTMLElement | null;
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe('from-host');
  });

  it('honors :model:prop when nested host object is provided', async () => {
    const comp = document.createElement('ce-test-props') as any;
    // Simulate :model:count / :prop: compilers initialize the host element
    // by setting the specific prop (e.g. `count`) directly on the element.
    comp.count = 42;
    document.body.appendChild(comp);
    await Promise.resolve();

    const count = comp.shadowRoot?.querySelector('.count') as HTMLElement | null;
    expect(count).not.toBeNull();
    expect(count?.textContent).toBe('42');
  });

  it('honors attribute-based prop (model-value) when provided as attribute', async () => {
    const comp = document.createElement('ce-test-props') as HTMLElement;
    comp.setAttribute('model-value', 'attr-default');
    document.body.appendChild(comp);
    await Promise.resolve();

    const span = comp.shadowRoot?.querySelector('.value') as HTMLElement | null;
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe('attr-default');
  });

  it('falls back to internal defaults when no binding provided', async () => {
    const comp = document.createElement('ce-test-props') as HTMLElement;
    document.body.appendChild(comp);
    await Promise.resolve();

    const span = comp.shadowRoot?.querySelector('.value') as HTMLElement | null;
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe('default');
  });
});
