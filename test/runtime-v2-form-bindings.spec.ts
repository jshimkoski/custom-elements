import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createElementClass, html } from "../src/lib/runtime-v2";

describe("Runtime V2 Form Bindings", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    // Clean up any custom elements that were defined
    const elements = container.querySelectorAll("*");
    elements.forEach((el) => {
      if (el.shadowRoot) {
        el.remove();
      }
    });
  });

  describe("v-model basic functionality", () => {
    it("should bind text input with v-model", async () => {
      const ElementClass = createElementClass({
        state: { message: "hello" },
        render: (state) => html`<input type="text" v-model="message" />`,
        style: "",
      });

      customElements.define("v-model-text-test", ElementClass);

      const el = document.createElement("v-model-text-test") as any;
      container.appendChild(el);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const input = el.shadowRoot.querySelector("input") as HTMLInputElement;
      expect(input?.value).toBe("hello");

      // Test two-way binding
      input.value = "world";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(el._state.message).toBe("world");
    });

    it("should handle v-model with .trim modifier", async () => {
      const ElementClass = createElementClass({
        state: { text: "" },
        render: (state) => html`<input type="text" v-model="text.trim" />`,
        style: "",
      });

      customElements.define("v-model-trim-test", ElementClass);

      const el = document.createElement("v-model-trim-test") as any;
      container.appendChild(el);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const input = el.shadowRoot.querySelector("input") as HTMLInputElement;

      input.value = "  hello world  ";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(el._state.text).toBe("hello world");
    });

    it("should handle v-model with .number modifier", async () => {
      const ElementClass = createElementClass({
        state: { count: 0 },
        render: (state) => html`<input type="text" v-model="count.number" />`,
        style: "",
      });

      customElements.define("v-model-number-test", ElementClass);

      const el = document.createElement("v-model-number-test") as any;
      container.appendChild(el);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const input = el.shadowRoot.querySelector("input") as HTMLInputElement;

      input.value = "123";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(el._state.count).toBe(123);
      expect(typeof el._state.count).toBe("number");
    });

    it("should handle v-model with .lazy modifier", async () => {
      const ElementClass = createElementClass({
        state: { text: "" },
        render: (state) => html`<input type="text" v-model="text.lazy" />`,
        style: "",
      });

      customElements.define("v-model-lazy-test", ElementClass);

      const el = document.createElement("v-model-lazy-test") as any;
      container.appendChild(el);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const input = el.shadowRoot.querySelector("input") as HTMLInputElement;

      // With lazy modifier, input events shouldn't trigger updates
      input.value = "typing...";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(el._state.text).toBe(""); // Should not update yet

      // But change/blur events should trigger updates
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(el._state.text).toBe("typing...");
    });

    it("should handle combined modifiers v-model.trim.number", async () => {
      const ElementClass = createElementClass({
        state: { value: 0 },
        render: (state) =>
          html`<input type="text" v-model="value.trim.number" />`,
        style: "",
      });

      customElements.define("v-model-combined-test", ElementClass);

      const el = document.createElement("v-model-combined-test") as any;
      container.appendChild(el);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const input = el.shadowRoot.querySelector("input") as HTMLInputElement;

      input.value = "  456  ";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(el._state.value).toBe(456);
      expect(typeof el._state.value).toBe("number");
    });
  });

  describe("checkbox bindings", () => {
    it("should handle single checkbox with boolean value", async () => {
      const ElementClass = createElementClass({
        state: { agreed: false },
        render: (state) => html`<input type="checkbox" v-model="agreed" />`,
        style: "",
      });

      customElements.define("checkbox-boolean-test", ElementClass);

      const el = document.createElement("checkbox-boolean-test") as any;
      container.appendChild(el);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const checkbox = el.shadowRoot.querySelector("input") as HTMLInputElement;
      expect(checkbox.checked).toBe(false);

      checkbox.checked = true;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(el._state.agreed).toBe(true);
    });

    it("should handle single checkbox with custom true/false values", async () => {
      const ElementClass = createElementClass({
        state: { status: "no" },
        render: (state) =>
          html`<input
            type="checkbox"
            v-model="status"
            true-value="yes"
            false-value="no"
          />`,
        style: "",
      });

      customElements.define("checkbox-custom-values-test", ElementClass);

      const el = document.createElement("checkbox-custom-values-test") as any;
      container.appendChild(el);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const checkbox = el.shadowRoot.querySelector("input") as HTMLInputElement;
      expect(checkbox.checked).toBe(false); // status is 'no'

      checkbox.checked = true;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(el._state.status).toBe("yes");

      checkbox.checked = false;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(el._state.status).toBe("no");
    });

    it("should handle multiple checkboxes bound to array", async () => {
      const ElementClass = createElementClass({
        state: { selected: ["apple"] },
        render: (state) => html`
          <input type="checkbox" value="apple" v-model="selected" />
          <input type="checkbox" value="banana" v-model="selected" />
          <input type="checkbox" value="cherry" v-model="selected" />
        `,
        style: "",
      });

      customElements.define("checkbox-array-test", ElementClass);

      const el = document.createElement("checkbox-array-test") as any;
      container.appendChild(el);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const checkboxes = el.shadowRoot.querySelectorAll(
        'input[type="checkbox"]',
      ) as NodeListOf<HTMLInputElement>;

      // Apple should be checked initially
      expect(checkboxes[0].checked).toBe(true); // apple
      expect(checkboxes[1].checked).toBe(false); // banana
      expect(checkboxes[2].checked).toBe(false); // cherry

      // Check banana
      checkboxes[1].checked = true;
      checkboxes[1].dispatchEvent(new Event("change", { bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(el._state.selected).toEqual(["apple", "banana"]);

      // Uncheck apple
      checkboxes[0].checked = false;
      checkboxes[0].dispatchEvent(new Event("change", { bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(el._state.selected).toEqual(["banana"]);
    });
  });

  describe("radio button bindings", () => {
    it("should handle radio button group", async () => {
      const ElementClass = createElementClass({
        state: { color: "red" },
        render: (state) => html`
          <input type="radio" name="color" value="red" v-model="color" />
          <input type="radio" name="color" value="blue" v-model="color" />
          <input type="radio" name="color" value="green" v-model="color" />
        `,
        style: "",
      });

      customElements.define("radio-test", ElementClass);

      const el = document.createElement("radio-test") as any;
      container.appendChild(el);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const radios = el.shadowRoot.querySelectorAll(
        'input[type="radio"]',
      ) as NodeListOf<HTMLInputElement>;

      // Red should be selected initially
      expect(radios[0].checked).toBe(true); // red
      expect(radios[1].checked).toBe(false); // blue
      expect(radios[2].checked).toBe(false); // green

      // Select blue
      radios[1].checked = true;
      radios[1].dispatchEvent(new Event("change", { bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(el._state.color).toBe("blue");

      // Other radios should be unchecked
      expect(radios[0].checked).toBe(false);
      expect(radios[2].checked).toBe(false);
    });
  });

  describe("select bindings", () => {
    it("should handle select element", async () => {
      const ElementClass = createElementClass({
        state: { option: "b" },
        render: (state) => html`
          <select v-model="option">
            <option value="a">Option A</option>
            <option value="b">Option B</option>
            <option value="c">Option C</option>
          </select>
        `,
        style: "",
      });

      customElements.define("select-test", ElementClass);

      const el = document.createElement("select-test") as any;
      container.appendChild(el);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const select = el.shadowRoot.querySelector("select") as HTMLSelectElement;
      expect(select.value).toBe("b");

      select.value = "c";
      select.dispatchEvent(new Event("change", { bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(el._state.option).toBe("c");
    });
  });

  describe("textarea bindings", () => {
    it("should handle textarea element", async () => {
      const ElementClass = createElementClass({
        state: { message: "Hello\nWorld" },
        render: (state) => html`<textarea v-model="message"></textarea>`,
        style: "",
      });

      customElements.define("textarea-test", ElementClass);

      const el = document.createElement("textarea-test") as any;
      container.appendChild(el);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const textarea = el.shadowRoot.querySelector(
        "textarea",
      ) as HTMLTextAreaElement;
      expect(textarea.value).toBe("Hello\nWorld");

      textarea.value = "Updated content";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(el._state.message).toBe("Updated content");
    });
  });

  describe("nested property bindings", () => {
    it("should handle nested object properties", async () => {
      const ElementClass = createElementClass({
        state: { user: { profile: { name: "John" } } },
        render: (state) =>
          html`<input type="text" v-model="user.profile.name" />`,
        style: "",
      });

      customElements.define("nested-binding-test", ElementClass);

      const el = document.createElement("nested-binding-test") as any;
      container.appendChild(el);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const input = el.shadowRoot.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("John");

      input.value = "Jane";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(el._state.user.profile.name).toBe("Jane");
    });
  });

  describe("IME composition handling", () => {
    it("should not update state during IME composition", async () => {
      const ElementClass = createElementClass({
        state: { text: "" },
        render: (state) => html`<input type="text" v-model="text" />`,
        style: "",
      });

      customElements.define("ime-test", ElementClass);

      const el = document.createElement("ime-test") as any;
      container.appendChild(el);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const input = el.shadowRoot.querySelector("input") as HTMLInputElement;

      // Simulate IME composition start
      input.dispatchEvent(new Event("compositionstart"));

      input.value = "composing...";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(el._state.text).toBe(""); // Should not update during composition

      // Simulate composition end
      input.dispatchEvent(new Event("compositionend"));

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(el._state.text).toBe("composing..."); // Should update after composition ends
    });
  });
});
