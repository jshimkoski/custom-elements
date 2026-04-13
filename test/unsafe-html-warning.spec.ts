import { describe, it, expect, vi, afterEach } from 'vitest';
import { html } from '../src/lib/runtime/template-compiler';
import { unsafeHTML } from '../src/lib/runtime/helpers';
import { renderOutput } from '../src/lib/runtime/render';
import { renderToStreamWithJITCSSDSD } from '../src/lib/ssr';
import { renderToString } from '../src/lib/runtime/vdom-ssr';
import {
  __resetWarningDeduplicationForTests,
  beginRenderWarningScope,
  endRenderWarningScope,
} from '../src/lib/runtime/logger';
import type { ComponentContext } from '../src/lib/runtime/types';

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

describe('unsafeHTML warning behavior', () => {
  afterEach(() => {
    __resetWarningDeduplicationForTests();
    vi.restoreAllMocks();
  });

  function createOutput() {
    beginRenderWarningScope();
    try {
      return html`
        <div>
          ${unsafeHTML('<b>first</b>')}
          ${unsafeHTML('<i>second</i>')}
        </div>
      `;
    } finally {
      endRenderWarningScope();
    }
  }

  it('warns once per render pass for repeated raw HTML nodes', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const root = document.createElement('div').attachShadow({ mode: 'open' });
    const context: ComponentContext<object, object, object, object> = {
      refs: {},
      emit: () => true,
    };
    const output = createOutput();

    renderOutput(root, output, context, {}, vi.fn());

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(root.innerHTML).toContain('<b>first</b>');
    expect(root.innerHTML).toContain('<i>second</i>');
  });

  it('warns once per SSR render pass for repeated raw HTML nodes', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const output = createOutput();

    const rendered = renderToString(output as any);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(rendered).toContain('<b>first</b>');
    expect(rendered).toContain('<i>second</i>');
  });

  it('warns once per DSD stream render pass for repeated raw HTML nodes', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const output = createOutput();

    const rendered = await drainStream(renderToStreamWithJITCSSDSD(output as any));

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(rendered).toContain('<b>first</b>');
    expect(rendered).toContain('<i>second</i>');
  });

  it('warns only once across repeated SSR render passes', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const first = renderToString(createOutput() as any);
    const second = renderToString(createOutput() as any);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(first).toContain('<b>first</b>');
    expect(second).toContain('<b>first</b>');
  });
});