import { describe, it, expect, beforeEach } from 'vitest';
import { component, html, ref } from '../src/lib/index';
import { each } from '../src/lib/directives';
import { TransitionGroup } from '../src/lib/transitions';

describe('TransitionGroup move animations - stress test', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should handle 20 rapid consecutive shuffles without breaking', async () => {
    component('test-stress-shuffle', () => {
      const items = ref([
        { id: 1, text: 'A' },
        { id: 2, text: 'B' },
        { id: 3, text: 'C' },
        { id: 4, text: 'D' },
        { id: 5, text: 'E' },
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
              preset: 'fade',
              class: 'flex gap-4',
              tag: 'div',
              moveClass: 'transition-all duration-300 ease-out',
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

    const el = document.createElement('test-stress-shuffle') as any;
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const wrapper = el.shadowRoot.querySelector(
      '[class*="flex"]',
    ) as HTMLElement;
    const shuffleBtn = el.shadowRoot.querySelector(
      '[data-test="shuffle"]',
    ) as HTMLElement;

    // Perform 20 rapid shuffles
    for (let i = 0; i < 20; i++) {
      shuffleBtn.click();
      // Very short delay to stress test
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    // Wait for all animations to settle
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify all items are still present and correct
    const items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.length).toBe(5);

    const ids = items.map((item: any) => item.getAttribute('data-test-id'));
    expect(new Set(ids).size).toBe(5);
    expect(ids.sort()).toEqual(['1', '2', '3', '4', '5']);
  });

  it('should handle extremely rapid clicks (no delay)', async () => {
    component('test-no-delay-shuffle', () => {
      const items = ref([
        { id: 1, text: '1' },
        { id: 2, text: '2' },
        { id: 3, text: '3' },
      ]);

      return html`
        <div>
          <button
            @click="${() => {
              items.value = [...items.value].reverse();
            }}"
            data-test="reverse"
          >
            Reverse
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
                <div key="${item.id}" class="p-4" data-test-id="${item.id}">
                  ${item.text}
                </div>
              `,
            ),
          )}
        </div>
      `;
    });

    const el = document.createElement('test-no-delay-shuffle') as any;
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const wrapper = el.shadowRoot.querySelector(
      '[class*="flex"]',
    ) as HTMLElement;
    const reverseBtn = el.shadowRoot.querySelector(
      '[data-test="reverse"]',
    ) as HTMLElement;

    // Click 10 times with NO delay between clicks
    for (let i = 0; i < 10; i++) {
      reverseBtn.click();
    }

    // Wait for animations to settle
    await new Promise((resolve) => setTimeout(resolve, 600));

    // All items should still be present
    const items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.length).toBe(3);

    // Even number of reverses (10) should result in original order
    expect(items.map((item: any) => item.getAttribute('data-test-id'))).toEqual(
      ['1', '2', '3'],
    );
  });

  it('should handle large lists with many items', async () => {
    component('test-large-list', () => {
      const items = ref(
        Array.from({ length: 20 }, (_, i) => ({
          id: i + 1,
          text: `Item ${i + 1}`,
        })),
      );

      return html`
        <div>
          <button
            @click="${() => {
              items.value = [...items.value].reverse();
            }}"
            data-test="reverse"
          >
            Reverse
          </button>

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
              preset: 'fade',
              class: 'grid grid-cols-4 gap-2',
              tag: 'div',
              moveClass: 'transition-all duration-400 ease-out',
            },
            each(
              items.value,
              (item: any) => html`
                <div
                  key="${item.id}"
                  class="p-2 bg-primary-100"
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

    const el = document.createElement('test-large-list') as any;
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const wrapper = el.shadowRoot.querySelector(
      '[class*="grid"]',
    ) as HTMLElement;
    const shuffleBtn = el.shadowRoot.querySelector(
      '[data-test="shuffle"]',
    ) as HTMLElement;

    // Initial check
    let items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.length).toBe(20);

    // Shuffle 5 times
    for (let i = 0; i < 5; i++) {
      shuffleBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Verify all items are still present
    items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.length).toBe(20);

    const ids = items.map((item: any) => item.getAttribute('data-test-id'));
    expect(new Set(ids).size).toBe(20);
  });

  it('should handle mixed operations in rapid succession', async () => {
    component('test-mixed-operations', () => {
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
              items.value = [...items.value, { id: Date.now(), text: 'New' }];
            }}"
            data-test="add"
          >
            Add
          </button>

          <button
            @click="${() => {
              items.value = items.value.slice(0, -1);
            }}"
            data-test="remove"
          >
            Remove
          </button>

          <button
            @click="${() => {
              items.value = [...items.value].reverse();
            }}"
            data-test="reverse"
          >
            Reverse
          </button>

          ${TransitionGroup(
            {
              preset: 'slide-right',
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

    const el = document.createElement('test-mixed-operations') as any;
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const wrapper = el.shadowRoot.querySelector(
      '[class*="flex"]',
    ) as HTMLElement;
    const addBtn = el.shadowRoot.querySelector(
      '[data-test="add"]',
    ) as HTMLElement;
    const removeBtn = el.shadowRoot.querySelector(
      '[data-test="remove"]',
    ) as HTMLElement;
    const reverseBtn = el.shadowRoot.querySelector(
      '[data-test="reverse"]',
    ) as HTMLElement;

    // Perform mixed operations rapidly
    const operations = [
      () => addBtn.click(),
      () => reverseBtn.click(),
      () => addBtn.click(),
      () => reverseBtn.click(),
      () => removeBtn.click(),
      () => reverseBtn.click(),
      () => addBtn.click(),
      () => reverseBtn.click(),
    ];

    for (const op of operations) {
      op();
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Wait for all animations to settle
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Verify items are present (exact count depends on operations)
    const items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.length).toBeGreaterThan(0);

    // Verify no duplicates
    const ids = items.map((item: any) => item.getAttribute('data-test-id'));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
