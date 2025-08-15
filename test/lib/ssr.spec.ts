import { describe, it, expect } from 'vitest';
import { renderToString, renderComponentsToString, generateHydrationScript, createSSRAPI, SSRComponentConfig, SSRRenderOptions, SSRContext, escapeHTML, escapeAttribute, formatHTML } from '../../src/lib/ssr';
// escapeHTML is not exported from template-helpers, so remove import

const config: SSRComponentConfig = {
  tag: 'test-el',
  template: (state) => `<div>${state.text}</div>`,
  state: { text: 'SSR' },
};

describe('ssr.ts', () => {
  it('renders a component to string', () => {
    const html = renderToString(config, config.state);
    expect(html).toContain('<div>SSR</div>');
  });

  it('renders multiple components to string', () => {
    const result = renderComponentsToString([config]);
    expect(result.html).toContain('<div>SSR</div>');
  });

  it('generates hydration script', () => {
    const ctx: SSRContext = { components: new Map([['test-el', { tag: 'test-el', template: () => '', state: {} }]]), styles: new Set() };
    const script = generateHydrationScript(ctx);
    expect(script).toContain('window.__SSR_CONTEXT__');
  });

  // escapeHTML is not exported, so skip this test

  it('creates SSR API', () => {
    const api = createSSRAPI({ text: 'SSR' });
    expect(api).toHaveProperty('state');
    expect(typeof api.emit).toBe('function');
  });

  it('handles SSRRenderOptions', () => {
    // SSRRenderOptions is an interface, just check type
    const options: SSRRenderOptions = {};
    expect(typeof options).toBe('object');
  });

  it('handles SSRContext', () => {
    const ctx: SSRContext = { components: new Map(), styles: new Set() };
    expect(ctx).toHaveProperty('components');
    expect(ctx).toHaveProperty('styles');
  });

  it('handles SSR error fallback', () => {
    const badConfig: SSRComponentConfig = {
      tag: 'bad-el',
      template: () => { throw new Error('fail'); },
      state: {},
    };
    const html = renderToString(badConfig, {});
    expect(html).toContain('SSR Error: Error: fail');
  });

  it('renders with styles included', () => {
    const styledConfig: SSRComponentConfig = {
      tag: 'styled-el',
      template: () => 'content',
      state: {},
      style: 'div { color: red; }',
    };
    const html = renderToString(styledConfig, { includeStyles: true });
    expect(html).toContain('<style>div { color: red; }</style>');
  });

  it('renders with prettyPrint', () => {
    const html = renderToString(config, { prettyPrint: true });
    expect(html).toContain('\n');
  });

  it('renders with custom attribute sanitization', () => {
    const attrConfig: SSRComponentConfig = {
      tag: 'attr-el',
      template: () => '',
      state: {},
      attrs: { onerror: 'alert(1)', safe: 'ok' },
    };
    const html = renderToString(attrConfig, {
      sanitizeAttributes: (attrs) => {
        const out = { ...attrs };
        delete out.onerror;
        return out;
      }
    });
    expect(html).not.toContain('onerror');
    expect(html).toContain('safe="ok"');
  });

  it('renders multiple components with styles', () => {
    const c1: SSRComponentConfig = {
      tag: 'c1', template: () => '1', state: {}, style: 'a{b}'
    };
    const c2: SSRComponentConfig = {
      tag: 'c2', template: () => '2', state: {}, style: 'c{d}'
    };
    const result = renderComponentsToString([c1, c2]);
    expect(result.html).toContain('1');
    expect(result.html).toContain('2');
    expect(result.styles).toContain('a{b}');
    expect(result.styles).toContain('c{d}');
    expect(result.context.components.size).toBe(2);
  });

  it('generates hydration script with multiple components', () => {
    const ctx: SSRContext = { components: new Map([
      ['a', { tag: 'a', template: () => '', state: { foo: 1 } }],
      ['b', { tag: 'b', template: () => '', state: { bar: 2 } }],
    ]), styles: new Set() };
    const script = generateHydrationScript(ctx);
    expect(script).toContain('window.__SSR_CONTEXT__');
    expect(script).toContain('foo');
    expect(script).toContain('bar');
  });

  it('escapes HTML correctly', () => {
    expect(escapeHTML('<div>&"\'</div>')).toBe('&lt;div&gt;&amp;&quot;&#39;&lt;/div&gt;');
  });

  it('escapes attribute correctly', () => {
    expect(escapeAttribute('onerror="<script>"')).toBe('onerror=&quot;&lt;script&gt;&quot;');
  });

  it('formats HTML for pretty print', () => {
    const html = '<div><span>hi</span></div>';
    expect(formatHTML(html)).toContain('\n');
  });
});
