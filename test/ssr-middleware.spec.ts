/**
 * Tests for SSR middleware helpers.
 *
 * Covers:
 *  - createSSRHandler: static VNode, factory function, document wrapping, head injection
 *  - createSSRHandler: error handling — factory throws, render throws, response closed
 *  - createStreamingSSRHandler: streaming response, chunked output
 *  - createStreamingSSRHandler: error handling — factory throws, response closed
 *  - SSRMiddlewareOptions: render options forwarded, document: false
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createSSRHandler,
  createStreamingSSRHandler,
  type MinimalRequest,
  type MinimalResponse,
  type SSRMiddlewareOptions,
} from '../src/lib/ssr-middleware';

// ---------------------------------------------------------------------------
// Minimal mock request / response helpers
// ---------------------------------------------------------------------------

function makeReq(url = '/'): MinimalRequest {
  return { url, method: 'GET', headers: {} };
}

interface ResMock {
  res: MinimalResponse;
  headers: Record<string, string>;
  written: string[];
  readonly body: string;
}

function makeRes(): ResMock {
  const headers: Record<string, string> = {};
  const written: string[] = [];
  let ended = '';

  const res: MinimalResponse = {
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
    write(chunk) {
      written.push(chunk);
    },
    end(data) {
      ended = data ?? '';
    },
  };

  return {
    res,
    headers,
    written,
    get body() {
      return written.join('') + ended;
    },
  };
}

// ---------------------------------------------------------------------------
// createSSRHandler
// ---------------------------------------------------------------------------

describe('createSSRHandler()', () => {
  it('returns a function', () => {
    const vnode = { tag: 'div', props: {}, children: [] };
    const handler = createSSRHandler(vnode as never);
    expect(typeof handler).toBe('function');
  });

  it('sets Content-Type header', async () => {
    const vnode = { tag: 'div', props: {}, children: [] };
    const handler = createSSRHandler(vnode as never);
    const mock = makeRes();
    await handler(makeReq(), mock.res);
    expect(mock.headers['content-type']).toContain('text/html');
  });

  it('wraps rendered HTML in a document shell by default', async () => {
    const vnode = { tag: 'p', props: {}, children: ['hello'] };
    const handler = createSSRHandler(vnode as never);
    const mock = makeRes();
    await handler(makeReq(), mock.res);
    expect(mock.body).toContain('<!DOCTYPE html>');
    expect(mock.body).toContain('<html>');
    expect(mock.body).toContain('<body>');
    expect(mock.body).toContain('</html>');
    expect(mock.body).toContain('<p>');
    expect(mock.body).toContain('hello');
  });

  it('injects head content into the shell', async () => {
    const vnode = { tag: 'div', props: {}, children: [] };
    const handler = createSSRHandler(vnode as never, {
      head: '<link rel="stylesheet" href="/app.css">',
    });
    const mock = makeRes();
    await handler(makeReq(), mock.res);
    expect(mock.body).toContain('<link rel="stylesheet" href="/app.css">');
    expect(mock.body.indexOf('<link')).toBeLessThan(mock.body.indexOf('</head>'));
  });

  it('does not wrap in document shell when document: false', async () => {
    const vnode = { tag: 'span', props: {}, children: ['raw'] };
    const handler = createSSRHandler(vnode as never, { document: false });
    const mock = makeRes();
    await handler(makeReq(), mock.res);
    expect(mock.body).not.toContain('<!DOCTYPE html>');
    expect(mock.body).toContain('<span>');
    expect(mock.body).toContain('raw');
  });

  it('accepts a VNode factory function', async () => {
    const factory = vi.fn((req: MinimalRequest) => ({
      tag: 'div',
      props: { attrs: { id: req.url } },
      children: [],
    }));
    const handler = createSSRHandler(factory as never);
    const mock = makeRes();
    await handler(makeReq('/test-path'), mock.res);
    expect(factory).toHaveBeenCalledOnce();
    expect(mock.body).toContain('id="/test-path"');
  });

  it('accepts an async VNode factory function', async () => {
    const factory = async () =>
      ({ tag: 'main', props: {}, children: ['async'] }) as never;
    const handler = createSSRHandler(factory);
    const mock = makeRes();
    await handler(makeReq(), mock.res);
    expect(mock.body).toContain('<main>');
    expect(mock.body).toContain('async');
  });

  it('passes render options to the renderer', async () => {
    const vnode = {
      tag: 'div',
      props: { attrs: { class: 'flex' } },
      children: [],
    };
    const opts: SSRMiddlewareOptions = {
      render: { dsd: false, jit: { extendedColors: false } },
      document: false,
    };
    const handler = createSSRHandler(vnode as never, opts);
    const mock = makeRes();
    await handler(makeReq(), mock.res);
    expect(mock.body).toContain('<div');
  });

  it('does not double-wrap an HTML root element', async () => {
    const vnode = {
      tag: 'html',
      props: {},
      children: [
        { tag: 'head', props: {}, children: [] },
        { tag: 'body', props: {}, children: [] },
      ],
    };
    const handler = createSSRHandler(vnode as never);
    const mock = makeRes();
    await handler(makeReq(), mock.res);
    expect((mock.body.match(/<html/g) ?? []).length).toBe(1);
  });

  it('closes the response and re-throws when the factory function throws', async () => {
    const handler = createSSRHandler(() => {
      throw new Error('factory error');
    });
    const mock = makeRes();
    await expect(handler(makeReq(), mock.res)).rejects.toThrow('factory error');
    // Response must still be closed (end() called) to avoid hanging request
    expect(mock.body).toBeTruthy();
  });

  it('closes the response and re-throws when the async factory rejects', async () => {
    const handler = createSSRHandler(async () => {
      throw new Error('async factory error');
    });
    const mock = makeRes();
    await expect(handler(makeReq(), mock.res)).rejects.toThrow('async factory error');
    expect(mock.body).toBeTruthy();
  });

  it('sends plain-text error body when factory throws', async () => {
    const handler = createSSRHandler(() => {
      throw new Error('boom');
    });
    const mock = makeRes();
    await expect(handler(makeReq(), mock.res)).rejects.toThrow();
    expect(mock.body).toContain('Internal Server Error');
  });
});

// ---------------------------------------------------------------------------
// createStreamingSSRHandler
// ---------------------------------------------------------------------------

describe('createStreamingSSRHandler()', () => {
  it('returns a function', () => {
    const vnode = { tag: 'div', props: {}, children: [] };
    const handler = createStreamingSSRHandler(vnode as never);
    expect(typeof handler).toBe('function');
  });

  it('sets Transfer-Encoding: chunked header', async () => {
    const vnode = { tag: 'div', props: {}, children: [] };
    const handler = createStreamingSSRHandler(vnode as never);
    const mock = makeRes();
    await handler(makeReq(), mock.res);
    expect(mock.headers['transfer-encoding']).toBe('chunked');
  });

  it('produces rendered HTML content', async () => {
    const vnode = { tag: 'p', props: {}, children: ['streamed'] };
    const handler = createStreamingSSRHandler(vnode as never);
    const mock = makeRes();
    await handler(makeReq(), mock.res);
    expect(mock.body).toContain('<p>');
    expect(mock.body).toContain('streamed');
  });

  it('writes document shell preamble and epilogue by default', async () => {
    const vnode = { tag: 'span', props: {}, children: [] };
    const handler = createStreamingSSRHandler(vnode as never);
    const mock = makeRes();
    await handler(makeReq(), mock.res);
    // The first write should contain the DOCTYPE preamble
    expect(mock.written[0]).toContain('<!DOCTYPE html>');
    // The full body should close the document
    expect(mock.body).toContain('</html>');
  });

  it('does not wrap when document: false', async () => {
    const vnode = { tag: 'article', props: {}, children: ['content'] };
    const handler = createStreamingSSRHandler(vnode as never, {
      document: false,
    });
    const mock = makeRes();
    await handler(makeReq(), mock.res);
    expect(mock.body).not.toContain('<!DOCTYPE html>');
    expect(mock.body).toContain('<article>');
  });

  it('accepts a per-request VNode factory', async () => {
    const factory = (req: MinimalRequest) =>
      ({
        tag: 'div',
        props: { attrs: { 'data-url': req.url } },
        children: [],
      }) as never;
    const handler = createStreamingSSRHandler(factory);
    const mock = makeRes();
    await handler(makeReq('/stream-test'), mock.res);
    expect(mock.body).toContain('data-url="/stream-test"');
  });

  it('buffers output via res.end when res.write is absent', async () => {
    const vnode = { tag: 'p', props: {}, children: ['buffered'] };
    const handler = createStreamingSSRHandler(vnode as never);

    let ended = '';
    const headers: Record<string, string> = {};
    const res: MinimalResponse = {
      setHeader(name, value) {
        headers[name.toLowerCase()] = value;
      },
      end(data) {
        ended = data ?? '';
      },
      // no write() method
    };

    await handler(makeReq(), res);

    // Transfer-Encoding must NOT be set (no streaming path taken)
    expect(headers['transfer-encoding']).toBeUndefined();
    // Content sent via end(), not write()
    expect(ended).toContain('<p>');
    expect(ended).toContain('buffered');
    expect(ended).toContain('<!DOCTYPE html>');
  });

  it('closes the response and re-throws when the factory function throws', async () => {
    const handler = createStreamingSSRHandler(() => {
      throw new Error('stream factory error');
    });
    const mock = makeRes();
    await expect(handler(makeReq(), mock.res)).rejects.toThrow('stream factory error');
    // Response must be closed
    expect(mock.body).toBeTruthy();
  });

  it('closes the response and re-throws when the async factory rejects', async () => {
    const handler = createStreamingSSRHandler(async () => {
      throw new Error('async stream error');
    });
    const mock = makeRes();
    await expect(handler(makeReq(), mock.res)).rejects.toThrow('async stream error');
    expect(mock.body).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Per-request head injection (VnodeFactoryResult.head)
// ---------------------------------------------------------------------------

describe('createSSRHandler() — per-request head from factory', () => {
  it('injects head returned from factory into the document shell', async () => {
    const factory = async () => ({
      vnode: { tag: 'div', props: {}, children: [] } as never,
      head: '<meta name="robots" content="noindex">',
    });
    const handler = createSSRHandler(factory);
    const mock = makeRes();
    await handler(makeReq(), mock.res);
    expect(mock.body).toContain('<meta name="robots" content="noindex">');
    expect(mock.body.indexOf('<meta')).toBeLessThan(mock.body.indexOf('</head>'));
  });

  it('merges per-request head with static options.head', async () => {
    const factory = async () => ({
      vnode: { tag: 'div', props: {}, children: [] } as never,
      head: '<script>window.__CER_DATA__ = {"id":1}</script>',
    });
    const handler = createSSRHandler(factory, {
      head: '<link rel="stylesheet" href="/app.css">',
    });
    const mock = makeRes();
    await handler(makeReq(), mock.res);
    expect(mock.body).toContain('<link rel="stylesheet" href="/app.css">');
    expect(mock.body).toContain('<script>window.__CER_DATA__');
    // Both appear before </head>
    const headEnd = mock.body.indexOf('</head>');
    expect(mock.body.indexOf('<link')).toBeLessThan(headEnd);
    expect(mock.body.indexOf('<script>')).toBeLessThan(headEnd);
  });

  it('is backward-compatible: { vnode } without head works as before', async () => {
    const factory = async () => ({
      vnode: { tag: 'main', props: {}, children: ['content'] } as never,
    });
    const handler = createSSRHandler(factory, {
      head: '<title>Test</title>',
    });
    const mock = makeRes();
    await handler(makeReq(), mock.res);
    expect(mock.body).toContain('<title>Test</title>');
    expect(mock.body).toContain('<main>');
  });

  it('does not inject head when factory head is undefined', async () => {
    const factory = async () => ({
      vnode: { tag: 'span', props: {}, children: [] } as never,
      head: undefined,
    });
    const handler = createSSRHandler(factory);
    const mock = makeRes();
    await handler(makeReq(), mock.res);
    // head element is present but empty (no injected content)
    expect(mock.body).toContain('<head>');
    expect(mock.body).toContain('</head>');
  });

  it('still forwards the router when factory returns { vnode, router, head }', async () => {
    const fakeRouter = { isFakeRouter: true };
    const factory = async () => ({
      vnode: { tag: 'div', props: {}, children: [] } as never,
      router: fakeRouter,
      head: '<meta charset="utf-8">',
    });
    const handler = createSSRHandler(factory);
    const mock = makeRes();
    // Should not throw — router is forwarded to renderToStringWithJITCSS
    await handler(makeReq(), mock.res);
    expect(mock.body).toContain('<meta charset="utf-8">');
  });
});

describe('createStreamingSSRHandler() — per-request head from factory', () => {
  it('injects factory head into the streaming preamble (write path)', async () => {
    const factory = async () => ({
      vnode: { tag: 'div', props: {}, children: [] } as never,
      head: '<script>window.__CER_DATA__ = {}</script>',
    });
    const handler = createStreamingSSRHandler(factory);
    const mock = makeRes();
    await handler(makeReq(), mock.res);
    // The preamble (first write) should contain the head
    expect(mock.written[0]).toContain('<script>window.__CER_DATA__');
    expect(mock.written[0]).toContain('</head>');
  });

  it('merges per-request head with static options.head in streaming mode', async () => {
    const factory = async () => ({
      vnode: { tag: 'div', props: {}, children: [] } as never,
      head: '<script>window.__CER_DATA__ = {"x":1}</script>',
    });
    const handler = createStreamingSSRHandler(factory, {
      head: '<link rel="stylesheet" href="/app.css">',
    });
    const mock = makeRes();
    await handler(makeReq(), mock.res);
    expect(mock.written[0]).toContain('<link rel="stylesheet"');
    expect(mock.written[0]).toContain('window.__CER_DATA__');
  });

  it('injects factory head via res.end when res.write is absent (buffered path)', async () => {
    const factory = async () => ({
      vnode: { tag: 'p', props: {}, children: ['hi'] } as never,
      head: '<meta name="description" content="test">',
    });
    const handler = createStreamingSSRHandler(factory);

    let ended = '';
    const res: MinimalResponse = {
      setHeader: () => {},
      end(data) { ended = data ?? '' },
      // no write() — forces buffered path
    };

    await handler(makeReq(), res);
    expect(ended).toContain('<meta name="description" content="test">');
    expect(ended).toContain('<p>');
    expect(ended.indexOf('<meta')).toBeLessThan(ended.indexOf('</head>'));
  });

  it('merges both heads in buffered path', async () => {
    const factory = async () => ({
      vnode: { tag: 'div', props: {}, children: [] } as never,
      head: '<script>window.__CER_DATA__ = {}</script>',
    });
    const handler = createStreamingSSRHandler(factory, {
      head: '<title>My App</title>',
    });

    let ended = '';
    const res: MinimalResponse = {
      setHeader: () => {},
      end(data) { ended = data ?? '' },
    };

    await handler(makeReq(), res);
    expect(ended).toContain('<title>My App</title>');
    expect(ended).toContain('window.__CER_DATA__');
  });

  it('is backward-compatible: { vnode } without head works in streaming mode', async () => {
    const factory = async () => ({
      vnode: { tag: 'article', props: {}, children: ['ok'] } as never,
    });
    const handler = createStreamingSSRHandler(factory, {
      head: '<title>Static</title>',
    });
    const mock = makeRes();
    await handler(makeReq(), mock.res);
    expect(mock.written[0]).toContain('<title>Static</title>');
    expect(mock.body).toContain('<article>');
  });
});
