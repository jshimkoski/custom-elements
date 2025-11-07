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
});
