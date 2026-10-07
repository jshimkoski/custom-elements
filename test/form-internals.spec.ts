import { afterEach, expect, it, vi } from 'vitest';
import { component, html, ref, useFormInternals } from '../src/lib';
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });
const tick = () => new Promise((done) => setTimeout(done, 0));
it('attaches internals once and forwards reset, disabled and restore callbacks', async () => {
  const internals = {} as ElementInternals;
  const attach = vi.spyOn(HTMLElement.prototype, 'attachInternals').mockReturnValue(internals);
  const reset = vi.fn(), disabled = vi.fn(), restore = vi.fn();
  component('test-form-internals', () => {
    const count = ref(0); useFormInternals({ reset, disabled, restore });
    return html`<button @click="${() => count.value++}">${count.value}</button>`;
  }, { formAssociated: true });
  const host = document.createElement('test-form-internals') as HTMLElement & { formResetCallback(): void; formDisabledCallback(value: boolean): void; formStateRestoreCallback(state: string, mode: string): void };
  document.body.append(host); await tick();
  host.shadowRoot!.querySelector('button')!.click(); await tick();
  expect(attach).toHaveBeenCalledTimes(1);
  expect((host.constructor as typeof HTMLElement & { formAssociated: boolean }).formAssociated).toBe(true);
  host.formResetCallback(); host.formDisabledCallback(true); host.formStateRestoreCallback('restored', 'restore');
  expect(reset).toHaveBeenCalledOnce(); expect(disabled).toHaveBeenCalledWith(true); expect(restore).toHaveBeenCalledWith('restored', 'restore');
  host.remove(); host.formResetCallback(); expect(reset).toHaveBeenCalledOnce();
});

it('uses the latest callbacks after reactive rerenders', async () => {
  vi.spyOn(HTMLElement.prototype, 'attachInternals').mockReturnValue({} as ElementInternals);
  const reset = vi.fn();
  component('test-current-form-callbacks', () => {
    const count = ref(0);
    const renderedCount = count.value;
    useFormInternals({ reset: () => reset(renderedCount) });
    return html`<button @click="${() => count.value++}">Change</button>`;
  }, { formAssociated: true });
  const host = document.createElement('test-current-form-callbacks'); document.body.append(host); await tick();
  host.shadowRoot!.querySelector('button')!.click(); await tick();
  (host as HTMLElement & { formResetCallback(): void }).formResetCallback();
  expect(reset).toHaveBeenCalledWith(1);
});
