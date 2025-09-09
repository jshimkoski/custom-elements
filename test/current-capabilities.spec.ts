/**
 * Simple test to verify what's currently working
 */

import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { component, html } from '../src/lib/index.js';

describe('🔍 Current Capabilities Check', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should support basic event modifiers', () => {
    let handlerCalled = false;
    let eventWasPrevented = false;

    component('test-basic-modifiers', {
      render: () => html`
        <form @submit.prevent="${(e: Event) => { 
          handlerCalled = true; 
          eventWasPrevented = e.defaultPrevented;
        }}">
          <button type="submit">Submit</button>
        </form>
      `
    });

    container.innerHTML = '<test-basic-modifiers></test-basic-modifiers>';
    const testEl = container.querySelector('test-basic-modifiers');
    const form = testEl?.shadowRoot?.querySelector('form');
    const button = testEl?.shadowRoot?.querySelector('button');
    
    button?.click();
    
    expect(handlerCalled).toBe(true);
    // This will fail if prevent is not working, but let's see
    console.log('Event was prevented:', eventWasPrevented);
  });

  it('should support basic :model directive', async () => {
    component('test-basic-model', {
      state: { value: 'initial' },
      render: (ctx: any) => html`
        <input :model="value" />
        <div class="output">${ctx.value}</div>
      `
    });

    container.innerHTML = '<test-basic-model></test-basic-model>';
    const testEl = container.querySelector('test-basic-model');
    const input = testEl?.shadowRoot?.querySelector('input') as HTMLInputElement;
    const output = testEl?.shadowRoot?.querySelector('.output');
    
    expect(input?.value).toBe('initial');
    expect(output?.textContent).toBe('initial');
    
    // Change the input value and trigger input event
    if (input) {
      input.value = 'changed';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Wait a tick for updates using Promise instead of setTimeout
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(output?.textContent).toBe('changed');
  });

  it('should support basic :show directive', async () => {
    component('test-basic-show', {
      state: { visible: true },
      render: (ctx: any) => html`
        <div :show="visible" class="content">Conditional content</div>
        <button @click="${() => { ctx.visible = !ctx.visible; }}">Toggle</button>
      `
    });

    container.innerHTML = '<test-basic-show></test-basic-show>';
    const testEl = container.querySelector('test-basic-show');
    const content = testEl?.shadowRoot?.querySelector('.content') as HTMLElement;
    const button = testEl?.shadowRoot?.querySelector('button');
    
    // Initially visible
    console.log('Initial display:', content?.style.display);
    
    // Click to toggle
    button?.click();
    
    // Wait for update and check if it's hidden
    await new Promise(resolve => setTimeout(resolve, 10));
    console.log('After toggle display:', content?.style.display);
  });

  it('should support basic :class directive', () => {
    component('test-basic-class', {
      state: { isActive: true, isDisabled: false },
      render: (ctx: any) => html`
        <div :class="{ active: isActive, disabled: isDisabled }" class="base">Content</div>
      `
    });

    container.innerHTML = '<test-basic-class></test-basic-class>';
    const testEl = container.querySelector('test-basic-class');
    const div = testEl?.shadowRoot?.querySelector('div');
    
    console.log('Classes:', div?.className);
    console.log('Has active:', div?.classList.contains('active'));
    console.log('Has disabled:', div?.classList.contains('disabled'));
  });
});
