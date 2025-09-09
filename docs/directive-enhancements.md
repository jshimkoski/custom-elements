# 🔧 Directive Enhancements

## 🚀 Overview

Directive enhancements provide advanced, ergonomic utilities built on top of the core directives (`when`, `each`, `match`). These helpers offer specialized functionality for common patterns like conditional rendering, collection management, async states, and responsive design.

## 📦 Import

```typescript
import {
  unless, whenEmpty, whenNotEmpty, eachWhere, switchOnLength,
  eachGroup, eachPage, switchOnPromise, whenMedia, responsive,
  whenVariants, responsiveSwitch, switchOn
} from '@jasonshimmy/custom-elements-runtime';
```

## 🔄 Conditional Directives

### `unless` - Negated Conditional

Render content when condition is **false** (opposite of `when`).

```typescript
render: (ctx) => html`
  ${unless(ctx.user.isLoggedIn, html`
    <login-button></login-button>
  `)}
`
```

### `whenEmpty` - Empty State Rendering

Render content only when array/collection is empty.

```typescript
render: (ctx) => html`
  ${whenEmpty(ctx.items, html`
    <div class="empty-state">No items found</div>
  `)}
`
```

### `whenNotEmpty` - Non-Empty State

Render content only when collection has items.

```typescript
render: (ctx) => html`
  ${whenNotEmpty(ctx.items, html`
    <div class="item-count">${ctx.items.length} items</div>
  `)}
`
```

## 📋 Collection Directives

### `eachWhere` - Filtered Iteration

Enhanced `each` with built-in filtering capability.

```typescript
render: (ctx) => html`
  <div class="active-users">
    ${eachWhere(
      ctx.users,
      (user) => user.isActive,
      (user, originalIndex, filteredIndex) => html`
        <user-card :user="${user}" data-index="${filteredIndex}"></user-card>
      `
    )}
  </div>
`
```

### `eachGroup` - Grouped Rendering

Group items by a key and render each group with a header.

```typescript
render: (ctx) => html`
  ${eachGroup(
    ctx.orders,
    (order) => order.status,
    (status, orders) => html`
      <div class="status-group">
        <h3>${status}</h3>
        ${orders.map(order => html`
          <order-item :order="${order}"></order-item>
        `)}
      </div>
    `
  )}
`
```

### `eachPage` - Paginated Rendering

Render specific page of items with pagination support.

```typescript
render: (ctx) => html`
  <div class="products-grid">
    ${eachPage(
      ctx.products,
      ctx.pageSize,
      ctx.currentPage,
      (product, globalIndex, pageIndex) => html`
        <product-card 
          :product="${product}" 
          data-global="${globalIndex}" 
          data-page="${pageIndex}"
        ></product-card>
      `
    )}
  </div>
`
```

### `switchOnLength` - Length-Based Rendering

Render different content based on array length.

```typescript
render: (ctx) => html`
  ${switchOnLength(ctx.notifications, {
    empty: html`<div class="no-notifications">All caught up!</div>`,
    one: (notification) => html`
      <single-notification :notification="${notification}"></single-notification>
    `,
    many: (notifications) => html`
      <notification-list :notifications="${notifications}"></notification-list>
    `,
    exactly: {
      2: (notifications) => html`<twin-notifications :pair="${notifications}"></twin-notifications>`,
      5: (notifications) => html`<priority-stack :items="${notifications}"></priority-stack>`
    }
  })}
`
```

## ⏳ Async State Directives

### `switchOnPromise` - Promise State Handling

Render different content based on promise/async state.

```typescript
render: (ctx) => html`
  ${switchOnPromise(ctx.apiState, {
    loading: html`<loading-spinner></loading-spinner>`,
    success: (data) => html`
      <data-view :data="${data}"></data-view>
    `,
    error: (error) => html`
      <error-message :error="${error}"></error-message>
    `,
    idle: html`<button @click="${ctx.loadData}">Load Data</button>`
  })}
`
```

## 📱 Responsive Directives

### `whenMedia` - Media Query Conditional

Render content when media query matches.

