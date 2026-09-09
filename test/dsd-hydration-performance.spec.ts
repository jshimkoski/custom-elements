import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  component,
  defineModel,
  html,
  ref,
  useEmit,
  useOnConnected,
  useProps,
} from '../src/lib';

describe('Declarative Shadow DOM hydration performance', () => {
  afterEach(() => {
    document.body.replaceChildren();
    delete (globalThis as typeof globalThis & {
      __CER_STATIC_ENTRY__?: boolean;
      __CER_DSD_TAGS__?: Set<string>;
    }).__CER_STATIC_ENTRY__;
    delete (globalThis as typeof globalThis & {
      __CER_DSD_TAGS__?: Set<string>;
    }).__CER_DSD_TAGS__;
    vi.unstubAllGlobals();
  });

  it('spreads opted-in DSD component definitions across separate tasks', async () => {
    const firstTag = 'test-batched-dsd-definition-first';
    const secondTag = 'test-batched-dsd-definition-second';
    for (const tag of [firstTag, secondTag]) {
      const host = document.createElement(tag);
      host.setAttribute('data-cer-hydrate', 'load');
      host.attachShadow({ mode: 'open' }).innerHTML = '<p>server output</p>';
      document.body.append(host);
    }
    (globalThis as typeof globalThis & {
      __CER_STATIC_ENTRY__?: boolean;
      __CER_DSD_TAGS__?: Set<string>;
    }).__CER_STATIC_ENTRY__ = true;
    (globalThis as typeof globalThis & {
      __CER_DSD_TAGS__?: Set<string>;
    }).__CER_DSD_TAGS__ = new Set([firstTag, secondTag]);

    const firstRender = vi.fn(() => html`<p>first client output</p>`);
    const secondRender = vi.fn(() => html`<p>second client output</p>`);
    component(firstTag, firstRender);
    component(secondTag, secondRender);

    expect(customElements.get(firstTag)).toBeUndefined();
    expect(customElements.get(secondTag)).toBeUndefined();
    // Metadata discovery is intentionally synchronous so props and event
    // contracts exist before an immediate interaction reaches painted SSR.
    expect(firstRender).toHaveBeenCalledOnce();
    expect(secondRender).toHaveBeenCalledOnce();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(customElements.get(firstTag)).toBeDefined();
    expect(customElements.get(secondTag)).toBeUndefined();
    expect(firstRender).toHaveBeenCalledOnce();
    expect(secondRender).toHaveBeenCalledOnce();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(customElements.get(secondTag)).toBeDefined();
  });

  it('finishes pending DSD registrations before the first user interaction', () => {
    const firstTag = 'test-interaction-dsd-definition-first';
    const secondTag = 'test-interaction-dsd-definition-second';
    for (const tag of [firstTag, secondTag]) {
      const host = document.createElement(tag);
      host.attachShadow({ mode: 'open' }).innerHTML = '<button>server output</button>';
      document.body.append(host);
    }
    (globalThis as typeof globalThis & {
      __CER_STATIC_ENTRY__?: boolean;
      __CER_DSD_TAGS__?: Set<string>;
    }).__CER_STATIC_ENTRY__ = true;
    (globalThis as typeof globalThis & {
      __CER_DSD_TAGS__?: Set<string>;
    }).__CER_DSD_TAGS__ = new Set([firstTag, secondTag]);

    component(firstTag, () => html`<button>first client output</button>`);
    component(secondTag, () => html`<button>second client output</button>`);

    const listener = vi.fn(() => {
      expect(customElements.get(firstTag)).toBeDefined();
      expect(customElements.get(secondTag)).toBeDefined();
    });
    window.addEventListener('keydown', listener);
    window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    window.removeEventListener('keydown', listener);

    expect(listener).toHaveBeenCalledOnce();
  });

  it('keeps definitions synchronous without a server-provided DSD manifest', () => {
    const tag = 'test-unlisted-dsd-definition';
    const host = document.createElement(tag);
    host.attachShadow({ mode: 'open' }).innerHTML = '<p>server output</p>';
    document.body.append(host);
    (globalThis as typeof globalThis & {
      __CER_STATIC_ENTRY__?: boolean;
    }).__CER_STATIC_ENTRY__ = true;

    component(tag, () => html`<p>client output</p>`);

    expect(customElements.get(tag)).toBeDefined();
  });

  it('does not render server-populated shadow content synchronously during upgrade', async () => {
    const tag = 'test-dsd-single-hydration-render';
    const host = document.createElement(tag);
    const shadowRoot = host.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = '<p>server output</p><style>:host{display:block}</style>';
    const serverParagraph = shadowRoot.querySelector('p');
    document.body.append(host);

    const htmlUpdates = vi.fn();
    (host as HTMLElement & { onHtmlStringUpdate?: (html: string) => void })
      .onHtmlStringUpdate = htmlUpdates;
    const render = vi.fn(() => html`<p>client output</p>`);
    component(tag, render);
    customElements.upgrade(host);

    // Definition/upgrade keeps already-painted server DOM available and does
    // not bind every existing instance in one long customElements.define task.
    expect(render).toHaveBeenCalledTimes(1); // registration discovery only
    expect(host.shadowRoot?.querySelector('p')).toBe(serverParagraph);

    await new Promise((resolve) => setTimeout(resolve, 0));

    // One lightweight registration discovery plus one real hydration render.
    // A constructor render would make this three calls and throw away the
    // server DOM immediately before connectedCallback renders it again.
    expect(render).toHaveBeenCalledTimes(2);
    expect(host.shadowRoot?.querySelector('p')).toBe(serverParagraph);
    expect(host.shadowRoot?.textContent).toContain('client output');
    // Retained DSD needs no client JIT/style pass. Serializing innerHTML here
    // is especially costly for content components containing large raw blocks.
    expect(htmlUpdates).not.toHaveBeenCalled();
  });

  it('defers default DSD context setup until its scheduled hydration task', async () => {
    const tag = 'test-load-dsd-lazy-context';
    const host = document.createElement(tag);
    host.attachShadow({ mode: 'open' }).innerHTML = '<p>server output</p>';
    document.body.append(host);

    const requestIdleCallback = vi.fn(() => 1);
    vi.stubGlobal('requestIdleCallback', requestIdleCallback);
    vi.stubGlobal('cancelIdleCallback', vi.fn());

    component(tag, () => html`<p>client output</p>`);
    customElements.upgrade(host);

    expect(requestIdleCallback).not.toHaveBeenCalled();
    expect((host as HTMLElement & { context?: unknown }).context).toBeUndefined();
    expect(host.shadowRoot?.textContent).toContain('server output');

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect((host as HTMLElement & { context?: unknown }).context).toBeDefined();
    expect(host).toHaveAttribute('data-cer-hydrated');
    expect(host.shadowRoot?.textContent).toContain('client output');
  });

  it('preserves focus inside server DOM when its scheduled hydration runs', async () => {
    const tag = 'test-dsd-hydration-focus';
    const host = document.createElement(tag);
    host.attachShadow({ mode: 'open' }).innerHTML = '<input aria-label="Search">';
    document.body.append(host);

    component(tag, () => html`<input aria-label="Search">`);
    const serverInput = host.shadowRoot?.querySelector<HTMLInputElement>('input');
    serverInput?.focus();
    expect(host.shadowRoot?.activeElement).toBe(serverInput);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(host.shadowRoot?.activeElement).toBe(
      host.shadowRoot?.querySelector('input'),
    );
  });

  it('uses an idle window only for an explicit idle hydration strategy', () => {
    const tag = 'test-load-dsd-idle-window';
    const host = document.createElement(tag);
    host.setAttribute('data-cer-hydrate', 'idle');
    host.attachShadow({ mode: 'open' }).innerHTML = '<p>server output</p>';
    document.body.append(host);

    let idleCallback: IdleRequestCallback | undefined;
    const requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      idleCallback = callback;
      return 1;
    });
    vi.stubGlobal('requestIdleCallback', requestIdleCallback);
    vi.stubGlobal('cancelIdleCallback', vi.fn());

    component(tag, () => html`<p>client output</p>`, { hydrate: 'idle' });
    customElements.upgrade(host);

    expect(requestIdleCallback).toHaveBeenCalledOnce();
    expect((host as HTMLElement & { context?: unknown }).context).toBeUndefined();
    expect(host.shadowRoot?.textContent).toContain('server output');

    idleCallback?.({ didTimeout: false, timeRemaining: () => 10 });

    expect((host as HTMLElement & { context?: unknown }).context).toBeDefined();
    expect(host).toHaveAttribute('data-cer-hydrated');
    expect(host.shadowRoot?.textContent).toContain('client output');
  });

  it('honors an explicit load marker without waiting for browser idle', async () => {
    const tag = 'test-explicit-load-dsd-scheduler';
    const host = document.createElement(tag);
    host.setAttribute('data-cer-hydrate', 'load');
    host.attachShadow({ mode: 'open' }).innerHTML = '<p>server output</p>';
    document.body.append(host);

    const requestIdleCallback = vi.fn(() => 1);
    vi.stubGlobal('requestIdleCallback', requestIdleCallback);
    vi.stubGlobal('cancelIdleCallback', vi.fn());

    component(tag, () => html`<p>client output</p>`, { hydrate: 'load' });
    customElements.upgrade(host);

    expect(requestIdleCallback).not.toHaveBeenCalled();
    expect((host as HTMLElement & { context?: unknown }).context).toBeUndefined();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect((host as HTMLElement & { context?: unknown }).context).toBeDefined();
    expect(host).toHaveAttribute('data-cer-hydrated');
  });

  it('coalesces props received before deferred hydration into the initial render', async () => {
    const tag = 'test-dsd-props-before-hydration';
    const host = document.createElement(tag) as HTMLElement & {
      label: string;
    };
    const shadowRoot = host.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = '<p>server output</p>';
    document.body.append(host);

    const render = vi.fn(() => {
      const props = useProps({ label: 'initial' });
      return html`<p>${props.label}</p>`;
    });
    component(tag, render);
    customElements.upgrade(host);

    // Parent hydration commonly assigns promoted custom-element props after
    // the child has connected but before its deferred DSD hydration runs.
    host.label = 'latest';
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(render).toHaveBeenCalledTimes(2); // discovery + one hydration render
    expect(host.shadowRoot?.textContent).toContain('latest');
  });

  it('does not hydrate descendants inside a non-hydrating DSD boundary', async () => {
    const parent = document.createElement('test-static-dsd-boundary');
    parent.setAttribute('data-cer-hydrate', 'none');
    const parentRoot = parent.attachShadow({ mode: 'open' });
    const child = document.createElement('test-static-dsd-child');
    const childRoot = child.attachShadow({ mode: 'open' });
    childRoot.innerHTML = '<p>server child</p>';
    parentRoot.append(child);
    document.body.append(parent);

    const render = vi.fn(() => html`<p>client child</p>`);
    component('test-static-dsd-child', render);
    customElements.upgrade(child);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(render).toHaveBeenCalledTimes(1); // registration discovery only
    expect(child.shadowRoot?.textContent).toContain('server child');
  });

  it('defers component context setup for server DOM until visible hydration', async () => {
    const tag = 'test-visible-dsd-lazy-context';
    const host = document.createElement(tag);
    host.setAttribute('data-cer-hydrate', 'visible');
    host.attachShadow({ mode: 'open' }).innerHTML = '<p>server output</p>';
    document.body.append(host);

    let intersectionCallback:
      | ((entries: Array<{ isIntersecting: boolean }>, observer: IntersectionObserver) => void)
      | undefined;
    const disconnect = vi.fn();
    const observe = vi.fn();
    class TestIntersectionObserver {
      constructor(callback: typeof intersectionCallback) {
        intersectionCallback = callback;
      }
      observe = observe;
      disconnect = disconnect;
    }
    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);

    component(tag, () => html`<p>client output</p>`, { hydrate: 'visible' });
    customElements.upgrade(host);

    expect(observe).toHaveBeenCalledWith(host);
    expect((host as HTMLElement & { context?: unknown }).context).toBeUndefined();
    expect(host.shadowRoot?.textContent).toContain('server output');

    intersectionCallback?.(
      [{ isIntersecting: true, target: host }],
      { disconnect } as unknown as IntersectionObserver,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(disconnect).toHaveBeenCalledOnce();
    expect((host as HTMLElement & { context?: unknown }).context).toBeDefined();
    expect(host).toHaveAttribute('data-cer-hydrated');
    expect(host.shadowRoot?.textContent).toContain('client output');
  });

  it('defers defining visibility-gated DSD components until one is visible', () => {
    const tag = 'test-visible-dsd-deferred-definition';
    const host = document.createElement(tag);
    host.setAttribute('data-cer-hydrate', 'visible');
    host.attachShadow({ mode: 'open' }).innerHTML = '<a href="/target">Target</a>';
    document.body.append(host);

    let intersectionCallback:
      | ((entries: Array<{ isIntersecting: boolean; target: Element }>) => void)
      | undefined;
    const observe = vi.fn();
    class TestIntersectionObserver {
      constructor(callback: typeof intersectionCallback) {
        intersectionCallback = callback;
      }
      observe = observe;
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);

    component(tag, () => html`<a href="/target">Target</a>`, { hydrate: 'visible' });

    expect(customElements.get(tag)).toBeUndefined();
    expect(observe).toHaveBeenCalledWith(host);
    expect(host.shadowRoot?.querySelector('a')?.getAttribute('href')).toBe('/target');

    intersectionCallback?.([{ isIntersecting: true, target: host }]);

    expect(customElements.get(tag)).toBeDefined();
  });

  it('shares one visibility observer across a server-rendered component list', () => {
    const tag = 'test-visible-dsd-shared-observer';
    const hosts = Array.from({ length: 12 }, () => {
      const host = document.createElement(tag);
      host.setAttribute('data-cer-hydrate', 'visible');
      host.attachShadow({ mode: 'open' }).innerHTML = '<p>server output</p>';
      document.body.append(host);
      return host;
    });

    let intersectionCallback:
      | ((entries: Array<{ isIntersecting: boolean; target: Element }>) => void)
      | undefined;
    const observerConstructions = vi.fn();
    const observe = vi.fn();
    class TestIntersectionObserver {
      constructor(callback: typeof intersectionCallback) {
        observerConstructions();
        intersectionCallback = callback;
      }
      observe = observe;
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);

    component(tag, () => html`<p>client output</p>`, { hydrate: 'load' });
    hosts.forEach((host) => customElements.upgrade(host));

    expect(observerConstructions).toHaveBeenCalledOnce();
    expect(observe).toHaveBeenCalledTimes(hosts.length);

    intersectionCallback?.(
      hosts.map((target) => ({ isIntersecting: true, target })),
    );
    expect(hosts.every((host) => host.hasAttribute('data-cer-hydrated'))).toBe(true);
  });

  it('allows an explicitly interactive island inside a non-hydrating DSD boundary', async () => {
    const parent = document.createElement('test-static-dsd-island-boundary');
    parent.setAttribute('data-cer-hydrate', 'none');
    const parentRoot = parent.attachShadow({ mode: 'open' });

    const island = document.createElement('test-explicit-dsd-island');
    island.setAttribute('data-cer-hydrate', 'load');
    const islandRoot = island.attachShadow({ mode: 'open' });
    islandRoot.innerHTML = '<button type="button">server island</button>';
    parentRoot.append(island);
    document.body.append(parent);

    const connected = vi.fn();
    component(
      'test-explicit-dsd-island',
      () => {
        useOnConnected(connected);
        return html`<button type="button">client island</button>`;
      },
      { hydrate: 'load' },
    );
    customElements.upgrade(island);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(connected).toHaveBeenCalledOnce();
    expect(island).toHaveAttribute('data-cer-hydrated');
    expect(island.shadowRoot?.textContent).toContain('client island');
  });

  it('restores serialized complex props before hydrating an island in a static boundary', async () => {
    const parent = document.createElement('test-static-props-boundary');
    parent.setAttribute('data-cer-hydrate', 'none');
    const parentRoot = parent.attachShadow({ mode: 'open' });

    const island = document.createElement('test-static-props-island') as HTMLElement & {
      items?: Array<{ label: string; path: string }>;
    };
    island.setAttribute('data-cer-hydrate', 'load');
    island.setAttribute(
      'data-cer-props',
      JSON.stringify({ items: [{ label: 'Home', path: '/' }] }),
    );
    const islandRoot = island.attachShadow({ mode: 'open' });
    islandRoot.innerHTML = '<a href="/">Home</a>';
    parentRoot.append(island);
    document.body.append(parent);

    component(
      'test-static-props-island',
      () => {
        const props = useProps({
          items: [] as Array<{ label: string; path: string }>,
        });
        return html`<a href="${props.items[0]?.path ?? '#'}">${props.items[0]?.label ?? 'Missing'}</a>`;
      },
      { hydrate: 'load' },
    );
    customElements.upgrade(island);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(island.items).toEqual([{ label: 'Home', path: '/' }]);
    expect(island).not.toHaveAttribute('data-cer-props');
    expect(island.shadowRoot?.querySelector('a')?.getAttribute('href')).toBe('/');
    expect(island.shadowRoot?.textContent).toContain('Home');
  });

  it('treats hydration attributes as SSR hints rather than disabling client-created elements', () => {
    const tag = 'test-client-none-hydration-hint';
    const connected = vi.fn();
    component(tag, () => {
      useOnConnected(connected);
      return html`<button>interactive client element</button>`;
    });

    const host = document.createElement(tag);
    host.setAttribute('data-cer-hydrate', 'none');
    document.body.append(host);

    expect(connected).toHaveBeenCalledOnce();
  });

  it('mounts client-created descendants even under a static SSR marker', () => {
    const tag = 'test-client-static-boundary-descendant';
    const connected = vi.fn();
    component(tag, () => {
      useOnConnected(connected);
      return html`<button>interactive client descendant</button>`;
    });

    const parent = document.createElement('div');
    parent.setAttribute('data-cer-hydrate', 'none');
    parent.append(document.createElement(tag));
    document.body.append(parent);

    expect(connected).toHaveBeenCalledOnce();
  });

  it('binds events to existing server DOM and patches it on later updates', async () => {
    const tag = 'test-dsd-event-hydration';
    const host = document.createElement(tag);
    const shadowRoot = host.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML =
      '<style>:host{display:block}</style><button type="button">0</button>';
    const serverButton = shadowRoot.querySelector('button');

    document.body.append(host);
    component(tag, () => {
      const count = ref(0);
      return html`<button type="button" @click="${() => count.value++}">
        ${count.value}
      </button>`;
    });
    customElements.upgrade(host);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const hydratedButton = host.shadowRoot?.querySelector('button');
    expect(hydratedButton).toBe(serverButton);

    hydratedButton?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(host.shadowRoot?.querySelector('button')).toBe(serverButton);
    expect(serverButton?.textContent?.trim()).toBe('1');
    expect(host).toHaveAttribute('data-cer-hydrated');
  });

  it('hydrates synchronously on the first interaction so deferred DSD events are not lost', async () => {
    const tag = 'test-dsd-first-interaction-hydration';
    const host = document.createElement(tag);
    const shadowRoot = host.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = '<button type="button">0</button>';
    const serverButton = shadowRoot.querySelector('button');
    document.body.append(host);

    component(tag, () => {
      const count = ref(0);
      return html`<button type="button" @click="${() => count.value++}">${count.value}</button>`;
    });
    customElements.upgrade(host);

    // Interact before the deferred setTimeout hydration task can run. The
    // capture-phase hydration trigger must bind the listener in time for this
    // same native event to reach the button.
    serverButton?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(host.shadowRoot?.querySelector('button')).toBe(serverButton);
    expect(serverButton?.textContent?.trim()).toBe('1');
  });

  it('binds parent listeners to nested server-rendered custom elements', async () => {
    const parentTag = 'test-dsd-parent-listener';
    const childTag = 'test-dsd-child-emitter';
    const parent = document.createElement(parentTag);
    const parentRoot = parent.attachShadow({ mode: 'open' });
    const wrapper = document.createElement('div');
    const child = document.createElement(childTag);
    const childRoot = child.attachShadow({ mode: 'open' });
    childRoot.innerHTML = '<button type="button">open</button>';
    wrapper.append(child, document.createElement('p'));
    parentRoot.append(wrapper);
    parentRoot.querySelector('p')!.textContent = 'closed';
    document.body.append(parent);

    component(childTag, () => {
      const emit = useEmit();
      return html`<button type="button" @click="${() => emit('open')}">open</button>`;
    });
    component(parentTag, () => {
      const open = ref(false);
      return html`<test-dsd-child-emitter @open="${() => (open.value = true)}"></test-dsd-child-emitter><p>${open.value ? 'open' : 'closed'}</p>`;
    });
    customElements.upgrade(parent);

    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const emitted = vi.fn();
    child.addEventListener('open', emitted);
    child.shadowRoot?.querySelector('button')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(emitted).toHaveBeenCalledOnce();
    expect(parent.shadowRoot?.querySelector('p')?.textContent).toBe('open');
  });

  it('propagates parent state into a server-hydrated child model', async () => {
    const parentTag = 'test-dsd-model-parent';
    const emitterTag = 'test-dsd-model-emitter';
    const targetTag = 'test-dsd-model-target';
    const parent = document.createElement(parentTag);
    const parentRoot = parent.attachShadow({ mode: 'open' });
    const wrapper = document.createElement('div');
    const emitter = document.createElement(emitterTag);
    const emitterRoot = emitter.attachShadow({ mode: 'open' });
    emitterRoot.innerHTML = '<button type="button">open</button>';
    const target = document.createElement(targetTag);
    const targetRoot = target.attachShadow({ mode: 'open' });
    targetRoot.innerHTML = '<p>closed</p>';
    wrapper.append(emitter, target);
    parentRoot.append(wrapper);
    document.body.append(parent);

    component(emitterTag, () => {
      const emit = useEmit();
      return html`<button type="button" @click="${() => emit('open')}">open</button>`;
    });
    component(targetTag, () => {
      const open = defineModel('open', false);
      return html`<p>${open.value ? 'open' : 'closed'}</p>`;
    });
    component(parentTag, () => {
      const open = ref(false);
      return html`<div><test-dsd-model-emitter @open="${() => (open.value = true)}"></test-dsd-model-emitter><test-dsd-model-target :model:open="${open}"></test-dsd-model-target></div>`;
    });
    customElements.upgrade(parent);

    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    emitter.shadowRoot?.querySelector('button')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(target.shadowRoot?.querySelector('p')?.textContent).toBe('open');
  });

  it('propagates changing primitive props into a server-hydrated child', async () => {
    const parentTag = 'test-dsd-prop-parent';
    const childTag = 'test-dsd-prop-child';
    const parent = document.createElement(parentTag);
    const parentRoot = parent.attachShadow({ mode: 'open' });
    const wrapper = document.createElement('div');
    const button = document.createElement('button');
    button.textContent = 'expand';
    const child = document.createElement(childTag) as HTMLElement & { expanded: boolean };
    child.setAttribute('expanded', 'false');
    child.attachShadow({ mode: 'open' }).innerHTML = '<p>false</p>';
    wrapper.append(button, child);
    parentRoot.append(wrapper);
    document.body.append(parent);

    component(childTag, () => {
      const props = useProps({ expanded: false });
      return html`<p>${String(props.expanded)}</p>`;
    });
    component(parentTag, () => {
      const expanded = ref(false);
      return html`<div><button @click="${() => (expanded.value = true)}">expand</button><test-dsd-prop-child :expanded="${expanded.value}"></test-dsd-prop-child></div>`;
    });
    customElements.upgrade(parent);

    await new Promise((resolve) => setTimeout(resolve, 0));
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(child.expanded).toBe(true);
    expect(child.shadowRoot?.textContent).toContain('true');
  });

  it('patches multiple bound props beside model and ref on a hydrated child', async () => {
    const parentTag = 'test-dsd-search-parent';
    const childTag = 'test-dsd-search-child';
    const parent = document.createElement(parentTag);
    const parentRoot = parent.attachShadow({ mode: 'open' });
    const wrapper = document.createElement('div');
    const button = document.createElement('button');
    button.textContent = 'load';
    const child = document.createElement(childTag) as HTMLElement & {
      activeDescendant: string;
      expanded: boolean;
      listboxId: string;
    };
    child.setAttribute('active-descendant', '');
    child.setAttribute('expanded', 'false');
    child.setAttribute('listbox-id', 'results');
    child.attachShadow({ mode: 'open' }).innerHTML = '<p>false:</p>';
    wrapper.append(button, child);
    parentRoot.append(wrapper);
    document.body.append(parent);

    component(childTag, () => {
      const props = useProps({
        activeDescendant: '',
        expanded: false,
        listboxId: '',
      });
      const model = defineModel('');
      return html`<p>${String(props.expanded)}:${props.activeDescendant}:${model.value}</p>`;
    });
    component(parentTag, () => {
      const childRef = ref<HTMLElement | null>(null);
      const query = ref('');
      const activeDescendant = ref('');
      const expanded = ref(false);
      return html`<div><button @click="${() => {
        query.value = 'Line 6';
        activeDescendant.value = 'result-1';
        expanded.value = true;
      }}">load</button><test-dsd-search-child :ref="${childRef}" :model="${query}" :listbox-id="${'results'}" :active-descendant="${activeDescendant.value}" :expanded="${expanded.value}"></test-dsd-search-child></div>`;
    });
    customElements.upgrade(parent);

    await new Promise((resolve) => setTimeout(resolve, 0));
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(parentRoot.querySelector(childTag)).toBe(child);
    expect(child.listboxId).toBe('results');
    expect(child.activeDescendant).toBe('result-1');
    expect(child.expanded).toBe(true);
    expect(child.shadowRoot?.textContent).toContain('true:result-1:Line 6');

    child.setAttribute('expanded', 'false');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(child.shadowRoot?.textContent).toContain('false:result-1:Line 6');
  });

  it('keeps the eager constructor render for newly created client elements', () => {
    const tag = 'test-client-constructor-render';
    const render = vi.fn(() => html`<p>client output</p>`);
    component(tag, render);

    expect(render).toHaveBeenCalledTimes(1); // registration discovery

    const host = document.createElement(tag);

    expect(render).toHaveBeenCalledTimes(2);
    expect(host.shadowRoot?.textContent).toContain('client output');
  });

  it('hydrates conditional anchor blocks without replacing their parent tree', async () => {
    const tag = 'test-dsd-anchor-hydration';
    const host = document.createElement(tag);
    const shadowRoot = host.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML =
      '<style>:host{display:block}</style><div><button>hide</button><span>visible</span></div>';
    const serverRoot = shadowRoot.querySelector('div');

    document.body.append(host);
    component(tag, () => {
      const visible = ref(true);
      return html`<div><button @click="${() => (visible.value = false)}">hide</button><span :when="${visible.value}">visible</span></div>`;
    });
    customElements.upgrade(host);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(host.shadowRoot?.querySelector('div')).toBe(serverRoot);

    host.shadowRoot?.querySelector('button')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(host.shadowRoot?.querySelector('div')).toBe(serverRoot);
    expect(host.shadowRoot?.querySelector('span')).toBeNull();
  });
});
