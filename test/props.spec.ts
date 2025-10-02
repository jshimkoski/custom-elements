import { describe, it, expect, beforeEach } from "vitest";
import {
  applyPropsFromDefinitions,
  applyProps,
  type PropDefinition,
} from "../src/lib/runtime/props";
import { ReactiveState } from "../src/lib/runtime/reactive";

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

describe("applyPropsFromDefinitions", () => {
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

  it("uses JS property value when attribute is missing", () => {
    const propDefs: Record<string, PropDefinition> = {
      enabled: { type: Boolean },
      count: { type: Number },
      label: { type: String },
    };
    const ctx: any = {};
    const el = makeElement({}, { enabled: true, count: 42, label: "test" });
    applyPropsFromDefinitions(el, propDefs, ctx);
    expect(ctx.enabled).toBe(true);
    expect(ctx.count).toBe(42);
    expect(ctx.label).toBe("test");
  });

  it("parses non-typed property values correctly", () => {
    const propDefs: Record<string, PropDefinition> = {
      enabled: { type: Boolean },
      count: { type: Number },
    };
    const ctx: any = {};
    const el = makeElement({}, { enabled: "true", count: "100" });
    applyPropsFromDefinitions(el, propDefs, ctx);
    expect(ctx.enabled).toBe(true);
    expect(ctx.count).toBe(100);
  });

  it("handles error when converting property value", () => {
    const propDefs: Record<string, PropDefinition> = {
      badProp: { type: String },
    };
    const ctx: any = {};
    const el = document.createElement("div");
    const badValue = {
      toString() {
        throw new Error("Cannot convert");
      }
    };
    (el as any).badProp = badValue;
    
    applyPropsFromDefinitions(el, propDefs, ctx);
    expect(ctx.badProp).toBe(badValue);
  });

  it("parses boolean attribute with empty string as true", () => {
    const propDefs: Record<string, PropDefinition> = {
      disabled: { type: Boolean },
    };
    const ctx: any = {};
    const el = makeElement({ disabled: "" });
    applyPropsFromDefinitions(el, propDefs, ctx);
    expect(ctx.disabled).toBe(true);
  });

  it("parses boolean attribute with 'false' as false", () => {
    const propDefs: Record<string, PropDefinition> = {
      disabled: { type: Boolean },
    };
    const ctx: any = {};
    const el = makeElement({ disabled: "false" });
    applyPropsFromDefinitions(el, propDefs, ctx);
    expect(ctx.disabled).toBe(false);
  });

  it("uses function property when attr is missing", () => {
    const propDefs: Record<string, PropDefinition> = {
      onClick: { type: Function },
    };
    const ctx: any = {};
    const fn = () => "clicked";
    const el = makeElement({}, { onClick: fn });
    applyPropsFromDefinitions(el, propDefs, ctx);
    expect(ctx.onClick).toBe(fn);
  });
});

