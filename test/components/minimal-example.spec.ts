import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { html, css, component } from '../../src/lib/runtime';

interface MinimalExampleState {
  count: number;
}

component('minimal-example', {
  debug: true,
  state: { count: 0 },
  template: (state: MinimalExampleState) => {
    // Debug log to confirm template is called with updated state
    if ((window as any).DEBUG_PATCH_VNODE) {
      console.log('[MinimalExample.template] called with state:', state);
    }
    return html`
      <div>
        Text Node Breaks: ${state.count}
        <span>${state.count}</span>
        <button data-on-click="increment">Count: ${state.count}</button>
      </div>
    `(state);
  },
  style: css`
    button { font-size: 1.5rem; padding: 0.5rem 1rem; }
  `,
  increment(_e: Event, state: MinimalExampleState) {
    state.count++;
  }
});

function getShadowHtml(el: HTMLElement) {
  return el.shadowRoot ? el.shadowRoot.innerHTML : '';
}

let el: HTMLElement;

function waitForRender() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

afterEach(() => {
  if (el && el.isConnected) el.remove();
});

describe('minimal-example component', () => {
  beforeEach(() => {
  el = document.createElement('minimal-example');
  document.body.appendChild(el);
  // Wait for two animation frames to ensure runtime is initialized
  return waitForRender();
  });

  it('renders initial state correctly', () => {
    const html = getShadowHtml(el);
    expect(html).toContain('Text Node Breaks: 0');
    expect(html).toContain('<span>0</span>');
    expect(html).toContain('Count: 0');
    // Ensure only one button and one span
    expect(el.shadowRoot?.querySelectorAll('button').length).toBe(1);
    expect(el.shadowRoot?.querySelectorAll('span').length).toBe(1);
  });

  it('updates state and re-renders on button click', async () => {
    const button = el.shadowRoot?.querySelector('button');
    expect(button).toBeTruthy();
    button?.click();
    await waitForRender(); // Wait for re-render
    const html = getShadowHtml(el);
    expect(html).toContain('Text Node Breaks: 1');
    expect(html).toContain('<span>1</span>');
    expect(html).toContain('Count: 1');
    expect(el.shadowRoot?.querySelectorAll('button').length).toBe(1);
    expect(el.shadowRoot?.querySelectorAll('span').length).toBe(1);
  });

  it('updates state and re-renders when count attribute is changed', async () => {
    el.setAttribute('count', '5');
    await Promise.resolve(); // Wait for re-render
    const html = getShadowHtml(el);
    expect(html).toContain('Text Node Breaks: 5');
    expect(html).toContain('<span>5</span>');
    expect(html).toContain('Count: 5');
    expect(el.shadowRoot?.querySelectorAll('button').length).toBe(1);
    expect(el.shadowRoot?.querySelectorAll('span').length).toBe(1);
  });

  it('updates state and re-renders when state is changed directly', async () => {
    await waitForRender(); // Ensure runtime is initialized
    (el as any).api.state.count = 7;
    await waitForRender(); // Wait for re-render
    const html = getShadowHtml(el);
    expect(html).toContain('Text Node Breaks: 7');
    expect(html).toContain('<span>7</span>');
    expect(html).toContain('Count: 7');
    expect(el.shadowRoot?.querySelectorAll('button').length).toBe(1);
    expect(el.shadowRoot?.querySelectorAll('span').length).toBe(1);
  });

  it('does not render duplicate elements or text nodes after multiple updates', async () => {
    await waitForRender(); // Ensure runtime is initialized
    for (let i = 0; i < 3; i++) {
      (el as any).api.state.count = i;
      await waitForRender();
    }
    const html = getShadowHtml(el);
    expect(el.shadowRoot?.querySelectorAll('button').length).toBe(1);
    expect(el.shadowRoot?.querySelectorAll('span').length).toBe(1);
    expect(html).toContain('Text Node Breaks: 2');
    expect(html).toContain('<span>2</span>');
    expect(html).toContain('Count: 2');
    // Ensure no duplicate text nodes for 'Text Node Breaks: ...' inside the <div>
    const div = el.shadowRoot?.querySelector('div');
    const textNodes = div ? Array.from(div.childNodes).filter(
      n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()
    ) : [];
    // Should only have one 'Text Node Breaks: ...' text node inside the <div>
    const textBreaksCount = textNodes.filter(n => n.textContent?.includes('Text Node Breaks:')).length;
    expect(textBreaksCount).toBe(1);
  });
});
