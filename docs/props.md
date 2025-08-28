# 🎯 Props Deep Dive

Props are the primary way to pass data from parent to child custom elements. This guide explains how to use props with the runtime, including types, best practices, and edge cases.

## 🏷️ Supported Prop Types

- **Primitive types:** string, number, boolean (set via attributes, kebab-case)
- **Function props (event handlers):** must be set as properties on the element instance, not as attributes

## 🚀 Usage

### 🔤 Primitive Props

Use kebab-case attributes to pass primitive props:

```html
<user-card name="Alice" age="30"></user-card>
```

```typescript
component("user-card", {
  props: { name: { type: String }, age: { type: Number } },
  render: (ctx) => html`<div>${ctx.name} (${ctx.age})</div>`
});
```

### 🛠️ Function Props (Event Handlers)

Set function props as properties on the element instance (not as attributes):

```typescript
const el = document.createElement('user-card');
el.onCustomEvent = (detail, ctx) => {
  // handle event
};
document.body.appendChild(el);
```

## 🌟 Best Practices

- Use kebab-case for attribute names
- Only use attributes for string, number, boolean props
- Always set function props as properties, not attributes
- For custom events, use `context.emit` in your component and listen using framework-native event binding or `addEventListener`

## ⚠️ Edge Cases

- If you set a function prop as an attribute, it will be a string, not a function
- For two-way binding, emit the expected event from your component using `context.emit`

## 🏁 Summary

Props are simple and powerful in the runtime. Use attributes for primitives, properties for functions, and follow best practices for robust, maintainable components.
