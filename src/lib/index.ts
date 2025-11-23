// Core functional API
export { component } from './runtime/component';

// Context-based hooks (React-style)
export {
  useEmit,
  useOnConnected,
  useOnDisconnected,
  useOnAttributeChanged,
  useOnError,
  useStyle,
  useProps,
} from './runtime/hooks';

// Reactive system
export { ref, computed, watch } from './runtime/reactive';

// Template and styling
export { html } from './runtime/template-compiler';
export { css } from './runtime/style';
export { unsafeHTML, decodeEntities } from './runtime/helpers';

// Logger utilities
export { setDevMode } from './runtime/logger';

// Testing utilities
export { flushDOMUpdates } from './runtime/scheduler';
