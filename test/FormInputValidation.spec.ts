import { beforeEach, describe, expect, it } from 'vitest';
import '../src/components/examples/FormInputValidation';

describe('FormInputValidation example', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('keeps native HTML constraint validation enabled', async () => {
    const host = document.createElement('form-input-validation') as HTMLElement;
    document.body.appendChild(host);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = host.shadowRoot ?? host;
    const form = root.querySelector('form') as HTMLFormElement;
    const email = root.querySelector('input[type="email"]') as HTMLInputElement;
    const username = root.querySelector('input[type="text"]') as HTMLInputElement;
    const bio = root.querySelector('textarea') as HTMLTextAreaElement;
    const gender = root.querySelector('input[type="radio"]') as HTMLInputElement;
    const fruit = root.querySelector('input[type="checkbox"][value="apple"]') as HTMLInputElement;
    const country = root.querySelector('select') as HTMLSelectElement;

    expect(form.noValidate).toBe(false);
    expect(email.required).toBe(true);
    expect(email.type).toBe('email');
    expect(username.required).toBe(true);
    expect(username.minLength).toBe(3);
    expect(bio.required).toBe(true);
    expect(bio.minLength).toBe(10);
    expect(gender.required).toBe(true);
    expect(fruit.required).toBe(true);
    expect(country.required).toBe(true);
    expect(form.checkValidity()).toBe(false);
  });

  it('retains defensive validation for programmatic submit events', async () => {
    const host = document.createElement('form-input-validation') as HTMLElement;
    document.body.appendChild(host);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = host.shadowRoot ?? host;
    const form = root.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(root.querySelector('.error')?.textContent).toContain(
      'Please enter a valid email address.',
    );
  });
});
