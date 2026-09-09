import type {
  ComponentConfig,
  ComponentContext,
  Refs,
  WatcherState,
} from '../types';
import { isReactiveState, reactiveSystem } from '../reactive';
import { toKebab, safe } from '../helpers';
import { initWatchers, triggerWatchers } from '../watchers';
import { applyProps, externallySetPropsKey } from '../props';
import {
  handleConnected,
  handleDisconnected,
  handleAttributeChanged,
} from '../lifecycle';
import {
  renderComponent,
  requestRender,
  applyStyle,
  registerChildComponent,
  unregisterChildComponent,
} from '../render';
import { scheduleDOMUpdate } from '../scheduler';
import { devError, devWarn } from '../logger';
import { registry } from './registry';

const HYDRATION_INTERACTION_EVENTS = [
  'click',
  'input',
  'change',
  'submit',
] as const;

function cloneHydrationEvent(event: Event): Event {
  const common = {
    bubbles: event.bubbles,
    cancelable: event.cancelable,
    composed: event.composed,
  };
  if (typeof InputEvent !== 'undefined' && event instanceof InputEvent) {
    return new InputEvent(event.type, {
      ...common,
      data: event.data,
      inputType: event.inputType,
      isComposing: event.isComposing,
    });
  }
  if (event instanceof MouseEvent) {
    return new MouseEvent(event.type, {
      ...common,
      button: event.button,
      buttons: event.buttons,
      clientX: event.clientX,
      clientY: event.clientY,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
    });
  }
  if (typeof SubmitEvent !== 'undefined' && event instanceof SubmitEvent) {
    return new SubmitEvent(event.type, {
      ...common,
      submitter: event.submitter,
    });
  }
  return new Event(event.type, common);
}

function hasNonHydratingAncestor(element: Element): boolean {
  let current: Element | null = element.parentElement;
  if (!current) {
    const root = element.getRootNode();
    if (root instanceof ShadowRoot) current = root.host;
  }

  while (current) {
    // The nearest explicit boundary owns the subtree. This lets a deliberately
    // interactive island opt back in with data-cer-hydrate="load" inside a
    // static page while keeping every unmarked sibling inert.
    const strategy = current.getAttribute('data-cer-hydrate');
    if (strategy) return strategy === 'none';
    if (current.parentElement) {
      current = current.parentElement;
      continue;
    }
    const root = current.getRootNode();
    current = root instanceof ShadowRoot ? root.host : null;
  }
  return false;
}

type VisibilityHydrator = () => void;

let sharedVisibilityObserver: IntersectionObserver | null = null;
let visibleHydrationCount = 0;
const visibleHydrators = new WeakMap<Element, VisibilityHydrator>();

function observeForVisibleHydration(
  element: Element,
  hydrate: VisibilityHydrator,
): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    const timeoutId = setTimeout(hydrate, 0);
    return () => clearTimeout(timeoutId);
  }

  if (!sharedVisibilityObserver) {
    sharedVisibilityObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          visibleHydrators.get(entry.target)?.();
        }
      },
      { rootMargin: '0px', threshold: 0 },
    );
  }

  const observer = sharedVisibilityObserver;
  let active = true;
  visibleHydrators.set(element, hydrate);
  visibleHydrationCount++;
  observer.observe(element);

  return () => {
    if (!active) return;
    active = false;
    visibleHydrators.delete(element);
    observer.unobserve?.(element);
    visibleHydrationCount = Math.max(0, visibleHydrationCount - 1);
    if (visibleHydrationCount === 0 && sharedVisibilityObserver === observer) {
      observer.disconnect();
      sharedVisibilityObserver = null;
    }
  };
}

export function createElementClass<
  S extends object,
  C extends object,
  P extends object,
  T extends object = object,
