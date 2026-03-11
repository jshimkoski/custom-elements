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
  // Two-way model binding (Vue-style defineModel)
  defineModel,
  // Context / provide-inject (Priority 2)
  provide,
  inject,
  // Composable hooks outside render (Priority 2)
  createComposable,
  // Expose component API to parent template refs (Priority 1)
  useExpose,
  // Access named slots in the component (Priority 1)
  useSlots,
  // Internal: for advanced consumers and library authors
  getCurrentComponentContext,
} from './runtime/hooks';
export type { ModelRef } from './runtime/hooks';

// Reactive system
export {
  ref,
  computed,
  watch,
  // watchEffect: auto-tracks reactive reads and re-runs on change (Priority 2)
  watchEffect,
  // Type guard: check if a value is a reactive state object
  isReactiveState,
} from './runtime/reactive';
export { ReactiveState } from './runtime/reactive';

// Template and styling
export { html } from './runtime/template-compiler';
export { css } from './runtime/style';
export { unsafeHTML, decodeEntities } from './runtime/helpers';

// Virtual DOM types
export type { VNode } from './runtime/types';

// Logger utilities
export { setDevMode, devLog } from './runtime/logger';

// Testing utilities
export {
  flushDOMUpdates,
  nextTick,
  scheduleWithPriority,
} from './runtime/scheduler';
export type { UpdatePriority } from './runtime/scheduler';

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

// Built-in components: <cer-suspense> and <cer-error-boundary>
export {
  registerSuspense,
  registerErrorBoundary,
  registerBuiltinComponents,
} from './runtime/builtin-components';
export { useTeleport } from './teleport';

// KeepAlive (Priority 3)
export { registerKeepAlive } from './keep-alive';
