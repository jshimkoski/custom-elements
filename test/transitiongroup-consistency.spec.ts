import { describe, it, expect, beforeEach } from 'vitest';
import { component, html, ref, each, TransitionGroup } from '../src/lib/index';

describe('TransitionGroup move animations - consistency', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should consistently animate on multiple consecutive shuffles', async () => {
    component('test-consistent-shuffle', () => {
      const items = ref([
        { id: 1, text: 'A' },
        { id: 2, text: 'B' },
        { id: 3, text: 'C' },
        { id: 4, text: 'D' }
      ]);
      
      return html`
        <div>
          <button @click="${() => {
            const shuffled = [...items.value];
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            items.value = shuffled;
          }}" data-test="shuffle">Shuffle</button>
          
          <button @click="${() => {
            items.value = [...items.value].reverse();
          }}" data-test="reverse">Reverse</button>
          
          ${TransitionGroup({
            preset: 'fade',
            class: 'flex gap-4',
            tag: 'div',
            moveClass: 'transition-all duration-500 ease-out'
          }, each(items.value, (item: any) => html`
            <div key="${item.id}" class="p-4 bg-primary-100" data-test-id="${item.id}">
              ${item.text}
            </div>
          `))}
        </div>
      `;
    });

    const el = document.createElement('test-consistent-shuffle') as any;
    document.body.appendChild(el);
    await new Promise(resolve => setTimeout(resolve, 100));

    const wrapper = el.shadowRoot.querySelector('[class*="flex"]') as HTMLElement;
    const shuffleBtn = el.shadowRoot.querySelector('[data-test="shuffle"]') as HTMLElement;
    const reverseBtn = el.shadowRoot.querySelector('[data-test="reverse"]') as HTMLElement;

    // Initial state
    let items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.length).toBe(4);

    // Test 10 consecutive shuffles to verify consistency
    for (let i = 0; i < 10; i++) {
      // Alternate between shuffle and reverse
      if (i % 2 === 0) {
        shuffleBtn.click();
      } else {
        reverseBtn.click();
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
      
      // Verify all items are still present after each shuffle
      expect(items.length).toBe(4);
      
      // Verify all IDs are unique
      const ids = items.map((item: any) => item.getAttribute('data-test-id'));
      expect(new Set(ids).size).toBe(4);
      
      // Verify no duplicates
      expect(ids.sort()).toEqual(['1', '2', '3', '4']);
    }
  });

  it('should handle rapid-fire shuffles without breaking', async () => {
    component('test-rapid-fire', () => {
      const items = ref([
        { id: 1, text: '1' },
        { id: 2, text: '2' },
        { id: 3, text: '3' },
        { id: 4, text: '4' },
        { id: 5, text: '5' }
      ]);
      
      return html`
        <div>
          <button @click="${() => {
            items.value = [...items.value].reverse();
          }}" data-test="reverse">Reverse</button>
          
          ${TransitionGroup({
            preset: 'scale',
            class: 'grid grid-cols-3 gap-4',
            tag: 'div',
            moveClass: 'transition-transform duration-300 ease-out'
          }, each(items.value, (item: any) => html`
            <div key="${item.id}" class="p-4" data-test-id="${item.id}">
              ${item.text}
            </div>
          `))}
        </div>
      `;
    });

    const el = document.createElement('test-rapid-fire') as any;
    document.body.appendChild(el);
    await new Promise(resolve => setTimeout(resolve, 100));

    const wrapper = el.shadowRoot.querySelector('[class*="grid"]') as HTMLElement;
    const reverseBtn = el.shadowRoot.querySelector('[data-test="reverse"]') as HTMLElement;

    // Fire 5 rapid clicks with minimal delay
    for (let i = 0; i < 5; i++) {
      reverseBtn.click();
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Wait for all animations to settle
    await new Promise(resolve => setTimeout(resolve, 400));

    // All items should still be present and correct
    const items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.length).toBe(5);
    
    const ids = items.map((item: any) => item.getAttribute('data-test-id'));
    expect(new Set(ids).size).toBe(5);
  });

  it('should handle shuffle with varying moveClass durations', async () => {
    component('test-varying-durations', () => {
      const items = ref([
        { id: 1, text: 'A' },
        { id: 2, text: 'B' },
        { id: 3, text: 'C' }
      ]);
      
      const duration = ref('duration-500');
      
      return html`
        <div>
          <button @click="${() => {
            items.value = [...items.value].reverse();
          }}" data-test="reverse">Reverse</button>
          
          <button @click="${() => {
            duration.value = duration.value === 'duration-500' ? 'duration-1000' : 'duration-500';
          }}" data-test="change-duration">Change Duration</button>
          
          ${TransitionGroup({
            preset: 'fade',
            class: 'flex gap-4',
            tag: 'div',
            moveClass: `transition-all ${duration.value} ease-out`
          }, each(items.value, (item: any) => html`
            <div key="${item.id}" class="p-4" data-test-id="${item.id}">
              ${item.text}
            </div>
          `))}
        </div>
      `;
    });

    const el = document.createElement('test-varying-durations') as any;
    document.body.appendChild(el);
    await new Promise(resolve => setTimeout(resolve, 100));

    const wrapper = el.shadowRoot.querySelector('[class*="flex"]') as HTMLElement;
    const reverseBtn = el.shadowRoot.querySelector('[data-test="reverse"]') as HTMLElement;
    const changeDurationBtn = el.shadowRoot.querySelector('[data-test="change-duration"]') as HTMLElement;

    // Initial order: A, B, C
    let items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.map((item: any) => item.textContent?.trim())).toEqual(['A', 'B', 'C']);

    // Reverse with 500ms duration
    reverseBtn.click();
    await new Promise(resolve => setTimeout(resolve, 150));
    
    items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.map((item: any) => item.textContent?.trim())).toEqual(['C', 'B', 'A']);

    // Change duration
    changeDurationBtn.click();
    await new Promise(resolve => setTimeout(resolve, 50));

    // Reverse with 1000ms duration
    reverseBtn.click();
    await new Promise(resolve => setTimeout(resolve, 150));
    
    items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.map((item: any) => item.textContent?.trim())).toEqual(['A', 'B', 'C']);
  });

  it('should maintain correct DOM order through complex operations', async () => {
    component('test-dom-order', () => {
      const items = ref([
        { id: 1, text: 'Item 1', color: 'bg-primary-500' },
        { id: 2, text: 'Item 2', color: 'bg-secondary-500' },
        { id: 3, text: 'Item 3', color: 'bg-success-500' },
        { id: 4, text: 'Item 4', color: 'bg-info-500' }
      ]);
      
      return html`
        <div>
          <button @click="${() => {
            // Move first to last
            items.value = [...items.value.slice(1), items.value[0]];
          }}" data-test="rotate">Rotate</button>
          
          <button @click="${() => {
            // Swap first and last
            const arr = [...items.value];
            [arr[0], arr[arr.length - 1]] = [arr[arr.length - 1], arr[0]];
            items.value = arr;
          }}" data-test="swap">Swap Ends</button>
          
          ${TransitionGroup({
            preset: 'slide-right',
            class: 'flex flex-col gap-2',
            tag: 'div',
            moveClass: 'transition-all duration-400 ease-in-out'
          }, each(items.value, (item: any) => html`
            <div 
              key="${item.id}" 
              class="${item.color} text-white p-3 rounded"
              data-test-id="${item.id}"
            >
              ${item.text}
            </div>
          `))}
        </div>
      `;
    });

    const el = document.createElement('test-dom-order') as any;
    document.body.appendChild(el);
    await new Promise(resolve => setTimeout(resolve, 100));

    const wrapper = el.shadowRoot.querySelector('.flex') as HTMLElement;
    const rotateBtn = el.shadowRoot.querySelector('[data-test="rotate"]') as HTMLElement;
    const swapBtn = el.shadowRoot.querySelector('[data-test="swap"]') as HTMLElement;

    // Initial: [1, 2, 3, 4]
    let items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.map((item: any) => item.getAttribute('data-test-id'))).toEqual(['1', '2', '3', '4']);

    // Rotate: [2, 3, 4, 1]
    rotateBtn.click();
    await new Promise(resolve => setTimeout(resolve, 150));
    items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.map((item: any) => item.getAttribute('data-test-id'))).toEqual(['2', '3', '4', '1']);

    // Swap ends: [1, 3, 4, 2]
    swapBtn.click();
    await new Promise(resolve => setTimeout(resolve, 150));
    items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.map((item: any) => item.getAttribute('data-test-id'))).toEqual(['1', '3', '4', '2']);

    // Rotate again: [3, 4, 2, 1]
    rotateBtn.click();
    await new Promise(resolve => setTimeout(resolve, 150));
    items = Array.from(wrapper.querySelectorAll('[data-test-id]'));
    expect(items.map((item: any) => item.getAttribute('data-test-id'))).toEqual(['3', '4', '2', '1']);

    // All items still present
    expect(items.length).toBe(4);
  });
});
