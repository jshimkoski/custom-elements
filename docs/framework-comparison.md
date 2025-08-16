# 🎯 Framework Comparison

| Feature                | Custom Elements Runtime | React   | Vue     | Angular | Svelte  | Lit     |
|------------------------|------------------------|---------|---------|---------|---------|---------|
| **SSR**                | Built-in, universal    | Yes     | Yes     | Yes     | Yes     | Yes     |
| **TypeScript**         | Strict, enforced       | Optional| Optional| Strict  | Optional| Strict  |
| **State Mgmt**         | Direct assignment, Store, Event Bus | Redux   | Pinia   | RxJS    | Store   | Manual  |
| **Routing**            | Built-in, declarative, SSR/static compatible | React Router | Vue Router | Angular Router | SvelteKit| Manual  |
| **HMR**                | Vite/ESM only          | Yes     | Yes     | Yes     | Yes     | Yes     |
| **Error Boundaries**   | Built-in               | Yes     | Yes     | Yes     | Yes     | Manual  |
| **Event Binding**      | Declarative, type-safe | JSX     | v-on    | (ng)    | on:     | @event  |
| **Reactivity**         | Proxy, computed, VDOM  | setState| Proxy   | Zone.js | Compiler| LitElement|
| **Dependencies**       | None                   | Many    | Some    | Many    | None    | None    |
| **SSR Hydration**      | Opt-in, template match | Yes     | Yes     | Yes     | Yes     | Yes     |
| **Tree-shaking**       | Full                   | Partial | Partial | Partial | Yes     | Yes     |
| **Custom Elements**    | Native, true web standard | No      | No      | No      | No      | Yes     |
| **DevTools**           | Basic                  | Advanced| Advanced| Advanced| Basic   | Basic   |
| **Plugin System**      | Built-in, strictly typed| Libraries| Libraries| Libraries| Libraries| Manual  |
| **Global Store/Event Bus** | Built-in           | Libraries| Libraries| Libraries| Built-in| Manual  |
| **Template Helpers**   | html, compile, css, classes, styles | JSX     | SFC     | Templates| Svelte  | Lit-html|
| **Build Tools**        | Vite/Webpack/Rollup    | Yes     | Yes     | Yes     | Yes     | Yes     |

## Strengths

- Minimal bundle size (~13.4KB, Gzipped), zero dependencies
- Strict TypeScript, functional API, and modular exports
- Built-in SSR, opt-in and selective hydration, error boundaries, plugin system
- Declarative, SSR/static-compatible router with `<router-view>` and programmatic navigation
- Strict plugin system with lifecycle, render, and error hooks
- Global store and event bus for cross-component state and communication
- Computed properties, refs, lifecycle hooks, and fine-grained VDOM
- Declarative, type-safe, attribute-based event binding with automatic cleanup
- Native custom elements with full lifecycle, attribute reflection, and controlled input sync
- Fully tree-shakable and regression-tested
- Deep object sanitization for security

## Tradeoffs

- Smaller ecosystem, fewer integrations
- Functional state management, no class-based API
- Minimal devtools
- SSR excludes refs/events/lifecycle
- Functional, modular API: No classes, no boilerplate

## What's Truly Unique

- **Native custom elements by default:** True web standard, interoperable with any framework (unlike React, Vue, Angular, Svelte; only Lit shares this).
- **Declarative event binding via attributes:** Uses `data-on-*` for type-safe, attribute-based event binding with automatic cleanup—rare outside this runtime.
- **SSR/static site generation:** With route matching and pre-rendering.
- **Plugin hooks:** For lifecycle, render, and error boundaries.
- **Attribute reflection and controlled input sync for custom elements.**
- **Zero dependencies with full feature set:** No external libraries required for SSR, hydration, plugin system, error boundaries, global store/event bus, computed, refs, lifecycle hooks, VDOM, and edge-case handling.
- **Functional, modular API:** No classes, no boilerplate, everything is strictly typed and regression-tested.

While some features exist in other frameworks, the combination of native custom elements, declarative attribute-based event binding, zero dependencies, and a strictly-typed, modular API is unique to Custom Elements Runtime.

## Summary

Custom Elements Runtime is ideal for modern, lightweight, standards-based web components and micro-frontends. Major frameworks excel in large-scale, feature-rich applications.