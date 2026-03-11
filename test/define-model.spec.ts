import { describe, it, expect, beforeEach } from 'vitest';
import { component, html, ref, defineModel } from '../src/lib/index';
import type { ModelRef } from '../src/lib/index';

/**
 * Shared wait helper — allows the microtask queue and any RAF callbacks to
 * settle before assertions.
 */
const wait = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

describe('defineModel', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  // ---------------------------------------------------------------------------
  // Type / basic API surface
  // ---------------------------------------------------------------------------

  it('returns a ModelRef with a value property', () => {
    let model: ModelRef<string> | undefined;

    component('dm-api-check', () => {
      model = defineModel('');
      return html`<div></div>`;
    });

    const el = document.createElement('dm-api-check');
    document.body.appendChild(el);

    expect(model).toBeDefined();
    expect('value' in model!).toBe(true);
  });

  it('supports named prop variant', () => {
    let titleModel: ModelRef<string> | undefined;

    component('dm-named-api', () => {
      titleModel = defineModel('title', '');
      return html`<div></div>`;
    });

    const el = document.createElement('dm-named-api');
    document.body.appendChild(el);

    expect(titleModel).toBeDefined();
    expect('value' in titleModel!).toBe(true);
  });

  it('supports single-arg form (default value for modelValue prop)', () => {
    let model: ModelRef<string> | undefined;

    component('dm-options-api', () => {
      model = defineModel('from options');
      return html`<div></div>`;
    });

    const el = document.createElement('dm-options-api');
    document.body.appendChild(el);

    expect(model).toBeDefined();
    expect('value' in model!).toBe(true);
  });

  it('reads the default value from single-arg defineModel', async () => {
    component('dm-options-default', () => {
      const model = defineModel('options default');
      return html`<span data-testid="out">${model.value}</span>`;
    });

    const el = document.createElement('dm-options-default');
    document.body.appendChild(el);
    await wait();

    const span = el.shadowRoot?.querySelector('[data-testid="out"]');
    expect(span?.textContent).toBe('options default');
  });

  it('emits update:modelValue when value set after single-arg defineModel', async () => {
    component('dm-options-emit-child', () => {
      const model = defineModel('');
      return html`
        <button
          data-testid="trigger"
          @click="${() => (model.value = 'options child')}"
        ></button>
      `;
    });

    component('dm-options-emit-parent', () => {
      const text = ref('initial');
      return html`
        <dm-options-emit-child
          :model="${text}"
          data-testid="child"
        ></dm-options-emit-child>
        <span data-testid="display">${text.value}</span>
      `;
    });

    const parent = document.createElement('dm-options-emit-parent');
    document.body.appendChild(parent);
    await wait();

    const child = parent.shadowRoot?.querySelector(
      'dm-options-emit-child',
    ) as HTMLElement;
    const display = parent.shadowRoot?.querySelector('[data-testid="display"]');
    expect(display?.textContent).toBe('initial');

    const btn = child.shadowRoot?.querySelector(
      '[data-testid="trigger"]',
    ) as HTMLButtonElement;
    btn.click();
    await wait();

    expect(display?.textContent).toBe('options child');
  });

  // ---------------------------------------------------------------------------
  // Default value and prop registration
  // ---------------------------------------------------------------------------

  it('reads the default value when no prop is supplied', async () => {
    component('dm-default-value', () => {
      const model = defineModel('hello');
      return html`<span data-testid="out">${model.value}</span>`;
    });

    const el = document.createElement('dm-default-value');
    document.body.appendChild(el);
    await wait();

    const span = el.shadowRoot?.querySelector('[data-testid="out"]');
    expect(span?.textContent).toBe('hello');
  });

  it('reads a named model default value', async () => {
    component('dm-named-default', () => {
      const count = defineModel('count', 42);
      return html`<span data-testid="out">${count.value}</span>`;
    });

    const el = document.createElement('dm-named-default');
    document.body.appendChild(el);
    await wait();

    const span = el.shadowRoot?.querySelector('[data-testid="out"]');
    expect(span?.textContent).toBe('42');
  });

  // ---------------------------------------------------------------------------
  // Two-way binding: parent :model → child reads prop
  // ---------------------------------------------------------------------------

  it('receives the parent-bound reactive value via :model', async () => {
    component('dm-child-input', () => {
      const model = defineModel('');
      return html`<span data-testid="val">${model.value}</span>`;
    });

    component('dm-parent-model', () => {
      const text = ref('parent value');
      return html`
        <dm-child-input :model="${text}" data-testid="child"></dm-child-input>
        <button
          data-testid="update"
          @click="${() => (text.value = 'updated')}"
        ></button>
      `;
    });

    const parent = document.createElement('dm-parent-model');
    document.body.appendChild(parent);
    await wait();

    const child = parent.shadowRoot?.querySelector(
      'dm-child-input',
    ) as HTMLElement;
    expect(child).toBeTruthy();

    const span = child.shadowRoot?.querySelector('[data-testid="val"]');
    expect(span?.textContent).toBe('parent value');

    // Trigger value update in parent
    const btn = parent.shadowRoot?.querySelector(
      '[data-testid="update"]',
    ) as HTMLButtonElement;
    btn.click();
    await wait();

    expect(span?.textContent).toBe('updated');
  });

  // ---------------------------------------------------------------------------
  // Two-way binding: child emits update:modelValue → parent state updates
  // ---------------------------------------------------------------------------

  it('emits update:modelValue when value is set by the child', async () => {
    component('dm-emit-child', () => {
      const model = defineModel('');
      return html`
        <button
          data-testid="trigger"
          @click="${() => (model.value = 'from child')}"
        ></button>
      `;
    });

    component('dm-emit-parent', () => {
      const text = ref('initial');
      return html`
        <dm-emit-child :model="${text}" data-testid="child"></dm-emit-child>
        <span data-testid="display">${text.value}</span>
      `;
    });

    const parent = document.createElement('dm-emit-parent');
    document.body.appendChild(parent);
    await wait();

    const child = parent.shadowRoot?.querySelector(
      'dm-emit-child',
    ) as HTMLElement;
    const display = parent.shadowRoot?.querySelector('[data-testid="display"]');
    expect(display?.textContent).toBe('initial');

    const btn = child.shadowRoot?.querySelector(
      '[data-testid="trigger"]',
    ) as HTMLButtonElement;
    btn.click();
    await wait();

    expect(display?.textContent).toBe('from child');
  });

  // ---------------------------------------------------------------------------
  // Named model two-way binding
  // ---------------------------------------------------------------------------

  it('receives named model value via :model:propName', async () => {
    component('dm-named-child', () => {
      const title = defineModel('title', '');
      return html`<span data-testid="val">${title.value}</span>`;
    });

    component('dm-named-parent', () => {
      const heading = ref('My Title');
      return html`
        <dm-named-child
          :model:title="${heading}"
          data-testid="child"
        ></dm-named-child>
      `;
    });

    const parent = document.createElement('dm-named-parent');
    document.body.appendChild(parent);
    await wait();

    const child = parent.shadowRoot?.querySelector(
      'dm-named-child',
    ) as HTMLElement;
    const span = child.shadowRoot?.querySelector('[data-testid="val"]');
    expect(span?.textContent).toBe('My Title');
  });

  it('emits update:propName for named models when value is set', async () => {
    component('dm-named-emit-child', () => {
      const title = defineModel('title', '');
      return html`
        <button
          data-testid="btn"
          @click="${() => (title.value = 'changed')}"
        ></button>
      `;
    });

    component('dm-named-emit-parent', () => {
      const heading = ref('original');
      return html`
        <dm-named-emit-child
          :model:title="${heading}"
          data-testid="child"
        ></dm-named-emit-child>
        <span data-testid="display">${heading.value}</span>
      `;
    });

    const parent = document.createElement('dm-named-emit-parent');
    document.body.appendChild(parent);
    await wait();

    const child = parent.shadowRoot?.querySelector(
      'dm-named-emit-child',
    ) as HTMLElement;
    const display = parent.shadowRoot?.querySelector('[data-testid="display"]');
    expect(display?.textContent).toBe('original');

    const btn = child.shadowRoot?.querySelector(
      '[data-testid="btn"]',
    ) as HTMLButtonElement;
    btn.click();
    await wait();

    expect(display?.textContent).toBe('changed');
  });

  // ---------------------------------------------------------------------------
  // Works with native inputs via :model inside child template
  // ---------------------------------------------------------------------------

  it('passes model ref to a native input via :model inside child template', async () => {
    component('dm-native-child', () => {
      const model = defineModel('');
      return html`
        <input data-testid="input" :model="${model}" />
        <span data-testid="mirror">${model.value}</span>
      `;
    });

    component('dm-native-parent', () => {
      const text = ref('');
      return html`
        <dm-native-child :model="${text}" data-testid="child"></dm-native-child>
        <span data-testid="parent-display">${text.value}</span>
      `;
    });

    const parent = document.createElement('dm-native-parent');
    document.body.appendChild(parent);
    await wait();

    const child = parent.shadowRoot?.querySelector(
      'dm-native-child',
    ) as HTMLElement;
    const input = child.shadowRoot?.querySelector(
      '[data-testid="input"]',
    ) as HTMLInputElement;
    const parentDisplay = parent.shadowRoot?.querySelector(
      '[data-testid="parent-display"]',
    );

    expect(input).toBeTruthy();

    // Simulate user typing
    input.value = 'typed';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await wait();

    // Parent reactive state should be updated via the update:modelValue chain
    expect(parentDisplay?.textContent).toBe('typed');
  });

  // ---------------------------------------------------------------------------
  // Multiple models on the same component
  // ---------------------------------------------------------------------------

  it('supports multiple named models on a single component', async () => {
    component('dm-multi-child', () => {
      const first = defineModel('first', '');
      const last = defineModel('last', '');
      return html`
        <span data-testid="full">${first.value} ${last.value}</span>
      `;
    });

    component('dm-multi-parent', () => {
      const firstName = ref('John');
      const lastName = ref('Doe');
      return html`
        <dm-multi-child
          :model:first="${firstName}"
          :model:last="${lastName}"
          data-testid="child"
        ></dm-multi-child>
      `;
    });

    const parent = document.createElement('dm-multi-parent');
    document.body.appendChild(parent);
    await wait();

    const child = parent.shadowRoot?.querySelector(
      'dm-multi-child',
    ) as HTMLElement;
    const span = child.shadowRoot?.querySelector('[data-testid="full"]');
    expect(span?.textContent?.trim()).toBe('John Doe');
  });
});
