# 🧩 Component Functionality Deep Dive

## 🚀 Overview

The `component` function is the entry point for defining custom elements using the runtime. It registers your component, sets up its config, and ensures it is reactive, secure, and developer-friendly. Components are lightweight, functional, and support all major features: state, props, computed, style, render, lifecycle hooks, error handling, and more.

## 🏷️ Tag Naming & Normalization

Custom element tags must follow web standards:

- **Kebab-case required:** Tags must contain at least one dash (e.g., `my-widget`) — hyphenated (kebab-case) tags are treated as custom elements.
- **Automatic normalization:**
  - The runtime converts any tag to kebab-case.
  - If you use a single word (e.g., `profile`), it is normalized to `cer-profile`.
  - This ensures all tags are valid and avoids conflicts with native elements.

**Examples:**
```typescript
component('profile', { ... }); // becomes 'cer-profile'
component('userCard', { ... }); // becomes 'user-card'
component('my-widget', { ... }); // stays 'my-widget'
```

**Tip:** Always use descriptive, kebab-case tags for clarity and standards compliance.

## 🛠️ Defining a Component

- Use the `component` function to register a new custom element.
- Provide a tag name (kebab-case) and a config object (or a render function).
- The config object supports all runtime features.

```typescript
component('my-element', {
  state: { count: 0 },
  props: { label: { type: String, default: 'Click me' } },
  computed: {
    doubled: (ctx) => ctx.count * 2,
  },
  render: (ctx) => html`
    <button @click="${() => ctx.count++}">
      ${ctx.label}: ${ctx.doubled}
    </button>
  `,
});
```

## 🧩 Config Object Structure

- `state`: Initial reactive state.
- `props`: Strongly typed, defaulted props from attributes.
- `computed`: Derived reactive values.
- `watch`: Watchers for state/props/computed changes.
- `style`: Static or dynamic CSS (string or function).
- `render`: Required function to generate UI.
- `loadingTemplate`: Shown during async render.
- `errorTemplate`: Shown on render error.
- `onConnected`, `onDisconnected`, `onAttributeChanged`: Lifecycle hooks.
- `onError`, `errorFallback`: Error handling hooks.
- Custom methods: Any additional functions (auto-injected into state).

### Events

The runtime uses a DOM-first events API. Components should emit DOM CustomEvents
via `context.emit` (events typically use `bubbles: true` and `composed: true`).

- Framework users: listen using your framework's normal event binding (`@event` in
  Vue, `on:event` in Svelte, `(event)` in Angular).
- Programmatic handlers: if you need to attach handlers to capture closures or
  perform custom wiring, use refs and add DOM listeners directly to the element
  instance.

See [Events Deep Dive](./events-deep-dive.md) for recommended event emission
options and integration tips.

## 🧪 Example: Full Component Usage

```typescript
component('profile-card', {
  state: { name: 'Sam', age: 25 },
  props: { theme: { type: String, default: 'light' } },
  computed: {
    greeting: (ctx) => `Hello, ${ctx.name}!`,
  },
  style: (ctx) => `:host { color: ${ctx.theme === 'dark' ? 'white' : 'black'}; }`,
  render: (ctx) => html`
    <div>
      <h2>${ctx.greeting}</h2>
      <p>Age: ${ctx.age}</p>
    </div>
  `,
  onConnected: (ctx) => {
    console.log('Profile card connected!', ctx);
  },
  onError: (err, ctx) => {
    console.error('Error in profile card:', err);
  },
});
```

## 🧠 How Component Registration Works Internally

- The runtime stores configs in an internal registry keyed by tag name.
- If the tag is not already registered, it defines a new custom element using the config.
- The element class is generated with all features: state, props, computed, render, style, lifecycle, error handling, and more.
- SSR fallback: If `window` is undefined, a minimal class is returned for server-side rendering.

**Note:** the internal `registry` is part of the runtime implementation and intended
for HMR and internal tooling. Consumer code (including npm package consumers)
should not rely on the registry or any global. In browser development the
registry may be reachable by dev tooling via the Symbol slot Symbol.for('cer.registry')
— this is a dev-only escape hatch. For server-side needs, import the internal
runtime module directly; do not treat the registry as a supported public API.

## 🔄 Hot Module Replacement (HMR)

- The runtime supports HMR: updating configs and re-rendering all instances when the module changes.
- No manual reloads needed during development.

## 📝 Tips & Best Practices

- Use kebab-case for tag names.
- Always provide a `render` function.
- Use config fields for state, props, computed, style, and lifecycle as needed.
- Keep components small, focused, and declarative.
- Use custom methods for reusable logic (auto-injected into state).

## 📚 Learn More

- [Component Config Guide](./component-config.md)
- [Render Guide](./render.md)
- [State Guide](./state.md)
- [Props Guide](./props.md)
- [Computed Guide](./computed.md)
- [Error Handling Guide](./error.md)

## 🏁 Summary

The `component` function is the foundation for building reactive, secure, and maintainable custom elements. It brings together all runtime features in a single, developer-friendly API for modern web apps.
