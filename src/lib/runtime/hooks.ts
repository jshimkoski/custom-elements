/**
 * Context-based hooks for functional components
 * Provides React-like hooks with perfect TypeScript inference
 */

import { isReactiveState, ReactiveState, reactiveSystem } from './reactive';
import { toKebab } from './helpers';
import { devWarn, devError } from './logger';
import { isDiscoveryRender as _isDiscoveryRenderFn } from './discovery-state';
import { sanitizeCSS, minifyCSS } from './css-utils';
import type { JITCSSOptions } from './style';
import { captureGlobalStyleForSSR } from './ssr-context';

// Re-export JITCSSOptions as a type-only re-export so consumers can still
// import it from './runtime/hooks' without creating a runtime dependency on style.ts.
export type { JITCSSOptions };

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

/** Symbol key used to store provides map on a component's context object. */
const PROVIDES_KEY = Symbol('cer:provides');

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
      configurable: true,
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
  // Wrap to normalize to Error. If the user's handler itself throws, log it in
  // dev mode so it doesn't vanish silently — the original error is already handled.
  hooks.onError.push((err: unknown) => {
    try {
      if (err instanceof Error) callback(err);
      else callback(new Error(String(err)));
    } catch (handlerErr) {
      devError(
        '[useOnError] The error handler itself threw an exception:',
        handlerErr,
      );
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
const usePropsStateKey = Symbol.for('@cer/usePropsState');

function getUsePropsStateMap(
  context: Record<string, unknown>,
): Map<string, ReactiveState<unknown>> {
  const typedContext = context as unknown as Record<
    typeof usePropsStateKey,
    Map<string, ReactiveState<unknown>>
  >;
  let map = typedContext[usePropsStateKey] as
    | Map<string, ReactiveState<unknown>>
    | undefined;
  if (!map) {
    map = new Map();
    Object.defineProperty(context, usePropsStateKey, {
      value: map,
      writable: false,
      enumerable: false,
      configurable: false,
    });
  }
  return map;
}

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
                    !(typeof Node !== 'undefined' && fromHost instanceof Node)
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

      const propStateMap = getUsePropsStateMap(ctx);
      let state = propStateMap.get(prop);
      let currentValue: unknown;

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
            (typeof HTMLElement !== 'undefined' &&
              host instanceof HTMLElement) ||
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
              if (typeof def === 'boolean') {
                currentValue = attrValue === '' || attrValue === 'true';
              } else if (typeof def === 'number') {
                currentValue = Number(attrValue);
              } else {
                currentValue = attrValue;
              }
            }
          }

          // No attribute - check property value
          if (currentValue === undefined) {
            const hostValue = (host as unknown as Record<string, unknown>)[
              prop
            ];
            if (typeof hostValue !== 'undefined' && hostValue !== '') {
              const isWrapperLike =
                hostValue &&
                typeof hostValue === 'object' &&
                'value' in hostValue &&
                !(typeof Node !== 'undefined' && hostValue instanceof Node);
              if (
                !(
                  typeof def === 'string' &&
                  hostValue &&
                  typeof hostValue === 'object' &&
                  !isWrapperLike &&
                  !isReactiveState(hostValue)
                )
              ) {
                if (
                  typeof def === 'boolean' &&
                  def === false &&
                  hostValue === ''
                ) {
                  currentValue = def;
                } else if (isReactiveState(hostValue)) {
                  currentValue = (hostValue as { value: unknown }).value;
                } else if (isWrapperLike) {
                  currentValue = (hostValue as { value: unknown }).value;
                } else if (
                  typeof def === 'boolean' &&
                  typeof hostValue === 'string'
                ) {
                  currentValue = hostValue === '' || hostValue === 'true';
                } else if (
                  typeof def === 'number' &&
                  typeof hostValue === 'string' &&
                  !Number.isNaN(Number(hostValue))
                ) {
                  currentValue = Number(hostValue);
                } else {
                  currentValue = hostValue;
                }
              }
            }
          }
        }
      } catch {
        // ignore host read failures and fall back to context
      }

      // Fall back to reading from the component context itself.
      if (currentValue === undefined) {
        const raw = ctx[prop];

        if (typeof def === 'boolean' && raw === '') {
          currentValue = def === false ? def : true;
        } else if (isReactiveState(raw)) {
          currentValue = (raw as { value: unknown }).value;
        } else if (
          raw &&
          typeof raw === 'object' &&
          'value' in raw &&
          !(typeof Node !== 'undefined' && raw instanceof Node)
        ) {
          currentValue = (raw as { value: unknown }).value;
        } else if (raw != null && raw !== '') {
          if (typeof def === 'boolean' && typeof raw === 'string') {
            currentValue = raw === 'true';
          } else if (
            typeof def === 'number' &&
            typeof raw === 'string' &&
            !Number.isNaN(Number(raw))
          ) {
            currentValue = Number(raw);
          } else {
            currentValue = raw;
          }
        } else {
          currentValue = def;
        }
      }

      if (!state) {
        state = new ReactiveState(currentValue);
        propStateMap.set(prop, state);
      } else if (!Object.is(state.peek(), currentValue)) {
        if (reactiveSystem.isRenderingComponent()) {
          state.initSilent(currentValue);
        } else {
          state.value = currentValue;
        }
      }

      return state.value;
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

