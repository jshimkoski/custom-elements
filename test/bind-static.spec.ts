import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { component } from '../src/lib/runtime/component';
import { ref } from '../src/lib/runtime/reactive';
import { html } from '../src/lib/runtime/template-compiler';

describe('test :bind directive static', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should apply object properties with :bind', async () => {
    component('test-bind-static', () => {
      const props = ref({
        class: 'test-class',
        'data-test': 'test-value',
        disabled: true,
      });

      return html` <input :bind="${props.value}" type="text" /> `;
    });

    container.innerHTML = '<test-bind-static></test-bind-static>';
    await new Promise((resolve) => setTimeout(resolve, 10));

    const input = container
      .querySelector('test-bind-static')
      ?.shadowRoot?.querySelector('input');

    console.log('input className:', input?.className);
    console.log('input getAttribute("class"):', input?.getAttribute('class'));
    console.log(
      'input getAttribute("data-test"):',
      input?.getAttribute('data-test'),
    );
    console.log('input disabled:', input?.disabled);

    expect(input?.className).toBe('test-class');
    expect(input?.getAttribute('data-test')).toBe('test-value');
    expect(input?.disabled).toBe(true);
  });
});
