import { component } from '../../src/lib/runtime';
import { describe, it, expect } from 'vitest';

describe('data-model binding', () => {
    let testId = 0;
    function setupComponent(templateStr: string, state: any) {
      testId++;
      const tag = `form-test-element-${testId}`;
      const config = {
        template: () => templateStr,
        state,
        debug: false,
      };
      component(tag, config);
      const el = document.createElement(tag);
      document.body.appendChild(el);
      if (typeof el['render'] === 'function') el['render']();
      // Wait for listeners to be attached
      const waitForListeners = async () => {
      const inputs = el.shadowRoot?.querySelectorAll('[data-model]') ?? [];
      for (const input of inputs) {
        while (!(input as any)._dataModelBound) {
          await new Promise(requestAnimationFrame);
        }
      }
    };
    return { el, config, waitForListeners };
    }

    it('binds text input', async () => {
      const { el, waitForListeners } = setupComponent('<input data-model="textValue">', { textValue: '' });
      await waitForListeners();
      const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
      input.value = 'hello';
      input.dispatchEvent(new Event('input'));
      await new Promise(requestAnimationFrame);
      // @ts-ignore
      expect(el['stateObj'].textValue).toBe('hello');
      document.body.removeChild(el);
    });

    it('binds textarea', async () => {
      const { el, waitForListeners } = setupComponent('<textarea data-model="areaValue"></textarea>', { areaValue: '' });
      await waitForListeners();
      const textarea = el.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement;
      textarea.value = 'world';
      textarea.dispatchEvent(new Event('input'));
      await new Promise(requestAnimationFrame);
      // @ts-ignore
      expect(el['stateObj'].areaValue).toBe('world');
      document.body.removeChild(el);
    });

    it('binds select', async () => {
      const { el, waitForListeners } = setupComponent('<select data-model="selectValue"><option value="a">A</option><option value="b">B</option></select>', { selectValue: 'a' });
      await waitForListeners();
      const select = el.shadowRoot!.querySelector('select') as HTMLSelectElement;
      select.value = 'b';
      select.dispatchEvent(new Event('change'));
      await new Promise(requestAnimationFrame);
      // @ts-ignore
      expect(el['stateObj'].selectValue).toBe('b');
      document.body.removeChild(el);
    });

    it('binds single checkbox (boolean)', async () => {
      const { el, waitForListeners } = setupComponent('<input type="checkbox" data-model="checkValue">', { checkValue: false });
      await waitForListeners();
      const checkbox = el.shadowRoot!.querySelector('input[type="checkbox"]') as HTMLInputElement;
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
      await new Promise(requestAnimationFrame);
      // @ts-ignore
      expect(el['stateObj'].checkValue).toBe(true);
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change'));
      await new Promise(requestAnimationFrame);
      // @ts-ignore
      expect(el['stateObj'].checkValue).toBe(false);
      document.body.removeChild(el);
    });

    it('binds single checkbox (custom true/false values)', async () => {
      const { el, waitForListeners } = setupComponent('<input type="checkbox" data-model="checkValue" data-true-value="yes" data-false-value="no">', { checkValue: 'no' });
      await waitForListeners();
      const checkbox = el.shadowRoot!.querySelector('input[type="checkbox"]') as HTMLInputElement;
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
      await new Promise(requestAnimationFrame);
      // @ts-ignore
      expect(el['stateObj'].checkValue).toBe('yes');
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change'));
      await new Promise(requestAnimationFrame);
      // @ts-ignore
      expect(el['stateObj'].checkValue).toBe('no');
      document.body.removeChild(el);
    });

    it('binds radio group', async () => {
      const { el, waitForListeners } = setupComponent('<input type="radio" name="group" value="one" data-model="radioValue"><input type="radio" name="group" value="two" data-model="radioValue">', { radioValue: 'one' });
      await waitForListeners();
      const radios = el.shadowRoot!.querySelectorAll('input[type="radio"]');
      (radios[1] as HTMLInputElement).checked = true;
      (radios[1] as HTMLInputElement).dispatchEvent(new Event('change'));
      await new Promise(requestAnimationFrame);
      // @ts-ignore
      expect(el['stateObj'].radioValue).toBe('two');
      document.body.removeChild(el);
    });

    it('binds multi-checkbox group (array)', async () => {
      const { el, waitForListeners } = setupComponent('<input type="checkbox" value="a" data-model="multiValue"><input type="checkbox" value="b" data-model="multiValue">', { multiValue: [] });
      await waitForListeners();
      // Force a synchronous render if available
      if (typeof el['render'] === 'function') el['render']();
      const checkboxes = el.shadowRoot!.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBe(2);
      (checkboxes[0] as HTMLInputElement).checked = true;
      (checkboxes[0] as HTMLInputElement).dispatchEvent(new Event('change'));
      await new Promise(requestAnimationFrame);
      // @ts-ignore
      expect(el['stateObj'].multiValue.map(String)).toContain('a');
      (checkboxes[1] as HTMLInputElement).checked = true;
      (checkboxes[1] as HTMLInputElement).dispatchEvent(new Event('change'));
      await new Promise(requestAnimationFrame);
      // @ts-ignore
      expect(el['stateObj'].multiValue.map(String)).toContain('b');
      (checkboxes[0] as HTMLInputElement).checked = false;
      (checkboxes[0] as HTMLInputElement).dispatchEvent(new Event('change'));
      await new Promise(requestAnimationFrame);
      // @ts-ignore
      expect(el['stateObj'].multiValue.map(String)).not.toContain('a');
      document.body.removeChild(el);
    });
  });