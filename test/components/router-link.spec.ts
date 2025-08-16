import { describe, it, expect, beforeEach } from 'vitest';
import { html, component } from '../../src/lib/runtime';
import { initRouter } from '../../src/lib/runtime';

describe('<router-link> attribute reflection (hosted)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // Ensure router-link is registered and available
    initRouter({ routes: [], base: '/' });
  });

  it('reflects camelCase attributes and DOM', async () => {
    // Register router-host after router-link is available
    component('router-host', {
      state: {
        to: '/foo',
        exactActiveClass: 'active-camel',
        ariaCurrentValue: 'step',
        external: 'true',
        disabled: 'true',
        style: 'a { color: red; }',
      },
      reflect: [
        'to',
        'exactActiveClass',
        'ariaCurrentValue',
        'external',
        'disabled',
        'style'
      ],
      template: (state) => html`
        <router-link
          to="${state.to}"
          exact-active-class="${state.exactActiveClass}"
          aria-current-value="${state.ariaCurrentValue}"
          external="${state.external}"
          disabled="${state.disabled}"
          style="${state.style}"
        >CamelCase</router-link>
      `(state),
    });
    const host = document.createElement('router-host');
    document.body.appendChild(host);
    await customElements.whenDefined('router-host');
    // Wait for router-link to be defined and shadow DOM to be available
    let link;
    for (let i = 0; i < 20; i++) {
      link = host.shadowRoot?.querySelector('router-link');
      if (link && link.shadowRoot) break;
      await new Promise(r => setTimeout(r, 25));
    }
    expect(link?.getAttribute('to')).toBe('/foo');
    expect(link?.getAttribute('exact-active-class')).toBe('active-camel');
    expect(link?.getAttribute('aria-current-value')).toBe('step');
    expect(link?.getAttribute('external')).toBe('true');
    expect(link?.getAttribute('disabled')).toBe('true');
    expect(link?.getAttribute('style')).toContain('color: red');
    // DOM output
    const linkShadow = link?.shadowRoot;
    expect(linkShadow?.querySelector('a')).toBeTruthy();
    expect(linkShadow?.querySelector('a')?.getAttribute('href')).toBe('/foo');
    expect(linkShadow?.querySelector('style')?.textContent).toContain('color: red');
  });

  it('renders as a button when tag="button"', async () => {
    component('router-host-button', {
      template: () => html`
        <router-link
          to="/bar"
          tag="button"
        >ButtonTest</router-link>
      `(),
    });
    const host = document.createElement('router-host-button');
    document.body.appendChild(host);
    await customElements.whenDefined('router-host-button');
    let link;
    for (let i = 0; i < 20; i++) {
      link = host.shadowRoot?.querySelector('router-link');
      if (link && link.shadowRoot) break;
      await new Promise(r => setTimeout(r, 25));
    }
    // DOM output
    const linkShadow = link?.shadowRoot;
    console.log(linkShadow?.innerHTML);
    expect(linkShadow?.querySelector('button')).toBeTruthy();
  });
});