```typescript
render: (ctx) => html`
  ${whenMedia('(min-width: 768px)', html`
    <desktop-navigation></desktop-navigation>
  `)}
  ${whenMedia('(max-width: 767px)', html`
    <mobile-menu></mobile-menu>
  `)}
`
```

### `responsive` Object - Breakpoint Utilities

Pre-built responsive helpers matching the style system.

```typescript
render: (ctx) => html`
  ${responsive.sm(html`<small-screen-content></small-screen-content>`)}
  ${responsive.md(html`<medium-screen-content></medium-screen-content>`)}
  ${responsive.lg(html`<large-screen-content></large-screen-content>`)}
  ${responsive.dark(html`<dark-mode-content></dark-mode-content>`)}
  ${responsive.light(html`<light-mode-content></light-mode-content>`)}
  ${responsive.touch(html`<touch-device-content></touch-device-content>`)}
  ${responsive.portrait(html`<portrait-content></portrait-content>`)}
`
```

**Available responsive helpers:**
- **Breakpoints**: `sm`, `md`, `lg`, `xl`, `2xl`
- **Color schemes**: `dark`, `light`  
- **Interaction**: `touch`, `mouse`
- **Accessibility**: `reducedMotion`, `highContrast`
- **Orientation**: `portrait`, `landscape`

### `whenVariants` - Multi-Condition Responsive

Combine dark mode and responsive conditions (matches style system).

```typescript
render: (ctx) => html`
  ${whenVariants(['dark', 'lg'], html`
    <dark-large-screen-layout></dark-large-screen-layout>
  `)}
  ${whenVariants(['light', 'sm'], html`
    <light-mobile-layout></light-mobile-layout>
  `)}
`
```

### `responsiveSwitch` - Breakpoint Content Switching

Render different content for different breakpoints and dark mode.

```typescript
render: (ctx) => html`
  ${responsiveSwitch({
    base: html`<mobile-view></mobile-view>`,
    md: html`<tablet-view></tablet-view>`,
    lg: html`<desktop-view></desktop-view>`,
  })}
`
```

## 🔀 General Purpose Directives

### `switchOn` - Fluent Switch/Case

Declarative switch/case with fluent API.

```typescript
render: (ctx) => html`
  ${switchOn(ctx.user.role)
    .case('admin', html`<admin-panel></admin-panel>`)
    .case('moderator', html`<mod-tools></mod-tools>`)
    .when(role => role.startsWith('user'), html`<user-dashboard></user-dashboard>`)
    .otherwise(html`<access-denied></access-denied>`)
    .done()}
`
```

## 📐 Breakpoint Values

The responsive directives use these breakpoint values (matching the style system):

```typescript
const mediaVariants = {
  sm: '(min-width:640px)',
  md: '(min-width:768px)', 
  lg: '(min-width:1024px)',
  xl: '(min-width:1280px)',
  '2xl': '(min-width:1536px)',
  dark: '(prefers-color-scheme: dark)'
};
```

## 🔑 Key Features

- **🎯 Type-safe**: Full TypeScript support with proper generics
- **⚡ Performant**: Built on efficient anchor blocks for minimal re-renders
- **🔄 Keying**: Smart key generation for optimal virtual DOM updates
- **📱 Responsive**: Aligned with style system breakpoints and dark mode
- **🧩 Composable**: Mix and match directives for complex scenarios
- **💡 Ergonomic**: Intuitive APIs that reduce boilerplate code

## 🎨 Style System Integration

All responsive directives (`whenMedia`, `responsive`, `whenVariants`, `responsiveSwitch`) are designed to work seamlessly with the style system's breakpoints and dark mode variants. This ensures consistent behavior between your styles and conditional rendering logic.

## 💡 Best Practices

- Use `eachWhere` instead of `each` + manual filtering for better performance
- Prefer `switchOnLength` over multiple `when` conditions for array length checks
- Use `switchOnPromise` for consistent async state management
- Combine `whenVariants` with style system classes for responsive designs
- Leverage `switchOn` for complex conditional logic with multiple cases
- For complex dark+breakpoint combinations, use `whenVariants` instead of `responsiveSwitch`
