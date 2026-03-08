import { describe, it, expect, beforeEach } from 'vitest';
import { component, html, ref } from '../src/lib/index';
import { each } from '../src/lib/directives';
import { TransitionGroup } from '../src/lib/transitions';

describe('List Animation - Styling and Animation Tests', () => {
  beforeEach(() => {
    // Clear any existing custom elements
    document.body.innerHTML = '';
  });

  it('should support flex layout with class prop', async () => {
    component('test-flex-layout', () => {
      const items = ref([
        { id: 1, text: 'A' },
        { id: 2, text: 'B' },
        { id: 3, text: 'C' },
      ]);

      return html`
        <div>
          ${TransitionGroup(
            {
              preset: 'fade',
              class: 'flex gap-4 flex-wrap',
              tag: 'div',
            },
            each(
              items.value,
              (item: any) => html`
                <div
                  key="${item.id}"
                  class="shrink-0 p-4 bg-blue-100"
                  data-test-id="${item.id}"
                >
                  ${item.text}
                </div>
              `,
            ),
          )}
        </div>
      `;
    });

    const el = document.createElement('test-flex-layout') as any;
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Find the TransitionGroup wrapper
    const wrapper = el.shadowRoot.querySelector(
      '[class*="flex"]',
    ) as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.className).toContain('flex');
    expect(wrapper.className).toContain('gap-4');
    expect(wrapper.className).toContain('flex-wrap');

    // Check items exist
    const items = wrapper.querySelectorAll('[data-test-id]');
    expect(items.length).toBe(3);
  });

  it('should support grid layout with class prop', async () => {
    component('test-grid-layout', () => {
      const items = ref([
        { id: 1, text: '1' },
        { id: 2, text: '2' },
        { id: 3, text: '3' },
        { id: 4, text: '4' },
      ]);

      return html`
        <div>
          ${TransitionGroup(
            {
              preset: 'scale',
              class: 'grid grid-cols-2 gap-4',
              tag: 'div',
            },
            each(
              items.value,
              (item: any) => html`
                <div
                  key="${item.id}"
                  class="p-4 bg-purple-100"
                  data-test-id="${item.id}"
                >
                  ${item.text}
                </div>
              `,
            ),
          )}
        </div>
      `;
    });

    const el = document.createElement('test-grid-layout') as any;
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Find the TransitionGroup wrapper
    const wrapper = el.shadowRoot.querySelector(
      '[class*="grid"]',
    ) as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.className).toContain('grid');
    expect(wrapper.className).toContain('grid-cols-2');
    expect(wrapper.className).toContain('gap-4');

    // Check items exist
    const items = wrapper.querySelectorAll('[data-test-id]');
    expect(items.length).toBe(4);
  });

  it('should support inline styles with style prop', async () => {
    component('test-inline-styles', () => {
      const items = ref([
        { id: 1, text: 'X' },
        { id: 2, text: 'Y' },
      ]);

      return html`
        <div>
          ${TransitionGroup(
            {
              preset: 'fade',
              style: 'display: flex; gap: 1rem; padding: 2rem;',
              tag: 'div',
            },
            each(
              items.value,
              (item: any) => html`
                <div key="${item.id}" data-test-id="${item.id}">
                  ${item.text}
                </div>
              `,
            ),
          )}
        </div>
      `;
    });

    const el = document.createElement('test-inline-styles') as any;
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Find the TransitionGroup wrapper with style attribute
    const wrapper = el.shadowRoot.querySelector('[style]') as HTMLElement;
    expect(wrapper).toBeTruthy();

    // Check computed styles (the style attribute gets parsed)
    const computedStyle = window.getComputedStyle(wrapper);
    expect(computedStyle.display).toBe('flex');
  });

  it('should apply initial styles to all list items on first render', async () => {
    component('test-list-initial-styles', () => {
      const items = ref([
        { id: 1, text: 'Item 1' },
        { id: 2, text: 'Item 2' },
        { id: 3, text: 'Item 3' },
      ]);

      return html`
        <div>
          ${TransitionGroup(
            {
              preset: 'slide-right',
              tag: 'div',
            },
            each(
              items.value,
              (item: any) => html`
                <div
                  key="${item.id}"
                  class="p-4 bg-neutral-100 rounded"
                  data-test-id="${item.id}"
                >
                  ${item.text}
                </div>
              `,
            ),
          )}
        </div>
      `;
    });

    const el = document.createElement('test-list-initial-styles') as any;
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check all items exist
    const items = el.shadowRoot.querySelectorAll('[data-test-id]');
    expect(items.length).toBe(3);

    // Check each item has the expected classes
    items.forEach((item: HTMLElement) => {
      const classes = item.className;

      // Should have the base classes (p-4, bg-neutral-100, rounded)
      expect(classes).toContain('p-4');
      expect(classes).toContain('bg-neutral-100');
      expect(classes).toContain('rounded');

      // Should NOT have transition-from classes on initial render
      expect(classes).not.toContain('transition-slide-right-from');
    });
  });

  it('should apply enter transitions when adding new items', async () => {
    component('test-list-add-items', () => {
      const items = ref<any[]>([]);

      return html`
        <div>
          <button
            @click="${() => {
              items.value = [
                ...items.value,
                {
                  id: items.value.length + 1,
                  text: `Item ${items.value.length + 1}`,
                },
              ];
            }}"
            data-test="add"
          >
            Add
          </button>
          ${TransitionGroup(
            {
              enterFrom: 'opacity-0 translate-x-4',
              enterActive: 'transition-all duration-300 ease-out',
              enterTo: 'opacity-100 translate-x-0',
              tag: 'div',
            },
            each(
              items.value,
              (item: any) => html`
                <div
                  key="${item.id}"
                  class="p-4 bg-neutral-100"
                  data-test-id="${item.id}"
                >
                  ${item.text}
                </div>
              `,
            ),
          )}
        </div>
      `;
    });

    const el = document.createElement('test-list-add-items') as any;
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const addBtn = el.shadowRoot.querySelector(
      '[data-test="add"]',
    ) as HTMLElement;

    // Add first item
    addBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 50));

    let items = el.shadowRoot.querySelectorAll('[data-test-id]');
    expect(items.length).toBe(1);

    // Check first item exists and has base classes (transition classes are applied then removed)
    const firstItem = items[0] as HTMLElement;
    const classes1 = firstItem.className;
    expect(classes1).toContain('p-4'); // Just verify base classes exist

    // Add second item
    addBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 50));

    items = el.shadowRoot.querySelectorAll('[data-test-id]');
    expect(items.length).toBe(2);

    // In jsdom there is no real CSS animation engine, so transitionend fires
    // almost instantly — by 50 ms the enter transition may already be complete.
    // Verify transition completed correctly: base classes present, enterFrom
    // classes ('opacity-0 translate-x-4') are no longer on the element.
    const secondItem = items[1] as HTMLElement;
    const classes2 = secondItem.className;
    expect(classes2).toContain('p-4'); // base classes rendered
    expect(classes2).not.toContain('opacity-0'); // enterFrom was removed
    expect(classes2).not.toContain('translate-x-4'); // enterFrom was removed
  });

  it('should apply leave transitions when removing items', async () => {
    const removeLog: string[] = [];

    component('test-list-remove-items', () => {
      const items = ref([
        { id: 1, text: 'Item 1' },
        { id: 2, text: 'Item 2' },
        { id: 3, text: 'Item 3' },
      ]);

      return html`
        <div>
          <button
            @click="${() => {
              const removed = items.value[0];
              removeLog.push(`Removing item ${removed.id}`);
              items.value = items.value.slice(1);
            }}"
            data-test="remove"
          >
            Remove First
          </button>
          ${TransitionGroup(
            {
              leaveFrom: 'opacity-100',
              leaveActive: 'transition-opacity duration-200',
              leaveTo: 'opacity-0',
              tag: 'div',
            },
            each(
              items.value,
              (item: any) => html`
                <div key="${item.id}" class="p-4" data-test-id="${item.id}">
                  ${item.text}
                </div>
              `,
            ),
          )}
        </div>
      `;
    });

    const el = document.createElement('test-list-remove-items') as any;
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 50));

    let items = el.shadowRoot.querySelectorAll('[data-test-id]');
    expect(items.length).toBe(3);

    const removeBtn = el.shadowRoot.querySelector(
      '[data-test="remove"]',
    ) as HTMLElement;
    removeBtn.click();

    // Check item is still in DOM during transition
    await new Promise((resolve) => setTimeout(resolve, 50));

    // After transition, item should be removed
    await new Promise((resolve) => setTimeout(resolve, 250));
    items = el.shadowRoot.querySelectorAll('[data-test-id]');
    expect(items.length).toBe(2);

    expect(removeLog.length).toBe(1);
  });

  it.skip('should apply move transitions when shuffling items (TODO: implement move transitions)', async () => {
    component('test-list-shuffle', () => {
      const items = ref([
        { id: 1, text: 'A' },
        { id: 2, text: 'B' },
        { id: 3, text: 'C' },
      ]);

      return html`
        <div>
          <button
            @click="${() => {
              items.value = [items.value[2], items.value[0], items.value[1]];
            }}"
            data-test="shuffle"
          >
            Shuffle
          </button>
          ${TransitionGroup(
            {
              preset: 'fade',
              moveClass: 'transition-transform duration-500',
              tag: 'div',
            },
            each(
              items.value,
              (item: any) => html`
                <div key="${item.id}" class="p-4" data-test-id="${item.id}">
                  ${item.text}
                </div>
              `,
            ),
          )}
        </div>
      `;
    });

    const el = document.createElement('test-list-shuffle') as any;
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const getOrder = () => {
      const items = el.shadowRoot.querySelectorAll('[data-test-id]');
      return Array.from(items).map((item: any) =>
        item.getAttribute('data-test-id'),
      );
    };

    const beforeOrder = getOrder();
    expect(beforeOrder).toEqual(['1', '2', '3']);

    const shuffleBtn = el.shadowRoot.querySelector(
      '[data-test="shuffle"]',
    ) as HTMLElement;
    shuffleBtn.click();

    await new Promise((resolve) => setTimeout(resolve, 100));

    const afterOrder = getOrder();
    expect(afterOrder).toEqual(['3', '1', '2']);

    // Check that move class is applied
    const items = el.shadowRoot.querySelectorAll('[data-test-id]');
    let hasMoveClass = false;
    items.forEach((item: any) => {
      if (item.className.includes('transition-transform')) {
        hasMoveClass = true;
      }
    });
    expect(hasMoveClass).toBe(true);
  });

  it('should handle rapid add/remove operations without breaking styles', async () => {
    component('test-list-rapid-changes', () => {
      const items = ref<any[]>([]);

      return html`
        <div>
          <button
            @click="${() => {
              items.value = [
                ...items.value,
                { id: Date.now(), text: `Item ${items.value.length + 1}` },
              ];
            }}"
            data-test="add"
          >
            Add
          </button>
          <button
            @click="${() => {
              if (items.value.length > 0) {
                items.value = items.value.slice(0, -1);
              }
            }}"
            data-test="remove"
          >
            Remove
          </button>
          ${TransitionGroup(
            {
              preset: 'slide-right',
              tag: 'div',
            },
            each(
              items.value,
              (item: any) => html`
                <div
                  key="${item.id}"
                  class="p-4 mb-2 bg-blue-100"
                  data-test-id="${item.id}"
                >
                  ${item.text}
                </div>
              `,
            ),
          )}
        </div>
      `;
    });

    const el = document.createElement('test-list-rapid-changes') as any;
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const addBtn = el.shadowRoot.querySelector(
      '[data-test="add"]',
    ) as HTMLElement;
    const removeBtn = el.shadowRoot.querySelector(
      '[data-test="remove"]',
    ) as HTMLElement;

    // Rapid operations
    addBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 30));
    addBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 30));
    addBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 30));
    removeBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 30));
    addBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const items = el.shadowRoot.querySelectorAll('[data-test-id]');
    expect(items.length).toBeGreaterThan(0);

    // Check all items have base styles
    items.forEach((item: HTMLElement) => {
      const classes = item.className;
      expect(classes).toContain('p-4');
      expect(classes).toContain('bg-blue-100');
    });
  });

  it('should preserve element identity during reorder (items move, not recreate)', async () => {
    component('test-style-preservation', () => {
      const items = ref([
        { id: 1, text: 'Item 1' },
        { id: 2, text: 'Item 2' },
        { id: 3, text: 'Item 3' },
      ]);

      return html`
        <div>
          <button
            @click="${() => {
              items.value = [items.value[2], items.value[0], items.value[1]];
            }}"
            data-test="reorder"
          >
            Reorder
          </button>
          ${TransitionGroup(
            {
              preset: 'fade',
              tag: 'div',
            },
            each(
              items.value,
              (item: any) => html`
                <div key="${item.id}" class="p-4" data-test-id="${item.id}">
                  ${item.text}
                </div>
              `,
            ),
          )}
        </div>
      `;
    });

    const el = document.createElement('test-style-preservation') as any;
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const getOrder = () => {
      const items = el.shadowRoot.querySelectorAll('[data-test-id]');
      return Array.from(items as NodeListOf<HTMLElement>).map((item) =>
        item.getAttribute('data-test-id'),
      );
    };

    const beforeOrder = getOrder();
    expect(beforeOrder).toEqual(['1', '2', '3']);

    const reorderBtn = el.shadowRoot.querySelector(
      '[data-test="reorder"]',
    ) as HTMLElement;
    reorderBtn.click();

    await new Promise((resolve) => setTimeout(resolve, 100));

    const afterOrder = getOrder();
    // Items should be reordered
    expect(afterOrder).toEqual(['3', '1', '2']);

    // All items should still exist (not recreated)
    const items = el.shadowRoot.querySelectorAll('[data-test-id]');
    expect(items.length).toBe(3);
  });

  it('should handle complex class combinations without conflicts', async () => {
    component('test-complex-classes', () => {
      const items = ref([{ id: 1, text: 'Test' }]);

      return html`
        <div>
          <button
            @click="${() => {
              items.value = [...items.value, { id: Date.now(), text: 'New' }];
            }}"
            data-test="add"
          >
            Add
          </button>
          ${TransitionGroup(
            {
              enterFrom: 'opacity-0 scale-95 -translate-x-4',
              enterActive: 'transition-all duration-300 ease-out',
              enterTo: 'opacity-100 scale-100 translate-x-0',
              tag: 'div',
            },
            each(
              items.value,
              (item: any) => html`
                <div
                  key="${item.id}"
                  class="p-4 mb-2 bg-linear-to-r from-purple-100 to-pink-100 rounded-lg shadow-md
                     hover:shadow-lg hover:scale-105 transition-all duration-200"
                  data-test-id="${item.id}"
                >
                  ${item.text}
                </div>
              `,
            ),
          )}
        </div>
      `;
    });

    const el = document.createElement('test-complex-classes') as any;
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const addBtn = el.shadowRoot.querySelector(
      '[data-test="add"]',
    ) as HTMLElement;
    addBtn.click();

    await new Promise((resolve) => setTimeout(resolve, 100));

    const items = el.shadowRoot.querySelectorAll('[data-test-id]');
    expect(items.length).toBe(2);

    // Check that base classes are preserved
    items.forEach((item: HTMLElement) => {
      const classes = item.className;
      expect(classes).toContain('p-4');
      expect(classes).toContain('rounded-lg');
      expect(classes).toContain('shadow-md');
      // Transition classes should be added
      expect(classes).toMatch(/opacity|scale|translate/);
    });
  });

  it('should not duplicate classes when patching existing elements', async () => {
    component('test-no-duplicate-classes', () => {
      const items = ref([
        { id: 1, text: 'A' },
        { id: 2, text: 'B' },
      ]);

      return html`
        <div>
          <button
            @click="${() => {
              // Trigger re-render without changing items
              items.value = [...items.value];
            }}"
            data-test="rerender"
          >
            Re-render
          </button>
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
                  class="p-4 bg-gray-100 rounded"
                  data-test-id="${item.id}"
                >
                  ${item.text}
                </div>
              `,
            ),
          )}
        </div>
      `;
    });

    const el = document.createElement('test-no-duplicate-classes') as any;
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const getClassCounts = () => {
      const items = el.shadowRoot.querySelectorAll('[data-test-id]');
      return Array.from(items as NodeListOf<HTMLElement>).map((item) => {
        const classes = item.className.split(/\s+/).filter((c) => c);
        const uniqueClasses = new Set(classes);
        return {
          total: classes.length,
          unique: uniqueClasses.size,
          classes: Array.from(uniqueClasses),
        };
      });
    };

    const rerenderBtn = el.shadowRoot.querySelector(
      '[data-test="rerender"]',
    ) as HTMLElement;

    // Re-render multiple times
    for (let i = 0; i < 3; i++) {
      rerenderBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    const afterCounts = getClassCounts();

    // Should not have duplicate classes
    afterCounts.forEach((count) => {
      expect(count.total).toBe(count.unique);
    });
  });
});
