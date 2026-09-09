/**
 * Tests for Declarative Shadow DOM (DSD) SSR rendering.
 *
 * Covers:
 *  - renderToStringDSD: DSD output for registered custom elements
 *  - renderToStringWithJITCSSDSD: DSD + CSS layer extraction
 *  - renderToStream: ReadableStream API
 *  - renderToStreamWithJITCSSDSD: convenience streaming DSD alias
 *  - SSRJITResult.globalStyles: useGlobalStyle() capture
 *  - Partial hydration: data-cer-hydrate attribute emission
 *  - Backwards-compatibility: non-DSD path unchanged
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  renderToStringDSD,
  renderToStringWithJITCSS,
  renderToStringWithJITCSSDSD,
  renderToStream,
  renderToStreamWithJITCSSDSD,
  DSD_POLYFILL_SCRIPT,
  shareRepeatedDeclarativeShadowStyles,
  type SSRJITResult,
} from '../src/lib/ssr';
import { renderToDSD } from '../src/lib/runtime/vdom-ssr-dsd';
import { registry } from '../src/lib/runtime/component/registry';
import { useStyle, useProps, useGlobalStyle } from '../src/lib/runtime/hooks';
import {
  registerSuspense,
  registerErrorBoundary,
} from '../src/lib/runtime/builtin-components';
import { registerKeepAlive } from '../src/lib/keep-alive';
import { html } from '../src/lib';

// ---------------------------------------------------------------------------
// Prose CSS inlining in DSD shadow style block
// ---------------------------------------------------------------------------

describe('buildShadowStyleBlock prose CSS inlining', () => {
  it('includes prose CSS inline when shadow HTML contains prose class', () => {
    const TAG = 'cer-prose-inline-test';
    registry.set(TAG, {
      props: {},
      render: () =>
        ({
          tag: 'article',
          props: { attrs: { class: 'prose' } },
          children: [{ tag: 'p', props: {}, children: 'Hello' }],
        }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const html = renderToStringDSD(vnode as never, { dsdPolyfill: false });
    // The <style> block inside the DSD template must contain prose CSS rules
    // (not just the empty placeholder that jitCSS emits for the singleton sheet).
    expect(html).toContain('.prose');
    // Verify actual prose rules are present, not just the empty placeholder
    const templateMatch = html.match(/<template shadowrootmode="open">([\s\S]*?)<\/template>/);
    expect(templateMatch).toBeTruthy();
    const shadowContent = templateMatch![1];
    // The prose CSS should include child element rules (h1, p, etc.)
    expect(shadowContent).toMatch(/\.prose\s+[hp]|\.prose\s*\{/);
  });

  it('emits base prose CSS before JIT variants so dark mode wins the cascade', () => {
    const TAG = 'cer-prose-dark-cascade-test';
    registry.set(TAG, {
      props: {},
      render: () =>
        ({
          tag: 'article',
          props: { attrs: { class: 'prose dark:prose-invert' } },
          children: [{ tag: 'p', props: {}, children: 'Dark prose' }],
        }) as never,
    });

    const html = renderToStringDSD(
      { tag: TAG, props: { attrs: {} }, children: [] } as never,
      { dsdPolyfill: false },
    );
    const shadowContent = html.match(
      /<template shadowrootmode="open">([\s\S]*?)<\/template>/,
    )?.[1] ?? '';
    const baseProseIndex = shadowContent.indexOf(
      '.prose{--cer-prose-body:var(--cer-color-neutral-900)',
    );
    const darkProseIndex = shadowContent.indexOf('.dark\\:prose-invert{');

    expect(baseProseIndex).toBeGreaterThan(-1);
    expect(darkProseIndex).toBeGreaterThan(-1);
    expect(baseProseIndex).toBeLessThan(darkProseIndex);
  });

  it('does not leak prose CSS into a later shadow root without a prose class', () => {
    const PROSE_TAG = 'cer-prose-leak-source';
    const PLAIN_TAG = 'cer-prose-leak-target';

    registry.set(PROSE_TAG, {
      props: {},
      render: () =>
        ({
          tag: 'article',
          props: { attrs: { class: 'prose' } },
          children: [{ tag: 'p', props: {}, children: 'Prose' }],
        }) as never,
    });
    registry.set(PLAIN_TAG, {
      props: {},
      render: () =>
        ({
          tag: 'div',
          props: { attrs: { class: 'flex gap-4' } },
          children: ['Plain'],
        }) as never,
    });

    renderToStringDSD(
      { tag: PROSE_TAG, props: { attrs: {} }, children: [] } as never,
      { dsdPolyfill: false },
    );
    const html = renderToStringDSD(
      { tag: PLAIN_TAG, props: { attrs: {} }, children: [] } as never,
      { dsdPolyfill: false },
    );
    const shadowContent = html.match(
      /<template shadowrootmode="open">([\s\S]*?)<\/template>/,
    )?.[1];

    expect(shadowContent).toBeTruthy();
    expect(shadowContent).not.toContain('.prose');
  });

  it('does not repeat inheritable design-token declarations in every shadow root', () => {
    const TAG = 'cer-dsd-compact-reset';
    registry.set(TAG, {
      props: {},
      render: () =>
        ({
          tag: 'div',
          props: { attrs: { class: 'text-primary-500' } },
          children: ['Compact'],
        }) as never,
    });

    const html = renderToStringDSD(
      { tag: TAG, props: { attrs: {} }, children: [] } as never,
      { dsdPolyfill: false },
    );
    const shadowContent = html.match(
      /<template shadowrootmode="open">([\s\S]*?)<\/template>/,
    )?.[1];

    expect(shadowContent).toBeTruthy();
    expect(shadowContent).toContain('box-sizing:border-box');
    expect(shadowContent).not.toContain('--cer-color-primary-500:#3b82f6');
    expect(shadowContent!.length).toBeLessThan(8_000);
  });

  it('matches the client fragment wrapper for multi-root component output', () => {
    const TAG = 'cer-dsd-multi-root-parity';
    registry.set(TAG, {
      props: {},
      render: () =>
        [
          { tag: 'span', props: {}, children: 'A' },
          { tag: 'span', props: {}, children: 'B' },
        ] as never,
    });

    const html = renderToStringDSD(
      { tag: TAG, props: { attrs: {} }, children: [] } as never,
      { dsdPolyfill: false },
    );
    const shadowContent = html.match(
      /<template shadowrootmode="open">([\s\S]*?)<\/template>/,
    )?.[1];

    expect(shadowContent).toMatch(
      /<\/style><div><span>A<\/span><span>B<\/span><\/div>$/,
    );
  });

  it('includes flex/gap utilities without prose rules when no prose class is used (before any prose registration)', () => {
    // This test must run before any prose class is registered in this describe block.
    // Note: detectedProseSizes is module-level, so once prose is registered by any test
    // in the suite, getProseSheet() will always return a non-null value. This test
    // verifies that JIT CSS works correctly for non-prose utility classes.
    const TAG = 'cer-no-prose-utilities-test';
    registry.set(TAG, {
      props: {},
      render: () =>
        ({
          tag: 'div',
          props: { attrs: { class: 'flex gap-4 text-sm' } },
          children: [],
        }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const html = renderToStringDSD(vnode as never, { dsdPolyfill: false });
    const templateMatch = html.match(/<template shadowrootmode="open">([\s\S]*?)<\/template>/);
    expect(templateMatch).toBeTruthy();
    const shadowContent = templateMatch![1];
    // Utility classes for flex, gap-4, and text-sm should be present
    expect(shadowContent).toContain('.flex');
    expect(shadowContent).toContain('.gap-4');
    expect(shadowContent).toContain('.text-sm');
  });
});

describe('declarative shadow style sharing', () => {
  it('escapes style payloads that could otherwise terminate the JSON script', () => {
    const dangerousStyle = ':host{--value:"</script><script>bad()</script>"}';
    const result = shareRepeatedDeclarativeShadowStyles(
      `<x-test><template shadowrootmode="open"><style>${dangerousStyle}</style></template></x-test>` +
        `<x-test><template shadowrootmode="open"><style>${dangerousStyle}</style></template></x-test>`,
    );

    expect(result).not.toContain('</script><script>bad()');
    expect(result).toContain('\\u003c/script>');
  });

  it('emits repeated shadow CSS once and references a shared stylesheet', () => {
    const TAG = 'cer-shared-dsd-style';
    registry.set(TAG, {
      props: {},
      render: () =>
        ({
          tag: 'div',
          props: { attrs: { class: 'flex gap-4' } },
          children: ['Shared'],
        }) as never,
    });

    const result = renderToStringWithJITCSSDSD(
      {
        tag: 'div',
        props: {},
        children: [
          { tag: TAG, props: { attrs: {} }, children: [] },
          { tag: TAG, props: { attrs: {} }, children: [] },
        ],
      } as never,
      { dsdPolyfill: false },
    );

    expect(result.htmlWithStyles).toContain('id="cer-shared-styles"');
    expect(result.htmlWithStyles).not.toContain('data-cer-style="');
    expect(result.htmlWithStyles.match(/data-cer-style-ref="0"/g)).toHaveLength(2);
    expect(result.htmlWithStyles.match(/data-cer-style-ref="1"/g)).toHaveLength(2);
    expect(result.htmlWithStyles).toContain('adoptedStyleSheets');
  });

  it('shares the common shadow reset even when component styles differ', () => {
    const FIRST = 'cer-shared-reset-first';
    const SECOND = 'cer-shared-reset-second';
    registry.set(FIRST, {
      props: {},
      render: () => {
        useStyle(() => ':host { color: red; }');
        return { tag: 'span', props: {}, children: ['First'] } as never;
      },
    });
    registry.set(SECOND, {
      props: {},
      render: () => {
        useStyle(() => ':host { color: blue; }');
        return { tag: 'span', props: {}, children: ['Second'] } as never;
      },
    });

    const result = renderToStringWithJITCSSDSD(
      {
        tag: 'div',
        props: {},
        children: [
          { tag: FIRST, props: { attrs: {} }, children: [] },
          { tag: SECOND, props: { attrs: {} }, children: [] },
        ],
      } as never,
      { dsdPolyfill: false },
    );

    expect(result.htmlWithStyles).toContain('color:red');
    expect(result.htmlWithStyles).toContain('color:blue');
    expect(result.htmlWithStyles.match(/data-cer-style-ref="0"/g)).toHaveLength(2);
  });

  it('keeps unique shadow CSS inline instead of paying for the sharing bootstrap', () => {
    const TAG = 'cer-unique-dsd-style-payload';
    registry.set(TAG, {
      props: {},
      render: () => {
        useStyle(() => ':host { color: rebeccapurple; }');
        return { tag: 'span', props: {}, children: ['Unique'] } as never;
      },
    });

    const result = renderToStringWithJITCSSDSD(
      { tag: TAG, props: { attrs: {} }, children: [] } as never,
      { dsdPolyfill: false },
    );

    expect(result.htmlWithStyles).not.toContain('id="cer-shared-styles"');
    expect(result.htmlWithStyles).toContain('rebeccapurple');
    expect(result.htmlWithStyles).toContain('<style>:host{color:rebeccapurple}');
  });
});

// ---------------------------------------------------------------------------
// :class and :style directive handling in SSR renderers
// ---------------------------------------------------------------------------

describe('SSR :class directive processing', () => {
  it('renderToDSD applies :class object syntax to regular elements', () => {
    const vnode = {
      tag: 'header',
      props: {
        attrs: {},
        directives: { class: { value: { 'app-bar': true, small: true, collapsed: false }, modifiers: [] } },
      },
      children: [],
    };
    const html = renderToDSD(vnode as never, { dsd: true });
    expect(html).toContain('class="app-bar small"');
    expect(html).not.toContain('collapsed');
  });

  it('renderToDSD merges static class with :class directive', () => {
    const vnode = {
      tag: 'div',
      props: {
        attrs: { class: 'base' },
        directives: { class: { value: { active: true }, modifiers: [] } },
      },
      children: [],
    };
    const html = renderToDSD(vnode as never, { dsd: true });
    expect(html).toContain('class="base active"');
  });

  it('renderToStringDSD emits :class inside component shadow DOM', () => {
    const TAG = 'cer-class-dir-test';
    registry.set(TAG, {
      props: {},
      render: () =>
        ({
          tag: 'header',
          props: {
            attrs: {},
            directives: { class: { value: { 'app-bar': true, small: true }, modifiers: [] } },
          },
          children: [],
        }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const html = renderToStringDSD(vnode as never, { dsdPolyfill: false });
    expect(html).toContain('class="app-bar small"');
  });
});

// ---------------------------------------------------------------------------
// DSD polyfill constant
// ---------------------------------------------------------------------------

describe('DSD_POLYFILL_SCRIPT', () => {
  it('is a non-empty string', () => {
    expect(typeof DSD_POLYFILL_SCRIPT).toBe('string');
    expect(DSD_POLYFILL_SCRIPT.length).toBeGreaterThan(0);
  });

  it('contains the shadowRootMode feature-detect', () => {
    expect(DSD_POLYFILL_SCRIPT).toContain('shadowRootMode');
  });

  it('contains attachShadow', () => {
    expect(DSD_POLYFILL_SCRIPT).toContain('attachShadow');
  });
});

// ---------------------------------------------------------------------------
// renderToStringDSD — registered custom elements
// ---------------------------------------------------------------------------

describe('renderToStringDSD()', () => {
  const TAG = 'cer-dsd-card';

  beforeEach(() => {
    registry.set(TAG, {
      props: {},
      render: () =>
        ({
          tag: 'div',
          props: { attrs: { class: 'card' } },
          children: [],
        }) as never,
    });
  });

  it('wraps registered custom element in DSD template', () => {
    const vnode = {
      tag: TAG,
      props: { attrs: { title: 'Hello' }, isCustomElement: true },
      children: [],
    };
    const html = renderToStringDSD(vnode as never);
    expect(html).toContain(`<${TAG}`);
    expect(html).toContain('<template shadowrootmode="open">');
    expect(html).toContain('</template>');
    expect(html).toContain(`</${TAG}>`);
  });

  it('shadow DOM contains the component render output', () => {
    const vnode = {
      tag: TAG,
      props: { attrs: {} },
      children: [],
    };
    const result = renderToStringDSD(vnode as never);
    // The shadow template should contain the inner div rendered by the component
    expect(result).toContain('<div');
  });

  it('includes a <style> block inside the template', () => {
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const result = renderToStringDSD(vnode as never);
    // The DSD template should have a style block with at least the baseReset
    expect(result).toContain('<style>');
  });

  it('serialises host element attributes', () => {
    const vnode = {
      tag: TAG,
      props: { attrs: { 'data-id': '42', title: 'test' } },
      children: [],
    };
    const result = renderToStringDSD(vnode as never);
    expect(result).toContain('data-id="42"');
    expect(result).toContain('title="test"');
  });

  it('renders light DOM children outside the template', () => {
    const vnode = {
      tag: TAG,
      props: { attrs: {} },
      children: [{ tag: 'p', props: {}, children: ['slotted'] }],
    };
    const result = renderToStringDSD(vnode as never);
    // slotted content is outside the <template>
    const afterTemplate = result.split('</template>')[1];
    expect(afterTemplate).toContain('<p>');
    expect(afterTemplate).toContain('slotted');
  });

  it('falls through to plain serialisation for unregistered tags', () => {
    const vnode = { tag: 'my-unknown-el', props: { attrs: {} }, children: [] };
    const result = renderToStringDSD(vnode as never);
    // Unregistered element — no DSD template, but still has a wrapper template
    // because it starts with a hyphen (custom-element-ish).
    // Actually: isRegisteredCustomElement checks registry.has(), so it falls through.
    expect(result).toContain('my-unknown-el');
  });

  it('does not emit DSD template for regular HTML elements', () => {
    const vnode = {
      tag: 'section',
      props: { attrs: { class: 'wrapper' } },
      children: [{ tag: 'p', props: {}, children: ['text'] }],
    };
    // dsdPolyfill: false so the polyfill script (which mentions shadowrootmode)
    // is not appended — we're only checking whether the element itself got a DSD wrapper.
    const result = renderToStringDSD(vnode as never, { dsdPolyfill: false });
    expect(result).not.toContain('shadowrootmode');
    expect(result).toContain('<section');
    expect(result).toContain('<p>');
  });

  it('appends DSD polyfill script by default', () => {
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const result = renderToStringDSD(vnode as never);
    expect(result).toContain(DSD_POLYFILL_SCRIPT);
  });

  it('omits polyfill when dsdPolyfill: false', () => {
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const result = renderToStringDSD(vnode as never, { dsdPolyfill: false });
    expect(result).not.toContain('shadowRootMode');
  });
});

// ---------------------------------------------------------------------------
// useStyle() CSS extraction inside DSD template
// ---------------------------------------------------------------------------

describe('renderToStringDSD() — useStyle CSS extraction', () => {
  const TAG = 'cer-dsd-styled';

  beforeEach(() => {
    registry.set(TAG, {
      props: {},
      render: () => {
        useStyle(() => ':host { display: block; background: red; }');
        return { tag: 'span', props: {}, children: [] } as never;
      },
    });
  });

  it('embeds useStyle output inside the shadow <style> block', () => {
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const result = renderToStringDSD(vnode as never, { dsdPolyfill: false });
    expect(result).toContain('display:block');
    // background should appear inside the template, not outside
    const templateContent =
      result.match(
        /<template shadowrootmode="open">([\s\S]*?)<\/template>/,
      )?.[1] ?? '';
    expect(templateContent).toContain('background');
  });
});

// ---------------------------------------------------------------------------
// useProps() integration in SSR context
// ---------------------------------------------------------------------------

describe('renderToStringDSD() — useProps integration', () => {
  const TAG = 'cer-dsd-props';

  beforeEach(() => {
    registry.set(TAG, {
      props: { theme: { type: String, default: 'light' } },
      render: () => {
        const props = useProps({ theme: 'light' });
        // Use a distinctive marker so we can verify the right branch was taken
        // regardless of whether CSS is minified (spaces removed).
        const bg = props.theme === 'dark' ? 'black' : 'white';
        useStyle(() => `:host{--test-bg:${bg}}`);
        return { tag: 'div', props: {}, children: [] } as never;
      },
    });
  });

  it('uses prop values from attrs in useStyle output', () => {
    const vnode = {
      tag: TAG,
      props: { attrs: { theme: 'dark' } },
      children: [],
    };
    const result = renderToStringDSD(vnode as never, { dsdPolyfill: false });
    expect(result).toContain('--test-bg:black');
  });

  it('falls back to default prop value when attr is absent', () => {
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const result = renderToStringDSD(vnode as never, { dsdPolyfill: false });
    expect(result).toContain('--test-bg:white');
  });
});

// ---------------------------------------------------------------------------
// renderToStringWithJITCSSDSD — convenience DSD + JIT alias
// ---------------------------------------------------------------------------

describe('renderToStringWithJITCSSDSD()', () => {
  it('returns SSRJITResult shape', () => {
    const vnode = {
      tag: 'div',
      props: { attrs: { class: 'flex' } },
      children: [],
    };
    const result: SSRJITResult = renderToStringWithJITCSSDSD(vnode as never);
    expect(typeof result.html).toBe('string');
    expect(typeof result.css).toBe('string');
    expect(typeof result.globalStyles).toBe('string');
    expect(typeof result.htmlWithStyles).toBe('string');
  });

  it('generates JIT CSS from rendered HTML', () => {
    const vnode = {
      tag: 'div',
      props: { attrs: { class: 'flex items-center gap-4' } },
      children: [],
    };
    const { css } = renderToStringWithJITCSSDSD(vnode as never, {
      jit: { extendedColors: false },
    });
    expect(css).toContain('display:flex');
  });

  it('does not duplicate shadow-scoped utilities in the document stylesheet', () => {
    const TAG = 'cer-dsd-jit-scope';
    registry.set(TAG, {
      props: {},
      render: () =>
        ({
          tag: 'div',
          props: { attrs: { class: 'flex items-center gap-4' } },
          children: [],
        }) as never,
    });

    const { css, htmlWithStyles } = renderToStringWithJITCSSDSD(
      { tag: TAG, props: { attrs: {} }, children: [] } as never,
      { dsdPolyfill: false },
    );

    expect(css).toBe('');
    expect(htmlWithStyles).not.toContain('<style id="cer-ssr-jit">');
    expect(htmlWithStyles).toContain('.items-center');
  });

  it('injects style tags into htmlWithStyles', () => {
    const vnode = {
      tag: 'html',
      props: {},
      children: [
        { tag: 'head', props: {}, children: [] },
        { tag: 'body', props: { attrs: { class: 'flex' } }, children: [] },
      ],
    };
    const { htmlWithStyles, css } = renderToStringWithJITCSSDSD(vnode as never);
    if (css) {
      expect(htmlWithStyles).toContain('<style id="cer-ssr-jit">');
      expect(htmlWithStyles.indexOf('<style')).toBeLessThan(
        htmlWithStyles.indexOf('</head>'),
      );
    }
  });

  it('appends polyfill script to htmlWithStyles', () => {
    const vnode = { tag: 'div', props: {}, children: [] };
    const { htmlWithStyles } = renderToStringWithJITCSSDSD(vnode as never);
    expect(htmlWithStyles).toContain(DSD_POLYFILL_SCRIPT);
  });
});

// ---------------------------------------------------------------------------
// SSRJITResult.globalStyles — useGlobalStyle capture
// ---------------------------------------------------------------------------

describe('renderToStringWithJITCSS() — globalStyles field', () => {
  it('result always has a globalStyles string', () => {
    const vnode = { tag: 'div', props: {}, children: [] };
    const result = renderToStringWithJITCSS(vnode as never);
    expect(typeof result.globalStyles).toBe('string');
  });

  it('captures useGlobalStyle() output from components during DSD render', () => {
    const TAG = 'cer-dsd-global-style';
    registry.set(TAG, {
      props: {},
      render: () => {
        useGlobalStyle(
          () =>
            '@font-face { font-family: "TestFont"; src: local("TestFont"); }',
        );
        return { tag: 'div', props: {}, children: [] } as never;
      },
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const result = renderToStringWithJITCSSDSD(vnode as never);
    expect(result.globalStyles).toContain('@font-face');
    expect(result.globalStyles).toContain('TestFont');
    expect(result.htmlWithStyles).toContain('cer-ssr-global');
    expect(result.htmlWithStyles).toContain('@font-face');
  });

  it('deduplicates useGlobalStyle() output when the same CSS is captured multiple times', () => {
    const TAG = 'cer-dsd-global-style-dedup';
    const CSS = ':root { --test-dedup: 1; }';
    registry.set(TAG, {
      props: {},
      render: () => {
        useGlobalStyle(() => CSS);
        return { tag: 'div', props: {}, children: [] } as never;
      },
    });
    // Render two instances of the same component
    const vnode1 = { tag: TAG, props: { attrs: {} }, children: [] };
    const vnode2 = { tag: TAG, props: { attrs: {} }, children: [] };
    const result = renderToStringWithJITCSSDSD({
      tag: 'div',
      props: {},
      children: [vnode1 as never, vnode2 as never],
    } as never);
    // CSS should appear only once in globalStyles
    const count = (result.globalStyles.match(/--test-dedup/g) ?? []).length;
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Partial hydration — data-cer-hydrate attribute
// ---------------------------------------------------------------------------

describe('renderToStringDSD() — partial hydration attribute', () => {
  it('emits data-cer-hydrate="load" when load is an explicit island boundary', () => {
    const TAG = 'cer-dsd-hydrate-load';
    registry.set(TAG, {
      props: {},
      hydrate: 'load',
      render: () => ({ tag: 'div', props: {}, children: [] }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const result = renderToStringDSD(vnode as never, { dsdPolyfill: false });
    expect(result).toContain('data-cer-hydrate="load"');
  });

  it('does not emit data-cer-hydrate when no strategy is configured', () => {
    const TAG = 'cer-dsd-hydrate-default';
    registry.set(TAG, {
      props: {},
      render: () => ({ tag: 'div', props: {}, children: [] }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const result = renderToStringDSD(vnode as never, { dsdPolyfill: false });
    expect(result).not.toContain('data-cer-hydrate');
  });

  it('emits data-cer-hydrate="idle" for idle strategy', () => {
    const TAG = 'cer-dsd-hydrate-idle';
    registry.set(TAG, {
      props: {},
      hydrate: 'idle',
      render: () => ({ tag: 'div', props: {}, children: [] }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const result = renderToStringDSD(vnode as never, { dsdPolyfill: false });
    expect(result).toContain('data-cer-hydrate="idle"');
  });

  it('emits data-cer-hydrate="visible" for visible strategy', () => {
    const TAG = 'cer-dsd-hydrate-visible';
    registry.set(TAG, {
      props: {},
      hydrate: 'visible',
      render: () => ({ tag: 'div', props: {}, children: [] }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const result = renderToStringDSD(vnode as never, { dsdPolyfill: false });
    expect(result).toContain('data-cer-hydrate="visible"');
  });

  it('emits data-cer-hydrate="none" for none strategy', () => {
    const TAG = 'cer-dsd-hydrate-none';
    registry.set(TAG, {
      props: {},
      hydrate: 'none',
      render: () => ({ tag: 'div', props: {}, children: [] }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const result = renderToStringDSD(vnode as never, { dsdPolyfill: false });
    expect(result).toContain('data-cer-hydrate="none"');
  });

  it('serializes an island strategy onto its unconfigured descendants', () => {
    const CHILD = 'cer-dsd-inherited-load-child';
    const ISLAND = 'cer-dsd-inherited-load-island';
    const STATIC = 'cer-dsd-inherited-load-static';
    registry.set(CHILD, {
      props: {},
      render: () => ({ tag: 'button', props: {}, children: ['Child'] }) as never,
    });
    registry.set(ISLAND, {
      props: {},
      hydrate: 'load',
      render: () => ({ tag: CHILD, props: { attrs: {} }, children: [] }) as never,
    });
    registry.set(STATIC, {
      props: {},
      hydrate: 'none',
      render: () => ({ tag: ISLAND, props: { attrs: {} }, children: [] }) as never,
    });

    const result = renderToStringDSD(
      { tag: STATIC, props: { attrs: {} }, children: [] } as never,
      { dsdPolyfill: false },
    );

    expect(result).toMatch(
      /<cer-dsd-inherited-load-child[^>]*data-cer-hydrate="load"/,
    );
  });

  it('serializes complex props needed by an island inside a static boundary', () => {
    const ISLAND = 'cer-dsd-static-boundary-props-island';
    const STATIC = 'cer-dsd-static-boundary-props-parent';
    const items = [
      { label: 'Home', path: '/' },
      { label: 'Music & amps', path: '/music/amps' },
    ];

    registry.set(ISLAND, {
      props: {
        items: { type: Function, default: [] },
      },
      hydrate: 'load',
      render: (context) => ({
        tag: 'p',
        props: {},
        children: String((context as { items?: unknown[] }).items?.length ?? 0),
      }) as never,
    });
    registry.set(STATIC, {
      props: {},
      render: () => html`<cer-dsd-static-boundary-props-island
        :items="${items}"
      ></cer-dsd-static-boundary-props-island>`,
    });

    const result = renderToStringDSD(
      {
        tag: STATIC,
        props: { attrs: { 'data-cer-hydrate': 'none' } },
        children: [],
      } as never,
      { dsdPolyfill: false },
    );

    expect(result.match(/data-cer-hydrate="none"/g)).toHaveLength(1);
    expect(result).toContain('data-cer-hydrate="load"');
    expect(result).toContain(
      'data-cer-props="{&quot;items&quot;:[{&quot;label&quot;:&quot;Home&quot;,&quot;path&quot;:&quot;/&quot;},{&quot;label&quot;:&quot;Music &amp; amps&quot;,&quot;path&quot;:&quot;/music/amps&quot;}]}"',
    );
  });

  it('does not duplicate complex props when a hydrating parent can bind them', () => {
    const CHILD = 'cer-dsd-normal-boundary-props-child';
    const PARENT = 'cer-dsd-normal-boundary-props-parent';
    registry.set(CHILD, {
      props: { items: { type: Function, default: [] } },
      render: () => ({ tag: 'p', props: {}, children: [] }) as never,
    });
    registry.set(PARENT, {
      props: {},
      hydrate: 'load',
      render: () => ({
        tag: CHILD,
        props: { attrs: {}, props: { items: [{ id: 1 }] } },
        children: [],
      }) as never,
    });

    const result = renderToStringDSD(
      { tag: PARENT, props: { attrs: {} }, children: [] } as never,
      { dsdPolyfill: false },
    );

    expect(result).not.toContain('data-cer-props');
  });
});

// ---------------------------------------------------------------------------
// Nested custom elements in shadow DOM
// ---------------------------------------------------------------------------

describe('renderToStringDSD() — nested custom elements', () => {
  it('recursively applies DSD to nested custom elements in shadow DOM', () => {
    const INNER = 'cer-dsd-inner';
    const OUTER = 'cer-dsd-outer';

    registry.set(INNER, {
      props: {},
      render: () => ({ tag: 'span', props: {}, children: ['inner'] }) as never,
    });

    registry.set(OUTER, {
      props: {},
      render: () =>
        ({
          tag: INNER,
          props: { attrs: {}, isCustomElement: true },
          children: [],
        }) as never,
    });

    const vnode = { tag: OUTER, props: { attrs: {} }, children: [] };
    const result = renderToStringDSD(vnode as never, { dsdPolyfill: false });

    // Outer element has DSD wrapper
    expect(result).toContain(`<${OUTER}`);
    // Inner element should also be DSD-wrapped inside outer's shadow
    expect(
      result.match(/<template shadowrootmode="open">/g)?.length,
    ).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// renderToStream()
// ---------------------------------------------------------------------------

describe('renderToStream()', () => {
  it('returns a ReadableStream', () => {
    const vnode = { tag: 'div', props: {}, children: [] };
    const stream = renderToStream(vnode as never);
    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it('stream yields the rendered HTML', async () => {
    const vnode = { tag: 'p', props: {}, children: ['hello'] };
    const stream = renderToStream(vnode as never);
    const reader = stream.getReader();
    const chunks: string[] = [];
    let done = false;
    while (!done) {
      const { value, done: d } = await reader.read();
      if (value) chunks.push(value);
      done = d;
    }
    const output = chunks.join('');
    expect(output).toContain('<p>');
    expect(output).toContain('hello');
  });

  it('stream with DSD option includes DSD polyfill', async () => {
    const TAG = 'cer-dsd-stream';
    registry.set(TAG, {
      props: {},
      render: () => ({ tag: 'div', props: {}, children: [] }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const stream = renderToStream(vnode as never, { dsd: true });
    const reader = stream.getReader();
    const chunks: string[] = [];
    let done = false;
    while (!done) {
      const { value, done: d } = await reader.read();
      if (value) chunks.push(value);
      done = d;
    }
    const output = chunks.join('');
    expect(output).toContain('shadowRootMode');
  });
});

// ---------------------------------------------------------------------------
// Async render functions in SSR
// ---------------------------------------------------------------------------

describe('renderToStringDSD() — async render functions', () => {
  it('emits an empty DSD shell when the render function is async', () => {
    const TAG = 'cer-dsd-async-render';
    registry.set(TAG, {
      props: {},
      // Async renders are not awaited in the synchronous SSR pass
      render: async () =>
        ({ tag: 'div', props: {}, children: ['async content'] }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const result = renderToStringDSD(vnode as never, { dsdPolyfill: false });
    // Host element must exist
    expect(result).toContain(`<${TAG}`);
    // DSD template shell must be present (but empty — no shadow content)
    expect(result).toContain('<template shadowrootmode="open">');
    // Async-rendered content must not appear (it was not awaited)
    expect(result).not.toContain('async content');
  });
});

// ---------------------------------------------------------------------------
// renderToStream — incremental async streaming
// ---------------------------------------------------------------------------

describe('renderToStream() — incremental async component streaming', () => {
  async function drainStream(
    stream: ReadableStream<string>,
  ): Promise<string[]> {
    const reader = stream.getReader();
    const chunks: string[] = [];
    let done = false;
    while (!done) {
      const { value, done: d } = await reader.read();
      if (value) chunks.push(value);
      done = d;
    }
    return chunks;
  }

  it('produces a single chunk for all-sync components', async () => {
    const TAG = 'cer-stream-sync';
    registry.set(TAG, {
      props: {},
      render: () => ({ tag: 'span', props: {}, children: ['sync'] }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const chunks = await drainStream(
      renderToStream(vnode as never, { dsd: true }),
    );
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toContain('shadowrootmode="open"');
    expect(chunks[0]).toContain('sync');
  });

  it('produces ≥ 2 chunks when a component has an async render function', async () => {
    const TAG = 'cer-stream-async';
    registry.set(TAG, {
      props: {},
      render: async () =>
        ({ tag: 'div', props: {}, children: ['resolved'] }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const chunks = await drainStream(
      renderToStream(vnode as never, { dsd: true }),
    );
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  it('chunk 1 contains placeholder with unique cer-stream-* id', async () => {
    const TAG = 'cer-stream-placeholder';
    registry.set(TAG, {
      props: {},
      render: async () =>
        ({ tag: 'div', props: {}, children: ['content'] }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const chunks = await drainStream(
      renderToStream(vnode as never, { dsd: true }),
    );
    expect(chunks[0]).toMatch(/id="cer-stream-\d+"/);
    expect(chunks[0]).toContain('<template shadowrootmode="open"></template>');
  });

  it('swap chunk uses shadowRoot.innerHTML (not outerHTML)', async () => {
    const TAG = 'cer-stream-swap';
    registry.set(TAG, {
      props: {},
      render: async () =>
        ({ tag: 'div', props: {}, children: ['swapped'] }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const chunks = await drainStream(
      renderToStream(vnode as never, { dsd: true }),
    );
    const swapChunks = chunks.slice(1).join('');
    // Uses shadowRoot.innerHTML for reliable cross-browser shadow root filling
    expect(swapChunks).toContain('s.innerHTML');
    // Does NOT rely on outerHTML DSD processing (unreliable for script-injected HTML)
    expect(swapChunks).not.toContain('e.outerHTML');
  });

  it('swap chunk carries the resolved shadow content', async () => {
    const TAG = 'cer-stream-content';
    registry.set(TAG, {
      props: {},
      render: async () =>
        ({
          tag: 'div',
          props: { attrs: { class: 'resolved-card' } },
          children: ['resolved content'],
        }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const chunks = await drainStream(
      renderToStream(vnode as never, { dsd: true }),
    );
    const swapChunks = chunks.slice(1).join('');
    expect(swapChunks).toContain('resolved content');
    expect(swapChunks).toContain('resolved-card');
  });

  it('swap chunk targets the same placeholder id as chunk 1', async () => {
    const TAG = 'cer-stream-id-match';
    registry.set(TAG, {
      props: {},
      render: async () =>
        ({ tag: 'p', props: {}, children: ['matched'] }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const chunks = await drainStream(
      renderToStream(vnode as never, { dsd: true }),
    );
    const placeholderId = chunks[0].match(/id="(cer-stream-\d+)"/)?.[1];
    expect(placeholderId).toBeTruthy();
    const swapChunks = chunks.slice(1).join('');
    expect(swapChunks).toContain(placeholderId);
  });

  it('swap chunk includes style block inside the shadow content', async () => {
    const TAG = 'cer-stream-styles';
    registry.set(TAG, {
      props: {},
      render: async () =>
        ({
          tag: 'div',
          props: { attrs: { class: 'p-4' } },
          children: [],
        }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const chunks = await drainStream(
      renderToStream(vnode as never, {
        dsd: true,
        jit: { extendedColors: false },
      }),
    );
    const swapChunks = chunks.slice(1).join('');
    // baseReset is always included in the shadow style block
    expect(swapChunks).toContain('box-sizing');
  });
});

// ---------------------------------------------------------------------------
// Backwards-compatibility: renderToStringWithJITCSS without dsd
// ---------------------------------------------------------------------------

describe('renderToStringWithJITCSS() backwards-compat', () => {
  it('result has css and htmlWithStyles (original fields)', () => {
    const vnode = {
      tag: 'div',
      props: { attrs: { class: 'flex' } },
      children: [],
    };
    const result = renderToStringWithJITCSS(vnode as never);
    expect(typeof result.html).toBe('string');
    expect(typeof result.css).toBe('string');
    expect(typeof result.htmlWithStyles).toBe('string');
  });

  it('does not include DSD template in non-DSD mode', () => {
    const TAG = 'cer-dsd-nomode';
    registry.set(TAG, {
      props: {},
      render: () => ({ tag: 'div', props: {}, children: [] }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    // Without dsd: true, custom elements render as plain HTML
    const { html } = renderToStringWithJITCSS(vnode as never);
    expect(html).not.toContain('shadowrootmode');
  });
});

// ---------------------------------------------------------------------------
// Exception safety — globalStyles collector cleanup
// ---------------------------------------------------------------------------

describe('renderToStringWithJITCSS() — exception safety', () => {
  it('resets the global style collector when the renderer throws', () => {
    // Passing null causes the renderer to throw because it tries to access
    // vnode.tag. This simulates any unexpected error inside _renderToStringDSD.
    expect(() =>
      renderToStringWithJITCSS(null as never, { dsd: true }),
    ).toThrow();

    // After the exception the collector must be cleared so subsequent
    // SSR useGlobalStyle() calls are not silently suppressed.
    const TAG = 'cer-dsd-after-throw';
    registry.set(TAG, {
      props: {},
      render: () => {
        useGlobalStyle(() => ':root { --after-throw: 1; }');
        return { tag: 'div', props: {}, children: [] } as never;
      },
    });
    const result = renderToStringWithJITCSSDSD({
      tag: TAG,
      props: { attrs: {} },
      children: [],
    } as never);
    // globalStyles must be captured correctly in the subsequent render
    expect(result.globalStyles).toContain('--after-throw');
  });
});

// ---------------------------------------------------------------------------
// Sequential renders — state isolation
// ---------------------------------------------------------------------------

describe('renderToStringWithJITCSSDSD() — sequential render isolation', () => {
  it('does not leak globalStyles between sequential render calls', () => {
    const TAG_A = 'cer-dsd-seq-a';
    const TAG_B = 'cer-dsd-seq-b';

    registry.set(TAG_A, {
      props: {},
      render: () => {
        useGlobalStyle(() => ':root { --seq-a: 1; }');
        return { tag: 'div', props: {}, children: [] } as never;
      },
    });
    registry.set(TAG_B, {
      props: {},
      render: () => {
        useGlobalStyle(() => ':root { --seq-b: 2; }');
        return { tag: 'div', props: {}, children: [] } as never;
      },
    });

    const result1 = renderToStringWithJITCSSDSD({
      tag: TAG_A,
      props: { attrs: {} },
      children: [],
    } as never);
    const result2 = renderToStringWithJITCSSDSD({
      tag: TAG_B,
      props: { attrs: {} },
      children: [],
    } as never);

    // Each render captures only its own globalStyles
    expect(result1.globalStyles).toContain('--seq-a');
    expect(result1.globalStyles).not.toContain('--seq-b');
    expect(result2.globalStyles).toContain('--seq-b');
    expect(result2.globalStyles).not.toContain('--seq-a');
  });
});

// ---------------------------------------------------------------------------
// renderToStream — dsdPolyfill: false
// ---------------------------------------------------------------------------

describe('renderToStream() — dsdPolyfill: false', () => {
  it('omits DSD polyfill when dsdPolyfill is false', async () => {
    const TAG = 'cer-dsd-stream-nopolyfill';
    registry.set(TAG, {
      props: {},
      render: () => ({ tag: 'div', props: {}, children: [] }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const stream = renderToStream(vnode as never, {
      dsd: true,
      dsdPolyfill: false,
    });
    const reader = stream.getReader();
    const chunks: string[] = [];
    let done = false;
    while (!done) {
      const { value, done: d } = await reader.read();
      if (value) chunks.push(value);
      done = d;
    }
    const output = chunks.join('');
    expect(output).toContain('shadowrootmode');
    expect(output).not.toContain('shadowRootMode'); // polyfill signature absent
  });
});

// ---------------------------------------------------------------------------
// Built-in components in SSR
// ---------------------------------------------------------------------------

describe('cer-suspense in SSR', () => {
  beforeEach(() => {
    registerSuspense();
  });

  it('emits DSD output (is in the component registry)', () => {
    const vnode = {
      tag: 'cer-suspense',
      props: { attrs: {}, isCustomElement: true },
      children: [{ tag: 'p', props: {}, children: ['content'] }],
    };
    const html = renderToStringDSD(vnode as never, {
      dsd: true,
      dsdPolyfill: false,
    });
    expect(html).toContain('<cer-suspense');
    expect(html).toContain('<template shadowrootmode="open">');
  });

  it('renders default slot when pending is false (default)', () => {
    const vnode = {
      tag: 'cer-suspense',
      props: { attrs: {}, isCustomElement: true },
      children: [{ tag: 'p', props: {}, children: ['content'] }],
    };
    const html = renderToStringDSD(vnode as never, {
      dsd: true,
      dsdPolyfill: false,
    });
    // Shadow root should contain <slot> (default slot, not fallback)
    expect(html).toContain('<slot>');
    expect(html).not.toContain('name="fallback"');
  });

  it('renders fallback slot when pending is true', () => {
    const vnode = {
      tag: 'cer-suspense',
      props: { attrs: { pending: 'true' }, isCustomElement: true },
      children: [
        { tag: 'p', props: {}, children: ['content'] },
        {
          tag: 'div',
          props: { attrs: { slot: 'fallback' } },
          children: ['Loading…'],
        },
      ],
    };
    const html = renderToStringDSD(vnode as never, {
      dsd: true,
      dsdPolyfill: false,
    });
    expect(html).toContain('name="fallback"');
    expect(html).not.toContain('<slot>');
  });

  it('light DOM children (slotted content) appear outside the template', () => {
    const vnode = {
      tag: 'cer-suspense',
      props: { attrs: {}, isCustomElement: true },
      children: [
        { tag: 'p', props: { attrs: { id: 'slotted' } }, children: ['hello'] },
      ],
    };
    const html = renderToStringDSD(vnode as never, {
      dsd: true,
      dsdPolyfill: false,
    });
    // Slotted children should be in light DOM, after </template>
    const templateEnd = html.indexOf('</template>');
    const slottedPos = html.indexOf('id="slotted"');
    expect(templateEnd).toBeGreaterThan(-1);
    expect(slottedPos).toBeGreaterThan(templateEnd);
  });
});

describe('cer-error-boundary in SSR', () => {
  beforeEach(() => {
    registerErrorBoundary();
  });

  it('emits DSD output (is in the component registry)', () => {
    const vnode = {
      tag: 'cer-error-boundary',
      props: { attrs: {}, isCustomElement: true },
      children: [{ tag: 'p', props: {}, children: ['content'] }],
    };
    const html = renderToStringDSD(vnode as never, {
      dsd: true,
      dsdPolyfill: false,
    });
    expect(html).toContain('<cer-error-boundary');
    expect(html).toContain('<template shadowrootmode="open">');
  });

  it('renders default slot (no error state on server)', () => {
    const vnode = {
      tag: 'cer-error-boundary',
      props: { attrs: {}, isCustomElement: true },
      children: [
        { tag: 'p', props: { attrs: { id: 'guarded' } }, children: ['safe'] },
      ],
    };
    const html = renderToStringDSD(vnode as never, {
      dsd: true,
      dsdPolyfill: false,
    });
    // Shadow root should contain <slot> (default, not error fallback)
    expect(html).toContain('<slot>');
    expect(html).not.toContain('Something went wrong');
  });

  it('light DOM children appear outside the template', () => {
    const vnode = {
      tag: 'cer-error-boundary',
      props: { attrs: {}, isCustomElement: true },
      children: [
        { tag: 'span', props: { attrs: { id: 'child' } }, children: ['ok'] },
      ],
    };
    const html = renderToStringDSD(vnode as never, {
      dsd: true,
      dsdPolyfill: false,
    });
    const templateEnd = html.indexOf('</template>');
    const childPos = html.indexOf('id="child"');
    expect(templateEnd).toBeGreaterThan(-1);
    expect(childPos).toBeGreaterThan(templateEnd);
  });
});

describe('cer-keep-alive in SSR', () => {
  beforeEach(() => {
    // registerKeepAlive() is a no-op in SSR (guards on typeof window).
    // We call it to ensure it doesn't throw.
    registerKeepAlive();
  });

  it('does not appear in the component registry (DOM-only component)', () => {
    // cer-keep-alive uses customElements.define() directly, not component().
    // It is therefore NOT in the runtime registry used by the DSD SSR renderer.
    expect(registry.has('cer-keep-alive')).toBe(false);
  });

  it('renders as an opaque shell without DSD wrapping', () => {
    const vnode = {
      tag: 'cer-keep-alive',
      props: { attrs: {}, isCustomElement: true },
      children: [{ tag: 'p', props: {}, children: ['preserved'] }],
    };
    const html = renderToStringDSD(vnode as never, {
      dsd: true,
      dsdPolyfill: false,
    });
    // No DSD template — not in registry
    expect(html).not.toContain('<template shadowrootmode="open">');
    // Light DOM children are still serialized
    expect(html).toContain('<cer-keep-alive');
    expect(html).toContain('preserved');
  });
});

describe('nested custom elements in DSD SSR', () => {
  const OUTER = 'cer-dsd-outer';
  const INNER = 'cer-dsd-inner';

  beforeEach(() => {
    registry.set(INNER, {
      props: {},
      render: () =>
        ({
          tag: 'span',
          props: { attrs: { id: 'inner-content' } },
          children: ['inner'],
        }) as never,
    });
    registry.set(OUTER, {
      props: {},
      render: () =>
        ({
          tag: INNER,
          props: { attrs: {}, isCustomElement: true },
          children: [],
        }) as never,
    });
  });

  it('emits nested DSD templates for nested custom elements', () => {
    const vnode = {
      tag: OUTER,
      props: { attrs: {}, isCustomElement: true },
      children: [],
    };
    const html = renderToStringDSD(vnode as never, {
      dsd: true,
      dsdPolyfill: false,
    });
    // Both outer and inner should have shadow roots
    expect((html.match(/<template shadowrootmode="open">/g) ?? []).length).toBe(
      2,
    );
    expect(html).toContain(`<${OUTER}`);
    expect(html).toContain(`<${INNER}`);
    expect(html).toContain('id="inner-content"');
  });
});

// ---------------------------------------------------------------------------
// renderToStreamWithJITCSSDSD — convenience alias
// ---------------------------------------------------------------------------

describe('renderToStreamWithJITCSSDSD()', () => {
  async function drainStream(stream: ReadableStream<string>): Promise<string[]> {
    const reader = stream.getReader();
    const chunks: string[] = [];
    let done = false;
    while (!done) {
      const { value, done: d } = await reader.read();
      if (value) chunks.push(value);
      done = d;
    }
    return chunks;
  }

  it('returns a ReadableStream', () => {
    const vnode = { tag: 'div', props: {}, children: [] };
    const stream = renderToStreamWithJITCSSDSD(vnode as never);
    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it('is equivalent to renderToStream with dsd: true', async () => {
    const TAG = 'cer-stream-dsd-alias';
    registry.set(TAG, {
      props: {},
      render: () => ({ tag: 'span', props: {}, children: ['alias'] }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const aliasChunks = await drainStream(renderToStreamWithJITCSSDSD(vnode as never));
    const directChunks = await drainStream(renderToStream(vnode as never, { dsd: true }));
    expect(aliasChunks.join('')).toBe(directChunks.join(''));
  });

  it('yields DSD output with shadowrootmode', async () => {
    const TAG = 'cer-stream-dsd-alias-dsd';
    registry.set(TAG, {
      props: {},
      render: () => ({ tag: 'div', props: {}, children: ['content'] }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const chunks = await drainStream(renderToStreamWithJITCSSDSD(vnode as never));
    expect(chunks[0]).toContain('shadowrootmode="open"');
  });

  it('includes DSD polyfill by default', async () => {
    const TAG = 'cer-stream-dsd-alias-polyfill';
    registry.set(TAG, {
      props: {},
      render: () => ({ tag: 'div', props: {}, children: [] }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const chunks = await drainStream(renderToStreamWithJITCSSDSD(vnode as never));
    expect(chunks.join('')).toContain('shadowRootMode');
  });

  it('omits DSD polyfill when dsdPolyfill: false', async () => {
    const TAG = 'cer-stream-dsd-alias-nopolyfill';
    registry.set(TAG, {
      props: {},
      render: () => ({ tag: 'div', props: {}, children: [] }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const chunks = await drainStream(
      renderToStreamWithJITCSSDSD(vnode as never, { dsdPolyfill: false }),
    );
    expect(chunks.join('')).toContain('shadowrootmode');
    expect(chunks.join('')).not.toContain('shadowRootMode');
  });

  it('streams async components as swap scripts', async () => {
    const TAG = 'cer-stream-dsd-alias-async';
    let resolve!: (v: unknown) => void;
    registry.set(TAG, {
      props: {},
      render: () =>
        new Promise((res) => {
          resolve = res;
        }) as never,
    });
    const vnode = { tag: TAG, props: { attrs: {} }, children: [] };
    const streamPromise = drainStream(renderToStreamWithJITCSSDSD(vnode as never));
    resolve({ tag: 'p', props: {}, children: ['streamed'] });
    const chunks = await streamPromise;
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks.slice(1).join('')).toContain('streamed');
  });
});

// ---------------------------------------------------------------------------
// Complex object props in DSD SSR (regression: fakeHost.getAttribute junk string)
// ---------------------------------------------------------------------------

describe('DSD SSR complex object props', () => {
  it('renders array props correctly without stringifying to [object Object]', () => {
    const TAG = 'cer-ssr-array-prop';
    const items = [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
      { id: 'c', label: 'Gamma' },
    ];
    registry.set(TAG, {
      props: {},
      render: () => {
        const props = useProps({ items: [] as { id: string; label: string }[] });
        return {
          tag: 'ul',
          props: {},
          children: props.items.map((item) => ({
            tag: 'li',
            props: { attrs: { id: item.id } },
            children: item.label,
          })),
        } as never;
      },
    });
    const vnode = { tag: TAG, props: { attrs: { items } }, children: [] };
    const html = renderToStringDSD(vnode as never, { dsdPolyfill: false });
    // The shadow DOM must contain the rendered list items, not an empty template
    const templateMatch = html.match(/<template shadowrootmode="open">([\s\S]*?)<\/template>/);
    expect(templateMatch).toBeTruthy();
    const shadow = templateMatch![1];
    expect(shadow).toContain('<li');
    expect(shadow).toContain('Alpha');
    expect(shadow).toContain('Beta');
    expect(shadow).toContain('Gamma');
    // Must not contain the stringified garbage
    expect(shadow).not.toContain('[object Object]');
  });

  it('renders object props correctly without stringifying', () => {
    const TAG = 'cer-ssr-object-prop';
    const config = { title: 'Hello', count: 3 };
    registry.set(TAG, {
      props: {},
      render: () => {
        const props = useProps({ config: null as { title: string; count: number } | null });
        const title = props.config?.title ?? 'none';
        return {
          tag: 'p',
          props: {},
          children: title,
        } as never;
      },
    });
    const vnode = { tag: TAG, props: { attrs: { config } }, children: [] };
    const html = renderToStringDSD(vnode as never, { dsdPolyfill: false });
    const templateMatch = html.match(/<template shadowrootmode="open">([\s\S]*?)<\/template>/);
    expect(templateMatch).toBeTruthy();
    expect(templateMatch![1]).toContain('Hello');
    expect(templateMatch![1]).not.toContain('[object Object]');
  });

  it('still returns primitive attrs as strings', () => {
    const TAG = 'cer-ssr-primitive-attrs';
    registry.set(TAG, {
      props: {},
      render: () => {
        const props = useProps({ label: '', count: 0, active: false });
        return {
          tag: 'span',
          props: { attrs: { 'data-label': props.label, 'data-count': String(props.count), 'data-active': String(props.active) } },
          children: [],
        } as never;
      },
    });
    const vnode = { tag: TAG, props: { attrs: { label: 'hi', count: 5, active: true } }, children: [] };
    const html = renderToStringDSD(vnode as never, { dsdPolyfill: false });
    const templateMatch = html.match(/<template shadowrootmode="open">([\s\S]*?)<\/template>/);
    expect(templateMatch).toBeTruthy();
    const shadow = templateMatch![1];
    expect(shadow).toContain('data-label="hi"');
    expect(shadow).toContain('data-count="5"');
    expect(shadow).toContain('data-active="true"');
  });

  it('renders array props passed via vnode.props.props (template-compiler path for custom elements)', () => {
    // The template compiler moves bound attrs on custom elements from attrs to
    // props (camelCase), deleting them from attrs. This test reproduces that
    // exact VNode shape to ensure runComponentSSRRender sees the values.
    const TAG = 'cer-ssr-props-path';
    const crumbs = [
      { label: 'Home', path: '/', key: '/', isLast: false, hasPage: true },
      { label: 'Music', path: '/music', key: '/music', isLast: true, hasPage: true },
    ];
    registry.set(TAG, {
      props: {},
      render: () => {
        const props = useProps({ crumbs: [] as { label: string; path: string }[] });
        if (props.crumbs.length <= 1) {
          return { tag: 'div', props: {}, children: '' } as never;
        }
        return {
          tag: 'nav',
          props: {},
          children: props.crumbs.map((c) => ({
            tag: 'span',
            props: {},
            children: c.label,
          })),
        } as never;
      },
    });
    // vnode.props.attrs is empty (moved by template compiler); crumbs is in props
    const vnode = { tag: TAG, props: { attrs: {}, props: { crumbs } }, children: [] };
    const html = renderToStringDSD(vnode as never, { dsdPolyfill: false });
    const templateMatch = html.match(/<template shadowrootmode="open">([\s\S]*?)<\/template>/);
    expect(templateMatch).toBeTruthy();
    const shadow = templateMatch![1];
    expect(shadow).toContain('<nav');
    expect(shadow).toContain('Home');
    expect(shadow).toContain('Music');
    expect(shadow).not.toContain('[object Object]');
  });
});
