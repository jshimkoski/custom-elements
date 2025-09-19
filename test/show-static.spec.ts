import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { component } from "../src/lib/runtime/component";
import { ref } from "../src/lib/runtime/reactive";
import { html } from "../src/lib/runtime/template-compiler";

describe("test :show directive static", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("should set display: none when :show is false", async () => {
    component("test-show-static", () => {
      const isVisible = ref(false);
      return html`
        <div :show="${isVisible.value}">Should be hidden</div>
      `;
    });

    container.innerHTML = "<test-show-static></test-show-static>";
    await new Promise(resolve => setTimeout(resolve, 10));

    const div = container.querySelector("test-show-static")?.shadowRoot?.querySelector("div");
    
    expect(div?.style.display).toBe('none');
  });

  it("should not set display style when :show is true", async () => {
    component("test-show-static-visible", () => {
      const isVisible = ref(true);
      return html`
        <div :show="${isVisible.value}">Should be visible</div>
      `;
    });

    container.innerHTML = "<test-show-static-visible></test-show-static-visible>";
    await new Promise(resolve => setTimeout(resolve, 10));

    const div = container.querySelector("test-show-static-visible")?.shadowRoot?.querySelector("div");
    
    // When visible, we don't add any display style
    expect(div?.getAttribute('style')).toBe(null);
  });
});
