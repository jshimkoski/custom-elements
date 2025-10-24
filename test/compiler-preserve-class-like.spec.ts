import { describe, it, expect, beforeEach } from 'vitest';
import { component } from '../src/lib/runtime/component';
import { html } from '../src/lib/runtime/template-compiler';

describe('compiler: preserve class-like attributes for custom elements', () => {
  beforeEach(() => {
    // noop
  });

  it('preserves class and class-like attributes on host element', async () => {
    component('preserve-test', () => {
      return html`<div>
        <child-el
          class="foo bar"
          activeClass="bg-red-500"
          custom-class="baz"
        ></child-el>
      </div>`;
    });

    // Register a minimal child component to ensure the compiler path for custom elements is exercised
    component('child-el', () => {
      return html`<span>child</span>`;
    });

    const el = document.createElement('preserve-test');
    document.body.appendChild(el);

    await new Promise((r) => setTimeout(r, 20));

    expect(el.shadowRoot).toBeTruthy();
    const host = el.shadowRoot!.querySelector('child-el');
    // The host child's serialized attributes should include the class-like attributes
    expect(host).toBeTruthy();
    // Use getAttribute to avoid depending on HTML serialization casing
    const classAttr = host!.getAttribute('class');
    const activeAttr =
      host!.getAttribute('activeClass') || host!.getAttribute('activeclass');
    const customKebab = host!.getAttribute('custom-class');
    const customProp = (host as any).customClass;
    expect(classAttr).toBeTruthy();
    expect(classAttr).toContain('foo');
    expect(activeAttr).toBe('bg-red-500');
    // Accept either kebab-case attribute or promoted camelCase property
    const customVal =
      customKebab ?? (typeof customProp === 'string' ? customProp : null);
    expect(customVal).toBe('baz');

    document.body.removeChild(el);
  });
});
