import { describe, it, expect } from 'vitest';
import { component, html, useEmit, useOnConnected } from '../src/lib';

let container: HTMLElement;

function setupContainer() {
  container = document.createElement('div');
  document.body.appendChild(container);
}

function teardownContainer() {
  if (container) document.body.removeChild(container);
}

describe('useEmit cancellable option', () => {
  it('returns false when a host listener calls preventDefault()', async () => {
    setupContainer();

    let hostPrevented = false;
    // Add a host listener that prevents the action
    container.addEventListener('close', (ev: Event) => {
      ev.preventDefault();
      hostPrevented = true;
    });

    let emitResult: boolean | undefined;

    component('test-useemit-cancel', () => {
      const emit = useEmit();

      useOnConnected(() => {
        // Emit a cancelable event. The host listener above should call preventDefault().
        emitResult = emit('close', { reason: 'user' }, { cancelable: true });
      });

      return html`<div>emit cancel test</div>`;
    });

    container.innerHTML = '<test-useemit-cancel></test-useemit-cancel>';
    // Allow lifecycle to run
    await new Promise((r) => setTimeout(r, 100));

    expect(hostPrevented).toBe(true);
    // When event was prevented, emit should return false
    expect(emitResult).toBe(false);

    teardownContainer();
  });

  it('returns true when no listener prevents the event', async () => {
    setupContainer();

    let hostSaw = false;

    // Add a host listener that does NOT prevent the event
    container.addEventListener('close', () => {
      hostSaw = true;
    });

    let emitResult: boolean | undefined;

    component('test-useemit-allow', () => {
      const emit = useEmit();

      useOnConnected(() => {
        emitResult = emit('close', { reason: 'user' }, { cancelable: true });
      });

      return html`<div>emit allow test</div>`;
    });

    container.innerHTML = '<test-useemit-allow></test-useemit-allow>';
    await new Promise((r) => setTimeout(r, 100));

    expect(hostSaw).toBe(true);
    expect(emitResult).toBe(true);

    teardownContainer();
  });

  it('integration: component respects emit return value (closes only when allowed)', async () => {
    // We'll test via a click handler so lifecycle timing is straightforward.
    // Case 1: host prevents
    setupContainer();

    // host listener that prevents close
    container.addEventListener('close', (ev: Event) => ev.preventDefault());

    component('test-closable-integration', () => {
      const emit = useEmit();
      const handleClose = () => {
        const allowed = emit('close', { reason: 'user' }, { cancelable: true });
        if (allowed) {
          const hostEl = container.querySelector('test-closable-integration');
          if (hostEl) hostEl.setAttribute('data-closed', 'true');
        }
      };
      return html`<button @click="${handleClose}">Close</button>`;
    });

    container.innerHTML =
      '<test-closable-integration></test-closable-integration>';
    await new Promise((r) => setTimeout(r, 100));
    const host1 = container.querySelector(
      'test-closable-integration',
    ) as HTMLElement | null;
    const btn1 = host1!.shadowRoot!.querySelector('button') as HTMLElement;
    btn1.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 100));
    let el = container.querySelector(
      'test-closable-integration',
    ) as HTMLElement;
    expect(el.hasAttribute('data-closed')).toBe(false);
    teardownContainer();

    // Case 2: no host prevention -> should close
    setupContainer();

    component('test-closable-integration', () => {
      const emit = useEmit();
      const handleClose = () => {
        const allowed = emit('close', { reason: 'user' }, { cancelable: true });
        if (allowed) {
          const hostEl = container.querySelector('test-closable-integration');
          if (hostEl) hostEl.setAttribute('data-closed', 'true');
        }
      };
      return html`<button @click="${handleClose}">Close</button>`;
    });

    container.innerHTML =
      '<test-closable-integration></test-closable-integration>';
    await new Promise((r) => setTimeout(r, 100));
    const host2 = container.querySelector(
      'test-closable-integration',
    ) as HTMLElement | null;
    const btn2 = host2!.shadowRoot!.querySelector('button') as HTMLElement;
    btn2.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 100));
    el = container.querySelector('test-closable-integration') as HTMLElement;
    expect(el.hasAttribute('data-closed')).toBe(true);
    teardownContainer();
  });
});
