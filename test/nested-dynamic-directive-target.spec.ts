import { describe, expect, it } from 'vitest';
import { html } from '../src/lib/runtime/template-compiler';
import { vdomRenderer } from '../src/lib/runtime/vdom';

describe('removed dynamic directive output', () => {
  it('removes a parent :class when a same-tag template shape moves it to a child', () => {
    const classNames = {
      'list-item': true,
      selected: true,
      'density-compact': true,
    };
    const textVNode = html`
      <div :class="${classNames}" :role="${'listitem'}">
        <div class="content">
          <div class="headline">Target</div>
        </div>
      </div>
    `;
    const linkVNode = html`
      <div :role="${null}">
        <a :class="${classNames}" :href="${'#target'}">
          <div class="content">
            <div class="headline">Target</div>
          </div>
        </a>
      </div>
    `;
    const root = document.createElement('div').attachShadow({ mode: 'open' });

    // A newly constructed custom element renders from default props before the
    // parent renderer applies attributes. md-list-item therefore renders its
    // text variant first, then switches to the nested link variant.
    vdomRenderer(root, textVNode);
    vdomRenderer(root, linkVNode);

    const wrapper = root.firstElementChild;
    const anchor = wrapper?.firstElementChild;
    expect(wrapper?.className).toBe('');
    expect(anchor?.classList.contains('list-item')).toBe(true);
    expect(anchor?.classList.contains('selected')).toBe(true);
    expect(anchor?.getAttribute('href')).toBe('#target');
  });

  it('removes stale dynamic styles when a same-tag template shape changes', () => {
    const styledVNode = html`
      <div :style="${{ paddingLeft: '16px', color: 'red' }}">Text</div>
    `;
    const plainVNode = html`<div><span>Link</span></div>`;
    const root = document.createElement('div').attachShadow({ mode: 'open' });

    vdomRenderer(root, styledVNode);
    expect(root.firstElementChild?.getAttribute('style')).toContain(
      'padding-left: 16px',
    );

    vdomRenderer(root, plainVNode);

    expect(root.firstElementChild?.getAttribute('style')).toBeNull();
  });
});
