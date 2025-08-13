import { component } from '../../src/lib/runtime';
import { describe, it, expect } from 'vitest';

const TEST_TAG = 'checkbox-vdom-regression';

component(TEST_TAG, {
  state: {
    text: '',
    checked: false,
    checkedGroup: [] as string[],
  },
  template: (state: any) => `
    <div>
      <input type="text" data-model="text" placeholder="Type here..." />
      <input type="checkbox" data-model="checked" />
      <input type="checkbox" value="a" data-model="checkedGroup" />
      <input type="checkbox" value="b" data-model="checkedGroup" />
      <span id="checked">${state.checked ? 'checked' : 'unchecked'}</span>
      <span id="checkedGroup">${state.checkedGroup.join(',')}</span>
    </div>
  `,
});

async function setupTestComponent(): Promise<ShadowRoot> {
  if (!customElements.get(TEST_TAG)) throw new Error(`Custom element ${TEST_TAG} is not registered`);
  const container = document.createElement('div');
  document.body.appendChild(container);
  const el = document.createElement(TEST_TAG);
  container.appendChild(el);
  let shadow: ShadowRoot | null = null;
  const start = Date.now();
  while (Date.now() - start < 2000) {
    shadow = (el as HTMLElement).shadowRoot;
    if (shadow) return shadow;
    await new Promise(r => setTimeout(r, 0));
  }
  throw new Error('shadowRoot not found for test component');
}

function getInput(root: ShadowRoot, type: string, value?: string): HTMLInputElement | null {
  if (value)
    return root.querySelector(`input[type="${type}"][value="${value}"]`) as HTMLInputElement | null;
  if (type === 'checkbox')
    return root.querySelector('input[type="checkbox"][data-model="checked"]') as HTMLInputElement | null;
  return root.querySelector(`input[type="${type}"]:not([value])`) as HTMLInputElement | null;
}

describe('Checkbox VDOM regression', () => {
  it('should update checkbox state on first click after text input', async () => {
    const root = await setupTestComponent();
    const textInput = getInput(root, 'text');
    expect(textInput).not.toBeNull();
    textInput!.value = 'hello';
    textInput!.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 50));
    const checkbox = getInput(root, 'checkbox');
    expect(checkbox).not.toBeNull();
    expect(checkbox!.checked).toBe(false);
    checkbox!.checked = true;
    checkbox!.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 50));
    expect(checkbox!.checked).toBe(true);
    const checkedSpan = root.getElementById('checked');
    expect(checkedSpan?.textContent).toBe('checked');
  });

  it('should update grouped checkbox state on first click after text input', async () => {
    const root = await setupTestComponent();
    const textInput = getInput(root, 'text');
    expect(textInput).not.toBeNull();
    textInput!.value = 'world';
    textInput!.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 50));
    const checkboxA = getInput(root, 'checkbox', 'a');
    expect(checkboxA).not.toBeNull();
    expect(checkboxA!.checked).toBe(false);
    checkboxA!.checked = true;
    checkboxA!.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 50));
    expect(checkboxA!.checked).toBe(true);
    const checkedGroupSpan = root.getElementById('checkedGroup');
    expect(checkedGroupSpan?.textContent).toContain('a');
  });
});
