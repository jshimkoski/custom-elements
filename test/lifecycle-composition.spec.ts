import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  component,
  html,
  useProps,
  useOnConnected,
  useOnDisconnected,
  useOnAttributeChanged,
  useHost,
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

  it('runs cleanup functions returned by useOnConnected exactly once', async () => {
    const log: string[] = [];

    component('lc-connected-cleanup', () => {
      useOnConnected(() => {
        log.push('connected');
        return () => log.push('returned-cleanup');
      });
      useOnDisconnected(() => log.push('disconnected'));
      return html`<div>connected cleanup</div>`;
    });

    container.innerHTML = '<lc-connected-cleanup></lc-connected-cleanup>';
    await new Promise((r) => setTimeout(r, 50));
    container.innerHTML = '';
    await new Promise((r) => setTimeout(r, 50));

    expect(log).toEqual(['connected', 'returned-cleanup', 'disconnected']);
  });

  it('retains cleanup functions returned by async useOnConnected handlers', async () => {
    const log: string[] = [];

    component('lc-async-connected-cleanup', () => {
      useOnConnected(async () => {
        await Promise.resolve();
        log.push('connected');
        return () => log.push('returned-cleanup');
      });
      return html`<div>async connected cleanup</div>`;
    });

    container.innerHTML = '<lc-async-connected-cleanup></lc-async-connected-cleanup>';
    await new Promise((r) => setTimeout(r, 20));
    container.innerHTML = '';
    await new Promise((r) => setTimeout(r, 20));

    expect(log).toEqual(['connected', 'returned-cleanup']);
  });

  it('runs a late async cleanup immediately when disconnect wins the race', async () => {
    let resolveHook!: (cleanup: () => void) => void;
    let cleanupCalls = 0;

    component('lc-late-async-cleanup', () => {
      useOnConnected(() => new Promise<() => void>((resolve) => {
        resolveHook = resolve;
      }));
      return html`<div>late async cleanup</div>`;
    });

    container.innerHTML = '<lc-late-async-cleanup></lc-late-async-cleanup>';
    await new Promise((r) => setTimeout(r, 20));
    container.innerHTML = '';
    resolveHook(() => { cleanupCalls += 1; });
    await new Promise((r) => setTimeout(r, 20));

    expect(cleanupCalls).toBe(1);
  });

  it('keeps disconnect callbacks scoped to the instance that connected', async () => {
    let renderToken = 0;
    const connectedTokens = new Map<string, number>();
    const disconnectedTokens = new Map<string, number>();

    component('lc-instance-scoped-disconnect', () => {
      const token = ++renderToken;
      const host = useHost();
      useOnConnected(() => {
        if (host) connectedTokens.set(host.id, token);
      });
      useOnDisconnected(() => {
        if (host) disconnectedTokens.set(host.id, token);
      });
      return html`<div>instance lifecycle</div>`;
    });

    const first = document.createElement('lc-instance-scoped-disconnect');
    first.id = 'first';
    const second = document.createElement('lc-instance-scoped-disconnect');
    second.id = 'second';
    container.append(first, second);
    await new Promise((r) => setTimeout(r, 50));

    first.remove();
    second.remove();
    await new Promise((r) => setTimeout(r, 50));

    expect(disconnectedTokens.get('first')).toBe(connectedTokens.get('first'));
    expect(disconnectedTokens.get('second')).toBe(connectedTokens.get('second'));
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
