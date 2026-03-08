/**
 * Context-based hooks for functional components
 * Provides React-like hooks with perfect TypeScript inference
 */

import { isReactiveState } from './reactive';
import { toKebab } from './helpers';
import { devWarn } from './logger';
import { isDiscoveryRender as _isDiscoveryRenderFn } from './discovery-state';

// Re-export discovery helpers so consumers continue to use the same import path.
export { beginDiscoveryRender, endDiscoveryRender } from './discovery-state';

/**
 * Returns true while a discovery render is in progress.
 * Used by `html` and other primitives to short-circuit side effects.
 * @internal
 */
export function isDiscoveryRender(): boolean {
  return _isDiscoveryRenderFn();
}

// Global state to track current component context during render
// Narrowed internal type for currentComponentContext to expose _hookCallbacks
interface InternalHookCallbacks {
  onConnected?: Array<(context?: unknown) => void>;
  onDisconnected?: Array<(context?: unknown) => void>;
  onAttributeChanged?: Array<
    (name: string, oldValue: string | null, newValue: string | null) => void
  >;
  onError?: Array<(err: unknown) => void>;
  props?: Record<string, unknown>;
  style?: () => string;
  expose?: Record<string, unknown>;
}

type InternalComponentContext = Record<string, unknown> & {
  _hookCallbacks?: InternalHookCallbacks;
  _computedStyle?: string;
};

let currentComponentContext: InternalComponentContext | null = null;

/**
 * Set the current component context (called internally during render)
 * @internal
 */
export function setCurrentComponentContext(
  context: Record<string, unknown>,
): void {
  currentComponentContext = context;
}

/**
 * Clear the current component context (called internally after render)
 * @internal
 */
export function clearCurrentComponentContext(): void {
  currentComponentContext = null;
}

// ---------- Discovery render probe ----------
// The actual state and helpers live in discovery-state.ts to avoid
// circular dependencies with reactive.ts. The re-exports above forward
// beginDiscoveryRender / endDiscoveryRender / isDiscoveryRender from that
// module so all existing import sites remain unchanged.

/**
 * Get the current component context. Useful for advanced composable patterns
 * that need to access or pass the context explicitly.
 * @internal
 */
export function getCurrentComponentContext(): Record<string, unknown> | null {
  return currentComponentContext;
}

/**
 * Get the emit function for the current component
 * Must be called during component render
 *
 * @example
 * ```ts
 * component('my-button', () => {
 *   const { label } = useProps({ label: 'Click me' });
 *   const emit = useEmit();
 *
 *   return html`
 *     <button @click="${() => emit('button-click', { label })}">
 *       ${label}
 *     </button>
 *   `;
 * });
 * ```
 */
export function useEmit(): (
  eventName: string,
  detail?: unknown,
  options?: CustomEventInit,
) => boolean {
  if (!currentComponentContext) {
    throw new Error('useEmit must be called during component render');
  }

  // During discovery render, return a no-op function — no real host exists.
  if (_isDiscoveryRenderFn()) {
    return () => false;
  }

  // Capture and validate the emit function from the current context
  const emitCandidate = (currentComponentContext as { emit?: unknown }).emit;
  if (typeof emitCandidate !== 'function') {
    throw new Error(
      'useEmit requires an emit function on the component context',
    );
  }
  const emitFn = emitCandidate as (
    eventName: string,
    detail?: unknown,
    options?: CustomEventInit,
  ) => boolean;

  return (eventName: string, detail?: unknown, options?: CustomEventInit) => {
    return emitFn(eventName, detail, options);
  };
}

/**
 * Initialize hook callbacks storage on context if not exists
 * Uses Object.defineProperty to avoid triggering reactive updates
 */
function ensureHookCallbacks(context: Record<string, unknown>): void {
  if (!context._hookCallbacks) {
    Object.defineProperty(context, '_hookCallbacks', {
      value: {},
      writable: true,
      enumerable: false,
      configurable: false,
    });
  }
}

