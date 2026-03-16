/* eslint-disable */
/**
 * Manual SSR verification script.
 *
 * Run with:  node verify-ssr.mjs
 *
 * Checks:
 *   1. DSD output — <template shadowrootmode="open"> with CSS injected
 *   2. JIT CSS inside shadow root
 *   3. cer-suspense in SSR (pending=false and pending=true)
 *   4. cer-error-boundary in SSR
 *   5. cer-keep-alive in SSR (opaque shell — no DSD wrapping)
 *   6. matchRouteSSR query string + fragment stripping
 *   7. matchRouteSSR dynamic params
 *   8. createSSRHandler error handling
 */

import {
  component,
  html,
  registerBuiltinComponents,
} from './dist/custom-elements-runtime.es.js';
import {
  renderToStringWithJITCSSDSD,
  renderToStream,
} from './dist/custom-elements-runtime.ssr.es.js';
import { matchRouteSSR } from './dist/custom-elements-runtime.router.es.js';
import { createSSRHandler } from './dist/custom-elements-runtime.ssr-middleware.es.js';

// ─────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────

registerBuiltinComponents();

component(
  'my-card',
  () => html`<div class="p-4 flex gap-2"><slot></slot></div>`,
);

component(
  'themed-box',
  () => html`<div class="bg-primary-500 text-white p-8"><slot></slot></div>`,
);

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function check(label, value, expectFn) {
  try {
    expectFn(value);
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${label}`);
    console.log(`     ${e.message}`);
    failed++;
  }
}

function contains(str, substring) {
  if (!str.includes(substring)) {
    throw new Error(
      `Expected output to contain: ${JSON.stringify(substring)}\n     Got: ${str.slice(0, 300)}`,
    );
  }
}

function notContains(str, substring) {
  if (str.includes(substring)) {
    throw new Error(
      `Expected output NOT to contain: ${JSON.stringify(substring)}`,
    );
  }
}

function eq(actual, expected) {
  if (actual !== expected) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

// ─────────────────────────────────────────────────────────────
// 1. DSD output
// ─────────────────────────────────────────────────────────────

console.log('\n1. Declarative Shadow DOM output');
{
  const { htmlWithStyles } = renderToStringWithJITCSSDSD(
    html`<my-card>Hello SSR</my-card>`,
  );

  check('emits <template shadowrootmode="open">', htmlWithStyles, (v) =>
    contains(v, 'shadowrootmode="open"'),
  );
  check('shadow content rendered inside template', htmlWithStyles, (v) =>
    contains(v, '<div class="p-4 flex gap-2">'),
  );
  check('light DOM children outside template', htmlWithStyles, (v) =>
    contains(v, 'Hello SSR'),
  );
  check('DSD polyfill injected', htmlWithStyles, (v) =>
    contains(v, 'shadowRootMode'),
  );
}

// ─────────────────────────────────────────────────────────────
// 2. JIT CSS inside shadow root
// ─────────────────────────────────────────────────────────────

console.log('\n2. JIT CSS inside shadow root');
{
  const { htmlWithStyles } = renderToStringWithJITCSSDSD(
    html`<themed-box>Hi</themed-box>`,
  );

  check('<style> block inside <template>', htmlWithStyles, (v) => {
    const templateStart = v.indexOf('shadowrootmode');
    const styleStart = v.indexOf('<style>', templateStart);
    if (styleStart === -1) throw new Error('No <style> found inside template');
  });
  check('baseReset CSS present (box-sizing)', htmlWithStyles, (v) =>
    contains(v, 'box-sizing'),
  );
  check('JIT utility class CSS generated (p-8)', htmlWithStyles, (v) =>
    contains(v, '.p-8'),
  );
}

// ─────────────────────────────────────────────────────────────
// 3. cer-suspense in SSR
// ─────────────────────────────────────────────────────────────

console.log('\n3. cer-suspense in SSR');
{
  const { htmlWithStyles: defaultSlot } = renderToStringWithJITCSSDSD(
    html`<cer-suspense><span>Content</span></cer-suspense>`,
  );
  check('DSD output present (pending=false)', defaultSlot, (v) =>
    contains(v, 'shadowrootmode="open"'),
  );
  check('default <slot> rendered when pending=false', defaultSlot, (v) =>
    contains(v, '<slot></slot>'),
  );
  check('light DOM child outside template', defaultSlot, (v) =>
    contains(v, '<span>Content</span>'),
  );

  const { htmlWithStyles: fallbackSlot } = renderToStringWithJITCSSDSD(
    html`<cer-suspense pending="true"
      ><span slot="fallback">Loading…</span></cer-suspense
    >`,
  );
  check(
    'fallback <slot name="fallback"> when pending=true',
    fallbackSlot,
    (v) => contains(v, 'name="fallback"'),
  );
}

// ─────────────────────────────────────────────────────────────
// 4. cer-error-boundary in SSR
// ─────────────────────────────────────────────────────────────

console.log('\n4. cer-error-boundary in SSR');
{
  const { htmlWithStyles } = renderToStringWithJITCSSDSD(
    html`<cer-error-boundary><my-card>Safe</my-card></cer-error-boundary>`,
  );
  check('DSD output present', htmlWithStyles, (v) =>
    contains(v, 'shadowrootmode="open"'),
  );
  check('default <slot> always rendered in SSR', htmlWithStyles, (v) =>
    contains(v, '<slot></slot>'),
  );
  check('light DOM children present', htmlWithStyles, (v) =>
    contains(v, '<my-card>'),
  );
}

// ─────────────────────────────────────────────────────────────
// 5. cer-keep-alive in SSR (opaque shell)
// ─────────────────────────────────────────────────────────────

console.log('\n5. cer-keep-alive in SSR (opaque shell)');
{
  const { htmlWithStyles } = renderToStringWithJITCSSDSD(
    html`<cer-keep-alive><my-card>Kept</my-card></cer-keep-alive>`,
  );
  check('<cer-keep-alive> tag present in output', htmlWithStyles, (v) =>
    contains(v, '<cer-keep-alive>'),
  );
  check('light DOM children rendered', htmlWithStyles, (v) =>
    contains(v, '<my-card>'),
  );
  check(
    'NO direct <template> for cer-keep-alive itself',
    htmlWithStyles,
    (v) => {
      // The first <template> should belong to my-card, not cer-keep-alive
      const kaStart = v.indexOf('<cer-keep-alive>');
      const firstTemplate = v.indexOf('<template', kaStart);
      const myCardStart = v.indexOf('<my-card', kaStart);
      if (firstTemplate !== -1 && firstTemplate < myCardStart) {
        throw new Error('cer-keep-alive incorrectly emitted a DSD <template>');
      }
    },
  );
}

// ─────────────────────────────────────────────────────────────
// 6. matchRouteSSR — query string + fragment stripping
// ─────────────────────────────────────────────────────────────

console.log('\n6. matchRouteSSR query string / fragment stripping');
{
  const routes = [
    { path: '/', component: 'home-page' },
    { path: '/about', component: 'about-page' },
    { path: '/blog/:slug', component: 'blog-post' },
    { path: '/docs/*', component: 'docs-page' },
  ];

  const r1 = matchRouteSSR(routes, '/about?ref=email&page=2');
  check('strips query string', r1.route?.component, (v) => eq(v, 'about-page'));

  const r2 = matchRouteSSR(routes, '/about#section');
  check('strips URL fragment', r2.route?.component, (v) => eq(v, 'about-page'));

  const r3 = matchRouteSSR(routes, '/blog/hello-world?ref=email#comments');
  check('strips both query + fragment', r3.route?.component, (v) =>
    eq(v, 'blog-post'),
  );
  check('extracts dynamic param correctly', r3.params.slug, (v) =>
    eq(v, 'hello-world'),
  );

  const r4 = matchRouteSSR(routes, '/docs/getting-started/intro');
  check('splat route matches', r4.route?.component, (v) => eq(v, 'docs-page'));

  const r5 = matchRouteSSR(routes, '/missing');
  check('returns null for unmatched routes', r5.route, (v) => {
    if (v !== null) throw new Error(`Expected null, got ${JSON.stringify(v)}`);
  });
}

// ─────────────────────────────────────────────────────────────
// 7. createSSRHandler — error handling
// ─────────────────────────────────────────────────────────────

console.log('\n7. createSSRHandler error handling');
{
  const handler = createSSRHandler(() => {
    throw new Error('factory exploded');
  });

  let ended = '';
  const res = {
    setHeader() {},
    end(data) {
      ended = data ?? '';
    },
  };

  let threw = false;
  try {
    await handler({ url: '/', method: 'GET', headers: {} }, res);
  } catch (e) {
    threw = e.message === 'factory exploded';
  }

  check('re-throws the original error', threw, (v) => {
    if (!v) throw new Error('Handler did not re-throw');
  });
  check('still closes the response (no hanging request)', ended, (v) =>
    contains(v, 'Internal Server Error'),
  );
}

// ─────────────────────────────────────────────────────────────
// 8. renderToStream — incremental async component streaming
// ─────────────────────────────────────────────────────────────

console.log('\n8. renderToStream — incremental async component streaming');
{
  // Component whose render function returns a Promise.
  // In standard renderToStringWithJITCSSDSD this would produce an empty shell.
  // With renderToStream it should resolve and appear as a swap-script chunk.
  component('async-widget', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return html`<div class="p-4 bg-green-100">Async widget loaded</div>`;
  });

  const stream = renderToStream(
    html`<div><async-widget></async-widget></div>`,
    { dsd: true },
  );

  // Drain the stream and collect all chunks
  const chunks = [];
  const reader = stream.getReader();
  let done = false;
  while (!done) {
    const { value, done: d } = await reader.read();
    if (value) chunks.push(value);
    done = d;
  }

  check(
    'stream produces ≥ 2 chunks (sync shell + async swap)',
    chunks.length,
    (v) => {
      if (v < 2)
        throw new Error(
          `Expected ≥ 2 chunks, got ${v}. Async component was not deferred.`,
        );
    },
  );

  const syncChunk = chunks[0];
  const asyncChunks = chunks.slice(1).join('');

  check(
    'chunk 1 — async placeholder has unique cer-stream-* id',
    syncChunk,
    (v) => contains(v, 'id="cer-stream-'),
  );
  check(
    'chunk 1 — placeholder shadow template is empty (not yet resolved)',
    syncChunk,
    (v) => {
      if (!v.includes('<template shadowrootmode="open"></template>')) {
        throw new Error('Expected empty DSD placeholder in sync chunk');
      }
    },
  );
  check(
    'chunk 2+ — contains shadowRoot.innerHTML swap script',
    asyncChunks,
    (v) => contains(v, 's.innerHTML'),
  );
  check(
    'chunk 2+ — swap script carries resolved shadow content',
    asyncChunks,
    (v) => contains(v, 'Async widget loaded'),
  );
  check(
    'chunk 2+ — swap script targets the correct placeholder id',
    asyncChunks,
    (v) => {
      const placeholderId = syncChunk.match(/id="(cer-stream-\d+)"/)?.[1];
      if (!placeholderId)
        throw new Error('Could not find placeholder id in sync chunk');
      if (!v.includes(placeholderId))
        throw new Error(
          `Swap script does not reference placeholder id "${placeholderId}"`,
        );
    },
  );
}

// ─────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
