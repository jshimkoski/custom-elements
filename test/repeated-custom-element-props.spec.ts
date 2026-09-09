import { afterEach, describe, expect, it } from 'vitest';
import { component, html, nextTick, useProps } from '../src/lib';

describe('repeated custom-element prop reconciliation', () => {
  afterEach(() => document.body.replaceChildren());

  it('updates the intended child when one repeated boolean prop changes', async () => {
    component('test-section-link', () => {
      const props = useProps({ label: '', selected: false });
      return html`
        <a :aria-current="${props.selected ? 'page' : null}">${props.label}</a>
      `;
    });

    component('test-section-list', () => {
      const props = useProps({ active: 'summary' });
      const sections = ['history', 'settings', 'players', 'summary'];
      return html`
        <nav>
          ${sections.map((section) => html`
            <test-section-link
              :label="${section}"
              :selected="${props.active === section}"
            ></test-section-link>
          `)}
        </nav>
      `;
    });

    const host = document.createElement('test-section-list') as HTMLElement & {
      active: string;
    };
    document.body.append(host);
    await nextTick();

    const links = () => [
      ...(host.shadowRoot?.querySelectorAll('test-section-link') ?? []),
    ];
    expect(
      links().map((item) => item.shadowRoot?.querySelector('a')?.getAttribute('aria-current')),
    ).toEqual([null, null, null, 'page']);

    host.active = 'history';
    await nextTick();

    expect(
      links().map((item) => item.shadowRoot?.querySelector('a')?.getAttribute('aria-current')),
    ).toEqual(['page', null, null, null]);
  });
});
