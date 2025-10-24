import { describe, it, expect, beforeEach } from 'vitest';
import { component, html, ref } from '../src/lib/index';
import { each } from '../src/lib/directives';
import { TransitionGroup } from '../src/lib/transitions';

describe('TransitionGroup move animations - FLIP technique', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should apply moveClass and FLIP animation when items are shuffled', async () => {
    component('test-flip-animation', () => {
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

    const el = document.createElement('test-flip-animation') as any;
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const wrapper = el.shadowRoot.querySelector(
      '[class*="flex"]',
    ) as HTMLElement;

    // Initial order: A, B, C
    let items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.map((item: any) => item.textContent?.trim())).toEqual([
      'A',
      'B',
      'C',
    ]);

    // Trigger shuffle
    const shuffleBtn = el.shadowRoot.querySelector(
      '[data-test="shuffle"]',
    ) as HTMLElement;
    shuffleBtn.click();

    // Wait for animations to complete
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Verify new order: C, A, B
    items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.map((item: any) => item.textContent?.trim())).toEqual([
      'C',
      'A',
      'B',
    ]);
  });

  it('should animate items smoothly from old to new positions', async () => {
    component('test-smooth-move', () => {
      const items = ref([
        { id: 1, text: '1' },
        { id: 2, text: '2' },
        { id: 3, text: '3' },
        { id: 4, text: '4' },
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
              class: 'grid grid-cols-2 gap-4',
              tag: 'div',
              moveClass: 'transition-all duration-700 ease-in-out',
            },
            each(
              items.value,
              (item: any) => html`
                <div
                  key="${item.id}"
                  class="p-8 bg-primary-500 text-white"
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

    const el = document.createElement('test-smooth-move') as any;
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const wrapper = el.shadowRoot.querySelector(
      '[class*="grid"]',
    ) as HTMLElement;

    // Initial order: 1, 2, 3, 4
    let items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.map((item: any) => item.getAttribute('data-test-id'))).toEqual(
      ['1', '2', '3', '4'],
    );

    // Trigger reverse
    const reverseBtn = el.shadowRoot.querySelector(
      '[data-test="reverse"]',
    ) as HTMLElement;
    reverseBtn.click();

    // Wait for DOM update and animations
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Verify reversed order: 4, 3, 2, 1
    items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.map((item: any) => item.getAttribute('data-test-id'))).toEqual(
      ['4', '3', '2', '1'],
    );

    // All items should still be present
    expect(items.length).toBe(4);
  });

  it('should handle complex shuffle patterns with multiple moves', async () => {
    component('test-complex-shuffle', () => {
      const items = ref([
        { id: 1, text: 'A' },
        { id: 2, text: 'B' },
        { id: 3, text: 'C' },
        { id: 4, text: 'D' },
        { id: 5, text: 'E' },
        { id: 6, text: 'F' },
      ]);

      return html`
        <div>
          <button
            @click="${() => {
              // Complex shuffle: [1,2,3,4,5,6] -> [6,1,4,2,5,3]
              items.value = [
                items.value[5],
                items.value[0],
                items.value[3],
                items.value[1],
                items.value[4],
                items.value[2],
              ];
            }}"
            data-test="shuffle"
          >
            Complex Shuffle
          </button>

          ${TransitionGroup(
            {
              preset: 'fade',
              class: 'grid grid-cols-3 gap-4',
              tag: 'div',
              moveClass: 'transition-all duration-600 ease-out',
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

    const el = document.createElement('test-complex-shuffle') as any;
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const wrapper = el.shadowRoot.querySelector(
      '[class*="grid"]',
    ) as HTMLElement;

    // Initial order
    let items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.map((item: any) => item.getAttribute('data-test-id'))).toEqual(
      ['1', '2', '3', '4', '5', '6'],
    );

    // Trigger complex shuffle
    const shuffleBtn = el.shadowRoot.querySelector(
      '[data-test="shuffle"]',
    ) as HTMLElement;
    shuffleBtn.click();

    // Wait for DOM update and animations
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Verify new order: [6,1,4,2,5,3]
    items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.map((item: any) => item.getAttribute('data-test-id'))).toEqual(
      ['6', '1', '4', '2', '5', '3'],
    );

    // All items should still be present
    expect(items.length).toBe(6);
  });
});
