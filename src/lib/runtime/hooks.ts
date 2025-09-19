/**
 * Context-based hooks for functional components
 * Provides React-like hooks with perfect TypeScript inference
 */

// Global state to track current component context during render
let currentComponentContext: any = null;

/**
 * Set the current component context (called internally during render)
 * @internal
 */
export function setCurrentComponentContext(context: any): void {
  currentComponentContext = context;
}

/**
 * Clear the current component context (called internally after render)
 * @internal  
 */
export function clearCurrentComponentContext(): void {
  currentComponentContext = null;
}

/**
 * Get the emit function for the current component
 * Must be called during component render
 * 
 * @example
 * ```ts
 * component('my-button', ({ label = 'Click me' }) => {
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
export function useEmit(): (eventName: string, detail?: any) => boolean {
  if (!currentComponentContext) {
    throw new Error('useEmit must be called during component render');
  }
  
  // Capture the emit function from the current context
  const emitFn = currentComponentContext.emit;
  return (eventName: string, detail?: any) => {
    return emitFn(eventName, detail);
  };
}

/**
 * Initialize hook callbacks storage on context if not exists
 * Uses Object.defineProperty to avoid triggering reactive updates
 */
function ensureHookCallbacks(context: any): void {
  if (!context._hookCallbacks) {
    Object.defineProperty(context, '_hookCallbacks', {
      value: {},
      writable: true,
      enumerable: false,
      configurable: false
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
  
  ensureHookCallbacks(currentComponentContext);
  currentComponentContext._hookCallbacks.onConnected = callback;
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
  
  ensureHookCallbacks(currentComponentContext);
  currentComponentContext._hookCallbacks.onDisconnected = callback;
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
  callback: (name: string, oldValue: string | null, newValue: string | null) => void
): void {
  if (!currentComponentContext) {
    throw new Error('useOnAttributeChanged must be called during component render');
  }
  
  ensureHookCallbacks(currentComponentContext);
  currentComponentContext._hookCallbacks.onAttributeChanged = callback;
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
  
  ensureHookCallbacks(currentComponentContext);
  currentComponentContext._hookCallbacks.onError = callback;
}

/**
 * Register a style function that will be called during each render
 * to provide reactive styles for the component
 * 
 * @example
 * ```ts
 * import { css } from '@lib/style';
 * 
 * component('my-component', ({ theme = 'light' }) => {
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
      configurable: true
    });
  } catch (error) {
    console.warn('Error in useStyle callback:', error);
    Object.defineProperty(currentComponentContext, '_computedStyle', {
      value: '',
      writable: true,
      enumerable: false,
      configurable: true
    });
  }
}