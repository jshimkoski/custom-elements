/**
 * Custom Elements Runtime
 * Lightweight, strongly typed, functional custom element runtime for two-way binding, event, and prop support.
 * Supports: reactive props, computed, events, style, render, lifecycle hooks, :model and @event attributes.
 * No external dependencies. Mobile-first, secure, and developer friendly.
 */

// Core functional API
export { component } from "./runtime/component";

// Context-based hooks (React-style)
export { 
  useEmit, 
  useOnConnected, 
  useOnDisconnected, 
  useOnAttributeChanged, 
  useOnError,
  useStyle,
  useProps
} from "./runtime/hooks";

// Reactive system
export { ref, computed, watch } from "./runtime/reactive";

// Template and styling
export { html } from "./runtime/template-compiler";
export { css } from "./runtime/style";

// VDOM utilities
export { renderToString } from "./runtime/vdom";
export type { VNode } from "./runtime/types";

// Feature modules
export * from "./directives";
export * from "./directive-enhancements";
export * from "./event-bus";
export * from "./store";
export * from "./router";
export * from "./transitions";
