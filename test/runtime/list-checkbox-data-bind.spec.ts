/**
 * Unit tests for list rendering and checkbox double-click bug regression
 * Ensures that newly added list items' checkboxes work on first click
 * and do not require a double click to update state.
 */

import { component } from '../../src/lib/runtime';
import { describe, it, expect } from 'vitest';

function getCheckboxes(root: ShadowRoot | HTMLElement): HTMLInputElement[] {
  return Array.from(root.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
}

const TEST_TAG = 'list-checkbox-test';

component(TEST_TAG, {
  state: {
    items: [] as { text: string; checked: boolean }[],
    inputValue: ''
  },
  template: (state: any, _api: any) => `
    <div>
      <input type="text" data-model="inputValue" />
      <button data-on-click="onAdd">Add</button>
      <ul>
        ${state.items.map((item: any, i: number) => `
          <li>
            <input type="checkbox" data-bind="items.${i}.checked" data-index="${i}" />
            <span>${item.text}</span>
            <button data-click="onRemove" data-index="${i}">Remove</button>
          </li>
        `).join('')}
      </ul>
    </div>
  `,
  onAdd(_: Event, state: any) {
    // eslint-disable-next-line no-console
    console.log('onAdd before:', JSON.stringify(state.items));
    if (state.inputValue.trim()) {
      state.items.push({ text: state.inputValue, checked: false });
      state.inputValue = '';
    }
    // eslint-disable-next-line no-console
    console.log('onAdd after:', JSON.stringify(state.items));
  },
  onRemove(e: Event, state: any) {
    const btn = e.target as HTMLButtonElement;
    const idx = Number(btn.getAttribute('data-index'));
    // eslint-disable-next-line no-console
    console.log('onRemove before:', JSON.stringify(state.items));
    state.items.splice(idx, 1);
    // eslint-disable-next-line no-console
    console.log('onRemove after:', JSON.stringify(state.items));
  },
});

async function setupTestComponent(): Promise<ShadowRoot> {
  // Ensure tag is registered before creating
  if (!customElements.get(TEST_TAG)) {
    throw new Error(`Custom element ${TEST_TAG} is not registered`);
  }
  const container = document.createElement('div');
  document.body.appendChild(container);
  const el = document.createElement(TEST_TAG);
  container.appendChild(el);
  // Wait for shadowRoot to be created
  let shadow: ShadowRoot | null = null;
  const start = Date.now();
  while (Date.now() - start < 2000) {
    shadow = (el as HTMLElement).shadowRoot;
    if (shadow) return shadow;
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error('shadowRoot not found for test component');
}

// Wait for input[type="text"] to exist in the shadow DOM
async function waitForInput(root: ShadowRoot, timeout = 2000): Promise<HTMLInputElement> {
  const start = Date.now();
  let input: HTMLInputElement | null = null;
  while (Date.now() - start < timeout) {
    await new Promise(r => setTimeout(r, 50));
    input = root.querySelector('input[type="text"]') as HTMLInputElement | null;
    if (input) return input;
  }
  throw new Error('input[type="text"] not found in shadow DOM after update');
}

describe('ListCheckboxTestComponent data-bind test', () => {
  it('should check newly added item on first change', async () => {
    const root = await setupTestComponent();
    const input = await waitForInput(root);
    input.value = 'Test Item';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    let addBtn = root.querySelector('button[data-on-click]') as HTMLButtonElement | null;
    expect(addBtn).not.toBeNull();
    addBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
    const checkboxes = getCheckboxes(root);
    expect(checkboxes.length).toBeGreaterThan(0);
    const lastCheckbox = checkboxes[checkboxes.length - 1];
    expect(lastCheckbox.checked).toBe(false);
    lastCheckbox.checked = true;
    lastCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
    const checkboxesAfter = getCheckboxes(root);
    expect(checkboxesAfter.length).toBeGreaterThan(0);
    expect(checkboxesAfter[checkboxesAfter.length - 1].checked).toBe(true);
  });

  it('should not require double change for new item checkbox', async () => {
    const root = await setupTestComponent();
    let input = await waitForInput(root);
    input.value = 'Item 1';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    let addBtn = root.querySelector('button[data-on-click]') as HTMLButtonElement | null;
    expect(addBtn).not.toBeNull();
    addBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 30));
  // Debug: log shadow DOM after add
  // eslint-disable-next-line no-console
  console.log('After add:', root.innerHTML);
  const input2 = await waitForInput(root, 4000);
  input2.value = 'Item 2';
  input2.dispatchEvent(new Event('input', { bubbles: true }));
    addBtn = root.querySelector('button[data-on-click]') as HTMLButtonElement | null;
    expect(addBtn).not.toBeNull();
    addBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 50));
    const checkboxes = getCheckboxes(root);
    expect(checkboxes.length).toBeGreaterThan(0);
    const lastCheckbox = checkboxes[checkboxes.length - 1];
    lastCheckbox.checked = true;
    lastCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 50));
    const checkboxesAfter = getCheckboxes(root);
    expect(checkboxesAfter.length).toBeGreaterThan(0);
    expect(checkboxesAfter[checkboxesAfter.length - 1].checked).toBe(true);
  });

  it('should preserve event listeners on checkbox after list update', async () => {
    const root = await setupTestComponent();
    let input = await waitForInput(root);
    input.value = 'Preserve Test';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    let addBtn = root.querySelector('button[data-on-click]') as HTMLButtonElement | null;
    expect(addBtn).not.toBeNull();
    addBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 50));
    let checkboxes = getCheckboxes(root);
    if (checkboxes.length > 0) {
      let cb = checkboxes[checkboxes.length - 1];
      cb.checked = true;
      cb.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 50));
      checkboxes = getCheckboxes(root);
      expect(checkboxes.length).toBeGreaterThan(0);
      cb = checkboxes[checkboxes.length - 1];
      expect(cb.checked).toBe(true);
    }
    // Remove item and add again
    let removeBtn = root.querySelector('button[data-click]') as HTMLButtonElement | null;
    expect(removeBtn).not.toBeNull();
    removeBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 50));
    // Debug: log shadow DOM after remove
    // eslint-disable-next-line no-console
    console.log('After remove:', root.innerHTML);
    const input2 = await waitForInput(root, 4000);
    input2.value = 'Preserve Test';
    input2.dispatchEvent(new Event('input', { bubbles: true }));
    addBtn = root.querySelector('button[data-on-click]') as HTMLButtonElement | null;
    expect(addBtn).not.toBeNull();
    addBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 50));
    let newCheckboxes = getCheckboxes(root);
    if (newCheckboxes.length > 0) {
      let newCb = newCheckboxes[newCheckboxes.length - 1];
      newCb.checked = true;
      newCb.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 50));
      newCheckboxes = getCheckboxes(root);
      expect(newCheckboxes.length).toBeGreaterThan(0);
      newCb = newCheckboxes[newCheckboxes.length - 1];
      expect(newCb.checked).toBe(true);
    }
  });
});
