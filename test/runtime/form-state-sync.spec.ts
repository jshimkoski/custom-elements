import { component } from '../../src/lib/runtime';
import { describe, it, expect } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Form Elements State Sync', () => {
  it('shows correct state in shadow DOM on load and after state change', async () => {
    const config = {
      ...getTestConfig(),
      template: () => `<div aria-label="Greeting">Hello</div>`
    };
    component('form-state-demo', {
      template: () => `
        <input type="text" data-model="text" />
        <input type="checkbox" data-model="checked" />
        <select data-model="select">
          <option value="a">A</option>
          <option value="b">B</option>
        </select>
      `,
      state: { text: 'hello', checked: true, select: 'b' },
    });
    const el = document.createElement('form-state-demo');
    document.body.appendChild(el);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const shadow = el.shadowRoot!;
    const textInput = shadow.querySelector('input[type="text"]') as HTMLInputElement;
    const checkbox = shadow.querySelector('input[type="checkbox"]') as HTMLInputElement;
    const select = shadow.querySelector('select') as HTMLSelectElement;
    expect(textInput.value).toBe('hello');
    expect(checkbox.checked).toBe(true);
    expect(select.value).toBe('b');
    // Change state
    el['setState']({ text: 'world', checked: false, select: 'a' });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    // Re-query textInput after state change
    const textInputAfter = shadow.querySelector('input[type="text"]') as HTMLInputElement;
    expect(textInputAfter.value).toBe('world');
    expect(checkbox.checked).toBe(false);
    expect(select.value).toBe('a');
    document.body.removeChild(el);
  });
});
