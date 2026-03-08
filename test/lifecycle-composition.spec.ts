import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  component,
  html,
  useProps,
  useOnConnected,
  useOnDisconnected,
  useOnAttributeChanged,
} from '../src/lib';

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  if (container) {
    document.body.removeChild(container);
  }
});

describe('🔗 Lifecycle hook composition (multiple hooks per type)', () => {
  it('calls all useOnConnected handlers in registration order', async () => {
    const log: string[] = [];

    component('lc-multi-connected', () => {
      useOnConnected(() => log.push('first'));
      useOnConnected(() => log.push('second'));
      useOnConnected(() => log.push('third'));
      return html`<div>multi-connected</div>`;
    });

    container.innerHTML = '<lc-multi-connected></lc-multi-connected>';
    await new Promise((r) => setTimeout(r, 50));

    expect(log).toEqual(['first', 'second', 'third']);
  });

  it('calls all useOnDisconnected handlers when component is removed', async () => {
    const log: string[] = [];

    component('lc-multi-disconnected', () => {
      useOnDisconnected(() => log.push('cleanup-a'));
      useOnDisconnected(() => log.push('cleanup-b'));
      return html`<div>multi-disconnected</div>`;
    });

    container.innerHTML = '<lc-multi-disconnected></lc-multi-disconnected>';
    await new Promise((r) => setTimeout(r, 50));

    log.length = 0; // clear any setup noise
    container.innerHTML = '';
    await new Promise((r) => setTimeout(r, 50));

    expect(log).toEqual(['cleanup-a', 'cleanup-b']);
  });

  it('calls all useOnAttributeChanged handlers when an attribute changes', async () => {
    const changes: Array<{
      cb: string;
      name: string;
      newValue: string | null;
    }> = [];

    component('lc-multi-attr', () => {
      useProps({ label: 'default' });
      useOnAttributeChanged((name, _old, newValue) =>
        changes.push({ cb: 'first', name, newValue }),
      );
      useOnAttributeChanged((name, _old, newValue) =>
        changes.push({ cb: 'second', name, newValue }),
      );
      return html`<div>multi-attr</div>`;
    });

    container.innerHTML = '<lc-multi-attr label="initial"></lc-multi-attr>';
    await new Promise((r) => setTimeout(r, 50));

    changes.length = 0;
    const el = container.querySelector('lc-multi-attr') as HTMLElement;
    el.setAttribute('label', 'updated');
    await new Promise((r) => setTimeout(r, 50));

    const labelChanges = changes.filter((c) => c.name === 'label');
    expect(labelChanges.length).toBe(2);
    expect(labelChanges[0]).toMatchObject({ cb: 'first', newValue: 'updated' });
    expect(labelChanges[1]).toMatchObject({
      cb: 'second',
      newValue: 'updated',
    });
  });

  it('does not discard earlier registrations when a second hook is added', async () => {
    const called = { first: false, second: false };

    component('lc-no-overwrite', () => {
      useOnConnected(() => {
        called.first = true;
      });
      useOnConnected(() => {
        called.second = true;
      });
      return html`<div>no-overwrite</div>`;
    });

    container.innerHTML = '<lc-no-overwrite></lc-no-overwrite>';
    await new Promise((r) => setTimeout(r, 50));

    expect(called.first).toBe(true);
    expect(called.second).toBe(true);
  });

  it('continues calling remaining hooks if one throws', async () => {
    const log: string[] = [];

    component('lc-error-resilient', () => {
      useOnConnected(() => {
        throw new Error('hook error');
      });
      useOnConnected(() => log.push('survived'));
      return html`<div>error-resilient</div>`;
    });

    container.innerHTML = '<lc-error-resilient></lc-error-resilient>';
    await new Promise((r) => setTimeout(r, 50));

    expect(log).toContain('survived');
  });
});