/**
 * Register a callback to be called when component is connected to DOM
 *
 * @example
 * ```ts
 * component('my-component', () => {
 *   useOnConnected(() => {
 *     console.log('Component mounted!');
 *   });
 *
 *   return html`<div>Hello World</div>`;
 * });
 * ```
 */
export function useOnConnected(callback: () => void): void {
  if (!currentComponentContext) {
    throw new Error('useOnConnected must be called during component render');
  }

  // During discovery render, skip registering lifecycle callbacks — the
  // discoveryContext is ephemeral and its hooks are never invoked.
  if (_isDiscoveryRenderFn()) return;

  ensureHookCallbacks(currentComponentContext as InternalComponentContext);
  const hooks = currentComponentContext._hookCallbacks as InternalHookCallbacks;
  if (!hooks.onConnected) hooks.onConnected = [];
  hooks.onConnected.push(callback);
}

/**
 * Register a callback to be called when component is disconnected from DOM
 *
 * @example
 * ```ts
 * component('my-component', () => {
 *   useOnDisconnected(() => {
 *     console.log('Component unmounted!');
 *   });
 *
 *   return html`<div>Goodbye World</div>`;
 * });
 * ```
 */
export function useOnDisconnected(callback: () => void): void {
  if (!currentComponentContext) {
    throw new Error('useOnDisconnected must be called during component render');
  }

  // During discovery render, skip registering lifecycle callbacks.
  if (_isDiscoveryRenderFn()) return;

  ensureHookCallbacks(currentComponentContext as InternalComponentContext);
  const hooks = currentComponentContext._hookCallbacks as InternalHookCallbacks;
  if (!hooks.onDisconnected) hooks.onDisconnected = [];
  hooks.onDisconnected.push(callback);
}

/**
 * Register a callback to be called when an attribute changes
 *
 * @example
 * ```ts
 * component('my-component', () => {
 *   useOnAttributeChanged((name, oldValue, newValue) => {
 *     console.log(`Attribute ${name} changed from ${oldValue} to ${newValue}`);
 *   });
 *
 *   return html`<div>Attribute watcher</div>`;
 * });
 * ```
 */
export function useOnAttributeChanged(
  callback: (
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ) => void,
): void {
  if (!currentComponentContext) {
    throw new Error(
      'useOnAttributeChanged must be called during component render',
    );
  }

  // During discovery render, skip registering lifecycle callbacks.
  if (_isDiscoveryRenderFn()) return;

  ensureHookCallbacks(currentComponentContext as InternalComponentContext);
  const hooks = currentComponentContext._hookCallbacks as InternalHookCallbacks;
  if (!hooks.onAttributeChanged) hooks.onAttributeChanged = [];
  hooks.onAttributeChanged.push(callback);
}

/**
 * Register a callback to be called when an error occurs
 *
 * @example
 * ```ts
 * component('my-component', () => {
 *   useOnError((error) => {
 *     console.error('Component error:', error);
 *   });
 *
 *   return html`<div>Error handler</div>`;
 * });
 * ```
 */
export function useOnError(callback: (error: Error) => void): void {
  if (!currentComponentContext) {
    throw new Error('useOnError must be called during component render');
  }

  // During discovery render, skip registering lifecycle callbacks.
  if (_isDiscoveryRenderFn()) return;

  ensureHookCallbacks(currentComponentContext as InternalComponentContext);
  const hooks = currentComponentContext._hookCallbacks as InternalHookCallbacks;
  if (!hooks.onError) hooks.onError = [];
  // Wrap to normalize to Error and swallow re-throws.
  hooks.onError.push((err: unknown) => {
    try {
      if (err instanceof Error) callback(err);
      else callback(new Error(String(err)));
    } catch {
      /* swallow */
    }
  });
}

/**
 * Register prop defaults for the component. Can be called during render.
 * Stores the prop defaults on `context._hookCallbacks.props` so the runtime
 * can pick them up when building the component config.
 *
 * Example:
 * ```ts
 * component('my-comp', () => {
 *   useProps({ modelValue: false, label: 'Hello' });
 *   return html`<div/>`;
 * });
 * ```
 */
