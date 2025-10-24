import { describe, it, expect, beforeEach } from 'vitest';
import { component, html, ref } from '../src/lib/index';
import { each } from '../src/lib/directives';
import { TransitionGroup } from '../src/lib/transitions';

describe('TransitionGroup shuffle animations', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should apply move transitions when shuffling flex layout items', async () => {
    component('test-flex-shuffle', () => {
      const items = ref([
        { id: 1, text: 'A' },
        { id: 2, text: 'B' },
        { id: 3, text: 'C' },
        { id: 4, text: 'D' },
      ]);

      return html`
        <div>
          <button
            @click="${() => {
              const shuffled = [
                items.value[3],
                items.value[0],
                items.value[2],
                items.value[1],
              ];
              items.value = shuffled;
            }}"
            data-test="shuffle"
          >
            Shuffle
          </button>

          ${TransitionGroup(
            {
              preset: 'scale',
              class: 'flex gap-4',
              tag: 'div',
              moveClass: 'transition-all duration-500 ease-out',
            },
            each(
              items.value,
              (item: any) => html`
                <div
                  key="${item.id}"
                  class="p-4 bg-primary-100"
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

    const el = document.createElement('test-flex-shuffle') as any;
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const wrapper = el.shadowRoot.querySelector(
      '[class*="flex"]',
    ) as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.className).toContain('flex');
    expect(wrapper.className).toContain('gap-4');

    // Check initial order
    let items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.map((item: any) => item.getAttribute('data-test-id'))).toEqual(
      ['1', '2', '3', '4'],
    );
    expect(items.map((item: any) => item.textContent?.trim())).toEqual([
      'A',
      'B',
      'C',
      'D',
    ]);

    // Shuffle
    const shuffleBtn = el.shadowRoot.querySelector(
      '[data-test="shuffle"]',
    ) as HTMLElement;
    shuffleBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check shuffled order
    items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.map((item: any) => item.getAttribute('data-test-id'))).toEqual(
      ['4', '1', '3', '2'],
    );
    expect(items.map((item: any) => item.textContent?.trim())).toEqual([
      'D',
      'A',
      'C',
      'B',
    ]);

    // Verify all items are still present and rendered correctly
    expect(items.length).toBe(4);
  });

  it('should apply move transitions when shuffling grid layout items', async () => {
    component('test-grid-shuffle', () => {
      const items = ref([
        { id: 1, text: '1' },
        { id: 2, text: '2' },
        { id: 3, text: '3' },
        { id: 4, text: '4' },
        { id: 5, text: '5' },
        { id: 6, text: '6' },
      ]);

      return html`
        <div>
          <button
            @click="${() => {
              const shuffled = [...items.value].reverse();
              items.value = shuffled;
            }}"
            data-test="shuffle"
          >
            Shuffle
          </button>

          ${TransitionGroup(
            {
              preset: 'fade',
              class: 'grid grid-cols-3 gap-4',
              tag: 'div',
              moveClass: 'transition-all duration-700 ease-in-out',
            },
            each(
              items.value,
              (item: any) => html`
                <div
                  key="${item.id}"
                  class="bg-primary-500 text-white p-4"
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

    const el = document.createElement('test-grid-shuffle') as any;
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const wrapper = el.shadowRoot.querySelector(
      '[class*="grid"]',
    ) as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.className).toContain('grid');
    expect(wrapper.className).toContain('grid-cols-3');

    // Check initial order
    let items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.map((item: any) => item.getAttribute('data-test-id'))).toEqual(
      ['1', '2', '3', '4', '5', '6'],
    );

    // Shuffle (reverse)
    const shuffleBtn = el.shadowRoot.querySelector(
      '[data-test="shuffle"]',
    ) as HTMLElement;
    shuffleBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check reversed order
    items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.map((item: any) => item.getAttribute('data-test-id'))).toEqual(
      ['6', '5', '4', '3', '2', '1'],
    );

    // Verify all items are still present
    expect(items.length).toBe(6);
  });

  it('should handle multiple rapid shuffles smoothly', async () => {
    component('test-rapid-shuffle', () => {
      const items = ref([
        { id: 1, text: 'A' },
        { id: 2, text: 'B' },
        { id: 3, text: 'C' },
      ]);

      return html`
        <div>
          <button
            @click="${() => {
              const shuffled = [...items.value];
              for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
              }
              items.value = shuffled;
            }}"
            data-test="shuffle"
          >
            Shuffle
          </button>

          ${TransitionGroup(
            {
              preset: 'scale',
              class: 'flex gap-4',
              tag: 'div',
              moveClass: 'transition-all duration-300 ease-out',
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

    const el = document.createElement('test-rapid-shuffle') as any;
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const wrapper = el.shadowRoot.querySelector(
      '[class*="flex"]',
    ) as HTMLElement;
    const shuffleBtn = el.shadowRoot.querySelector(
      '[data-test="shuffle"]',
    ) as HTMLElement;

    // Perform multiple rapid shuffles
    shuffleBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 50));

    shuffleBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 50));

    shuffleBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // All items should still be present
    const items = wrapper.querySelectorAll('[data-test-id]');
    expect(items.length).toBe(3);

    // All IDs should still be unique
    const ids = Array.from(items).map((item: any) =>
      item.getAttribute('data-test-id'),
    );
    expect(new Set(ids).size).toBe(3);
  });

  it('should combine shuffle with add/remove operations', async () => {
    component('test-shuffle-with-operations', () => {
      const items = ref([
        { id: 1, text: 'A' },
        { id: 2, text: 'B' },
        { id: 3, text: 'C' },
      ]);

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

          <button
            @click="${() => {
              const shuffled = [...items.value];
              shuffled.reverse();
              items.value = shuffled;
            }}"
            data-test="shuffle"
          >
            Shuffle
          </button>

          <button
            @click="${() => {
              items.value = items.value.slice(0, -1);
            }}"
            data-test="remove"
          >
            Remove
          </button>

          ${TransitionGroup(
            {
              preset: 'scale',
              class: 'flex gap-4',
              tag: 'div',
              moveClass: 'transition-transform duration-500 ease-out',
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

    const el = document.createElement('test-shuffle-with-operations') as any;
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const wrapper = el.shadowRoot.querySelector(
      '[class*="flex"]',
    ) as HTMLElement;
    const addBtn = el.shadowRoot.querySelector(
      '[data-test="add"]',
    ) as HTMLElement;
    const shuffleBtn = el.shadowRoot.querySelector(
      '[data-test="shuffle"]',
    ) as HTMLElement;
    const removeBtn = el.shadowRoot.querySelector(
      '[data-test="remove"]',
    ) as HTMLElement;

    // Initial state
    expect(wrapper.querySelectorAll('[data-test-id]').length).toBe(3);

    // Add an item
    addBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(wrapper.querySelectorAll('[data-test-id]').length).toBe(4);

    // Shuffle
    shuffleBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(wrapper.querySelectorAll('[data-test-id]').length).toBe(4);

    // Remove an item
    removeBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(wrapper.querySelectorAll('[data-test-id]').length).toBe(3);

    // Shuffle again
    shuffleBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(wrapper.querySelectorAll('[data-test-id]').length).toBe(3);
  });
});
