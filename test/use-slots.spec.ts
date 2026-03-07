/**
 * Tests for the useSlots() hook.
 *
 * useSlots() returns helpers for inspecting which slot content the host
 * element's children have been assigned to, allowing conditional rendering
 * based on slot presence.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { component, html, useSlots } from '../src/lib';

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  if (container && document.body.contains(container)) {
    document.body.removeChild(container);
  }
});

function wait(ms = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('useSlots()', () => {
  it('has() returns false when no slotted children are present', async () => {
    let slotsResult: ReturnType<typeof useSlots> | null = null;

    component('slots-empty', () => {
      slotsResult = useSlots();
      return html`<div><slot></slot></div>`;
    });

    container.innerHTML = '<slots-empty></slots-empty>';
    await wait();

    expect(slotsResult).not.toBeNull();
    expect(slotsResult!.has()).toBe(false);
    expect(slotsResult!.has('footer')).toBe(false);
  });

  it('has() returns true when default slot children are present', async () => {
    let defaultHas = false;

    component('slots-with-default', () => {
      const slots = useSlots();
      defaultHas = slots.has();
      return html`<div><slot></slot></div>`;
    });

    container.innerHTML =
      '<slots-with-default><span>content</span></slots-with-default>';
    await wait();

    expect(defaultHas).toBe(true);
  });

  it('has(name) returns true for named slot children', async () => {
    let footerHas = false;

    component('slots-named', () => {
      const slots = useSlots();
      footerHas = slots.has('footer');
      return html`<div><slot></slot><slot name="footer"></slot></div>`;
    });

    container.innerHTML = `
      <slots-named>
        <div slot="footer">Footer content</div>
      </slots-named>
    `;
    await wait();

    expect(footerHas).toBe(true);
  });

  it('getNodes() returns default slot children', async () => {
    let nodeCount = 0;

    component('slots-getnodes', () => {
      const slots = useSlots();
      nodeCount = slots.getNodes().length;
      return html`<div><slot></slot></div>`;
    });

    container.innerHTML = `
      <slots-getnodes>
        <span>one</span>
        <span>two</span>
      </slots-getnodes>
    `;
    await wait();

    expect(nodeCount).toBe(2);
  });

  it('getNodes(name) returns only matching named slot children', async () => {
    let footerNodes: Element[] = [];

    component('slots-getnodes-named', () => {
      const slots = useSlots();
      footerNodes = slots.getNodes('footer');
      return html`<div><slot></slot><slot name="footer"></slot></div>`;
    });

    container.innerHTML = `
      <slots-getnodes-named>
        <span>default</span>
        <div slot="footer">Footer A</div>
        <div slot="footer">Footer B</div>
      </slots-getnodes-named>
    `;
    await wait();

    expect(footerNodes.length).toBe(2);
  });

  it('names() returns all slot names that have content', async () => {
    let slotNames: string[] = [];

    component('slots-names', () => {
      const slots = useSlots();
      slotNames = slots.names();
      return html`<div>
        <slot></slot><slot name="header"></slot><slot name="footer"></slot>
      </div>`;
    });

    container.innerHTML = `
      <slots-names>
        <span>default content</span>
        <div slot="footer">Footer</div>
      </slots-names>
    `;
    await wait();

    expect(slotNames).toContain('default');
    expect(slotNames).toContain('footer');
    expect(slotNames).not.toContain('header');
  });

  it('throws when called outside render context', () => {
    expect(() => {
      useSlots();
    }).toThrow('useSlots must be called during component render');
  });

  it('useSlots is exported from the main package entry', () => {
    // Verified by the successful top-level import at the top of this file
    expect(typeof useSlots).toBe('function');
  });
});
