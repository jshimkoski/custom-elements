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
  // Context / provide-inject (Priority 2)
  provide,
  inject,
  // Composable hooks outside render (Priority 2)
  createComposable,
  // Internal: for advanced consumers and library authors
  getCurrentComponentContext,
} from './runtime/hooks';

// Reactive system
export {
  ref,
  computed,
  watch,
  // watchEffect: auto-tracks reactive reads and re-runs on change (Priority 2)
  watchEffect,
} from './runtime/reactive';

// Template and styling
export { html } from './runtime/template-compiler';
export { css } from './runtime/style';
export { unsafeHTML, decodeEntities } from './runtime/helpers';

// Logger utilities
export { setDevMode, devLog } from './runtime/logger';

// Testing utilities
export { flushDOMUpdates, nextTick } from './runtime/scheduler';

// Health monitoring
export type {
  HealthMonitorInstance,
  HealthReport,
} from './runtime/monitoring/health-monitor';
export {
  createHealthMonitor,
  getHealthMonitor,
  getHealthStatus,
  updateHealthMetric,
} from './runtime/monitoring/health-monitor';

// Teleport (Priority 3)
export type { TeleportHandle } from './teleport';
export { useTeleport } from './teleport';

// KeepAlive (Priority 3)
export { registerKeepAlive } from './keep-alive';