/**
 * Cache of globally-injected stylesheets keyed by their CSS content.
 * Prevents duplicate `<style>` injections when the same `useGlobalStyle()`
 * factory runs across multiple component instances.
 */
const _globalStyleSheets = new Map<string, CSSStyleSheet>();

/**
 * Inject CSS into `document.adoptedStyleSheets`, escaping the Shadow DOM
 * boundary. Suitable for `@font-face` declarations, `:root` variable overrides,
 * and global scroll/scroll-bar styling. Deduplicated by CSS content so calling
 * this in multiple component instances is safe.
 *
 * **Use sparingly** — this intentionally breaks Shadow DOM encapsulation.
 * A dev-mode warning is emitted to make the escape hatch visible.
 *
 * @example
 * ```ts
 * component('app-root', () => {
 *   useGlobalStyle(() => css`
 *     @font-face {
 *       font-family: 'Inter';
 *       src: url('/fonts/inter.woff2') format('woff2');
 *     }
 *     :root {
 *       --app-font: 'Inter', sans-serif;
 *     }
 *   `);
 *   return html`<slot></slot>`;
 * });
 * ```
 */
export function useGlobalStyle(styleFactory: () => string): void {
  let raw: string;
  try {
    raw = styleFactory();
  } catch {
    return;
  }

  // SSR collection pass: when an active collector exists (set up by
  // beginSSRGlobalStyleCollection in ssr.ts), capture here and skip DOM
  // injection regardless of whether document is available. This correctly
  // handles both Node.js SSR (no document) and test environments (document
  // present via happy-dom/jsdom) that call renderToStringWithJITCSS.
  if (captureGlobalStyleForSSR(raw)) return;

  if (typeof document === 'undefined' || typeof CSSStyleSheet === 'undefined') {
    // SSR without an active collector — nothing to do.
    return;
  }
  devWarn(
    '[useGlobalStyle] Injecting global styles from a component. ' +
      'This escapes Shadow DOM encapsulation — use sparingly.',
  );
  const style = minifyCSS(sanitizeCSS(raw!));
  if (!style || _globalStyleSheets.has(style)) return;
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(style);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    _globalStyleSheets.set(style, sheet);
  } catch {
    // Fallback: inject a <style> element in <head>
    const el = document.createElement('style');
    el.textContent = style;
    (document.head ?? document.documentElement).appendChild(el);
  }
}

/**
 * Design token definitions accepted by `useDesignTokens()`.
 * Map high-level token names to CSS custom property overrides.
 */
export interface DesignTokens {
  /** Override the primary color scale root (sets --cer-color-primary-500) */
  primary?: string;
  /** Override the secondary color scale root */
  secondary?: string;
  /** Override the neutral color scale root */
  neutral?: string;
  /** Override the success color root */
  success?: string;
  /** Override the info color root */
  info?: string;
  /** Override the warning color root */
  warning?: string;
  /** Override the error color root */
  error?: string;
  /** Override the sans-serif font family */
  fontSans?: string;
  /** Override the serif font family */
  fontSerif?: string;
  /** Override the monospace font family */
  fontMono?: string;
  /** Additional arbitrary CSS custom property overrides */
  [key: string]: string | undefined;
}