describe("applyProps (ComponentConfig)", () => {
  it("calls applyPropsFromDefinitions when cfg.props is defined", () => {
    const el = makeElement({ foo: "bar" });
    const cfg: any = {
      props: {
        foo: { type: String },
      },
    };
    const context: any = {};
    
    applyProps(el, cfg, context);
    expect(context.foo).toBe("bar");
  });

  it("defines dynamic getters when no cfg.props", () => {
    const el = makeElement({}, { customProp: "value" });
    const cfg: any = {};
    const context: any = {};
    
    applyProps(el, cfg, context);
    expect(context.customProp).toBe("value");
  });

  it("skips internal properties starting with _", () => {
    const el = makeElement({}, { _internal: "private", public: "value" });
    const cfg: any = {};
    const context: any = {};
    
    applyProps(el, cfg, context);
    expect(context._internal).toBeUndefined();
    expect(context.public).toBe("value");
  });

  it("prefers attribute value over property value", () => {
    const el = makeElement({ foo: "attr-value" }, { foo: "prop-value" });
    const cfg: any = {};
    const context: any = {};
    
    applyProps(el, cfg, context);
    expect(context.foo).toBe("attr-value");
  });

  it("unwraps ReactiveState values", () => {
    const reactiveValue = new ReactiveState("reactive");
    const el = makeElement({}, { data: reactiveValue });
    const cfg: any = {};
    const context: any = {};
    
    applyProps(el, cfg, context);
    expect(context.data).toBe("reactive");
  });

  it("unwraps objects with .value property", () => {
    const valueObj = { value: "unwrapped" };
    const el = makeElement({}, { prop: valueObj });
    const cfg: any = {};
    const context: any = {};
    
    applyProps(el, cfg, context);
    expect(context.prop).toBe("unwrapped");
  });

  it("does not unwrap Node objects with .value", () => {
    const input = document.createElement("input");
    input.value = "input-value";
    const el = makeElement({}, { inputRef: input });
    const cfg: any = {};
    const context: any = {};
    
    applyProps(el, cfg, context);
    expect(context.inputRef).toBe(input);
  });

  it("handles errors in getter gracefully", () => {
    const el = document.createElement("div");
    Object.defineProperty(el, "badProp", {
      get() {
        throw new Error("Bad property");
      }
    });
    const cfg: any = {};
    const context: any = {};
    
    // Should not throw
    applyProps(el, cfg, context);
  });

  it("respects existing non-configurable properties", () => {
    const el = makeElement({}, { prop: "value" });
    const cfg: any = {};
    const context: any = {};
    Object.defineProperty(context, "prop", {
      value: "existing",
      configurable: false,
    });
    
    applyProps(el, cfg, context);
    expect(context.prop).toBe("existing");
  });

  it("respects existing getters/setters", () => {
    const el = makeElement({}, { prop: "value" });
    const cfg: any = {};
    const context: any = {};
    let capturedValue = "getter";
    Object.defineProperty(context, "prop", {
      get() { return capturedValue; },
      set(v) { capturedValue = v; },
      configurable: false,
    });
    
    applyProps(el, cfg, context);
    expect(context.prop).toBe("getter");
  });

  it("allows overriding declared props from useProps", () => {
    const el = makeElement({ foo: "bar" });
    const cfg: any = {};
    const context: any = {
      _hookCallbacks: {
        props: {
          foo: { type: String },
        },
      },
    };
    
    applyProps(el, cfg, context);
    expect(context.foo).toBe("bar");
  });

  it("handles useProps with empty declared props", () => {
    const el = makeElement({}, { prop: "value" });
    const cfg: any = {};
    const context: any = {
      _hookCallbacks: {
        props: {},
      },
    };
    
    applyProps(el, cfg, context);
    expect(context.prop).toBe("value");
  });

  it("handles missing _hookCallbacks gracefully", () => {
    const el = makeElement({}, { prop: "value" });
    const cfg: any = {};
    const context: any = {};
    
    applyProps(el, cfg, context);
    expect(context.prop).toBe("value");
  });

  it("handles errors during defineProperty gracefully", () => {
    const el = makeElement({}, { prop: "value" });
    const cfg: any = {};
    const context: any = {};
    
    // Create a non-extensible object to cause defineProperty to throw
    Object.preventExtensions(context);
    
    // Should not throw
    applyProps(el, cfg, context);
  });

  it("handles outer try-catch errors gracefully", () => {
    const el = makeElement();
    const cfg: any = {};
    // Pass something that will cause errors in the outer try
    const context: any = null;
    
    // Should not throw
    expect(() => applyProps(el, cfg, context as any)).not.toThrow();
  });

  it("handles non-string keys gracefully", () => {
    const el = document.createElement("div");
    const cfg: any = {};
    const context: any = {};
    
    // Add a symbol property
    const sym = Symbol("test");
    (el as any)[sym] = "symbol-value";
    
    applyProps(el, cfg, context);
    // Symbol keys should be skipped
    expect(context[sym as any]).toBeUndefined();
  });
});
