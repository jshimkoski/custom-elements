import { describe, it, expect } from "vitest";
import {
  applyPropsFromDefinitions,
  type PropDefinition,
} from "../src/lib/runtime/props";

function makeElement(
  attrs: Record<string, string | undefined> = {},
  methods: Record<string, any> = {},
) {
  const el = document.createElement("div");
  Object.entries(attrs).forEach(([k, v]) => {
    if (v !== undefined) el.setAttribute(k, v);
  });
  Object.entries(methods).forEach(([k, v]) => {
    (el as any)[k] = v;
  });
  return el;
}

describe("applyProps", () => {
  it("applies string, number, boolean props from attributes", () => {
    const propDefs: Record<string, PropDefinition> = {
      foo: { type: String },
      bar: { type: Number },
      baz: { type: Boolean },
    };
    const ctx: any = {};
    const el = makeElement({ foo: "abc", bar: "42", baz: "true" });
    applyPropsFromDefinitions(el, propDefs, ctx);
    expect(ctx.foo).toBe("abc");
    expect(ctx.bar).toBe(42);
    expect(ctx.baz).toBe(true);
  });

  it("applies default values if attribute missing", () => {
    const propDefs: Record<string, PropDefinition> = {
      foo: { type: String, default: "def" },
      bar: { type: Number, default: 7 },
      baz: { type: Boolean, default: false },
    };
    const ctx: any = {};
    const el = makeElement();
    applyPropsFromDefinitions(el, propDefs, ctx);
    expect(ctx.foo).toBe("def");
    expect(ctx.bar).toBe(7);
    expect(ctx.baz).toBe(false);
  });

  it("leaves prop undefined if no attr and no default", () => {
    const propDefs: Record<string, PropDefinition> = {
      foo: { type: String },
    };
    const ctx: any = {};
    const el = makeElement();
    applyPropsFromDefinitions(el, propDefs, ctx);
    expect(ctx.foo).toBeUndefined();
  });

  it("prefers function prop on element instance", () => {
    const propDefs: Record<string, PropDefinition> = {
      onClick: { type: Function },
    };
    const ctx: any = {};
    const fn = () => "clicked";
    const el = makeElement({}, { onClick: fn });
    applyPropsFromDefinitions(el, propDefs, ctx);
    expect(ctx.onClick).toBe(fn);
  });

  it("preserves original string values without HTML escaping", () => {
    const propDefs: Record<string, PropDefinition> = {
      foo: { type: String },
      bar: { type: String, default: "<script>" },
    };
    const ctx: any = {};
    const el = makeElement({ foo: "<div>" });
    applyPropsFromDefinitions(el, propDefs, ctx);
    expect(ctx.foo).toBe("<div>");
    expect(ctx.bar).toBe("<script>");
  });

  it("returns early if propDefs is missing", () => {
    const ctx: any = { foo: "bar" };
    const el = makeElement();
    applyPropsFromDefinitions(el, {}, ctx);
    expect(ctx.foo).toBe("bar");
  });
});
