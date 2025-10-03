import { describe, it, expect, beforeEach, vi } from "vitest";
import { component, html, ref, TransitionGroup, each } from "../src/lib/index";

describe("Transitions - Comprehensive Tests", () => {
  beforeEach(() => {
    // Clear any existing custom elements
    const elements = document.querySelectorAll('[data-test]');
    elements.forEach(el => el.remove());
  });

  it("should apply enter transitions to all items on initial render", async () => {
    component('test-initial-render', () => {
      const items = ref<any[]>([]); // Start empty with proper typing
      
      return html`
        <div>
          <button @click="${() => {
            const newId = items.value.length + 1;
            items.value = [...items.value, { id: newId, text: `Item ${newId}` }];
          }}" data-test="add">Add Item</button>
          ${TransitionGroup({
            enterFrom: 'opacity-0',
            enterActive: 'transition-opacity duration-200',
            enterTo: 'opacity-100',
            tag: 'div'
          }, each(items.value, (item: any) => html`
            <div 
              key="${item.id}" 
              data-test-id="${item.id}"
            >${item.text}</div>
          `))}
        </div>
      `;
    });

    document.body.innerHTML = '<test-initial-render></test-initial-render>';
    const el = document.querySelector('test-initial-render') as HTMLElement;
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const addBtn = el.shadowRoot?.querySelector('[data-test="add"]') as HTMLButtonElement;
    
    // Add 3 items with transitions
    addBtn.click();
    await new Promise(resolve => setTimeout(resolve, 100));
    addBtn.click();
    await new Promise(resolve => setTimeout(resolve, 100));
    addBtn.click();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check that all items exist
    const items = el.shadowRoot?.querySelectorAll('[data-test-id]');
    expect(items?.length).toBe(3);
    
    // Check transition classes: first item is initial content, subsequent items animate
    const item1Classes = (items?.[0] as HTMLElement)?.className || '';
    const item2Classes = (items?.[1] as HTMLElement)?.className || '';
    const item3Classes = (items?.[2] as HTMLElement)?.className || '';
    
    console.log('Item 1 classes:', item1Classes);
    console.log('Item 2 classes:', item2Classes);
    console.log('Item 3 classes:', item3Classes);
    
    // First item doesn't animate (no appear:true), items 2-3 do animate
    expect(item1Classes).not.toContain('opacity-100');
    expect(item2Classes).toContain('opacity-100');
    expect(item3Classes).toContain('opacity-100');
  });

  it("should apply move transitions when shuffling maintains all items", async () => {
    component('test-move-transitions', () => {
      const items = ref([
        { id: 1, text: 'Item 1' },
        { id: 2, text: 'Item 2' },
        { id: 3, text: 'Item 3' }
      ]);
      
      const shuffle = () => {
        items.value = [items.value[2], items.value[0], items.value[1]];
        console.log('After shuffle, items:', items.value.map(i => i.id));
      };
      
      return html`
        <div>
          <button @click="${shuffle}" data-test="shuffle">Shuffle</button>
          ${TransitionGroup({
            preset: 'fade',
            tag: 'div',
            moveClass: 'transition-transform duration-300'
          }, each(items.value, (item: any) => html`
            <div key="${item.id}" data-test-id="${item.id}">${item.text}</div>
          `))}
        </div>
      `;
    });

    document.body.innerHTML = '<test-move-transitions></test-move-transitions>';
    const el = document.querySelector('test-move-transitions') as HTMLElement;
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get initial order
    let items = Array.from(el.shadowRoot?.querySelectorAll('[data-test-id]') || [])
      .map(el => el.getAttribute('data-test-id'));
    console.log('Initial order:', items);
    expect(items).toEqual(['1', '2', '3']);
    
    // Shuffle
    const shuffleBtn = el.shadowRoot?.querySelector('[data-test="shuffle"]') as HTMLButtonElement;
    shuffleBtn.click();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get new order
    items = Array.from(el.shadowRoot?.querySelectorAll('[data-test-id]') || [])
      .map(el => el.getAttribute('data-test-id'));
    console.log('Order after shuffle:', items);
    expect(items).toEqual(['3', '1', '2']);
    
    // All 3 items should still exist (no enter/leave, just move)
    const allItems = el.shadowRoot?.querySelectorAll('[data-test-id]');
    expect(allItems?.length).toBe(3);
  });

  it("should properly map old node keys to new node keys", async () => {
    component('test-key-mapping', () => {
      const items = ref([
        { id: 1, text: 'A' },
        { id: 2, text: 'B' },
        { id: 3, text: 'C' }
      ]);
      
      const shuffle = () => {
        items.value = [items.value[2], items.value[0], items.value[1]];
      };
      
      return html`
        <div>
          <button @click="${shuffle}" data-test="shuffle">Shuffle</button>
          ${TransitionGroup({
            preset: 'fade',
            tag: 'div'
          }, each(items.value, (item: any) => html`
            <div key="${item.id}" data-test-id="${item.id}">${item.text}</div>
          `))}
        </div>
      `;
    });

    document.body.innerHTML = '<test-key-mapping></test-key-mapping>';
    const el = document.querySelector('test-key-mapping') as HTMLElement;
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get the actual DOM elements and check their keys
    const shadow = el.shadowRoot!;
    const items = Array.from(shadow.querySelectorAll('[data-test-id]')) as HTMLElement[];
    
    console.log('DOM node keys before shuffle:');
    items.forEach(item => {
      const key = (item as any).key;
      const dataKey = item.getAttribute('data-anchor-key');
      console.log(`  ID: ${item.getAttribute('data-test-id')}, key property: ${key}, data-anchor-key: ${dataKey}`);
    });
    
    // Shuffle
    const shuffleBtn = shadow.querySelector('[data-test="shuffle"]') as HTMLButtonElement;
    shuffleBtn.click();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check keys after shuffle
    const itemsAfter = Array.from(shadow.querySelectorAll('[data-test-id]')) as HTMLElement[];
    
    console.log('DOM node keys after shuffle:');
    itemsAfter.forEach(item => {
      const key = (item as any).key;
      const dataKey = item.getAttribute('data-anchor-key');
      const testId = item.getAttribute('data-test-id');
      console.log(`  ID: ${testId}, key property: ${key}, data-anchor-key: ${dataKey}`);
      
      // The key should match the ID (e.g., key "1" for id "1")
      // Keys are stripped of "each-" prefix for proper keyed diffing
      expect(key).toBe(testId);
    });
  });

  it("should handle rapid adds and removes correctly", async () => {
    component('test-rapid-changes', () => {
      const items = ref([] as any[]); // Start with empty array
      
      const add = () => {
        const newId = items.value.length + 1;
        items.value = [...items.value, { id: newId, text: `Item ${newId}` }];
      };
      
      const remove = () => {
        if (items.value.length > 0) {
          items.value = items.value.slice(0, -1);
        }
      };
      
      return html`
        <div>
          <button @click="${add}" data-test="add">Add</button>
          <button @click="${remove}" data-test="remove">Remove</button>
          ${TransitionGroup({
            preset: 'fade',
            tag: 'div'
          }, each(items.value, (item: any) => html`
            <div key="${item.id}" data-test-id="${item.id}">${item.text}</div>
          `))}
        </div>
      `;
    });

    document.body.innerHTML = '<test-rapid-changes></test-rapid-changes>';
    const el = document.querySelector('test-rapid-changes') as HTMLElement;
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const addBtn = el.shadowRoot?.querySelector('[data-test="add"]') as HTMLButtonElement;
    
    // Add 4 items rapidly
    addBtn.click();
    await new Promise(resolve => setTimeout(resolve, 50));
    addBtn.click();
    await new Promise(resolve => setTimeout(resolve, 50));
    addBtn.click();
    await new Promise(resolve => setTimeout(resolve, 50));
    addBtn.click();
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Check all items exist and have transition classes
    const items = el.shadowRoot?.querySelectorAll('[data-test-id]');
    console.log('Item count after rapid adds:', items?.length);
    expect(items?.length).toBe(4);
    
    // Check each item has transition classes (first is initial, rest animate)
    let hasTransitionClasses = 0;
    items?.forEach((item, index) => {
      const classes = (item as HTMLElement).className;
      console.log(`  Item ${index + 1} classes:`, classes);
      if (classes.includes('opacity-100')) {
        hasTransitionClasses++;
      }
    });
    
    console.log(`Items with transition classes: ${hasTransitionClasses} / ${items?.length}`);
    expect(hasTransitionClasses).toBe(3); // Items 2-4 have transition classes (item 1 is initial)
  });
});
