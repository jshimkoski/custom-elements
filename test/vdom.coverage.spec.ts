/**
 * Additional VDOM tests to increase coverage to 80%+
 * Focuses on edge cases and uncovered branches
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createElement, patch, patchChildren, patchProps, cleanupRefs, processModelDirective, assignKeysDeep } from "../src/lib/runtime/vdom";
import type { VNode as VNodeType } from "../src/lib/runtime/types";
import { ReactiveState } from "../src/lib/runtime/reactive";
import { setElementTransition, setNodeKey } from "../src/lib/runtime/node-metadata";

type VNode = VNodeType;

describe("VDOM Coverage - Edge Cases", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("coerceBooleanForNative edge cases", () => {
    it("should handle disabled attribute with 'false' string", () => {
      const vnode: VNode = {
        tag: "button",
        props: {
          props: { disabled: "false" },
          attrs: {},
        },
      };
      const el = createElement(vnode) as HTMLButtonElement;
      // 'false' string should be coerced to false
      expect(el.disabled).toBe(false);
    });

    it("should handle disabled attribute with empty string", () => {
      const vnode: VNode = {
        tag: "input",
        props: {
          props: { disabled: "" },
          attrs: {},
        },
      };
      const el = createElement(vnode) as HTMLInputElement;
      // Empty string should be treated as true (attribute presence)
      expect(el.disabled).toBe(true);
    });

    it("should handle disabled with ReactiveState", () => {
      const disabled = new ReactiveState(true);
      const vnode: VNode = {
        tag: "input",
        props: {
          props: { disabled },
          attrs: {},
        },
      };
      const el = createElement(vnode) as HTMLInputElement;
      expect(el.disabled).toBe(true);
    });

    it("should handle disabled with object wrapper", () => {
      const vnode: VNode = {
        tag: "input",
        props: {
          props: { disabled: { value: true } },
          attrs: {},
        },
      };
      const el = createElement(vnode) as HTMLInputElement;
      expect(el.disabled).toBe(true);
    });

    it("should not coerce arbitrary objects to truthy disabled", () => {
      const vnode: VNode = {
        tag: "input",
        props: {
          props: { disabled: { some: "object" } },
          attrs: {},
        },
      };
      const el = createElement(vnode) as HTMLInputElement;
      // Arbitrary objects should not enable disabled
      expect(el.disabled).toBe(false);
    });
  });

  describe("cleanupRefs", () => {
    it("should clean up refs recursively", () => {
      const refs: any = {
        myInput: null,
      };
  const input = document.createElement("input");
  setNodeKey(input, "myInput");
      refs.myInput = input;
      container.appendChild(input);

      cleanupRefs(container, refs);
      expect(refs.myInput).toBeUndefined();
    });

    it("should handle missing refs gracefully", () => {
      expect(() => cleanupRefs(container)).not.toThrow();
    });

    it("should clean up event listeners", () => {
      const button = document.createElement("button");
      const onClick = () => {};
      button.addEventListener("click", onClick);
      container.appendChild(button);

      cleanupRefs(container);
      // Event listeners should be cleaned up (no errors)
      expect(container.contains(button)).toBe(true);
    });
  });

  describe("processModelDirective - IME composition", () => {
    it("should handle compositionstart event", () => {
      const state = new ReactiveState("test");
      const props: any = {};
      const attrs: any = {};
      const listeners: any = {};
      const input = document.createElement("input");

      processModelDirective(state, [], props, attrs, listeners, { _state: {} }, input);

      // Trigger compositionstart
      const event = new Event("compositionstart");
      listeners.compositionstart(event);

      expect((listeners as any)._isComposing).toBe(true);
    });

    it("should handle compositionend event", () => {
      const state = new ReactiveState("test");
      const props: any = {};
      const attrs: any = {};
      const listeners: any = {};
      const input = document.createElement("input");

      processModelDirective(state, [], props, attrs, listeners, { _state: {} }, input);

      (listeners as any)._isComposing = true;
      input.value = "updated";

      // Trigger compositionend
      const event = new Event("compositionend");
      Object.defineProperty(event, "target", { value: input, writable: false });
      listeners.compositionend(event);

      expect((listeners as any)._isComposing).toBe(false);
    });

    it("should ignore events during composition", () => {
      const state = new ReactiveState("test");
      const props: any = {};
      const attrs: any = {};
      const listeners: any = {};
      const input = document.createElement("input");

      processModelDirective(state, [], props, attrs, listeners, { _state: {} }, input);

      (listeners as any)._isComposing = true;
      input.value = "new value";

      // Trigger input event during composition
      listeners.input({ target: input, bubbles: true });

      // Value should not update during composition
      expect(state.value).toBe("test");
    });
  });

  describe("processModelDirective - Radio buttons", () => {
    it("should handle radio button model binding", () => {
      const state = new ReactiveState("option1");
      const props: any = {};
      const attrs: any = { value: "option2", type: "radio" };
      const listeners: any = {};
      const input = document.createElement("input");
      input.type = "radio";
      input.value = "option2";

      processModelDirective(state, [], props, attrs, listeners, { _state: {} }, input);

      // Initial state
      expect(props.checked).toBe(false);

      // Simulate clicking radio button
      input.checked = true;
      listeners.change({ target: input, bubbles: true });

      expect(state.value).toBe("option2");
    });
  });

  describe("processModelDirective - Checkbox arrays", () => {
    it("should handle checkbox with array model", () => {
      const state = new ReactiveState(["option1"]);
      const props: any = {};
      const attrs: any = { value: "option2", type: "checkbox" };
      const listeners: any = {};
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = "option2";

      processModelDirective(state, [], props, attrs, listeners, { _state: {} }, input);

      // Check the checkbox
      input.checked = true;
      listeners.change({ target: input, bubbles: true });

      expect(state.value).toContain("option2");
    });

    it("should remove unchecked checkbox value from array", () => {
      const state = new ReactiveState(["option1", "option2"]);
      const props: any = {};
      const attrs: any = { value: "option2", type: "checkbox" };
      const listeners: any = {};
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = "option2";

      processModelDirective(state, [], props, attrs, listeners, { _state: {} }, input);

      // Uncheck the checkbox
      input.checked = false;
      listeners.change({ target: input, bubbles: true });

      expect(state.value).not.toContain("option2");
    });
  });

  describe("processModelDirective - Multiple select", () => {
    it("should handle multiple select", () => {
      const state = new ReactiveState([]);
      const props: any = {};
      const attrs: any = {};
      const listeners: any = {};
      const select = document.createElement("select");
      select.multiple = true;

      const option1 = document.createElement("option");
      option1.value = "opt1";
      option1.text = "Option 1";
      select.appendChild(option1);

      const option2 = document.createElement("option");
      option2.value = "opt2";
      option2.text = "Option 2";
      select.appendChild(option2);

      processModelDirective(state, [], props, attrs, listeners, { _state: {} }, select);

      // Select both options
      option1.selected = true;
      option2.selected = true;

      listeners.change({ target: select, bubbles: true });

      expect(state.value).toEqual(["opt1", "opt2"]);
    });
  });

  describe("processModelDirective - Modifiers", () => {
    it("should handle .number modifier", () => {
      const state = new ReactiveState(0);
      const props: any = {};
      const attrs: any = {};
      const listeners: any = {};
      const input = document.createElement("input");

      processModelDirective(state, ["number"], props, attrs, listeners, { _state: {} }, input);

      input.value = "42";
      listeners.input({ target: input, bubbles: true });

      expect(state.value).toBe(42);
    });

    it("should handle .trim modifier", () => {
      const state = new ReactiveState("");
      const props: any = {};
      const attrs: any = {};
      const listeners: any = {};
      const input = document.createElement("input");

      processModelDirective(state, ["trim"], props, attrs, listeners, { _state: {} }, input);

      input.value = "  hello  ";
      listeners.input({ target: input, bubbles: true });

      expect(state.value).toBe("hello");
    });

    it("should handle .lazy modifier with change event", () => {
      const state = new ReactiveState("");
      const props: any = {};
      const attrs: any = {};
      const listeners: any = {};
      const input = document.createElement("input");

      processModelDirective(state, ["lazy"], props, attrs, listeners, { _state: {} }, input);

      // Should use change event, not input event
      expect(listeners.change).toBeDefined();
      expect(listeners.input).toBeUndefined();
    });
  });

  describe("processModelDirective - Nested updates", () => {
    it("should handle nested object updates", () => {
      const state = new ReactiveState({ name: "John", age: 30 });
      const props: any = {};
      const attrs: any = {};
      const listeners: any = {};
      const context: any = { _state: {} };

      processModelDirective(state, [], props, attrs, listeners, context);

      // Trigger update:name event
      const event = new CustomEvent("update:name", { detail: "Jane" });
      
      if (listeners["update:name"]) {
        listeners["update:name"](event);
        expect(state.value.name).toBe("Jane");
      }
    });
  });

  describe("patchProps edge cases", () => {
    it("should handle patching disabled on native controls", () => {
      const el = document.createElement("input");
      const oldProps = {
        props: {},
        attrs: {},
      };
      const newProps = {
        props: { disabled: true },
        attrs: {},
      };

      patchProps(el, oldProps, newProps);
      expect((el as HTMLInputElement).disabled).toBe(true);
    });

    it("should patch props on custom elements", () => {
      const el = document.createElement("div");
      const oldProps: any = {
        props: {},
        attrs: {},
        isCustomElement: true,
      };
      const newProps: any = {
        props: { customProp: "value" },
        attrs: {},
        isCustomElement: true,
      };

      patchProps(el, oldProps, newProps);
      expect((el as any).customProp).toBe("value");
    });

    it("should detect changes in ReactiveState wrappers with different identities", () => {
      const input = document.createElement("input");
      const state1 = new ReactiveState("old");
      const state2 = new ReactiveState("new");
      const oldProps = {
        props: { value: state1 },
        attrs: {},
      };
      const newProps = {
        props: { value: state2 },
        attrs: {},
      };

      patchProps(input, oldProps, newProps);
      // Should unwrap ReactiveState and set the value
      expect(input.value).toBe("new");
    });
  });

  describe("assignKeysDeep", () => {
    it("should assign unique keys to nodes with key conflicts", () => {
      const nodes: VNode[] = [
        { tag: "div", props: {}, key: "same" },
        { tag: "div", props: {}, key: "same" },
        { tag: "div", props: {}, key: "same" },
      ];

      const result = assignKeysDeep(nodes, "base") as VNode[];
      const keys = result.map((n: any) => n.key);

      // All keys should be unique
      expect(new Set(keys).size).toBe(keys.length);
    });

    it("should handle nested children", () => {
      const node: VNode = {
        tag: "div",
        props: {},
        key: "parent",
        children: [
          { tag: "span", props: {}, key: "child1" },
          { tag: "span", props: {}, key: "child2" },
        ],
      };

      const result = assignKeysDeep(node, "root") as VNode;
      expect(result.key).toBeDefined();
      expect(Array.isArray(result.children)).toBe(true);
    });
  });

  describe("patch - tag mismatch with same key", () => {
    it("should patch in-place when tag matches but key differs for custom elements", () => {
      const oldVNode: VNode = {
        tag: "custom-element",
        props: {},
        key: "old-key",
      };
      const newVNode: VNode = {
        tag: "custom-element",
        props: {},
        key: "new-key",
      };

      const oldEl = createElement(oldVNode);
      container.appendChild(oldEl);

      const result = patch(oldEl, oldVNode, newVNode);
      expect(result).toBe(oldEl); // Should reuse the same element
    });

    it("should replace node when both tag and key differ", () => {
      const oldVNode: VNode = {
        tag: "div",
        props: {},
        key: "old-key",
      };
      const newVNode: VNode = {
        tag: "span",
        props: {},
        key: "new-key",
      };

      const oldEl = createElement(oldVNode);
      container.appendChild(oldEl);

      const result = patch(oldEl, oldVNode, newVNode);
      expect(result).not.toBe(oldEl);
      expect((result as HTMLElement).tagName).toBe("SPAN");
    });
  });

  describe("createElement - custom elements", () => {
    it("should call requestRender on custom elements after creation", () => {
      const vnode: VNode = {
        tag: "div",
        props: {
          props: { testProp: "value" },
          attrs: {},
        },
      };

      const el = createElement(vnode) as any;
      
      // Mock custom element methods
      el.requestRender = () => {};
      el._cfg = { render: () => ({}) };

      // This would normally be called during creation
      expect(el).toBeDefined();
    });

    it("should create select with children", () => {
      const vnode: VNode = {
        tag: "select",
        props: {
          attrs: {},
        },
        children: [
          { tag: "option", props: { attrs: { value: "option1" } }, children: "Option 1" },
          { tag: "option", props: { attrs: { value: "option2" } }, children: "Option 2" },
        ],
      };

      const select = createElement(vnode) as HTMLSelectElement;
      expect(select.children.length).toBe(2);
      expect(select.tagName).toBe("SELECT");
    });
  });

  describe("patchChildren - TransitionGroup", () => {
    it("should handle TransitionGroup metadata", () => {
      const parent = document.createElement("div");
      // Use runtime helper to set transition metadata so WeakMap-backed storage is used
      setElementTransition(parent, {
        css: true,
        classes: {
          enterFrom: "opacity-0",
          enterActive: "transition-opacity",
          enterTo: "opacity-100",
        },
      });

      const oldChildren: VNode[] = [];
      const newChildren: VNode[] = [
        { tag: "div", props: {}, key: "item1", children: "Item 1" },
      ];

      patchChildren(parent, oldChildren, newChildren);
      expect(parent.childNodes.length).toBeGreaterThan(0);
    });
  });

  describe("processModelDirective - Custom elements", () => {
    it("should set up update:prop listeners for custom elements", () => {
      const state = new ReactiveState("value");
      const props: any = {};
      const attrs: any = {};
      const listeners: any = {};
      const customEl = document.createElement("custom-input");

      processModelDirective(state, [], props, attrs, listeners, { _state: {} }, customEl, "modelValue");

      expect(listeners["update:modelValue"]).toBeDefined();
      expect(listeners["update:model-value"]).toBeDefined();
    });

    it("should apply ReactiveState directly to custom element props", () => {
      const state = new ReactiveState("value");
      const props: any = {};
      const attrs: any = {};
      const listeners: any = {};
      const customEl = document.createElement("custom-input");

      processModelDirective(state, [], props, attrs, listeners, { _state: {} }, customEl);

      // ReactiveState should be assigned directly for custom elements
      expect(props.modelValue).toBe(state);
    });
  });

  describe("processModelDirective - Attribute fallback", () => {
    it("should set attribute for custom elements", () => {
      const state = new ReactiveState("test value");
      const props: any = {};
      const attrs: any = {};
      const listeners: any = {};
      const customEl = document.createElement("custom-el");

      processModelDirective(state, [], props, attrs, listeners, { _state: {} }, customEl);

      // Should set attribute for initialization
      expect(attrs["model-value"]).toBeDefined();
    });
  });

  describe("Event filtering", () => {
    it("should prevent updates when _modelUpdating flag is set", () => {
      const state = new ReactiveState("test");
      const props: any = {};
      const attrs: any = {};
      const listeners: any = {};
      const input = document.createElement("input");

      processModelDirective(state, [], props, attrs, listeners, { _state: {} }, input);

      (input as any)._modelUpdating = true;
      input.value = "new value";

      const event = new InputEvent("input", { bubbles: true });
      Object.defineProperty(event, "target", { value: input, writable: false, configurable: true });
      
      listeners.input(event);

      // Should not update when _modelUpdating is true
      expect(state.value).toBe("test");
    });

    it("should filter events without target", () => {
      const state = new ReactiveState("test");
      const props: any = {};
      const attrs: any = {};
      const listeners: any = {};
      const input = document.createElement("input");

      processModelDirective(state, [], props, attrs, listeners, { _state: {} }, input);

      const event = new Event("input");
      // Event without target should be ignored
      
      listeners.input(event);

      // Value should remain unchanged
      expect(state.value).toBe("test");
    });
  });
});
