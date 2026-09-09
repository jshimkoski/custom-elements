import { describe, expect, it } from 'vitest';
import { html } from '../src/lib';
import { renderToStringDSD } from '../src/lib/runtime/vdom-ssr-dsd';
import { vdomRenderer } from '../src/lib/runtime/vdom';
import type { VNode } from '../src/lib/runtime/types';

describe('boolean-valued ARIA and enumerated attributes', () => {
  it('serializes ARIA booleans as values while preserving HTML boolean presence semantics', () => {
    const tree = html`<button
      aria-haspopup="true"
      aria-expanded="false"
      contenteditable="false"
      disabled="false"
    >Menu</button>` as VNode;
    const root = document.createElement('div').attachShadow({ mode: 'open' });

    vdomRenderer(root, tree);
    const button = root.querySelector('button')!;

    expect(button.getAttribute('aria-haspopup')).toBe('true');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('contenteditable')).toBe('false');
    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('keeps dynamic false ARIA values instead of removing the attribute', () => {
    const tree = html`<button aria-expanded="${false}">Menu</button>` as VNode;
    const root = document.createElement('div').attachShadow({ mode: 'open' });

    vdomRenderer(root, tree);

    expect(root.querySelector('button')?.getAttribute('aria-expanded')).toBe('false');
  });

  it('uses the same semantics during SSR', () => {
    const tree = html`<button aria-expanded="false" disabled="false">Menu</button>` as VNode;
    const output = renderToStringDSD(tree, { dsdPolyfill: false });

    expect(output).toContain('aria-expanded="false"');
    expect(output).not.toContain('disabled');
  });
});
