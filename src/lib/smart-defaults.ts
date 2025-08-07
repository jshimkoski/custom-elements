// Advanced type utilities and smart defaults for the ultimate DX
import type { ReactiveComponentOptions } from './runtime.js';

/**
 * Utility types for better component authoring
 */
export type StateFrom<T> = T extends { state: infer S } ? S : never;
export type EventHandler<TState = any> = (e: Event, state: TState, api: any) => void;
export type StateWatcher<TState, K extends keyof TState> = (
  newValue: TState[K], 
  oldValue: TState[K], 
  state: TState, 
  api: any
) => void;

/**
 * Smart defaults for common component patterns
 */
const componentDefaults = {
  // Common attribute schemas
  attrs: {
    visible: { type: 'boolean' as const, reflect: true },
    disabled: { type: 'boolean' as const, reflect: true },
    variant: { type: 'string' as const, reflect: true },
    size: { type: 'string' as const, reflect: true },
    theme: { type: 'string' as const, reflect: true },
    value: { type: 'string' as const, reflect: true },
    count: { type: 'number' as const, reflect: true },
    data: { type: 'json' as const, reflect: false }
  },

  // Common event handlers
  events: {
    clickToToggle: (prop: string) => ({
      click: (_e: Event, state: any) => {
        state[prop] = !state[prop];
      }
    }),
    
    inputToState: (prop: string) => ({
      input: (e: Event, state: any) => {
        state[prop] = (e.target as HTMLInputElement).value;
      }
    }),

    submitForm: (handler: EventHandler) => ({
      submit: (e: Event, state: any, api: any) => {
        e.preventDefault();
        handler(e, state, api);
      }
    })
  },

  // Common computed properties
  computed: {
    isEmpty: (arrayProp: string) => (state: any) => 
      !state[arrayProp] || state[arrayProp].length === 0,
    
    count: (arrayProp: string) => (state: any) => 
      state[arrayProp] ? state[arrayProp].length : 0,
    
    isValid: (validationFn: (state: any) => boolean) => validationFn
  },

  // Common styles
  styles: {
    resetButton: `
      button {
        background: none;
        border: none;
        padding: 0;
        margin: 0;
        font: inherit;
        cursor: pointer;
      }
    `,
    
    srOnly: `
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    `,

    flexCenter: `
      .flex-center {
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `,

    visuallyHidden: `
      .visually-hidden {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }
    `
  }
};

/**
 * Preset component configurations for common patterns
 */
