import { describe, it, expect, beforeEach } from 'vitest';
import { component, html, ref, defineModel } from '../src/lib/index';
import type { ModelRef } from '../src/lib/index';
import { Transition } from '../src/lib/transitions';

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

  // ---------------------------------------------------------------------------
  // Bug: ref change in parent without direct parent template exposure
  // The child must re-render when the parent ref changes even if the parent
  // template does not reference ${open.value} directly.
  // ---------------------------------------------------------------------------

  it('re-renders child when parent ref changes without being exposed in parent template', async () => {
    let capturedRef: ReturnType<typeof ref<boolean>> | undefined;

    component('dm-visibility-child', () => {
      const model = defineModel(false);
      return html`
        <div data-testid="content">${model.value ? 'visible' : 'hidden'}</div>
      `;
    });

    component('dm-visibility-parent', () => {
      const open = ref(false);
      // Capture ref for external mutation — same ReactiveState per hooks index.
      capturedRef = open;
      // NOTE: no ${open.value} anywhere in the parent template — this is
      // the exact bug scenario: the parent must still re-render so the child
      // receives the updated value.
      return html`
        <dm-visibility-child :model="${open}"></dm-visibility-child>
      `;
    });

    const parent = document.createElement('dm-visibility-parent');
    document.body.appendChild(parent);
    await wait();

    const child = parent.shadowRoot?.querySelector(
      'dm-visibility-child',
    ) as HTMLElement;
    const content = child?.shadowRoot?.querySelector('[data-testid="content"]');
    expect(content?.textContent).toBe('hidden');

    // Change the ref from outside — both the parent and child should re-render
    // because `:model="${open}"` now registers a reactive dependency on open.
    capturedRef!.value = true;
    await wait();

    expect(content?.textContent).toBe('visible');

    // Toggle back to verify bidirectional reactivity
    capturedRef!.value = false;
    await wait();
    expect(content?.textContent).toBe('hidden');
  });

  it('parent component re-renders when ref passed via :model changes (no explicit ${ref.value})', async () => {
    let capturedRef: ReturnType<typeof ref<boolean>> | undefined;
    let parentRenderCount = 0;

    component('dm-tracking-child', () => {
      const model = defineModel(false);
      return html`<span>${model.value}</span>`;
    });

    component('dm-tracking-parent', () => {
      parentRenderCount++;
      const open = ref(false);
      capturedRef = open;
      // There is intentionally no ${open.value} reference here.
      return html` <dm-tracking-child :model="${open}"></dm-tracking-child> `;
    });

    const parent = document.createElement('dm-tracking-parent');
    document.body.appendChild(parent);
    await wait();

    const initialCount = parentRenderCount;
    expect(initialCount).toBeGreaterThanOrEqual(1);

    capturedRef!.value = true;
    await wait();

    // The parent must have re-rendered at least once more after the ref changed.
    expect(parentRenderCount).toBeGreaterThan(initialCount);
  });

  it('re-renders child when parent ref starts truthy and changes without parent template exposure', async () => {
    let capturedRef: ReturnType<typeof ref<boolean>> | undefined;

    component('dm-truthy-start-child', () => {
      const model = defineModel(true);
      return html`
        <div data-testid="content">${model.value ? 'visible' : 'hidden'}</div>
      `;
    });

    component('dm-truthy-start-parent', () => {
      const open = ref(true);
      capturedRef = open;
      // NOTE: no ${open.value} anywhere in the parent template
      return html`
        <dm-truthy-start-child :model="${open}"></dm-truthy-start-child>
      `;
    });

    const parent = document.createElement('dm-truthy-start-parent');
    document.body.appendChild(parent);
    await wait();

    const child = parent.shadowRoot?.querySelector(
      'dm-truthy-start-child',
    ) as HTMLElement;
    const content = child?.shadowRoot?.querySelector('[data-testid="content"]');
    expect(content?.textContent).toBe('visible');

    capturedRef!.value = false;
    await wait();

    expect(content?.textContent).toBe('hidden');

    capturedRef!.value = true;
    await wait();

    expect(content?.textContent).toBe('visible');
  });

  it('re-renders child with Transition-like conditional when parent ref changes without parent template exposure', async () => {
    let capturedRef: ReturnType<typeof ref<boolean>> | undefined;

    component('dm-transition-child', () => {
      const model = defineModel(false);
      return html`
        <div data-testid="wrapper">
          ${model.value
            ? html`<span data-testid="inner">open</span>`
            : html`<span data-testid="inner">closed</span>`}
        </div>
      `;
    });

    component('dm-transition-parent', () => {
      const open = ref(false);
      capturedRef = open;
      // No ${open.value} in parent template — this is the exact bug scenario
      return html`
        <dm-transition-child :model="${open}"></dm-transition-child>
      `;
    });

    const parent = document.createElement('dm-transition-parent');
    document.body.appendChild(parent);
    await wait();

    const child = parent.shadowRoot?.querySelector(
      'dm-transition-child',
    ) as HTMLElement;
    const inner = child?.shadowRoot?.querySelector('[data-testid="inner"]');
    expect(inner?.textContent).toBe('closed');

    capturedRef!.value = true;
    await wait();

    expect(inner?.textContent).toBe('open');
  });

  it('re-renders child using Transition component from defineModel show-hide when parent ref changes', async () => {
    let capturedRef: ReturnType<typeof ref<boolean>> | undefined;

    component('dm-real-transition-child', () => {
      const model = defineModel(false);
      return html`
        <div data-testid="wrapper">
          ${Transition(
            { show: model.value },
            html`<span data-testid="content">modal content</span>`,
          )}
        </div>
      `;
    });

    component('dm-real-transition-parent', () => {
      const open = ref(false);
      capturedRef = open;
      // Intentionally omit ${open.value} from parent template
      return html`
        <dm-real-transition-child :model="${open}"></dm-real-transition-child>
      `;
    });

    const parent = document.createElement('dm-real-transition-parent');
    document.body.appendChild(parent);
    await wait();

    const child = parent.shadowRoot?.querySelector(
      'dm-real-transition-child',
    ) as HTMLElement;
    // Initially hidden: Transition with show=false renders no content
    const wrapperBefore = child?.shadowRoot?.querySelector(
      '[data-testid="content"]',
    );
    expect(wrapperBefore).toBeNull();

    capturedRef!.value = true;
    await wait();

    // After open=true, Transition should show the content
    const wrapperAfter = child?.shadowRoot?.querySelector(
      '[data-testid="content"]',
    );
    expect(wrapperAfter).not.toBeNull();
    expect(wrapperAfter?.textContent).toBe('modal content');
  });
});