/**
 * Apply design tokens to `:host` as CSS custom property overrides.
 * Must be called during component render. This is a typed, validated
 * alternative to writing `useStyle(() => css\`:host { ... }\`)` by hand.
 *
 * Semantic color tokens (e.g. `primary: '#6366f1'`) set the `*-500` shade
 * for that scale. Use arbitrary `'--cer-color-primary-500'` keys to override
 * individual shades.
 *
 * @example
 * ```ts
 * component('app-root', () => {
 *   useDesignTokens({
 *     primary: '#6366f1',
 *     fontSans: '"Inter", sans-serif',
 *     '--cer-color-neutral-900': '#0a0a0a',
 *   });
 *   return html`<slot></slot>`;
 * });
 * ```
 */
export function useDesignTokens(tokens: DesignTokens): void {
  if (!currentComponentContext) {
    throw new Error('useDesignTokens must be called during component render');
  }

  if (_isDiscoveryRenderFn()) return;

  const declarations: string[] = [];
  const semanticColorMap: Record<string, string> = {
    primary: '--cer-color-primary-500',
    secondary: '--cer-color-secondary-500',
    neutral: '--cer-color-neutral-500',
    success: '--cer-color-success-500',
    info: '--cer-color-info-500',
    warning: '--cer-color-warning-500',
    error: '--cer-color-error-500',
  };
  const fontMap: Record<string, string> = {
    fontSans: '--cer-font-sans',
    fontSerif: '--cer-font-serif',
    fontMono: '--cer-font-mono',
  };

  for (const [key, value] of Object.entries(tokens)) {
    if (value === undefined) continue;
    if (key in semanticColorMap) {
      declarations.push(`${semanticColorMap[key]}:${value}`);
    } else if (key in fontMap) {
      declarations.push(`${fontMap[key]}:${value}`);
    } else if (key.startsWith('--')) {
      declarations.push(`${key}:${value}`);
    }
  }

  if (declarations.length === 0) return;

  const cssText = `:host{${declarations.join(';')}}`;

  // Append to any existing computed style
  const ctx = currentComponentContext as { _computedStyle?: string };
  const existing = ctx._computedStyle ?? '';
  const combined = existing ? `${existing}\n${cssText}` : cssText;

  Object.defineProperty(currentComponentContext, '_computedStyle', {
    value: combined,
    writable: true,
    enumerable: false,
    configurable: true,
  });
}

