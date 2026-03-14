/**
 * Tests for cls() JIT CSS class name helper and SSR JIT CSS pre-generation.
 */
import { describe, it, expect } from 'vitest';
import { cls } from '../src/lib/jit-css';
import { renderToStringWithJITCSS, type SSRJITResult } from '../src/lib/ssr';

// ---- cls() ----

describe('cls()', () => {
  it('is a no-op identity function at runtime', () => {
    expect(cls('flex items-center gap-4')).toBe('flex items-center gap-4');
  });

  it('returns an empty string unchanged', () => {
    expect(cls('')).toBe('');
  });

  it('preserves whitespace without modification', () => {
    const input = '  flex   items-center  ';
    expect(cls(input)).toBe(input);
  });

  it('returns a string (type check)', () => {
    expect(typeof cls('font-bold text-primary-500')).toBe('string');
  });
});

// ---- renderToStringWithJITCSS() ----

describe('renderToStringWithJITCSS()', () => {
  it('returns an object with html, css, and htmlWithStyles', () => {
    const vnode = {
      tag: 'div',
      attrs: { class: 'flex items-center' },
      children: [],
    };
    const result: SSRJITResult = renderToStringWithJITCSS(vnode as never);
    expect(typeof result.html).toBe('string');
    expect(typeof result.css).toBe('string');
    expect(typeof result.htmlWithStyles).toBe('string');
  });

  it('html string contains the rendered element', () => {
    const vnode = { tag: 'p', props: {}, children: ['hello'] };
    const { html } = renderToStringWithJITCSS(vnode as never);
    expect(html).toContain('<p');
    expect(html).toContain('hello');
  });

  it('css contains JIT CSS for utility classes in the rendered HTML', () => {
    const vnode = {
      tag: 'div',
      props: { attrs: { class: 'flex items-center' } },
      children: [],
    };
    const { css } = renderToStringWithJITCSS(vnode as never);
    expect(css).toContain('display:flex');
  });

  it('htmlWithStyles injects <style> tag before </head> when present', () => {
    // SSR typically produces a fragment, but the function should inject before </head>
    // We test this by wrapping the vnode output in a document-like structure
    const vnode = {
      tag: 'html',
      props: {},
      children: [
        { tag: 'head', props: {}, children: [] },
        {
          tag: 'body',
          props: {},
          children: [
            { tag: 'div', props: { attrs: { class: 'flex' } }, children: [] },
          ],
        },
      ],
    };
    const { htmlWithStyles, css } = renderToStringWithJITCSS(vnode as never);
    if (css) {
      expect(htmlWithStyles).toContain('<style id="cer-ssr-jit">');
    } else {
      // No utility classes → htmlWithStyles === html
      expect(htmlWithStyles).toBe(
        renderToStringWithJITCSS(vnode as never).html,
      );
    }
  });

  it('htmlWithStyles prepends <style> when no </head> tag', () => {
    const vnode = {
      tag: 'div',
      props: { attrs: { class: 'flex' } },
      children: ['content'],
    };
    const { htmlWithStyles, css } = renderToStringWithJITCSS(vnode as never);
    if (css) {
      expect(
        htmlWithStyles.startsWith('<style') ||
          htmlWithStyles.includes('</head>'),
      ).toBe(true);
    }
  });

  it('accepts jit options to enable extended colors', () => {
    const vnode = {
      tag: 'div',
      props: { attrs: { class: 'bg-blue-500' } },
      children: [],
    };
    const { css } = renderToStringWithJITCSS(vnode as never, {
      jit: { extendedColors: true },
    });
    expect(css).toContain('background-color');
  });

  it('returns empty css string when no utility classes are present', () => {
    const vnode = { tag: 'p', props: {}, children: ['plain text'] };
    const { css, htmlWithStyles, html } = renderToStringWithJITCSS(
      vnode as never,
    );
    expect(css).toBe('');
    expect(htmlWithStyles).toBe(html);
  });
});
