import { describe, it, expect, beforeEach } from 'vitest';
import { component, html, ref } from '../src/lib/index';
import { each } from '../src/lib/directives';
import { Transition, TransitionGroup } from '../src/lib/transitions';

describe('Transitions - Minimal Tests', () => {
  beforeEach(() => {
    // Clear any existing custom elements
    const elements = document.querySelectorAll('[data-test]');
    elements.forEach((el) => el.remove());
  });

  it('should trigger component re-render when ref changes', async () => {
    let renderCount = 0;

    component('test-reactive-list', () => {
      renderCount++;
      const items = ref([
        { id: 1, text: 'A' },
        { id: 2, text: 'B' },
        { id: 3, text: 'C' },
      ]);

      const shuffle = () => {
        items.value = [items.value[2], items.value[0], items.value[1]];
      };

      return html`
        <div data-test="container">
          <button @click="${shuffle}" data-test="shuffle-btn">Shuffle</button>
          ${TransitionGroup(
            {
              preset: 'fade',
              tag: 'div',
            },
            each(
              items.value,
              (item: any) => html`
                <div
                  key="${item.id}"
                  data-test-id="${item.id}"
                  data-test="list-item"
                >
                  ${item.text}
                </div>
              `,
            ),
          )}
        </div>
      `;
    });

    document.body.innerHTML = '<test-reactive-list></test-reactive-list>';
    const el = document.querySelector('test-reactive-list') as HTMLElement;

    await new Promise((resolve) => setTimeout(resolve, 100));

    const initialRenderCount = renderCount;

    // Click shuffle button
    const btn = el.shadowRoot?.querySelector(
      '[data-test="shuffle-btn"]',
    ) as HTMLButtonElement;
    btn.click();

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get order after shuffle - items are now direct children of TransitionGroup div
    const itemsAfter = Array.from(
      el.shadowRoot?.querySelectorAll('[data-test-id]') || [],
    ).map((el) => el.getAttribute('data-test-id'));

    expect(renderCount).toBeGreaterThan(initialRenderCount);
    expect(itemsAfter).toEqual(['3', '1', '2']);
  });

  it('should show elements with enter transitions', async () => {
    component('test-transition-enter', () => {
      const show = ref(false); // Start hidden

      // Expose show ref for testing
      (window as any).toggleShow = () => {
        show.value = !show.value;
      };

      return html`
        <div>
          ${Transition(
            {
              show: show.value,
              enterFrom: 'opacity-0',
              enterActive: 'transition-opacity duration-300',
              enterTo: 'opacity-100',
            },
            html` <div data-test="content">Hello</div> `,
          )}
        </div>
      `;
    });

    document.body.innerHTML = '<test-transition-enter></test-transition-enter>';
    const el = document.querySelector('test-transition-enter') as HTMLElement;

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Initially should not have content (show=false)
    let content = el.shadowRoot?.querySelector(
      '[data-test="content"]',
    ) as HTMLElement;
    expect(content).toBeFalsy();

    // Toggle to show
    (window as any).toggleShow();

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Now content should exist
    content = el.shadowRoot?.querySelector(
      '[data-test="content"]',
    ) as HTMLElement;
    expect(content).toBeTruthy();

    // Element should have transition classes during enter
    await new Promise((resolve) => setTimeout(resolve, 100));

    // After transition completes, should have final state
    await new Promise((resolve) => setTimeout(resolve, 300));

    // In jsdom, computed styles from adopted stylesheets don't work
    // So we check that the correct classes are applied instead
    const classes = content.className;

    // Should have the enterTo state classes
    expect(classes).toContain('opacity-100');
    expect(classes).not.toContain('opacity-0');
  });

  it('should apply leave transitions when removing elements', async () => {
    component('test-transition-leave', () => {
      const items = ref([
        { id: 1, text: 'Item 1' },
        { id: 2, text: 'Item 2' },
      ]);

      const remove = (id: number) => {
        items.value = items.value.filter((item) => item.id !== id);
      };

      return html`
        <div>
          ${TransitionGroup(
            {
              enterFrom: 'opacity-0',
              enterActive: 'transition-opacity duration-200',
              enterTo: 'opacity-100',
              leaveFrom: 'opacity-100',
              leaveActive: 'transition-opacity duration-200',
              leaveTo: 'opacity-0',
              tag: 'div',
            },
            each(
              items.value,
              (item: any) => html`
                <div key="${item.id}" data-test-id="${item.id}">
                  ${item.text}
                  <button
                    @click="${() => remove(item.id)}"
                    data-test-remove="${item.id}"
                  >
                    Remove
                  </button>
                </div>
              `,
            ),
          )}
        </div>
      `;
    });

    document.body.innerHTML = '<test-transition-leave></test-transition-leave>';
    const el = document.querySelector('test-transition-leave') as HTMLElement;

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should have 2 items initially
    let items = el.shadowRoot?.querySelectorAll('[data-test-id]');
    expect(items?.length).toBe(2);

    // Click remove button for item 1
    const removeBtn = el.shadowRoot?.querySelector(
      '[data-test-remove="1"]',
    ) as HTMLButtonElement;
    removeBtn.click();

    // Item should still be in DOM during transition
    await new Promise((resolve) => setTimeout(resolve, 50));

    // After transition completes, should have 1 item
    await new Promise((resolve) => setTimeout(resolve, 250));
    items = el.shadowRoot?.querySelectorAll('[data-test-id]');
    expect(items?.length).toBe(1);
  });
});
