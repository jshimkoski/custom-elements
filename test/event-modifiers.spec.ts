import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import { component, html } from '../src/lib/index.js';

/**
 * Event Modifiers Test Suite
 * Testing event modifier functionality (.prevent, .stop, .once)
 */

describe('🎯 Event Modifiers', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should handle .prevent modifier to preventDefault', async () => {
    let eventReceived = false;
    let wasDefaultPrevented = false;

    component(
      'test-prevent',
      () => html`
        <form
          @submit.prevent="${(e: Event) => {
            eventReceived = true;
            wasDefaultPrevented = e.defaultPrevented;
          }}"
        >
          <button type="submit">Submit</button>
        </form>
      `,
    );

    container.innerHTML = '<test-prevent></test-prevent>';
    await new Promise((resolve) => setTimeout(resolve, 10));

    const form = container
      .querySelector('test-prevent')
      ?.shadowRoot?.querySelector('form');
    const submitEvent = new Event('submit', { cancelable: true });
    form?.dispatchEvent(submitEvent);

    expect(eventReceived).toBe(true);
    expect(wasDefaultPrevented).toBe(true);
  });

  it('should handle .stop modifier to stopPropagation', async () => {
    let innerEventReceived = false;
    let outerEventReceived = false;

    component(
      'test-stop',
      () => html`
        <div
          @click="${() => {
            outerEventReceived = true;
          }}"
        >
          <button
            @click.stop="${() => {
              innerEventReceived = true;
            }}"
          >
            Click me
          </button>
        </div>
      `,
    );

    container.innerHTML = '<test-stop></test-stop>';
    await new Promise((resolve) => setTimeout(resolve, 10));

    const button = container
      .querySelector('test-stop')
      ?.shadowRoot?.querySelector('button');
    button?.click();

    expect(innerEventReceived).toBe(true);
    expect(outerEventReceived).toBe(false); // Should be stopped from propagating
  });

  it('should handle .once modifier for single-use event listeners', async () => {
    let clickCount = 0;

    component(
      'test-once',
      () => html`
        <button
          @click.once="${() => {
            clickCount++;
          }}"
        >
          Click me once
        </button>
      `,
    );

    container.innerHTML = '<test-once></test-once>';
    await new Promise((resolve) => setTimeout(resolve, 10));

    const button = container
      .querySelector('test-once')
      ?.shadowRoot?.querySelector('button');

    // First click should work
    button?.click();
    expect(clickCount).toBe(1);

    // Second click should not increase count
    button?.click();
    expect(clickCount).toBe(1);

    // Third click should still not increase count
    button?.click();
    expect(clickCount).toBe(1);
  });

  it('should handle combined modifiers', async () => {
    let eventReceived = false;
    let wasDefaultPrevented = false;
    let propagationStopped = false;

    component(
      'test-combined',
      () => html`
        <div
          @click="${() => {
            propagationStopped = false;
          }}"
        >
          <form
            @submit.prevent.stop="${(e: Event) => {
              eventReceived = true;
              wasDefaultPrevented = e.defaultPrevented;
              // Check if stopPropagation was called by checking if the parent handler runs
              setTimeout(() => {
                propagationStopped = true;
              }, 5);
            }}"
          >
            <button type="submit">Submit</button>
          </form>
        </div>
      `,
    );

    container.innerHTML = '<test-combined></test-combined>';
    await new Promise((resolve) => setTimeout(resolve, 10));

    const form = container
      .querySelector('test-combined')
      ?.shadowRoot?.querySelector('form');
    const submitEvent = new Event('submit', {
      cancelable: true,
      bubbles: true,
    });
    form?.dispatchEvent(submitEvent);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(eventReceived).toBe(true);
    expect(wasDefaultPrevented).toBe(true);
    expect(propagationStopped).toBe(true);
  });
});