export function useProps<T extends Record<string, unknown>>(defaults: T): T {
  if (!currentComponentContext) {
    throw new Error('useProps must be called during component render');
  }

  ensureHookCallbacks(currentComponentContext as InternalComponentContext);
  const hooks = currentComponentContext._hookCallbacks as InternalHookCallbacks;
  hooks.props = {
    ...(hooks.props || {}),
    ...defaults,
  };

  const ctx = currentComponentContext;
  // Define dynamic getters for declared props so the context property
  // always reflects the host element's property (or reactive ref.value)
  try {
    const declaredKeys = Object.keys(defaults || {});
    for (const key of declaredKeys) {
      if (typeof key !== 'string' || key.startsWith('_')) continue;
      const existing = Object.getOwnPropertyDescriptor(ctx, key);
      // Only define if not present or configurable (allow overriding)
      if (existing && !existing.configurable) continue;
      try {
        // Preserve any existing concrete value on the context in a closure.
        // This avoids recursive getters when we later reference ctx[key].
        const hasOwn = Object.prototype.hasOwnProperty.call(ctx, key);
        let localValue: unknown = hasOwn
          ? (ctx as Record<string, unknown>)[key]
          : undefined;

        Object.defineProperty(ctx, key, {
          configurable: true,
          enumerable: true,
          get() {
            try {
              const host = (ctx && (ctx as { _host?: HTMLElement })._host) as
                | HTMLElement
                | undefined;
              if (host) {
                // First, check for attribute value (attributes should take precedence)
                const kebabKey = toKebab(key);
                const attrValue = host.getAttribute(kebabKey);
                if (attrValue !== null) {
                  const defaultType = typeof defaults[key];
                  if (defaultType === 'boolean') {
                    // Standalone boolean attributes have empty string value
                    return attrValue === '' || attrValue === 'true';
                  }
                  if (defaultType === 'number') {
                    return Number(attrValue);
                  }
                  return attrValue;
                }

                // If no attribute, check if host has a property value set
                if (
                  typeof (host as unknown as Record<string, unknown>)[key] !==
                  'undefined'
                ) {
                  const fromHost = (host as unknown as Record<string, unknown>)[
                    key
                  ];
                  // prefer host value when present
                  // If the host provided a ReactiveState instance or a wrapper
                  // with a .value, unwrap it here so destructured props and
                  // useProps return the primitive/current value consistently.
                  if (isReactiveState(fromHost)) {
                    return (fromHost as { value: unknown }).value;
                  }
                  if (
                    fromHost &&
                    typeof fromHost === 'object' &&
                    'value' in fromHost &&
                    !(fromHost instanceof Node)
                  ) {
                    return (fromHost as { value?: unknown }).value;
                  }
                  // For string-typed declared props, avoid returning host
                  // object-like properties (for example `element.style` which
                  // is a CSSStyleDeclaration). Prefer attribute value or the
                  // local default instead of returning a non-primitive host
                  // property into templates which expect primitives.
                  const defaultType = typeof defaults[key];
                  if (
                    defaultType === 'string' &&
                    fromHost &&
                    typeof fromHost === 'object'
                  ) {
                    // fallthrough to localValue
                  } else {
                    // For boolean defaults, treat empty string (standalone attribute) or 'true' as true.
                    if (
                      defaultType === 'boolean' &&
                      typeof fromHost === 'string'
                    ) {
                      return fromHost === '' || fromHost === 'true';
                    }
                    return fromHost;
                  }
                }
              }
            } catch {
              // ignore host read failures and fall back to context
            }
            return localValue;
          },
          set(v: unknown) {
            // allow test/runtime code to set context props during render/init
            localValue = v;
          },
        });
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
  // Return a Proxy that always reads the latest value from the component
  // context so accesses are reactive. Also unwrap functional refs ({ value })
  // and coerce string attribute values to boolean/number when defaults
  // indicate such types.
  const result = new Proxy({} as Record<string, unknown>, {
    get(_target, prop: string) {
      if (typeof prop !== 'string') return undefined;
      const def = (defaults as Record<string, unknown>)[prop];

      // If a host element is available, prefer reading from attributes first,
      // then from properties. This ensures that HTML attributes take precedence
      // over default property values (like the standard "title" attribute).
      try {
        const host = (ctx && (ctx as { _host?: HTMLElement })._host) as
          | HTMLElement
          | undefined;
        if (host) {
          // Check attribute first (only if host is an actual HTMLElement)
          if (
            host instanceof HTMLElement ||
            (typeof (host as { getAttribute?: (name: string) => string | null })
              .getAttribute === 'function' &&
              typeof (host as { hasAttribute?: (name: string) => boolean })
                .hasAttribute === 'function')
          ) {
            const kebabKey = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
            const attrValue = (
              host as { getAttribute: (name: string) => string | null }
            ).getAttribute(kebabKey);
            if (attrValue !== null) {
              // Attribute exists - convert based on default type
              if (typeof def === 'boolean') {
                return attrValue === '' || attrValue === 'true';
              }
              if (typeof def === 'number') {
                return Number(attrValue);
              }
              return attrValue;
            }
          }

          // No attribute - check property value
          const hostValue = (host as unknown as Record<string, unknown>)[prop];
          // Only use host value if it's explicitly set (not undefined AND not empty string for string defaults)
          // Empty strings on standard HTML properties (like 'title') should fall through to defaults
          if (typeof hostValue !== 'undefined' && hostValue !== '') {
            // If the declared default is a string, avoid returning raw DOM
            // object-like properties (such as element.style which is a CSSStyleDeclaration)
            // since templates expect primitives and serializing objects can
            // cause DOMExceptions. However, wrapper-like objects that expose
            // a `.value` property (or ReactiveState instances) should be
            // unwrapped and returned even for string defaults.
            const isWrapperLike =
              hostValue &&
              typeof hostValue === 'object' &&
              'value' in hostValue &&
              !(hostValue instanceof Node);
            if (
              typeof def === 'string' &&
              hostValue &&
              typeof hostValue === 'object' &&
              !isWrapperLike &&
              !isReactiveState(hostValue)
            ) {
              // treat as not present and fall through to ctx/default
            } else {
              // Special handling for boolean props: if default is false and hostValue is empty string,
              // treat it as if the property wasn't set (use default false)
              if (
                typeof def === 'boolean' &&
                def === false &&
                hostValue === ''
              ) {
                return def;
              }

              // Unwrap ReactiveState instances and wrapper-like objects coming
              // from the host so useProps mirrors applyProps/destructured props
              // behavior and returns primitive/current values.
              if (isReactiveState(hostValue)) {
                return (hostValue as { value: unknown }).value;
              }
              if (isWrapperLike) {
                return (hostValue as { value: unknown }).value;
              }

              // Primitive on host - return directly (but coerce strings if default provided)
              if (typeof def === 'boolean' && typeof hostValue === 'string') {
                // For boolean attributes, only explicit 'true' string or non-empty presence means true
                return (
                  hostValue === 'true' ||
                  (hostValue !== '' && hostValue !== 'false')
                );
              }
              if (
                typeof def === 'number' &&
                typeof hostValue === 'string' &&
                !Number.isNaN(Number(hostValue))
              )
                return Number(hostValue);
              return hostValue;
            }
          }
        }
      } catch {
        // ignore host read failures and fall back to context
      }

      // Fall back to reading from the component context itself.
      const raw = ctx[prop];
      // Treat empty-string on context as boolean true (attribute presence)
      // EXCEPT when the default is false - in that case, empty string means "not set"
      if (typeof def === 'boolean' && raw === '') {
        if (def === false) {
          // For boolean props with default false, empty string means use the default
          return def;
        }
        // For boolean props with default true, empty string means attribute presence = true
        return true;
      }
      // If the context stores a ReactiveState or wrapper, unwrap it here
      // so components using useProps receive the primitive/current value
      // when the source is the component context itself. Host-provided
      // ReactiveState instances are preserved above; this path is only
      // for ctx values and defaults.
      if (isReactiveState(raw)) return (raw as { value: unknown }).value;
      if (
        raw &&
        typeof raw === 'object' &&
        'value' in raw &&
        !(raw instanceof Node)
      )
        return (raw as { value: unknown }).value;
      if (raw != null && raw !== '') {
        if (typeof def === 'boolean' && typeof raw === 'string') {
          return raw === 'true';
        }
        if (
          typeof def === 'number' &&
          typeof raw === 'string' &&
          !Number.isNaN(Number(raw))
        )
          return Number(raw);
        return raw;
      }
      return def;
    },
    has(_target, prop: string) {
      return typeof prop === 'string' && (prop in ctx || prop in defaults);
    },
    ownKeys() {
      return Array.from(
        new Set([...Object.keys(defaults), ...Object.keys(ctx || {})]),
      );
    },
    getOwnPropertyDescriptor() {
      return { configurable: true, enumerable: true } as PropertyDescriptor;
    },
  });

  return result as T;
}

/**
 * Register prop defaults and return a stable props object for use inside render.
 * The returned object reads values from the current component context at render
 * time and falls back to the provided defaults. This keeps prop access stable
 * in production builds and avoids reliance on parsing the render function.
 *
 * Must be called during render. Example:
 * const props = useProps({ modelValue: false });
 */
// (useProps now returns the props object directly)

/**
 * Register a style function that will be called during each render
 * to provide reactive styles for the component
 *
 * @example
 * ```ts
 * import { css } from '@lib/style';
 *
 * component('my-component', () => {
 *   const { theme } = useProps({ theme: 'light' });
 *
 *   useStyle(() => css`
 *     :host {
 *       background: ${theme === 'light' ? 'white' : 'black'};
 *       color: ${theme === 'light' ? 'black' : 'white'};
 *     }
 *   `);
 *
 *   return html`<div>Styled component</div>`;
 * });
 * ```
 */
export function useStyle(callback: () => string): void {
  if (!currentComponentContext) {
    throw new Error('useStyle must be called during component render');
  }

  // During discovery render, skip style computation — no real DOM to style.
  if (_isDiscoveryRenderFn()) return;

  ensureHookCallbacks(currentComponentContext);

  // Execute the callback immediately during render to capture the current style
  // This ensures reactive state is read during the render phase, not during style application
  try {
    const computedStyle = callback();

    // Store the computed style using Object.defineProperty to avoid triggering reactive updates
    Object.defineProperty(currentComponentContext, '_computedStyle', {
      value: computedStyle,
      writable: true,
      enumerable: false,
      configurable: true,
    });
  } catch (error) {
    devWarn('Error in useStyle callback:', error);
    Object.defineProperty(currentComponentContext, '_computedStyle', {
      value: '',
      writable: true,
      enumerable: false,
      configurable: true,
    });
  }
}

// ---------- provide / inject ----------

const PROVIDES_KEY = Symbol.for('@cer/provides');

/**
 * Store a value under a key so that descendant components can retrieve it
 * with `inject()`. Must be called during component render.
 *
 * @example
 * ```ts
 * component('theme-provider', () => {
 *   provide('theme', 'dark');
 *   return html`<slot></slot>`;
 * });
 * ```
 */
export function provide<T>(key: string | symbol, value: T): void {
  if (!currentComponentContext) {
    throw new Error('provide must be called during component render');
  }

  // During discovery render, skip provide — the ephemeral context is discarded.
  if (_isDiscoveryRenderFn()) return;

  const ctx = currentComponentContext as Record<string | symbol, unknown>;
  if (!ctx[PROVIDES_KEY]) {
    Object.defineProperty(ctx, PROVIDES_KEY, {
      value: new Map<string | symbol, unknown>(),
      writable: false,
      enumerable: false,
      configurable: true,
    });
  }
  (ctx[PROVIDES_KEY] as Map<string | symbol, unknown>).set(key, value);
}

/**
 * Retrieve a value provided by an ancestor component. Traverses the shadow
 * DOM tree upward through ShadowRoot host elements looking for the nearest
 * `provide()` call with the matching key. Returns `defaultValue` (or
 * `undefined`) when no provider is found. Must be called during render.
 *
 * @example
 * ```ts
 * component('themed-button', () => {
 *   const theme = inject<string>('theme', 'light');
 *   return html`<button class="btn-${theme}">Click</button>`;
 * });
 * ```
 */
export function inject<T>(
  key: string | symbol,
  defaultValue?: T,
): T | undefined {
  if (!currentComponentContext) {
    throw new Error('inject must be called during component render');
  }

  // During discovery render, the host tree is not yet mounted — return the
  // default value to allow prop detection to continue without DOM traversal.
  if (_isDiscoveryRenderFn()) return defaultValue;

  try {
    const host = (currentComponentContext as { _host?: HTMLElement })._host;
    if (host) {
      let node: Node | null = host.parentNode as Node | null;
      if (!node) node = host.getRootNode() as Node | null;

      while (node) {
        if (node instanceof ShadowRoot) {
          const shadowHost = node.host;
          const hostCtx = (
            shadowHost as unknown as {
              context?: Record<string | symbol, unknown>;
            }
          ).context;
          if (hostCtx) {
            const provides = hostCtx[PROVIDES_KEY] as
              | Map<string | symbol, unknown>
              | undefined;
            if (provides?.has(key)) {
              return provides.get(key) as T;
            }
          }
          const next: Node | null = shadowHost.parentNode as Node | null;
          node = next ?? (shadowHost.getRootNode() as Node | null);
          if (node === document || node === shadowHost) break;
        } else {
          // Also check light-DOM ancestor elements that may be custom components
          // with provides (e.g. a consumer that is a slotted child of a provider).
          if (node instanceof Element) {
            const elCtx = (
              node as unknown as {
                context?: Record<string | symbol, unknown>;
              }
            ).context;
            if (elCtx) {
              const provides = elCtx[PROVIDES_KEY] as
                | Map<string | symbol, unknown>
                | undefined;
              if (provides?.has(key)) {
                return provides.get(key) as T;
              }
            }
          }
          const next: Node | null = (node as Node).parentNode as Node | null;
          node = next ?? ((node as Node).getRootNode?.() as Node | null);
          if (node === document) break;
        }
      }
    }
  } catch {
    // ignore traversal errors - fall through to default
  }

  return defaultValue;
}

// ---------- createComposable ----------

/**
 * Execute a function that calls hooks (useOnConnected, useOnDisconnected, etc.)
 * using an explicit component context rather than requiring the call to happen
 * directly inside a render function. This enables composable utility functions
 * that register lifecycle callbacks from outside the render body.
 *
 * @example
 * ```ts
 * function useLogger(label: string) {
 *   return createComposable(() => {
 *     useOnConnected(() => console.log(`${label} connected`));
 *     useOnDisconnected(() => console.log(`${label} disconnected`));
 *   });
 * }
 *
 * component('my-comp', () => {
 *   const stopLogger = useLogger('my-comp');
 *   stopLogger(context); // pass the component context explicitly
 *   return html`<div>Hello</div>`;
 * });
 * ```
 *
 * More commonly, use it as a direct wrapper inside render:
 * ```ts
 * component('my-comp', () => {
 *   // Accepts context automatically from getCurrentComponentContext()
 *   createComposable(() => {
 *     useOnConnected(() => console.log('connected from composable'));
 *   })();
 *   return html`<div>Hello</div>`;
 * });
 * ```
 */
export function createComposable<T>(
  fn: () => T,
): (ctx?: Record<string, unknown>) => T {
  return (ctx?: Record<string, unknown>) => {
    const targetCtx = ctx ?? currentComponentContext;
    if (!targetCtx) {
      throw new Error(
        'createComposable: no component context available. Pass a context explicitly or call inside a render function.',
      );
    }

    const prev = currentComponentContext;
    setCurrentComponentContext(targetCtx);
    try {
      return fn();
    } finally {
      // Restore the previous context (supports nested composables)
      if (prev) {
        setCurrentComponentContext(prev);
      } else {
        clearCurrentComponentContext();
      }
    }
  };
}

/**
 * Expose a public interface from the current component so that parent
 * components holding a template ref to this element can call its methods
 * or read its properties. Must be called during component render.
 *
 * @example
 * ```ts
 * component('my-counter', () => {
 *   const count = ref(0);
 *   useExpose({ increment: () => count.value++, get count() { return count.value; } });
 *   return html`<div>${count.value}</div>`;
 * });
 *
 * // Parent: counterRef.value.increment()
 * ```
 */
export function useExpose<T extends Record<string, unknown>>(exposed: T): void {
  if (!currentComponentContext) {
    throw new Error('useExpose must be called during component render');
  }

  // During discovery render, skip — no real host to expose properties on
  if (_isDiscoveryRenderFn()) return;

  ensureHookCallbacks(currentComponentContext);
  const hooks = currentComponentContext._hookCallbacks as InternalHookCallbacks;
  hooks.expose = { ...(hooks.expose ?? {}), ...exposed };

  // Apply exposed properties onto the host element immediately if available
  const host = (currentComponentContext as { _host?: HTMLElement })._host;
  if (host) {
    for (const [key, value] of Object.entries(exposed)) {
      try {
        (host as unknown as Record<string, unknown>)[key] = value;
      } catch {
        // ignore non-writable properties
      }
    }
  }
}

/**
 * Access named slots provided to the current component. Returns helpers to
 * check slot presence and retrieve slotted elements. Must be called during
 * component render.
 *
 * @example
 * ```ts
 * component('my-card', () => {
 *   const slots = useSlots();
 *   return html`
 *     <div class="card">
 *       <slot></slot>
 *       ${slots.has('footer') ? html`<footer><slot name="footer"></slot></footer>` : ''}
 *     </div>
 *   `;
 * });
 * ```
 */
export function useSlots(): {
  has(name?: string): boolean;
  getNodes(name?: string): Element[];
  names(): string[];
} {
  if (!currentComponentContext) {
    throw new Error('useSlots must be called during component render');
  }

  // During discovery render, return empty no-op slot object
  if (_isDiscoveryRenderFn()) {
    return { has: () => false, getNodes: () => [], names: () => [] };
  }

  const host = (currentComponentContext as { _host?: HTMLElement })._host;

  return {
    /**
     * Returns true if the named slot (or the default slot when name is
     * omitted) has at least one slotted child element.
     */
    has(name?: string): boolean {
      if (!host) return false;
      if (!name || name === 'default') {
        return Array.from(host.children).some((el) => !el.hasAttribute('slot'));
      }
      return Array.from(host.children).some(
        (el) => el.getAttribute('slot') === name,
      );
    },
    /**
     * Returns all child elements assigned to the named slot (or the default
     * slot when name is omitted).
     */
    getNodes(name?: string): Element[] {
      if (!host) return [];
      if (!name || name === 'default') {
        return Array.from(host.children).filter(
          (el) => !el.hasAttribute('slot'),
        );
      }
      return Array.from(host.children).filter(
        (el) => el.getAttribute('slot') === name,
      );
    },
    /** Returns the names of all slots that have content, including 'default'. */
    names(): string[] {
      if (!host) return [];
      const slotNames = new Set<string>();
      for (const child of Array.from(host.children)) {
        const slotAttr = child.getAttribute('slot');
        slotNames.add(slotAttr ?? 'default');
      }
      return Array.from(slotNames);
    },
  };
}
