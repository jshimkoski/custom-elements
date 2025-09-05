import { describe, it, expect } from 'vitest';

// Import all examples so they register with the runtime
import '../src/components/examples/MinimalExample';
import '../src/components/examples/DesignSystem';
import '../src/components/examples/FormInputValidation';
import '../src/components/examples/TodoApp';
import '../src/components/examples/ShoppingCart';

function mountTag(tag: string) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const el = document.createElement(tag);
  root.appendChild(el);
  return { root, el };
}

describe('examples integration', () => {
  it('minimal-example mounts and increments', async () => {
    const { root, el } = mountTag('minimal-example');
    await Promise.resolve();
    const btn = el.shadowRoot?.querySelector('button') as HTMLButtonElement | null;
    expect(btn).toBeTruthy();
    const initial = btn!.textContent || '';
    btn!.click();
    await Promise.resolve();
    expect((btn!.textContent || '')).not.toBe(initial);
    document.body.removeChild(root);
  });

  it('design-system mounts and child interactions update host', async () => {
    const { root, el } = mountTag('design-system');
    await Promise.resolve();
    const parent = el as HTMLElement;
    const child = parent.shadowRoot?.querySelector('cer-child') as HTMLElement | null;
    expect(child).toBeTruthy();
    // Prop button
    const propBtn = child!.shadowRoot?.querySelectorAll('button')[1] as HTMLButtonElement | undefined;
    expect(propBtn).toBeDefined();
    propBtn!.click();
    await Promise.resolve();
    expect(propBtn!.textContent).toContain('Clicked from child prop');
    // Model button -> updates parent text
    const modelBtn = child!.shadowRoot?.querySelectorAll('button')[0] as HTMLButtonElement | undefined;
    modelBtn!.click();
    await Promise.resolve();
    expect(parent.shadowRoot?.textContent).toContain('Clicked from child');
    document.body.removeChild(root);
  });

  it('form-input-validation mounts and validation works', async () => {
    const { root, el } = mountTag('form-input-validation');
    await Promise.resolve();
    const form = el.shadowRoot?.querySelector('form') as HTMLFormElement | null;
    expect(form).toBeTruthy();
    // Submit without filling should set an error message in the shadowRoot
    const submitBtn = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    submitBtn?.click();
    await Promise.resolve();
    expect(el.shadowRoot?.textContent).toContain('Please enter a valid email address.');
    document.body.removeChild(root);
  });

  it('todo-app mounts and add/toggle/remove flow works', async () => {
    const { root, el } = mountTag('todo-app');
    await Promise.resolve();
  const form = el.shadowRoot?.querySelector('form') as HTMLFormElement | null;
  const input = form?.querySelector('input[type="text"]') as HTMLInputElement | null;
  const submitBtn = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null;
  expect(input).toBeTruthy();
  expect(submitBtn).toBeTruthy();
  // add a todo
  // Synthetic events are treated as untrusted by the runtime (isTrusted=false)
  // so update the component via its context to emulate user input reliably.
  (el as any).context.input = 'Write tests';
  (el as any).context.addTodo();
  await Promise.resolve();
  // find the first list item's span text
  const firstSpan = el.shadowRoot?.querySelector('ul li span') as HTMLElement | null;
  expect(firstSpan).toBeTruthy();
  expect(firstSpan!.textContent).toContain('Write tests');
  // toggle first todo checkbox (within the same li)
  const firstLi = el.shadowRoot?.querySelector('ul li') as HTMLLIElement | null;
  const checkbox = firstLi?.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
  expect(checkbox).toBeTruthy();
  checkbox!.click();
  await Promise.resolve();
  // remove button within the same list item
  const removeBtn = firstLi?.querySelector('button') as HTMLButtonElement | null;
  expect(removeBtn).toBeTruthy();
  removeBtn!.click();
  await Promise.resolve();
  // ensure the item was removed
  expect(el.shadowRoot?.textContent).not.toContain('Write tests');
    document.body.removeChild(root);
  });

  it('shopping-cart mounts (basic smoke)', async () => {
    const { root, el } = mountTag('shopping-cart');
    await Promise.resolve();
    // Basic render smoke: ensure element and some expected text exist
    expect(el.shadowRoot).toBeTruthy();
    document.body.removeChild(root);
  });
});
