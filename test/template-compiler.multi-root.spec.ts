import { describe, it, expect } from 'vitest';
import { html } from '../src/lib/runtime/template-compiler';
import { when, match, each } from '../src/lib/directives';

describe('template-compiler multi-root normalization', () => {
  it('returns an array for true multi-root templates', () => {
    const output = html`
      <div>First</div>
      <div>Second</div>
    `;
    expect(Array.isArray(output)).toBe(true);
    expect((output as any[]).length).toBe(2);
    expect((output as any[])[0].tag).toBe('div');
    expect((output as any[])[1].tag).toBe('div');
    expect((output as any[])[0].children).toBe('First');
    expect((output as any[])[1].children).toBe('Second');
  });

  it('returns a single VNode for single root templates', () => {
    const output = html`<div>Only</div>`;
    expect(typeof output).toBe('object');
    expect((output as any).tag).toBe('div');
    expect((output as any).children).toBe('Only');
  });
});

describe('template-compiler root-level directives', () => {
  it('parses root-level #show directive', () => {
    const output = html`<div #show="true">Visible</div>`;
    expect(typeof output).toBe('object');
    expect((output as any).tag).toBe('div');
    expect((output as any).props?.directives?.show).toBeDefined();
    expect((output as any).children).toBe('Visible');
  });

  it('parses root-level #class directive', () => {
    const output = html`<div #class="'active'">Classy</div>`;
    expect(typeof output).toBe('object');
    expect((output as any).tag).toBe('div');
    expect((output as any).props?.directives?.class).toBeDefined();
    expect((output as any).children).toBe('Classy');
  });

  it('parses root-level #model directive', () => {
    const output = html`<input #model="foo" type="text" />`;
    expect(typeof output).toBe('object');
    expect((output as any).tag).toBe('input');
    expect((output as any).props?.directives?.model).toBeDefined();
  });
});

describe('template-compiler root-level blocks (using directives)', () => {
  function isVNode(val: any): val is { tag: string; children?: any; key?: any } {
    return val && typeof val === 'object' && typeof val.tag === 'string';
  }

  it('handles root-level when block (true)', () => {
    const output = html`${when(true, html`<div>When True</div>`)}`;
    const arr = Array.isArray(output) ? output : [output];
    const anchor = arr.find(isVNode);
    expect(anchor?.tag).toBe('#anchor');
    const child = Array.isArray(anchor?.children) ? anchor.children.find(isVNode) : undefined;
    expect(child?.tag).toBe('div');
    expect(child?.children).toBe('When True');
  });

  it('handles root-level when block (false)', () => {
    const output = html`${when(false, html`<div>When False</div>`)}`;
    const arr = Array.isArray(output) ? output : [output];
    const anchor = arr.find(isVNode);
    expect(anchor?.tag).toBe('#anchor');
    const child = Array.isArray(anchor?.children) ? anchor.children.find(isVNode) : undefined;
    expect(child?.tag).toBe(undefined);
    expect(child?.children).toBe(undefined);
  });

  it('handles root-level match block', () => {
    const output = html`${match().when(false, html`<div>Should not show</div>`).when(true, html`<div>Matched</div>`).otherwise(html`<div>Fallback</div>`).done()}`;
    const arr = Array.isArray(output) ? output : [output];
    const anchor = arr.find(isVNode);
    expect(anchor?.tag).toBe('#anchor');
    const child = Array.isArray(anchor?.children) ? anchor.children.find(isVNode) : undefined;
    expect(child?.tag).toBe('div');
    expect(child?.children).toBe('Matched');
  });

  it('handles root-level each block', () => {
    const items = ['A', 'B', 'C'];
    const output = html`${each(items, (item) => html`<div>${item}</div>`)}`;
    const arr = Array.isArray(output) ? output : [output];
    expect(arr.length).toBe(3);
    arr.forEach((anchor, i) => {
      expect(isVNode(anchor)).toBe(true);
      expect(anchor.tag).toBe('#anchor');
      const child = Array.isArray(anchor.children) ? anchor.children.find(isVNode) : undefined;
      expect(child?.tag).toBe('div');
      expect(child?.children).toBe(items[i]);
    });
  });

  it('handles root-level each block (empty)', () => {
    const items: string[] = [];
    const output = html`${each(items, (item) => html`<div>${item}</div>`)}`;
    const arr = Array.isArray(output) ? output : [output];
    expect(arr.length).toBe(1);
    arr.forEach((anchor, i) => {
      expect(isVNode(anchor)).toBe(true);
      expect(anchor.tag).toBe('div');
      const child = Array.isArray(anchor.children) ? anchor.children.find(isVNode) : undefined;
      expect(child?.tag).toBe(undefined);
      expect(child?.children).toBe(undefined);
    });
  });
});

