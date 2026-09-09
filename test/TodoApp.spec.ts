import { describe, it, expect, beforeEach } from 'vitest';

// Importing the component file registers the custom element
import '../src/components/examples/TodoApp';

describe('TodoApp example', () => {
  beforeEach(() => {
    // clean document body between tests
    document.body.innerHTML = '';
  });

  it('adds a todo when the form is submitted', async () => {
    const el = document.createElement('todo-app');
    document.body.appendChild(el);

    // wait for microtask to allow component setup
    await Promise.resolve();

    const input = document.querySelector('todo-app')!.shadowRoot
      ? document
          .querySelector('todo-app')!
          .shadowRoot!.querySelector('input[type="text"]')
      : document.querySelector('todo-app')!.querySelector('input[type="text"]');

    // Fall back to light-dom query if shadowRoot isn't used
    const textInput =
      (input as HTMLInputElement) ||
      document.querySelector('todo-app input[type="text"]')!;
    textInput.value = 'buy milk';
    textInput.dispatchEvent(new Event('input', { bubbles: true }));

    const host = document.querySelector('todo-app') as HTMLElement;
    const addButton = (
      host.shadowRoot
        ? host.shadowRoot.querySelector('button[type="submit"]')
        : host.querySelector('button[type="submit"]')
    ) as HTMLButtonElement;
    addButton.click();

    // wait for next microtask/render
    await Promise.resolve();

    // Check that a list item with the text exists (search inside shadowRoot when used)
    const hostEl = document.querySelector('todo-app') as HTMLElement;
    // Wait for any scheduled DOM updates (macrotask) to complete
    await Promise.resolve();
    await new Promise((res) => setTimeout(res, 0));
    const listItem = hostEl.shadowRoot
      ? hostEl.shadowRoot.querySelector('li')
      : hostEl.querySelector('li');
    expect(listItem).not.toBeNull();
    expect(listItem!.textContent).toContain('buy milk');
  });

  it('keeps item identity isolated across reactive renders', async () => {
    const host = document.createElement('todo-app') as HTMLElement;
    document.body.appendChild(host);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = host.shadowRoot ?? host;
    const input = root.querySelector('input[type="text"]') as HTMLInputElement;
    const submit = root.querySelector('button[type="submit"]') as HTMLButtonElement;

    for (const text of ['First task', 'Second task', 'Third task']) {
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      submit.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    let items = [...root.querySelectorAll('li')];
    expect(items).toHaveLength(3);
    const secondCheckbox = items[1].querySelector('input[type="checkbox"]') as HTMLInputElement;
    secondCheckbox.checked = true;
    secondCheckbox.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    items = [...root.querySelectorAll('li')];
    expect(
      items.map((item) =>
        (item.querySelector('input[type="checkbox"]') as HTMLInputElement).checked,
      ),
    ).toEqual([false, true, false]);

    (items[1].querySelector('button.remove-btn') as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(
      [...root.querySelectorAll('span.todo-text')].map((label) => label.textContent?.trim()),
    ).toEqual(['First task', 'Third task']);
  });
});
