import { describe, it, expect, beforeEach } from 'vitest';
import { component, html, css, useStyle, ref, useProps } from '../src/lib';

describe('useStyle Hook', () => {
  beforeEach(() => {
    // Clean up any existing components
    document.body.innerHTML = '';
  });

  it('should apply static styles via useStyle hook', async () => {
    component('test-static-style', () => {
      useStyle(
        () => css`
          :host {
            background-color: red;
            color: white;
          }
        `,
      );

      return html`<div>Styled content</div>`;
    });

    // Create and mount component
    const element = document.createElement('test-static-style') as any;
    document.body.appendChild(element);

    // Wait for component to initialize
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Check that component was created successfully
    const shadowRoot = element.shadowRoot;
    expect(shadowRoot).toBeDefined();
    expect(shadowRoot.innerHTML).toContain('Styled content');

    // Check that stylesheets were applied (JSDOM limitation: can't inspect CSS rules)
    expect(shadowRoot.adoptedStyleSheets.length).toBeGreaterThanOrEqual(1);

    // Check that the computed style was set on the context
    expect(element.context._computedStyle).toBeDefined();
    expect(element.context._computedStyle).toContain('background-color: red');
    expect(element.context._computedStyle).toContain('color: white');
  });

  it('should apply reactive styles via useStyle hook', async () => {
    component('test-reactive-style', () => {
      const props = useProps({ theme: 'light' });
      useStyle(
        () => css`
          :host {
            background-color: ${props.theme === 'light' ? 'white' : 'black'};
            color: ${props.theme === 'light' ? 'black' : 'white'};
          }
        `,
      );

      return html`<div>Theme: ${props.theme}</div>`;
    });

    // Create and mount component with light theme
    const element = document.createElement('test-reactive-style') as any;
    element.setAttribute('theme', 'light');
    document.body.appendChild(element);

    // Wait for component to initialize
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Check that component was created and light theme styles were computed
    expect(element.shadowRoot).toBeDefined();
    expect(element.shadowRoot.innerHTML).toContain('Theme: light');
    expect(element.context._computedStyle).toContain('background-color: white');
    expect(element.context._computedStyle).toContain('color: black');

    // Change to dark theme
    element.setAttribute('theme', 'dark');

    // Wait for re-render
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Check that dark theme styles were computed
    expect(element.shadowRoot.innerHTML).toContain('Theme: dark');
    expect(element.context._computedStyle).toContain('background-color: black');
    expect(element.context._computedStyle).toContain('color: white');
  });

  it('should work with reactive state objects', async () => {
    component('test-state-style', () => {
      const myState = ref({ color: 'blue' });

      useStyle(
        () => css`
          :host {
            color: ${myState.value.color};
          }
          div {
            border: 2px solid ${myState.value.color};
          }
        `,
      );

      return html`
        <div>Color: ${myState.value.color}</div>
        <button @click="${() => (myState.value.color = 'green')}">
          Change Color
        </button>
      `;
    });

    // Create and mount component
    const element = document.createElement('test-state-style') as any;
    document.body.appendChild(element);

    // Wait for component to initialize
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Check initial state and computed styles
    expect(element.shadowRoot).toBeDefined();
    expect(element.shadowRoot.innerHTML).toContain('Color: blue');
    expect(element.context._computedStyle).toContain('color: blue');
    expect(element.context._computedStyle).toContain('border: 2px solid blue');

    // Click button to change color
    const button = element.shadowRoot.querySelector('button');
    expect(button).toBeDefined();
    button?.click();

    // Wait for reactive update
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Check that state and styles updated
    expect(element.shadowRoot.innerHTML).toContain('Color: green');
    expect(element.context._computedStyle).toContain('color: green');
    expect(element.context._computedStyle).toContain('border: 2px solid green');
  });

  it('should throw error when called outside render', () => {
    expect(() => {
      useStyle(
        () => css`
          :host {
            color: red;
          }
        `,
      );
    }).toThrow('useStyle must be called during component render');
  });
});