>(
  tag: string,
  config: ComponentConfig<S, C, P, T>,
): CustomElementConstructor | { new (): object } {
  // Validate that render is provided
  if (!config.render) {
    throw new Error('Component must have a render function');
  }
  if (typeof window === 'undefined') {
    // SSR fallback: minimal class, no DOM, no lifecycle, no "this"
    return class {
      constructor() {}
    };
  }
  return class extends HTMLElement {
    public context!: ComponentContext<S, C, P, T>;
    private _refs: Refs['refs'] = {};
    private _listeners: Array<() => void> = [];
    private _watchers: Map<string, WatcherState> = new Map();
    /** @internal */
    private _renderTimeoutId: ReturnType<typeof setTimeout> | null = null;
    private _hydrationTimeoutId: ReturnType<typeof setTimeout> | null = null;
    private _hydrationIdleId: number | null = null;
    private _hydrationInteractionCleanup: (() => void) | null = null;
    private _visibleHydrationCleanup: (() => void) | null = null;
    private _componentInitialized = false;
    private _mounted = false;
    private _hasError = false;
    private _initializing = true;
    private _hydrateExistingDOM = false;

    private _componentId = '';

    private _styleSheet: CSSStyleSheet | null = null;

    private _lastHtmlStringForJitCSS = '';

    /**
     * Returns the last rendered HTML string for JIT CSS.
     */
    public get lastHtmlStringForJitCSS(): string {
      return this._lastHtmlStringForJitCSS;
    }

    /**
     * Returns true if the most recent render or lifecycle call threw an error.
     */
    public get hasError(): boolean {
      return this._hasError;
    }

    /**
     * Returns true if the component is currently loading.
     */
    public get isLoading(): boolean {
      return this._templateLoading;
    }

    /**
     * Returns the last error thrown during rendering, or null if none.
     */
    public get lastError(): Error | null {
      return this._templateError;
    }

    private _cfg: ComponentConfig<S, C, P, T>;
    private _lastRenderTime = 0;
    private _renderCount = 0;
    private _templateLoading = false;
    private _templateError: Error | null = null;

    constructor() {
      super();
      // Native Declarative Shadow DOM is attached and populated before the
      // custom element upgrades. Preserve that server output until the single
      // connectedCallback hydration render instead of doing an otherwise
      // redundant constructor render immediately beforehand.
      const hasServerRenderedShadowContent = Boolean(
        this.shadowRoot?.hasChildNodes(),
      );
      this._hydrateExistingDOM = hasServerRenderedShadowContent;
      // When a Declarative Shadow DOM template was parsed by the browser
      // (i.e. the server rendered with dsd: true), this.shadowRoot is already
      // set. Calling attachShadow() on an element that already has a shadow
      // root throws a DOMException, so we only attach when one doesn't exist.
      if (!this.shadowRoot) {
        this.attachShadow({ mode: 'open' });
      }
      // Always read the latest config from the registry so re-registration
      // (HMR / tests) updates future instances.
      this._cfg = (registry.get(tag) as ComponentConfig<S, C, P, T>) || config;
      // Every DSD host already has everything needed for first paint. Avoid
      // constructing reactive proxies, prop descriptors, watchers, and IDs in
      // the synchronous custom-element upgrade task. connectedCallback either
      // hydrates it in the strategy's scheduled task or leaves a static island
      // untouched. Client-created elements still initialize eagerly.
      if (!hasServerRenderedShadowContent) {
        this._initializeComponent(config, hasServerRenderedShadowContent);
      }
    }

    private _initializeComponent(
      config: ComponentConfig<S, C, P, T>,
      hasServerRenderedShadowContent = this._hydrateExistingDOM,
    ): void {
      if (this._componentInitialized) return;
      this._componentInitialized = true;
      this._restoreSerializedHydrationProps(this._cfg);

      // Generate unique component ID for render deduplication
      this._componentId = `${tag}-${crypto.randomUUID()}`;

      const reactiveContext = this._initContext(config);

      // Helper to define non-enumerable properties
      const defineNonEnum = (
        obj: Record<string, unknown>,
        key: string,
        value: unknown,
      ) => {
        Object.defineProperty(obj, key, {
          value,
          writable: false,
          enumerable: false,
          configurable: false,
        });
      };

      // Inject refs into context (non-enumerable to avoid proxy traps)
      defineNonEnum(reactiveContext, 'refs', this._refs);
      defineNonEnum(reactiveContext, 'requestRender', () =>
        this.requestRender(),
      );
      defineNonEnum(reactiveContext, '_requestRender', () =>
        this._requestRender(),
      );
      defineNonEnum(reactiveContext, '_componentId', this._componentId);
      defineNonEnum(
        reactiveContext,
        '_triggerWatchers',
        (path: string, newValue: unknown) =>
          this._triggerWatchers(path, newValue),
      );

      // --- Apply props BEFORE wiring listeners and emit ---
      this.context = reactiveContext;
      // Expose host element on the reactive context so hooks like useProps
      // can fallback to reading element properties when attributes were
      // serialized (e.g., objects became "[object Object]"). This is added
      // as a non-enumerable field to avoid interfering with reactive proxy.
      safe(() => {
        defineNonEnum(reactiveContext, '_host', this);
      });
      // Defer applying props until connectedCallback so attributes that are
      // set by the parent renderer (after element construction) are available.
      // applyProps will still be invoked from attributeChangedCallback when
      // attributes are set; connectedCallback will call it as a final step to
      // ensure defaults are applied when no attributes are present.

      // Inject emit helper for custom events (single canonical event API).
      // Emits a DOM CustomEvent and returns whether it was not defaultPrevented.
      defineNonEnum(
        this.context,
        'emit',
        (eventName: string, detail?: unknown, options?: CustomEventInit) => {
          const eventOptions = {
            detail,
            bubbles: true,
            composed: true,
            ...(options || {}),
          };
          const ev = new CustomEvent(eventName, eventOptions);

          // Primary event dispatch
          this.dispatchEvent(ev);

          // Dispatch alternate camel/kebab variation for compatibility
          const colonIndex = eventName.indexOf(':');
          if (colonIndex > 0) {
            const prefix = eventName.substring(0, colonIndex);
            const prop = eventName.substring(colonIndex + 1);
            const altName = prop.includes('-')
              ? `${prefix}:${prop
                  .split('-')
                  .map((p, i) =>
                    i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1),
                  )
                  .join('')}`
              : `${prefix}:${prop.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`;
            if (altName !== eventName) {
              safe(() => {
                this.dispatchEvent(new CustomEvent(altName, eventOptions));
              });
            }
          }

          return !ev.defaultPrevented;
        },
      );

      // --- Inject config methods into context ---
      // Expose config functions on the context as callable helpers. Event
      // handling is DOM-first: use standard DOM event listeners or
      // `context.emit` (which dispatches a DOM CustomEvent) to communicate
      // with the host. There is no property-based host-callback dispatch.
      const cfgToUse =
        (registry.get(tag) as ComponentConfig<S, C, P, T>) || config;
      for (const key in cfgToUse) {
        const fn = (cfgToUse as Record<string, unknown>)[key];
        if (typeof fn === 'function') {
          // Expose as context method: context.fn(...args) => fn(...args, context)
          (this.context as Record<string, unknown>)[key] = (
            ...args: unknown[]
          ) => fn(...args, this.context);
        }
      }

      // Set up reactive property setters for all props to detect external changes
      if (cfgToUse.props) {
        const externallySetProps = new Set<string>();
        Object.defineProperty(this, externallySetPropsKey, {
          value: externallySetProps,
          writable: false,
          enumerable: false,
          configurable: false,
        });
        for (const propName in cfgToUse.props) {
          // A declared prop may share a name with an inherited DOM property
          // (`role`, `title`, `hidden`, etc.). An unset inherited value is not
          // an explicit component input and must not replace the prop default.
          // Preserve own properties assigned before custom-element upgrade;
          // otherwise initialize the public property from its declaration.
          const hadOwnValue = Object.prototype.hasOwnProperty.call(
            this,
            propName,
          );
          let internalValue = hadOwnValue
            ? (this as Record<string, unknown>)[propName]
            : cfgToUse.props[propName].default;
          if (hadOwnValue) externallySetProps.add(propName);

          Object.defineProperty(this, propName, {
            get() {
              return internalValue;
            },
            set(newValue) {
              const oldValue = internalValue;
              internalValue = newValue;
              externallySetProps.add(propName);

              // Keep legacy context access in sync without letting the proxy
              // schedule its own render. The explicit request below is the one
              // canonical update for this external property assignment.
              const wasInitializing = this._initializing;
              this._initializing = true;
              try {
                (this.context as Record<string, unknown>)[propName] = newValue;
              } finally {
                this._initializing = wasInitializing;
              }

              if (!wasInitializing && this._mounted && oldValue !== newValue) {
                this._requestRender();
              }
            },
            enumerable: true,
            configurable: true,
          });
        }
      }

      this._initializing = false;

      // Initialize watchers after initialization phase is complete
      this._initWatchers(cfgToUse);

      // Apply props before initial render so they're available immediately
      // Note: Attributes set by parent renderers may not be available yet,
      // but connectedCallback will re-apply props and re-render
      this._applyProps(cfgToUse);

      // Client-created elements still render eagerly so their shadow DOM is
      // available before connection. Server-rendered elements already have
      // useful DSD content and hydrate exactly once when connected.
      if (!hasServerRenderedShadowContent) {
        this._render(cfgToUse);
      }
    }

    /**
     * Restore complex props serialized for an interactive island inside a
     * static SSR boundary. The static parent cannot run a client render to
     * promote its bound props, so the island consumes this escaped one-shot
     * payload before property descriptors and useProps state are initialized.
     */
    private _restoreSerializedHydrationProps(
      cfg: ComponentConfig<S, C, P, T>,
    ): void {
      if (!this._hydrateExistingDOM) return;
      const serialized = this.getAttribute('data-cer-props');
      if (serialized === null) return;

      // Remove the transport attribute even when malformed. It is internal,
      // one-shot state and must not remain as a stale or user-editable source.
      this.removeAttribute('data-cer-props');

      let parsed: unknown;
      try {
        parsed = JSON.parse(serialized);
      } catch {
        return;
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;

      const declaredProps = cfg.props ?? {};
      for (const [key, value] of Object.entries(parsed)) {
        if (
          key === '__proto__' ||
          key === 'prototype' ||
          key === 'constructor' ||
          !Object.prototype.hasOwnProperty.call(declaredProps, key) ||
          Object.prototype.hasOwnProperty.call(this, key) ||
          this.hasAttribute(toKebab(key))
        ) {
          continue;
        }

        safe(() => {
          Object.defineProperty(this, key, {
            value,
            writable: true,
            enumerable: true,
            configurable: true,
          });
        });
      }
    }

    connectedCallback() {
      this._runLogicWithinErrorBoundary(config, () => {
        // Register this component with parent's shadowRoot for optimized child HTML aggregation
        const parentHost = this.getRootNode() as ShadowRoot | Document;
        if (parentHost && parentHost !== document && 'host' in parentHost) {
          registerChildComponent(parentHost as ShadowRoot, this);
        }

        // Partial-hydration markers describe how existing server DOM should be
        // activated. Client-created elements have already rendered locally and
        // must mount normally even when a router carries the same route marker
        // into a later client-side navigation.
        const ownHydrateStrategy = this.getAttribute('data-cer-hydrate');
        const hydrateStrategy = this._hydrateExistingDOM
          ? ownHydrateStrategy ?? (hasNonHydratingAncestor(this) ? 'none' : null)
          : null;
        if (hydrateStrategy === 'none') {
          // Static element — never hydrate. Keep the DSD content as-is.
          return;
        }
        if (hydrateStrategy === 'idle') {
          const cb = () => {
            this._hydrationIdleId = null;
            this._hydrationTimeoutId = null;
            this._hydrateNow(config);
          };
          if (typeof requestIdleCallback !== 'undefined') {
            this._hydrationIdleId = requestIdleCallback(cb);
          } else {
            // Fallback for environments without requestIdleCallback (e.g. Safari < 16)
            this._hydrationTimeoutId = setTimeout(cb, 200);
          }
          return;
        }
        if (hydrateStrategy === 'visible') {
          this._visibleHydrationCleanup?.();
          this._visibleHydrationCleanup = observeForVisibleHydration(
            this,
            () => {
              this._visibleHydrationCleanup?.();
              this._visibleHydrationCleanup = null;
              this._hydrateNow(config);
            },
          );
          return;
        }

        if (this._hydrateExistingDOM) {
          // customElements.define() upgrades every matching SSR instance in one
          // synchronous browser task. Rendering each one inside that callback
          // turns large lists into a single long task even though their DSD is
          // already painted. Give each existing shadow root its own task so the
          // browser can yield for input and rendering between instances.
          // If a user reaches the already-painted DSD before its scheduled
          // task, hydrate during capture so the same event still reaches the
          // newly bound target listener. This preserves responsiveness without
          // dropping fast clicks or input.
          this._armInteractionHydration(config);
          const hydrate = () => {
            this._hydrationIdleId = null;
            this._hydrationTimeoutId = null;
            this._clearInteractionHydration();
            if (this.isConnected) this._hydrateNow(config);
          };
          this._hydrationTimeoutId = setTimeout(hydrate, 0);
          return;
        }

        // Default ('load' or no attribute): hydrate immediately.
        // Use a synchronous render here (not _requestRender) so that
        // handleConnected fires AFTER a fully up-to-date render. This
        // guarantees the lifecycle callbacks registered via useOnConnected /
        // useOnDisconnected close over the current ReactiveState objects
        // (including after a disconnect+reconnect where cleanup() has
        // replaced the stateStorage entries). In production the scheduler
        // is async, so _requestRender() would defer the render to a later
        // microtask — leaving handleConnected with stale closures from the
        // previous render, which is the root cause of the bug where
        // collapsed.value changes but the template never re-renders.
        this._applyProps(config);
        this._render(config);
        handleConnected(config, this.context, this._mounted, (val) => {
          this._mounted = val;
        });
        this.setAttribute('data-cer-hydrated', '');
      });
    }

    /** Execute the standard hydration sequence (used by deferred strategies). */
    private _hydrateNow(cfg: ComponentConfig<S, C, P, T>): void {
      if (!this.isConnected) return;
      this._initializeComponent(cfg);
      this._runLogicWithinErrorBoundary(cfg, () => {
        this._applyProps(cfg);
        this._render(cfg);
        handleConnected(cfg, this.context, this._mounted, (val) => {
          this._mounted = val;
        });
        this.setAttribute('data-cer-hydrated', '');
      });
    }

    private _armInteractionHydration(
      cfg: ComponentConfig<S, C, P, T>,
    ): void {
      const root = this.shadowRoot;
      if (!root || this._hydrationInteractionCleanup) return;

      const hydrate = (event: Event) => {
        const target = event.target;
        // Chromium snapshots a dispatch path's listeners before capture begins,
        // so listeners bound during hydration do not receive the original
        // interaction. Consume it and replay one equivalent event afterwards.
        event.preventDefault();
        event.stopImmediatePropagation();
        this._clearInteractionHydration();
        this._cancelScheduledHydration();
        if (!this.isConnected) return;
        this._hydrateNow(cfg);
        if (target) {
          target.dispatchEvent(cloneHydrationEvent(event));
        }
      };

      for (const eventName of HYDRATION_INTERACTION_EVENTS) {
        root.addEventListener(eventName, hydrate, { capture: true });
      }
      this._hydrationInteractionCleanup = () => {
        for (const eventName of HYDRATION_INTERACTION_EVENTS) {
          root.removeEventListener(eventName, hydrate, { capture: true });
        }
      };
    }

    private _clearInteractionHydration(): void {
      this._hydrationInteractionCleanup?.();
      this._hydrationInteractionCleanup = null;
    }

    private _cancelScheduledHydration(): void {
      if (this._hydrationTimeoutId !== null) {
        clearTimeout(this._hydrationTimeoutId);
        this._hydrationTimeoutId = null;
      }
      if (this._hydrationIdleId !== null) {
        if (typeof cancelIdleCallback !== 'undefined') {
          cancelIdleCallback(this._hydrationIdleId);
        }
        this._hydrationIdleId = null;
      }
    }

    disconnectedCallback() {
      this._runLogicWithinErrorBoundary(config, () => {
        this._visibleHydrationCleanup?.();
        this._visibleHydrationCleanup = null;
        this._cancelScheduledHydration();
        this._clearInteractionHydration();
        // Unregister this component from parent's shadowRoot cache
        const parentHost = this.getRootNode() as ShadowRoot | Document;
        if (parentHost && parentHost !== document && 'host' in parentHost) {
          unregisterChildComponent(parentHost as ShadowRoot, this);
        }

        if (!this._componentInitialized) return;

        handleDisconnected(
          config,
          this.context,
          this._listeners,
          () => {
            this._listeners = [];
          },
          () => {
            this._watchers.clear();
          },
          (val) => {
            this._templateLoading = val;
          },
          (err) => {
            this._templateError = err;
          },
          (val) => {
            this._mounted = val;
          },
        );
        // Clean up reactive system entries (componentData + stateStorage) so
        // disconnected components do not accumulate in the global Maps forever.
        reactiveSystem.cleanup(this._componentId);
      });
    }

    attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null,
    ) {
      if (!this._componentInitialized) return;
      this._runLogicWithinErrorBoundary(config, () => {
        const propName = Object.keys(config.props ?? {}).find(
          (key) => toKebab(key) === name,
        );
        if (propName) {
          const externallySetProps = (
            this as unknown as Record<symbol, unknown>
          )[externallySetPropsKey];
          if (externallySetProps instanceof Set) {
            externallySetProps.delete(propName);
          }
        }
        // Before the first connected render, props are read in one batch by
        // connectedCallback. Scheduling here would race deferred DSD hydration
        // and render the same component repeatedly while the parent binds it.
        if (this._mounted) {
          this._applyProps(config);
          if (oldValue !== newValue) this._requestRender();
        }
        handleAttributeChanged(config, name, oldValue, newValue, this.context);
      });
    }

    static get observedAttributes() {
      return config.props ? Object.keys(config.props).map(toKebab) : [];
    }

    // --- Render ---
    private _render(cfg: ComponentConfig<S, C, P, T>) {
      this._runLogicWithinErrorBoundary(cfg, () => {
        const hydrateExisting = this._hydrateExistingDOM;
        this._hydrateExistingDOM = false;
        // _render invoked; proceed to render via renderComponent
        renderComponent(
          this.shadowRoot,
          cfg,
          this.context,
          this._refs,
          (html) => {
            this._lastHtmlStringForJitCSS = html;
            // Optionally, use the latest HTML string for debugging or external logic
            if (
              typeof (this as { onHtmlStringUpdate?: (html: string) => void })
                .onHtmlStringUpdate === 'function'
            ) {
              const htmlUpdater = this as unknown as
                | { onHtmlStringUpdate?: (html: string) => void }
                | undefined;
              htmlUpdater?.onHtmlStringUpdate?.(html as string);
            }
          },
          (val) => {
            this._templateLoading = val;
            // Optionally, use loading state for external logic
            const selfAsAny = this as unknown as
              | { onLoadingStateChange?: (val: boolean) => void }
              | undefined;
            selfAsAny?.onLoadingStateChange?.(val);
          },
          (err) => {
            this._templateError = err;
            // Optionally, use error state for external logic
            const selfAsAny2 = this as unknown as
              | { onErrorStateChange?: (err: Error) => void }
              | undefined;
            selfAsAny2?.onErrorStateChange?.(err as Error);
          },
          (html) => this._applyStyle(cfg, html),
          hydrateExisting,
        );
      });
    }

    public requestRender() {
      this._requestRender();
    }

    _requestRender() {
      // Detached instances cannot produce visible work. More importantly, a
      // queued render from an instance that was just replaced must not run
      // after disconnectedCallback cleaned its reactive subscriptions; doing
      // so can resurrect stale state and overwrite instance-scoped closures.
      if (!this.isConnected) return;
      this._runLogicWithinErrorBoundary(this._cfg, () => {
        // Use scheduler to batch render requests
        scheduleDOMUpdate(() => {
          if (!this.isConnected) return;
          requestRender(
            () => {
              if (this.isConnected) this._render(this._cfg);
            },
            this._lastRenderTime,
            this._renderCount,
            (t) => {
              this._lastRenderTime = t;
            },
            (c) => {
              this._renderCount = c;
            },
            this._renderTimeoutId,
            (id) => {
              this._renderTimeoutId = id;
            },
          );
        }, this._componentId);
      });
    }

    // --- Style ---
    private _applyStyle(cfg: ComponentConfig<S, C, P, T>, html: string) {
      this._runLogicWithinErrorBoundary(cfg, () => {
        applyStyle(
          this.shadowRoot,
          this.context,
          html,
          this._styleSheet,
          (sheet) => {
            this._styleSheet = sheet;
          },
        );
      });
    }

    // --- Error Boundary function ---
    private _runLogicWithinErrorBoundary(
      cfg: ComponentConfig<S, C, P, T>,
      fn: () => void,
    ) {
      try {
        fn();
        // Clear error state only after a successful execution so that
        // getLastError() remains valid between a failed and a subsequent
        // successful render, rather than being wiped at the start of every call.
        this._hasError = false;
      } catch (error) {
        this._hasError = true;

        // DEV-only diagnostic: provide actionable context to help debugging
        try {
          const tag = this.tagName?.toLowerCase?.() || '<unknown>';
          const compId = this._componentId || '<unknown-id>';
          const safeProps: Record<string, unknown> = {};
          if (cfg && cfg.props) {
            for (const k of Object.keys(cfg.props)) {
              try {
                const v = (this.context as Record<string, unknown>)[k];
                if (v instanceof Node) {
                  safeProps[k] = `[DOM Node: ${v.nodeName}]`;
                } else if (typeof v === 'object' && v !== null) {
                  safeProps[k] =
                    Object.keys(v).length > 5
                      ? `[object(${Object.keys(v).length} keys)]`
                      : v;
                } else {
                  safeProps[k] = v;
                }
              } catch {
                safeProps[k] = '[unreadable]';
              }
            }
          }

          devError(`Error rendering component <${tag}> (id=${compId}):`, error);
          devError('Component props snapshot:', safeProps);
          devWarn(
            'Common causes: accessing properties of null/undefined inside template interpolations; expensive or throwing expressions inside templates that evaluate eagerly. Fixes: use optional chaining (obj?.prop), guard with ternary, or use the runtime lazy overload: when(cond, () => html`...`).',
          );
        } catch {
          // best-effort diagnostics - swallow failures here to preserve original behavior
        }

        if (cfg.onError) {
          cfg.onError(error as Error | null, this.context);
        }

        // Propagate to the nearest ancestor <cer-error-boundary> so that
        // slotted child components' errors are surfaced to the boundary even
        // when the child has no useOnError handler of its own.
        // Skip when this element IS the error boundary to avoid double-handling.
        if (this.tagName.toLowerCase() !== 'cer-error-boundary') {
          let node: Element | null = this.parentElement;
          if (!node) {
            const root = this.getRootNode();
            if (root instanceof ShadowRoot) node = root.host.parentElement;
          }
          while (node) {
            if (node.tagName.toLowerCase() === 'cer-error-boundary') {
              type ErrorBoundaryElement = {
                _cerHandleChildError?: (err: unknown) => void;
              };
              (node as unknown as ErrorBoundaryElement)._cerHandleChildError?.(
                error,
              );
              break;
            }
            let next: Element | null = node.parentElement;
            if (!next) {
              const root = node.getRootNode();
              if (root instanceof ShadowRoot) next = root.host.parentElement;
            }
            node = next;
          }
        }
      }
    }

    // --- State, props, computed ---
    private _initContext(
      cfg: ComponentConfig<S, C, P, T>,
    ): ComponentContext<S, C, P, T> {
      try {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        function createReactive<T>(obj: T, path = ''): T {
          if (Array.isArray(obj)) {
            // Create a proxy that intercepts array mutations
            return new Proxy(obj, {
              get(target, prop, receiver) {
                const value = Reflect.get(target, prop, receiver);

                // Intercept array mutating methods
                if (typeof value === 'function' && typeof prop === 'string') {
                  const mutatingMethods = [
                    'push',
                    'pop',
                    'shift',
                    'unshift',
                    'splice',
                    'sort',
                    'reverse',
                  ];
                  if (mutatingMethods.includes(prop)) {
                    return function (...args: unknown[]) {
                      const result = value.apply(target, args);

                      if (!self._initializing && self._mounted) {
                        const fullPath = path || 'root';
                        self._triggerWatchers(fullPath, target);
                        scheduleDOMUpdate(
                          () => self._render(cfg),
                          self._componentId,
                        );
                      }

                      return result;
                    };
                  }
                }

                return value;
              },
              set(target, prop, value) {
                (target as Record<string, unknown>)[String(prop)] = value;
                if (!self._initializing && self._mounted) {
                  const fullPath = path
                    ? `${path}.${String(prop)}`
                    : String(prop);
                  self._triggerWatchers(fullPath, value);
                  scheduleDOMUpdate(() => self._render(cfg), self._componentId);
                }
                return true;
              },
              deleteProperty(target, prop) {
                delete (target as Record<string, unknown>)[String(prop)];
                if (!self._initializing && self._mounted) {
                  const fullPath = path
                    ? `${path}.${String(prop)}`
                    : String(prop);
                  self._triggerWatchers(fullPath, undefined);
                  scheduleDOMUpdate(() => self._render(cfg), self._componentId);
                }
                return true;
              },
            });
          }
          if (obj && typeof obj === 'object') {
            // Skip ReactiveState objects to avoid corrupting their internal structure
            if (isReactiveState(obj)) {
              return obj;
            }

            for (const key in obj) {
              const newPath = path ? `${path}.${key}` : key;
              obj[key] = createReactive(obj[key], newPath);
            }
            return new Proxy(obj, {
              set(target, prop, value) {
                const fullPath = path
                  ? `${path}.${String(prop)}`
                  : String(prop);
                (target as Record<string, unknown>)[String(prop)] =
                  createReactive(value, fullPath);
                if (!self._initializing && self._mounted) {
                  self._triggerWatchers(
                    fullPath,
                    (target as Record<string, unknown>)[String(prop)],
                  );
                  scheduleDOMUpdate(() => self._render(cfg), self._componentId);
                }
                return true;
              },
              get(target, prop, receiver) {
                return Reflect.get(target, prop, receiver);
              },
            });
          }
          return obj;
        }
        return createReactive({
          // For functional components, state is managed by state() function calls
          // Include prop defaults in initial reactive context so prop updates trigger reactivity
          ...(cfg.props
            ? Object.fromEntries(
                Object.entries(cfg.props).map(([key, def]) => [
                  key,
                  def.default,
                ]),
              )
            : {}),
        }) as ComponentContext<S, C, P, T>;
      } catch {
        return {} as ComponentContext<S, C, P, T>;
      }
    }

    private _initWatchers(cfg: ComponentConfig<S, C, P, T>): void {
      this._runLogicWithinErrorBoundary(cfg, () => {
        initWatchers(
          this.context,
          this._watchers,
          {}, // Watchers are now handled by the watch() function in functional API
        );
      });
    }

    private _triggerWatchers(path: string, newValue: unknown): void {
      triggerWatchers(this.context, this._watchers, path, newValue);
    }

    private _applyProps(cfg: ComponentConfig<S, C, P, T>): void {
      this._runLogicWithinErrorBoundary(cfg, () => {
        applyProps(this, cfg, this.context);
      });
    }
  };
}
