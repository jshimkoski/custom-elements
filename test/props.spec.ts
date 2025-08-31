import { describe, it, expect } from 'vitest';
import { applyProps } from '../src/lib/runtime/props';
import type { ComponentConfig, ComponentContext } from '../src/lib/runtime/types';

function makeElement(attrs: Record<string, string | undefined> = {}, methods: Record<string, any> = {}) {
  const el = document.createElement('div');
  Object.entries(attrs).forEach(([k, v]) => {
    if (v !== undefined) el.setAttribute(k, v);
  });
  Object.entries(methods).forEach(([k, v]) => {
    (el as any)[k] = v;
  });
  return el;
}

describe('applyProps', () => {
  it('applies string, number, boolean props from attributes', () => {
    const cfg: ComponentConfig<any, any, any, any> = {
      props: {
        foo: { type: String },
        bar: { type: Number },
        baz: { type: Boolean }
      }
    } as any;
    const ctx: any = {};
    const el = makeElement({ foo: 'abc', bar: '42', baz: 'true' });
    applyProps(el, cfg, ctx);
    expect(ctx.foo).toBe('abc');
    expect(ctx.bar).toBe(42);
    expect(ctx.baz).toBe(true);
  });

  it('applies default values if attribute missing', () => {
    const cfg: ComponentConfig<any, any, any, any> = {
      props: {
        foo: { type: String, default: 'def' },
        bar: { type: Number, default: 7 },
        baz: { type: Boolean, default: false }
      }
    } as any;
    const ctx: any = {};
    const el = makeElement();
    applyProps(el, cfg, ctx);
    expect(ctx.foo).toBe('def');
    expect(ctx.bar).toBe(7);
    expect(ctx.baz).toBe(false);
  });

  it('leaves prop undefined if no attr and no default', () => {
    const cfg: ComponentConfig<any, any, any, any> = {
      props: {
        foo: { type: String }
      }
    } as any;
    const ctx: any = {};
    const el = makeElement();
    applyProps(el, cfg, ctx);
    expect(ctx.foo).toBeUndefined();
  });

  it('prefers function prop on element instance', () => {
    const cfg: ComponentConfig<any, any, any, any> = {
      props: {
        onClick: { type: Function }
      }
    } as any;
    const ctx: any = {};
    const fn = () => 'clicked';
    const el = makeElement({}, { onClick: fn });
    applyProps(el, cfg, ctx);
    expect(ctx.onClick).toBe(fn);
  });

  it('escapes HTML in string props and defaults', () => {
    const cfg: ComponentConfig<any, any, any, any> = {
      props: {
        foo: { type: String },
        bar: { type: String, default: '<script>' }
      }
    } as any;
    const ctx: any = {};
    const el = makeElement({ foo: '<div>' });
    applyProps(el, cfg, ctx);
    expect(ctx.foo).toBe('&lt;div&gt;');
    expect(ctx.bar).toBe('&lt;script&gt;');
  });

  it('returns early if cfg.props is missing', () => {
    const cfg: ComponentConfig<any, any, any, any> = {} as any;
    const ctx: any = { foo: 'bar' };
    const el = makeElement();
    applyProps(el, cfg, ctx);
    expect(ctx.foo).toBe('bar');
  });
});
