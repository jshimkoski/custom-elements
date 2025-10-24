import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { component, html, ref } from '../src/lib/index';

describe('🛡️ Infinite Loop Protection', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container?.remove();
  });

  it('should detect immediate function invocation in event handlers', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let renderCount = 0;

    component('infinite-loop-test', () => {
      renderCount++;
      const count = ref(0);

      // This should trigger a warning - function called immediately
      const incrementImmediate = () => {
        count.value++;
        return undefined; // Returns undefined after modifying state
      };

      // This is correct - function reference passed
      const incrementCorrect = () => {
        count.value++;
      };

      return html`
        <div>
          Count: ${count.value}
          <button id="bad" @click="${incrementImmediate()}">
            Bad (immediate)
          </button>
          <button id="good" @click="${incrementCorrect}">
            Good (reference)
          </button>
        </div>
      `;
    });

    const element = document.createElement('infinite-loop-test') as any;
    container.appendChild(element);

    // Should warn about potential infinite loop
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('State modification detected during render'),
    );

    // Should not have excessive renders
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(renderCount).toBeLessThan(15); // Should not render excessively

    consoleSpy.mockRestore();
  });

  it('should provide helpful error messages for common mistakes', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    component('mistake-test', () => {
      const toggle = ref(false);

      const handleToggle = () => {
        toggle.value = !toggle.value;
      };

      return html`
        <div>
          <!-- These should all trigger warnings -->
          <button @click="${handleToggle()}">Immediate invocation</button>
          <button @click="${undefined}">Undefined handler</button>
          <button @click="${null}">Null handler</button>
        </div>
      `;
    });

    const element = document.createElement('mistake-test') as any;
    container.appendChild(element);

    // Should warn about each problematic pattern
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('State modification detected during render'),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Event handler for '@click' is null"),
    );

    consoleSpy.mockRestore();
  });

  it('should not warn for valid function references', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    component('valid-test', () => {
      const count = ref(0);

      const increment = () => {
        count.value++;
      };

      const decrement = () => {
        count.value--;
      };

      return html`
        <div>
          Count: ${count.value}
          <button @click="${increment}">+</button>
          <button @click="${decrement}">-</button>
          <button @click="${() => (count.value = 0)}">Reset</button>
        </div>
      `;
    });

    const element = document.createElement('valid-test') as any;
    container.appendChild(element);

    // Should not warn for valid patterns
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should limit excessive re-renders automatically', async () => {
    let renderCount = 0;
    const maxRenders = 50; // Should be stopped before this

    component('render-limit-test', () => {
      renderCount++;
      const count = ref(0);

      // This creates an infinite loop
      if (renderCount < maxRenders) {
        count.value = renderCount; // Triggers re-render
      }

      return html`<div>Render: ${renderCount}</div>`;
    });

    const element = document.createElement('render-limit-test') as any;
    container.appendChild(element);

    // Wait for potential infinite loop
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Should be limited to prevent browser freeze
    expect(renderCount).toBeLessThan(20); // Should be stopped early
  });
});
