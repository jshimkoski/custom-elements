import { describe, it, expect } from "vitest";
import { component } from "../src/lib/runtime/component";
import { html } from "../src/lib/runtime/template-compiler";
import { useProps } from "../src/lib/runtime/hooks";

describe("Boolean Props", () => {
  it("should treat standalone attributes as boolean true", async () => {
    const testTag = `test-boolean-${Date.now()}-${Math.random().toString().replace(".", "")}`;
    
    component(testTag, () => {
      const { disabled, checked } = useProps({ disabled: false, checked: false });
      
      return html`
        <div>
          <span id="disabled-value">${String(disabled)}</span>
          <span id="checked-value">${String(checked)}</span>
        </div>
      `;
    });

    const el = document.createElement(testTag);
    el.setAttribute("disabled", "");
    el.setAttribute("checked", "");
    document.body.appendChild(el);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const shadowRoot = (el as any).shadowRoot;
    expect(shadowRoot?.querySelector("#disabled-value")?.textContent).toBe("true");
    expect(shadowRoot?.querySelector("#checked-value")?.textContent).toBe("true");
    
    document.body.removeChild(el);
  });

  it("should support explicit false boolean values", async () => {
    const testTag = `test-boolean-explicit-${Date.now()}-${Math.random().toString().replace(".", "")}`;
    
    component(testTag, () => {
      const { disabled } = useProps({ disabled: true });
      
      return html`
        <div>
          <span id="disabled-value">${String(disabled)}</span>
        </div>
      `;
    });

    const el = document.createElement(testTag);
    el.setAttribute("disabled", "false");
    document.body.appendChild(el);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const shadowRoot = (el as any).shadowRoot;
    expect(shadowRoot?.querySelector("#disabled-value")?.textContent).toBe("false");
    
    document.body.removeChild(el);
  });

  it("should handle mixed boolean and string attributes", async () => {
    const testTag = `test-mixed-${Date.now()}-${Math.random().toString().replace(".", "")}`;
    
    component(testTag, () => {
      const props = useProps({ 
        disabled: false, 
        title: "", 
        active: true 
      });
      
      return html`
        <div>
          <span id="disabled-value">${String(props.disabled)}</span>
          <span id="title-value">${props.title || "no-title"}</span>
          <span id="active-value">${String(props.active)}</span>
        </div>
      `;
    });

    const el = document.createElement(testTag);
    el.setAttribute("disabled", "");
    el.setAttribute("title", "Test Title");
    el.setAttribute("active", "false");
    document.body.appendChild(el);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const shadowRoot = (el as any).shadowRoot;
    expect(shadowRoot?.querySelector("#disabled-value")?.textContent).toBe("true");
    expect(shadowRoot?.querySelector("#title-value")?.textContent).toBe("Test Title");
    expect(shadowRoot?.querySelector("#active-value")?.textContent).toBe("false");
    
    document.body.removeChild(el);
  });
});
