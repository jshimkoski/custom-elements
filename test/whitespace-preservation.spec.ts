import { describe, it, expect } from 'vitest';
import { html } from '../src/lib/runtime/template-compiler';

describe('Whitespace Preservation', () => {
  it('should preserve whitespace in <pre> elements', () => {
    const result = html`
      <pre>
Line 1
Line 2
  Indented</pre
      >
    `;

    const preNode = Array.isArray(result) ? result[0] : result;
    expect(preNode.tag).toBe('pre');

    // In the compiled template, children can be a string directly for text-only content
    const textContent =
      typeof preNode.children === 'string'
        ? preNode.children
        : preNode.children?.[0];

    expect(typeof textContent).toBe('string');
    expect(textContent).toContain('\n');
    expect(textContent).toMatch(/Line 1\nLine 2/);
    expect(textContent).toContain('  Indented');
  });

  it('should preserve whitespace in <code> elements with multiple lines', () => {
    // Using String.raw to preserve literal newlines that formatter won't collapse
    const template = String.raw`<code>const x = 1;
const y = 2;</code>`;
    const result = html([template] as any);

    const codeNode = Array.isArray(result) ? result[0] : result;
    expect(codeNode.tag).toBe('code');

    const textContent =
      typeof codeNode.children === 'string'
        ? codeNode.children
        : codeNode.children?.[0];

    expect(typeof textContent).toBe('string');
    expect(textContent).toContain('\n');
    expect(textContent).toMatch(/const x = 1;\nconst y = 2;/);
  });

  it('should preserve whitespace in <textarea> elements', () => {
    const result = html`
      <textarea>
Line 1
Line 2
  Indented</textarea
      >
    `;

    const textareaNode = Array.isArray(result) ? result[0] : result;
    expect(textareaNode.tag).toBe('textarea');

    const textContent =
      typeof textareaNode.children === 'string'
        ? textareaNode.children
        : textareaNode.children?.[0];

    expect(typeof textContent).toBe('string');
    expect(textContent).toContain('\n');
    expect(textContent).toMatch(/Line 1\nLine 2/);
  });

  it('should collapse whitespace in regular elements', () => {
    const result = html` <div>Line 1 Line 2 Indented</div> `;

    const divNode = Array.isArray(result) ? result[0] : result;
    expect(divNode.tag).toBe('div');

    const textContent =
      typeof divNode.children === 'string'
        ? divNode.children
        : divNode.children?.[0];

    expect(typeof textContent).toBe('string');
    // Should be collapsed to single spaces
    expect(textContent).not.toContain('\n');
    expect(textContent).toMatch(/Line 1 Line 2 Indented/);
  });

  it('should preserve whitespace in nested pre inside div', () => {
    const result = html`
      <div>
        <pre>
Line 1
Line 2</pre
        >
      </div>
    `;

    const divNode = Array.isArray(result) ? result[0] : result;
    const preNode = Array.isArray(divNode.children)
      ? divNode.children.find((c: any) => c.tag === 'pre')
      : undefined;
    expect(preNode).toBeDefined();

    if (preNode && typeof preNode === 'object') {
      const textContent =
        typeof (preNode as any).children === 'string'
          ? (preNode as any).children
          : (preNode as any).children?.[0];

      expect(typeof textContent).toBe('string');
      expect(textContent).toContain('\n');
      expect(textContent).toMatch(/Line 1\nLine 2/);
    }
  });
});
