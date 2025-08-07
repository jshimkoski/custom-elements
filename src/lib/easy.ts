import { createReactiveComponent } from './runtime.js';
import type { ReactiveComponentOptions } from './runtime.js';
import { html, css, classes, styles, ref, on } from './template-helpers.js';

// Export template helpers for easy access
export { html, css, classes, styles, ref, on };

/**
 * Simplified component creation with smart defaults and type inference
 */
export function component<TState extends object>(tag: string) {
  return function(options: Omit<ReactiveComponentOptions<TState>, 'tag'>) {
    return createReactiveComponent({
      tag,
      ...options,
    });
  };
}

/**
 * Even simpler component creation with automatic tag generation
 */
export function autoComponent<TState extends object>(
  name: string,
  options: Omit<ReactiveComponentOptions<TState>, 'tag'>
) {
  // Convert camelCase to kebab-case
  const tag = name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
  
  return createReactiveComponent({
    tag,
    ...options,
  });
}

/**
 * Create a component with chaining API
 */
export class ComponentBuilder<TState extends object = {}> {
  private _tag: string;
  private _state?: TState;
  private _template?: ReactiveComponentOptions<TState>['template'];
  private _style?: ReactiveComponentOptions<TState>['style'];
  private _options: Partial<ReactiveComponentOptions<TState>> = {};

  constructor(tag: string) {
    this._tag = tag;
  }

  state<T extends object>(state: T): ComponentBuilder<T> {
    return Object.assign(new ComponentBuilder<T>(this._tag), this, { _state: state });
  }

  template(template: ReactiveComponentOptions<TState>['template']): ComponentBuilder<TState> {
    this._template = template;
    return this;
  }

  style(style: ReactiveComponentOptions<TState>['style']): ComponentBuilder<TState> {
    this._style = style;
    return this;
  }

  events(events: ReactiveComponentOptions<TState>['events']): ComponentBuilder<TState> {
    this._options.events = events;
    return this;
  }

  attrs(attrs: ReactiveComponentOptions<TState>['attrs']): ComponentBuilder<TState> {
    this._options.attrs = attrs;
    return this;
  }

  hooks(hooks: ReactiveComponentOptions<TState>['hooks']): ComponentBuilder<TState> {
    this._options.hooks = hooks;
    return this;
  }

  computed(computed: ReactiveComponentOptions<TState>['computed']): ComponentBuilder<TState> {
    this._options.computed = computed;
    return this;
  }

  build() {
    if (!this._state || !this._template) {
      throw new Error('State and template are required');
    }
    
    return createReactiveComponent({
      tag: this._tag,
      state: this._state,
      template: this._template,
      style: this._style,
      ...this._options,
    });
  }
}

/**
 * Create a component with fluent API
 */
export function define(tag: string): ComponentBuilder {
  return new ComponentBuilder(tag);
}

/**
 * Utility type for better state inference
 */
export type StateOf<T> = T extends { state: infer S } ? S : never;

/**
 * Create reactive state outside of components
 */
export function state<T extends object>(initialState: T): T {
  return new Proxy(initialState, {
    set(target, prop, value) {
      target[prop as keyof T] = value;
      // Emit global state change event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('state-change', {
          detail: { prop, value, state: target }
        }));
      }
      return true;
    }
  });
}

/**
 * Connect external state to components
 */
export function connect<T extends object>(
  externalState: T,
  selector?: (state: T) => Partial<T>
) {
  return function<TState extends object>(
    componentOptions: ReactiveComponentOptions<TState>
  ): ReactiveComponentOptions<TState> {
    const originalHooks = componentOptions.hooks || {};
    
    return {
      ...componentOptions,
      hooks: {
        ...originalHooks,
        onMounted(state, api) {
          // Connect external state changes to component
          const handler = (e: CustomEvent) => {
            const { prop, value } = e.detail;
            const selected = selector ? selector(externalState) : externalState;
            if (prop in selected) {
              (state as any)[prop] = value;
            }
          };
          
          window.addEventListener('state-change', handler as EventListener);
          
          // Initial sync
          const selected = selector ? selector(externalState) : externalState;
          Object.assign(state, selected);
          
          originalHooks.onMounted?.(state, api);
        },
        onUnmounted(state, api) {
          // Clean up listeners
          originalHooks.onUnmounted?.(state, api);
        }
      }
    };
  };
}
