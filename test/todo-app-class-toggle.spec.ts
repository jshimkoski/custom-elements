import { describe, it, expect } from 'vitest';
import '../src/components/examples/TodoApp';

function mountRegistered(tag: string) {
  const el = document.createElement(tag);
  document.body.appendChild(el);
  return el;
}

describe('TodoApp :class toggle', () => {
  it('adds and removes border-error-500 based on input value', async () => {
    // enable runtime class debug logging
    (globalThis as any).__VDOM_CLASS_DEBUG = true;
    const tag = 'todo-app';
    const mountEl = mountRegistered(tag);
    // allow initial mount
    await new Promise((r) => setTimeout(r, 20));

    const input = mountEl.shadowRoot?.querySelector(
      'input[type="text"]',
    ) as HTMLInputElement | null;
    if (!input) {
      throw new Error('input not found in TodoApp shadowRoot');
    }

    // Debug: log class attribute and classList

    console.log('initial class attr ->', input.getAttribute('class'));

    console.log('initial className ->', input.className);

    console.log('initial classList ->', Array.from(input.classList));
    // Ensure initial state (no error class)

    console.log(
      'assert before initial check ->',
      input.classList.contains('border-error-600'),
    );
    expect(input.classList.contains('border-error-600')).toBe(false);

    // Simulate typing 'test'
    input.value = 'test';
    // dispatch input event
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await new Promise((r) => setTimeout(r, 20));

    console.log(
      'after typing test ->',
      input.getAttribute('class'),
      Array.from(input.classList),
    );
    expect(input.classList.contains('border-error-600')).toBe(true);

    // Change away
    input.value = 'nope';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await new Promise((r) => setTimeout(r, 20));

    console.log(
      'after typing nope ->',
      input.getAttribute('class'),
      Array.from(input.classList),
    );
    expect(input.classList.contains('border-error-600')).toBe(false);
  });
});
