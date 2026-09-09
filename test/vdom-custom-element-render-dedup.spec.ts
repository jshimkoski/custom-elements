import { afterEach, describe, expect, it, vi } from 'vitest';
import { component, html, useProps } from '../src/lib';
import { patchProps } from '../src/lib/runtime/vdom-patch';

describe('custom-element VDOM render deduplication', () => {
  afterEach(() => document.body.replaceChildren());

  it('updates host listeners without re-rendering the child component', async () => {
    const tag = 'test-listener-only-child-update';
    const render = vi.fn(() => {
      const props = useProps({ label: 'same' });
      return html`<span>${props.label}</span>`;
    });
    component(tag, render);
    const host = document.createElement(tag) as HTMLElement;
    document.body.append(host);
    const rendersBeforePatch = render.mock.calls.length;
    const oldClick = vi.fn();
    const newClick = vi.fn();

    patchProps(
      host,
      { props: { label: 'same', onClick: oldClick }, isCustomElement: true },
      { props: { label: 'same', onClick: newClick }, isCustomElement: true },
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(render).toHaveBeenCalledTimes(rendersBeforePatch);
    host.click();
    expect(newClick).toHaveBeenCalledOnce();
  });

  it('renders once when a declared child prop actually changes', async () => {
    const tag = 'test-single-child-prop-update';
    const render = vi.fn(() => {
      const props = useProps({ label: 'before' });
      return html`<span>${props.label}</span>`;
    });
    component(tag, render);
    const host = document.createElement(tag) as HTMLElement;
    document.body.append(host);
    const rendersBeforePatch = render.mock.calls.length;

    patchProps(
      host,
      { props: { label: 'before' }, isCustomElement: true },
      { props: { label: 'after' }, isCustomElement: true },
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(render).toHaveBeenCalledTimes(rendersBeforePatch + 1);
    expect(host.shadowRoot?.textContent).toContain('after');
  });
});
