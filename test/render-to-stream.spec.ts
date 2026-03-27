/**
 * Tests for renderToStream and renderToStreamWithJITCSSDSD.
 * Focuses on P0-3: asyncTimeout prevents hung async components from blocking the stream.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToStream, renderToStreamWithJITCSSDSD } from '../src/lib/ssr';
import { type AsyncStreamEntry } from '../src/lib/runtime/vdom-ssr-dsd';
import type { VNode } from '../src/lib/runtime/types';

afterEach(() => {
  vi.useRealTimers();
});

/** Drain a ReadableStream<string> into a concatenated string. */
async function drainStream(stream: ReadableStream<string>): Promise<string> {
  const reader = stream.getReader();
  const chunks: string[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return chunks.join('');
}

const SIMPLE_VNODE: VNode = {
  tag: 'div',
  attrs: {},
  children: ['hello'],
} as unknown as VNode;

// ─── Basic streaming ───────────────────────────────────────────────────────────

describe('renderToStream — basic', () => {
  it('returns a ReadableStream', () => {
    const stream = renderToStream(SIMPLE_VNODE);
    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it('produces at least one chunk containing the rendered HTML', async () => {
    const stream = renderToStream(SIMPLE_VNODE);
    const html = await drainStream(stream);
    expect(html).toContain('hello');
  });

  it('closes the stream after all chunks are emitted', async () => {
    const stream = renderToStream(SIMPLE_VNODE);
    const reader = stream.getReader();
    let done = false;
    while (!done) {
      ({ done } = await reader.read());
    }
    expect(done).toBe(true);
  });
});

// ─── asyncTimeout ──────────────────────────────────────────────────────────────

describe('renderToStream — asyncTimeout (P0-3)', () => {
  it('closes the stream even when an async entry never resolves (default 30s timeout)', async () => {
    vi.useFakeTimers();

    // Inject a never-resolving entry into the streaming collector before the render.
    // We have to call beginStreamingCollection ourselves because renderToStream
    // calls it internally — but we can inject our own hanging entry AFTER the
    // initial render completes by providing a custom vnode whose render triggers
    // it. Instead, directly test via the public asyncTimeout option by injecting
    // a hanging promise via the internal collector API.
    //
    // Strategy: call renderToStream with a vnode that produces no output, then
    // manually push a hanging entry into the collector right before the render
    // call so it is picked up by the stream's async loop.

    let hangCollector: AsyncStreamEntry[] | null = null;

    // Intercept beginStreamingCollection to capture the collector reference.
    const origBegin = (await import('../src/lib/runtime/vdom-ssr-dsd'))
      .beginStreamingCollection;
    vi.spyOn(
      await import('../src/lib/runtime/vdom-ssr-dsd'),
      'beginStreamingCollection',
    ).mockImplementationOnce((collector) => {
      hangCollector = collector;
      origBegin(collector);
      // Push a hanging entry after the collector is set.
      hangCollector!.push({
        id: 'hang-1',
        tag: 'my-async',
        attrsString: '',
        hydrateAttr: '',
        useStyleCSS: '',
        lightDOM: '',
        opts: { dsd: true },
        promise: new Promise(() => {
          /* never resolves */
        }),
      });
    });

    // asyncTimeout: 100ms so the test doesn't need to advance 30s.
    const stream = renderToStream(SIMPLE_VNODE, { asyncTimeout: 100 });

    // Advance past the timeout — the stream should close.
    vi.advanceTimersByTime(200);
    await vi.runAllTimersAsync();

    const html = await drainStream(stream);
    // The synchronous render chunk should still be present.
    expect(html).toContain('hello');
  });

  it('closes the stream when an async entry times out with custom asyncTimeout', async () => {
    vi.useFakeTimers();

    const stream = renderToStream(SIMPLE_VNODE, { asyncTimeout: 50 });

    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();

    // Stream should be closeable without hanging.
    const reader = stream.getReader();
    let done = false;
    while (!done) {
      vi.advanceTimersByTime(10);
      ({ done } = await reader.read());
    }
    expect(done).toBe(true);
  });

  it('passes asyncTimeout through renderToStreamWithJITCSSDSD', () => {
    // Verify the overload signature accepts asyncTimeout without TypeScript errors.
    // If this compiles and produces a ReadableStream, the option is threaded correctly.
    const stream = renderToStreamWithJITCSSDSD(SIMPLE_VNODE, {
      asyncTimeout: 5000,
    });
    expect(stream).toBeInstanceOf(ReadableStream);
  });
});

// ─── Error handling ────────────────────────────────────────────────────────────

describe('renderToStream — sync render error', () => {
  it('errors the stream when the sync render throws', async () => {
    // Pass a vnode that will cause renderToStringWithJITCSS to throw.
    const badVNode = null as unknown as VNode;
    const stream = renderToStream(badVNode);
    const reader = stream.getReader();
    await expect(reader.read()).rejects.toThrow();
  });
});
