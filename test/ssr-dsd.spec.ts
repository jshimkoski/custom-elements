/**
 * Tests for Declarative Shadow DOM (DSD) SSR rendering.
 *
 * Covers:
 *  - renderToStringDSD: DSD output for registered custom elements
 *  - renderToStringWithJITCSSDSD: DSD + CSS layer extraction
 *  - renderToStream: ReadableStream API
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
  DSD_POLYFILL_SCRIPT,
  type SSRJITResult,
} from '../src/lib/ssr';
import { registry } from '../src/lib/runtime/component/registry';
import { useStyle, useProps, useGlobalStyle } from '../src/lib/runtime/hooks';
import {
  registerSuspense,
  registerErrorBoundary,
} from '../src/lib/runtime/builtin-components';
import { registerKeepAlive } from '../src/lib/keep-alive';

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
        ({ tag: 'div', props: { attrs: { class: 'card' } }, children: [] }) as never,
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
    const templateContent = result.match(
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
    const vnode = { tag: TAG, props: { attrs: { theme: 'dark' } }, children: [] };
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
    const vnode = { tag: 'div', props: { attrs: { class: 'flex' } }, children: [] };
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
        useGlobalStyle(() => '@font-face { font-family: "TestFont"; src: local("TestFont"); }');
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
    const result = renderToStringWithJITCSSDSD(
      { tag: 'div', props: {}, children: [vnode1 as never, vnode2 as never] } as never,
    );
    // CSS should appear only once in globalStyles
    const count = (result.globalStyles.match(/--test-dedup/g) ?? []).length;
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Partial hydration — data-cer-hydrate attribute
// ---------------------------------------------------------------------------

describe('renderToStringDSD() — partial hydration attribute', () => {
  it('does not emit data-cer-hydrate for default (load) strategy', () => {
    const TAG = 'cer-dsd-hydrate-load';
    registry.set(TAG, {
      props: {},
      hydrate: 'load',
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
      render: () =>
        ({ tag: 'span', props: {}, children: ['inner'] }) as never,
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
    expect(result.match(/<template shadowrootmode="open">/g)?.length).toBeGreaterThanOrEqual(2);
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
// Backwards-compatibility: renderToStringWithJITCSS without dsd
// ---------------------------------------------------------------------------

describe('renderToStringWithJITCSS() backwards-compat', () => {
  it('result has css and htmlWithStyles (original fields)', () => {
    const vnode = { tag: 'div', props: { attrs: { class: 'flex' } }, children: [] };
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
    const result = renderToStringWithJITCSSDSD(
      { tag: TAG, props: { attrs: {} }, children: [] } as never,
    );
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

    const result1 = renderToStringWithJITCSSDSD(
      { tag: TAG_A, props: { attrs: {} }, children: [] } as never,
    );
    const result2 = renderToStringWithJITCSSDSD(
      { tag: TAG_B, props: { attrs: {} }, children: [] } as never,
    );

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
    const html = renderToStringDSD(vnode as never, { dsd: true, dsdPolyfill: false });
    expect(html).toContain('<cer-suspense');
    expect(html).toContain('<template shadowrootmode="open">');
  });

  it('renders default slot when pending is false (default)', () => {
    const vnode = {
      tag: 'cer-suspense',
      props: { attrs: {}, isCustomElement: true },
      children: [{ tag: 'p', props: {}, children: ['content'] }],
    };
    const html = renderToStringDSD(vnode as never, { dsd: true, dsdPolyfill: false });
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
        { tag: 'div', props: { attrs: { slot: 'fallback' } }, children: ['Loading…'] },
      ],
    };
    const html = renderToStringDSD(vnode as never, { dsd: true, dsdPolyfill: false });
    expect(html).toContain('name="fallback"');
    expect(html).not.toContain('<slot>');
  });

  it('light DOM children (slotted content) appear outside the template', () => {
    const vnode = {
      tag: 'cer-suspense',
      props: { attrs: {}, isCustomElement: true },
      children: [{ tag: 'p', props: { attrs: { id: 'slotted' } }, children: ['hello'] }],
    };
    const html = renderToStringDSD(vnode as never, { dsd: true, dsdPolyfill: false });
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
    const html = renderToStringDSD(vnode as never, { dsd: true, dsdPolyfill: false });
    expect(html).toContain('<cer-error-boundary');
    expect(html).toContain('<template shadowrootmode="open">');
  });

  it('renders default slot (no error state on server)', () => {
    const vnode = {
      tag: 'cer-error-boundary',
      props: { attrs: {}, isCustomElement: true },
      children: [{ tag: 'p', props: { attrs: { id: 'guarded' } }, children: ['safe'] }],
    };
    const html = renderToStringDSD(vnode as never, { dsd: true, dsdPolyfill: false });
    // Shadow root should contain <slot> (default, not error fallback)
    expect(html).toContain('<slot>');
    expect(html).not.toContain('Something went wrong');
  });

  it('light DOM children appear outside the template', () => {
    const vnode = {
      tag: 'cer-error-boundary',
      props: { attrs: {}, isCustomElement: true },
      children: [{ tag: 'span', props: { attrs: { id: 'child' } }, children: ['ok'] }],
    };
    const html = renderToStringDSD(vnode as never, { dsd: true, dsdPolyfill: false });
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
    const html = renderToStringDSD(vnode as never, { dsd: true, dsdPolyfill: false });
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
        ({ tag: 'span', props: { attrs: { id: 'inner-content' } }, children: ['inner'] }) as never,
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
    const html = renderToStringDSD(vnode as never, { dsd: true, dsdPolyfill: false });
    // Both outer and inner should have shadow roots
    expect((html.match(/<template shadowrootmode="open">/g) ?? []).length).toBe(2);
    expect(html).toContain(`<${OUTER}`);
    expect(html).toContain(`<${INNER}`);
    expect(html).toContain('id="inner-content"');
  });
});
