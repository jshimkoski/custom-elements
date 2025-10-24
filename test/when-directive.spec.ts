import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { component, html, ref } from '../src/lib/index';

describe(':when directive', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should render element when condition is true', async () => {
    component('when-test-1', () => {
      const show = ref(true);
      return html`
        <div>
          <p :when="${show.value}">Visible</p>
        </div>
      `;
    });

    const el = document.createElement('when-test-1') as any;
    container.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const p = el.shadowRoot?.querySelector('p');
    expect(p).toBeTruthy();
    expect(p?.textContent).toBe('Visible');
  });

  it('should not render element when condition is false', async () => {
    component('when-test-2', () => {
      const show = ref(false);
      return html`
        <div>
          <p :when="${show.value}">Hidden</p>
        </div>
      `;
    });

    const el = document.createElement('when-test-2') as any;
    container.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const p = el.shadowRoot?.querySelector('p');
    expect(p).toBeNull();
  });

  it('should toggle element visibility when condition changes', async () => {
    component('when-test-3', () => {
      const show = ref(true);
      const toggle = () => {
        show.value = !show.value;
      };
      return html`
        <div>
          <button @click="${toggle}">Toggle</button>
          <p :when="${show.value}">Toggleable</p>
        </div>
      `;
    });

    const el = document.createElement('when-test-3') as any;
    container.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Initially visible
    let p = el.shadowRoot?.querySelector('p');
    expect(p).toBeTruthy();
    expect(p?.textContent).toBe('Toggleable');

    // Click to hide
    const button = el.shadowRoot?.querySelector('button');
    button?.click();
    await new Promise((resolve) => setTimeout(resolve, 10));

    p = el.shadowRoot?.querySelector('p');
    expect(p).toBeNull();

    // Click to show again
    button?.click();
    await new Promise((resolve) => setTimeout(resolve, 10));

    p = el.shadowRoot?.querySelector('p');
    expect(p).toBeTruthy();
    expect(p?.textContent).toBe('Toggleable');
  });

  it('should work with nested elements', async () => {
    component('when-test-4', () => {
      const show = ref(true);
      return html`
        <div>
          <section :when="${show.value}">
            <h1>Title</h1>
            <p>Content</p>
          </section>
        </div>
      `;
    });

    const el = document.createElement('when-test-4') as any;
    container.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const section = el.shadowRoot?.querySelector('section');
    expect(section).toBeTruthy();
    const h1 = section?.querySelector('h1');
    expect(h1?.textContent).toBe('Title');
    const p = section?.querySelector('p');
    expect(p?.textContent).toBe('Content');
  });

  it('should work with multiple conditional elements', async () => {
    component('when-test-5', () => {
      const showFirst = ref(true);
      const showSecond = ref(false);
      return html`
        <div>
          <p :when="${showFirst.value}">First</p>
          <p :when="${showSecond.value}">Second</p>
        </div>
      `;
    });

    const el = document.createElement('when-test-5') as any;
    container.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const paragraphs = el.shadowRoot?.querySelectorAll('p');
    expect(paragraphs?.length).toBe(1);
    expect(paragraphs?.[0]?.textContent).toBe('First');
  });

  it('should work with reactive expressions', async () => {
    component('when-test-6', () => {
      const count = ref(5);
      return html`
        <div>
          <p :when="${count.value > 3}">Count is greater than 3</p>
          <p :when="${count.value <= 3}">Count is 3 or less</p>
        </div>
      `;
    });

    const el = document.createElement('when-test-6') as any;
    container.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const paragraphs = el.shadowRoot?.querySelectorAll('p');
    expect(paragraphs?.length).toBe(1);
    expect(paragraphs?.[0]?.textContent).toBe('Count is greater than 3');
  });

  it('should work with falsy values', async () => {
    component('when-test-7', () => {
      const values = {
        zero: ref(0),
        emptyString: ref(''),
        nullValue: ref(null),
        undefinedValue: ref(undefined),
        falseValue: ref(false),
      };
      return html`
        <div>
          <p :when="${values.zero.value}">Zero</p>
          <p :when="${values.emptyString.value}">Empty</p>
          <p :when="${values.nullValue.value}">Null</p>
          <p :when="${values.undefinedValue.value}">Undefined</p>
          <p :when="${values.falseValue.value}">False</p>
        </div>
      `;
    });

    const el = document.createElement('when-test-7') as any;
    container.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const paragraphs = el.shadowRoot?.querySelectorAll('p');
    expect(paragraphs?.length).toBe(0);
  });

  it('should work with complex elements containing other directives', async () => {
    component('when-test-8', () => {
      const show = ref(true);
      const message = ref('Hello');
      return html`
        <div>
          <input type="text" :when="${show.value}" :model="${message}" />
        </div>
      `;
    });

    const el = document.createElement('when-test-8') as any;
    container.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const input = el.shadowRoot?.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input?.value).toBe('Hello');
  });

  it('should maintain element state when re-rendering with same condition', async () => {
    component('when-test-9', () => {
      const show = ref(true);
      const count = ref(0);
      const increment = () => {
        count.value++;
      };
      return html`
        <div>
          <button @click="${increment}">Increment</button>
          <p :when="${show.value}">Count: ${count.value}</p>
        </div>
      `;
    });

    const el = document.createElement('when-test-9') as any;
    container.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 10));

    let p = el.shadowRoot?.querySelector('p');
    expect(p?.textContent).toBe('Count: 0');

    const button = el.shadowRoot?.querySelector('button');
    button?.click();
    await new Promise((resolve) => setTimeout(resolve, 10));

    p = el.shadowRoot?.querySelector('p');
    expect(p?.textContent).toBe('Count: 1');
  });

  it('should work with self-closing tags', async () => {
    component('when-test-10', () => {
      const show = ref(true);
      return html`
        <div>
          <hr :when="${show.value}" />
          <br :when="${show.value}" />
        </div>
      `;
    });

    const el = document.createElement('when-test-10') as any;
    container.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const hr = el.shadowRoot?.querySelector('hr');
    const br = el.shadowRoot?.querySelector('br');
    expect(hr).toBeTruthy();
    expect(br).toBeTruthy();
  });
});