// ---------- provide / inject ----------

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

      // Depth counter prevents infinite loops in detached subtrees where
      // getRootNode() may return a subtree root instead of `document`.
      let depth = 0;
      const MAX_DEPTH = 50;

      while (node && depth < MAX_DEPTH) {
        depth++;
        if (typeof ShadowRoot !== 'undefined' && node instanceof ShadowRoot) {
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
          if (typeof Element !== 'undefined' && node instanceof Element) {
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
          const prevNode = node;
          const next: Node | null = (node as Node).parentNode as Node | null;
          node = next ?? ((node as Node).getRootNode?.() as Node | null);
          // Guard against infinite loops: if getRootNode() returns the same
          // node (disconnected element with no ancestors), stop traversal.
          if (node === document || node === prevNode) break;
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

  // Single-pass collection: group children by slot name once, reuse for all methods.
  const getSlotMap = (): Map<string, Element[]> => {
    const map = new Map<string, Element[]>();
    if (!host) return map;
    for (const child of host.children) {
      const key = child.getAttribute('slot') ?? 'default';
      const bucket = map.get(key);
      if (bucket) {
        bucket.push(child);
      } else {
        map.set(key, [child]);
      }
    }
    return map;
  };

  return {
    /**
     * Returns true if the named slot (or the default slot when name is
     * omitted) has at least one slotted child element.
     */
    has(name?: string): boolean {
      if (!host) return false;
      const slotName = !name || name === 'default' ? 'default' : name;
      const bucket = getSlotMap().get(slotName);
      return bucket !== undefined && bucket.length > 0;
    },
    /**
     * Returns all child elements assigned to the named slot (or the default
     * slot when name is omitted).
     */
    getNodes(name?: string): Element[] {
      if (!host) return [];
      const slotName = !name || name === 'default' ? 'default' : name;
      return getSlotMap().get(slotName) ?? [];
    },
    /** Returns the names of all slots that have content, including 'default'. */
    names(): string[] {
      if (!host) return [];
      return Array.from(getSlotMap().keys());
    },
  };
}

/**
 * A writable ref that reads from a component prop and emits `update:<propName>`
 * when its value is set, enabling two-way binding with a parent's `:model` or
 * `:model:<propName>` directive.
 *
 * Also recognised by the vdom `:model` directive as a reactive value so it can
 * be passed directly to native inputs inside the child template.
 */
export interface ModelRef<T> {
  /** The current prop value. Reactive — reads trigger re-renders. */
  value: T;
}

/**
 * Define a two-way binding model for a component prop, similar to Vue's
 * `defineModel()`. It combines `useProps` + `useEmit` into a single ergonomic
 * API so child components don't need to wire the plumbing manually.
 *
 * The returned `ModelRef` object:
 * - **reads** `.value` → returns the current prop value (reactive)
 * - **writes** `.value = x` → emits `update:<propName>` so the parent's
 *   `:model` / `:model:<propName>` directive can update its reactive state
 *
 * The object is also recognised by the vdom `:model` directive, so you can
 * pass it directly to a native input's `:model` binding inside the child
 * template and the two-way sync is wired up automatically.
 *
 * @example
 * ```ts
 * // Default model — maps to the parent's :model="..."
 * component('my-input', () => {
 *   const model = defineModel('');
 *
 *   return html`
 *     <input :model="${model}" />
 *   `;
 * });
 *
 * // Named model — maps to the parent's :model:title="..."
 * component('my-field', () => {
 *   const title = defineModel('title', '');
 *   const count = defineModel('count', 0);
 *
 *   return html`
 *     <input :model="${title}" />
 *     <input type="number" :model="${count}" />
 *   `;
 * });
 * ```
 *
 * @param args - Either:
 *   - No arguments → `modelValue` prop, no default.
 *   - One argument → treated as the **default value** for the `modelValue` prop;
 *     type is inferred from the value.
 *   - Two arguments → first is the **prop name**, second is the **default value**;
 *     type is inferred from the default value.
 */
export function defineModel<T = unknown>(): ModelRef<T | undefined>;
export function defineModel<T>(defaultValue: T): ModelRef<T>;
export function defineModel<T>(propName: string, defaultValue: T): ModelRef<T>;
export function defineModel<T = unknown>(
  ...args: [] | [T] | [string, T]
): ModelRef<T | undefined> {
  if (!currentComponentContext) {
    throw new Error('defineModel must be called during component render');
  }

  const propName = args.length === 2 ? (args[0] as string) : 'modelValue';
  const initialDefault =
    args.length === 2
      ? (args[1] as T)
      : args.length === 1
        ? (args[0] as T)
        : undefined;

  // Register the prop so the runtime discovers it during the discovery render
  // and includes it in the component's observed attributes / prop definitions.
  const props = useProps({
    [propName]: initialDefault,
  } as Record<string, unknown>);

  // Capture the emit function once — during a discovery render this is a no-op.
  const isDiscovery = _isDiscoveryRenderFn();
  const emitFn = isDiscovery
    ? null
    : (() => {
        const candidate = (currentComponentContext as { emit?: unknown }).emit;
        if (typeof candidate !== 'function') return null;
        return candidate as (
          eventName: string,
          detail?: unknown,
          options?: CustomEventInit,
        ) => boolean;
      })();

  // The model ref is marked with the ReactiveState symbol so that
  // processModelDirective treats it as a reactive value and wires up
  // `:model` on native inputs inside the child template correctly.
  const modelRef: ModelRef<T> = {
    get value(): T {
      return props[propName] as T;
    },
    set value(newValue: T) {
      if (emitFn) {
        emitFn(`update:${propName}`, newValue);
      }
    },
  };

  try {
    const key = Symbol.for('@cer/ReactiveState');
    Object.defineProperty(modelRef, key, {
      value: true,
      enumerable: false,
      configurable: false,
    });
  } catch {
    // ignore exotic runtimes
  }

  return modelRef;
}
