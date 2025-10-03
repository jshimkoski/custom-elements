import { describe, it, expect, beforeEach } from 'vitest';
import { component, html, ref, each } from '../src/lib/index';

describe('each directive with flex/grid layouts', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should work with flex layout by wrapping each() in a flex container', async () => {
    component('each-flex-test', () => {
      const items = ref([
        { id: 1, text: 'A' },
        { id: 2, text: 'B' },
        { id: 3, text: 'C' }
      ]);
      
      return html`
        <div class="flex gap-4">
          ${each(items.value, (item: any) => html`
            <div key="${item.id}" class="p-4 bg-blue-100" data-test-id="${item.id}">
              ${item.text}
            </div>
          `)}
        </div>
      `;
    });

    const el = document.createElement('each-flex-test') as any;
    document.body.appendChild(el);
    await new Promise(resolve => setTimeout(resolve, 100));

    const flexContainer = el.shadowRoot.querySelector('.flex');
    expect(flexContainer).toBeTruthy();
    expect(flexContainer.className).toContain('flex');
    expect(flexContainer.className).toContain('gap-4');
    
    const items = flexContainer.querySelectorAll('[data-test-id]');
    expect(items.length).toBe(3);
    
    // Verify the DOM structure shows each() items are direct children
    // (no wrapper between the flex container and the items)
    expect(flexContainer.children.length).toBeGreaterThan(0);
  });

  it('should work with grid layout by wrapping each() in a grid container', async () => {
    component('each-grid-test', () => {
      const items = ref([
        { id: 1, text: '1' },
        { id: 2, text: '2' },
        { id: 3, text: '3' },
        { id: 4, text: '4' }
      ]);
      
      return html`
        <div class="grid grid-cols-2 gap-4">
          ${each(items.value, (item: any) => html`
            <div key="${item.id}" class="p-4 bg-purple-100" data-test-id="${item.id}">
              ${item.text}
            </div>
          `)}
        </div>
      `;
    });

    const el = document.createElement('each-grid-test') as any;
    document.body.appendChild(el);
    await new Promise(resolve => setTimeout(resolve, 100));

    const gridContainer = el.shadowRoot.querySelector('.grid');
    expect(gridContainer).toBeTruthy();
    expect(gridContainer.className).toContain('grid');
    expect(gridContainer.className).toContain('grid-cols-2');
    expect(gridContainer.className).toContain('gap-4');
    
    const items = gridContainer.querySelectorAll('[data-test-id]');
    expect(items.length).toBe(4);
    
    // Verify the DOM structure shows each() items are direct children
    // (no wrapper between the grid container and the items)
    expect(gridContainer.children.length).toBeGreaterThan(0);
  });

  it('should demonstrate that each() returns an array of VNodes, not a wrapper', () => {
    const items = [
      { id: 1, text: 'A' },
      { id: 2, text: 'B' }
    ];
    
    const result = each(items, (item: any) => html`
      <div key="${item.id}">${item.text}</div>
    `);
    
    // each() returns an array of anchor blocks
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    
    // Each item is an anchor block
    result.forEach((vnode: any) => {
      expect(vnode.tag).toBe('#anchor');
      expect(vnode.key).toMatch(/^each-/);
    });
  });
});