const componentPresets = {
  // Button component preset
  button: <TState extends { disabled?: boolean; variant?: string }>(
    overrides: Partial<ReactiveComponentOptions<TState>> = {}
  ): Partial<ReactiveComponentOptions<TState>> => ({
    attrs: {
      disabled: componentDefaults.attrs.disabled,
      variant: componentDefaults.attrs.variant,
      ...overrides.attrs
    },
    
    template: overrides.template || ((_state) => `
      <button 
        class="btn btn-\${_state.variant || 'primary'}"
        \${_state.disabled ? 'disabled' : ''}
      >
        <slot></slot>
      </button>
    `),

    style: overrides.style || `
      .btn {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-family: inherit;
        font-size: 1rem;
        transition: all 0.2s ease;
      }
      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .btn-primary {
        background: #007bff;
        color: white;
      }
      .btn-primary:hover:not(:disabled) {
        background: #0056b3;
      }
      .btn-secondary {
        background: #6c757d;
        color: white;
      }
      .btn-secondary:hover:not(:disabled) {
        background: #545b62;
      }
    `,

    ...overrides
  }),

  // Input component preset
  input: <TState extends { value?: string; disabled?: boolean }>(
    overrides: Partial<ReactiveComponentOptions<TState>> = {}
  ): Partial<ReactiveComponentOptions<TState>> => ({
    attrs: {
      value: componentDefaults.attrs.value,
      disabled: componentDefaults.attrs.disabled,
      ...overrides.attrs
    },

    template: overrides.template || ((_state) => `
      <div class="input-wrapper">
        <input 
          type="text"
          value="\${_state.value || ''}"
          \${_state.disabled ? 'disabled' : ''}
          data-ref="input"
        />
      </div>
    `),

    events: {
      '[data-ref="input"]': {
        input: (e, state) => {
          state.value = (e.target as HTMLInputElement).value;
        }
      },
      ...overrides.events
    },

    style: overrides.style || `
      .input-wrapper {
        display: inline-block;
      }
      input {
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-family: inherit;
        font-size: 1rem;
        width: 100%;
        box-sizing: border-box;
      }
      input:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
      }
      input:disabled {
        background: #f8f9fa;
        opacity: 0.6;
        cursor: not-allowed;
      }
    `,

    ...overrides
  }),

  // Modal component preset
  modal: <TState extends { open?: boolean }>(
    overrides: Partial<ReactiveComponentOptions<TState>> = {}
  ): Partial<ReactiveComponentOptions<TState>> => ({
    attrs: {
      open: componentDefaults.attrs.visible,
      ...overrides.attrs
    },

    template: overrides.template || ((_state) => `
      <div class="modal-backdrop \${_state.open ? 'active' : ''}" data-ref="backdrop">
        <div class="modal-content" role="dialog" aria-modal="true">
          <div class="modal-header">
            <slot name="header"></slot>
            <button class="modal-close" data-ref="close" aria-label="Close modal">×</button>
          </div>
          <div class="modal-body">
            <slot></slot>
          </div>
          <div class="modal-footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    `),

    events: {
      '[data-ref="close"]': {
        click: (_e, state) => { state.open = false; }
      },
      '[data-ref="backdrop"]': {
        click: (e, state) => {
          if (e.target === e.currentTarget) {
            state.open = false;
          }
        }
      },
      ...overrides.events
    },

    style: overrides.style || `
      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        z-index: 1000;
      }
      .modal-backdrop.active {
        opacity: 1;
        visibility: visible;
      }
      .modal-content {
        background: white;
        border-radius: 8px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        max-width: 90vw;
        max-height: 90vh;
        overflow: auto;
        transform: scale(0.9);
        transition: transform 0.3s ease;
      }
      .modal-backdrop.active .modal-content {
        transform: scale(1);
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid #eee;
      }
      .modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #999;
        line-height: 1;
        padding: 0;
        width: 2rem;
        height: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .modal-close:hover {
        color: #333;
      }
      .modal-body {
        padding: 1rem;
      }
      .modal-footer {
        padding: 1rem;
        border-top: 1px solid #eee;
      }
    `,

    ...overrides
  })
};

/**
 * Utility functions for common patterns
 */
const componentUtils = {
  // Generate unique IDs
  id: () => Math.random().toString(36).substr(2, 9),
  
  // Debounce function
  debounce: <T extends (...args: any[]) => any>(
    fn: T, 
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: number;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => fn(...args), delay);
    };
  },

  // Throttle function
  throttle: <T extends (...args: any[]) => any>(
    fn: T, 
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        fn(...args);
      }
    };
  },

  // Create a simple state store
  createStore: <T extends object>(initialState: T) => {
    let state = { ...initialState };
    const listeners = new Set<(state: T) => void>();

    return {
      get state() { return state; },
      
      setState(updates: Partial<T>) {
        state = { ...state, ...updates };
        listeners.forEach(listener => listener(state));
      },

      subscribe(listener: (state: T) => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }
    };
  },

  // Format currency
  currency: (amount: number, currency = 'USD') => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency 
    }).format(amount),

  // Format date
  date: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', options).format(new Date(date)),

  // Format relative time
  relativeTime: (date: Date | string | number) => {
    const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });
    const diff = Date.now() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return rtf.format(-days, 'day');
    if (hours > 0) return rtf.format(-hours, 'hour');
    if (minutes > 0) return rtf.format(-minutes, 'minute');
    return rtf.format(-seconds, 'second');
  }
};

export { componentDefaults as defaults, componentPresets as presets, componentUtils as utils };
