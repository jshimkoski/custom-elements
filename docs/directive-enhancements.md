# 🔧 Directive Enhancements

## 🚀 Overview

Directive enhancements provide advanced, ergonomic utilities built on top of the core directives (`when`, `each`, `match`). These helpers offer specialized functionality for common patterns like conditional rendering, collection management, async states, and responsive design.

## 📦 Import

```typescript
import {
  component,
  html,
  ref,
  computed,
  useProps,
} from '@jasonshimmy/custom-elements-runtime';
import type { VNode } from '@jasonshimmy/custom-elements-runtime';
import {
  unless,
  whenEmpty,
  whenNotEmpty,
  eachWhere,
  switchOnLength,
  eachGroup,
  eachPage,
  switchOnPromise,
  whenMedia,
  responsive,
  whenVariants,
  responsiveSwitch,
  switchOn,
  // Low-level responsive constants (for advanced/custom use)
  mediaVariants,
  responsiveOrder,
} from '@jasonshimmy/custom-elements-runtime/directive-enhancements';
```

## 🔄 Conditional Directives

### `unless` - Negated Conditional

Render content when condition is **false** (opposite of `when`).

```typescript
component('auth-component', () => {
  const props = useProps({ user: null as { isLoggedIn?: boolean } | null });
  return html`
    ${unless(!props.user?.isLoggedIn, html` <login-button></login-button> `)}
  `;
});
```

### `whenEmpty` - Empty State Rendering

Render content only when array/collection is empty.

```typescript
component('items-list', () => {
  const props = useProps({ items: [] as any[] });
  return html`
    ${whenEmpty(
      props.items,
      html` <div class="empty-state">No items found</div> `,
    )}
  `;
});
```

### `whenNotEmpty` - Non-Empty State

Render content only when collection has items.

```typescript
component('items-counter', () => {
  const props = useProps({ items: [] as any[] });
  return html`
    ${whenNotEmpty(
      props.items,
      html` <div class="item-count">${props.items.length} items</div> `,
    )}
  `;
});
```

## 📋 Collection Directives

### `eachWhere` - Filtered Iteration

Enhanced `each` with built-in filtering capability.

```typescript
component('filtered-users', () => {
  const props = useProps({ users: [] as Array<{ isActive?: boolean }> });
  return html`
    <div class="active-users">
      ${eachWhere(
        props.users,
        (user) => Boolean(user.isActive),
        (user, originalIndex, filteredIndex) => html`
          <user-card :user="${user}" data-index="${filteredIndex}"></user-card>
        `,
      )}
    </div>
  `;
});
```

### `eachGroup` - Grouped Rendering

Group items by a key and render each group with a header.

```typescript
component('grouped-orders', () => {
  const props = useProps({ orders: [] as Array<{ status?: string }> });
  return html`
    ${eachGroup(
      props.orders,
      (order) => order.status,
      (status, orders) => html`
        <div class="status-group">
          <h3>${status}</h3>
          ${orders.map(
            (order) => html` <order-item :order="${order}"></order-item> `,
          )}
        </div>
      `,
    )}
  `;
});
```

### `eachPage` - Paginated Rendering

Render specific page of items with pagination support.

```typescript
component('paginated-products', () => {
  const props = useProps({
    products: [] as any[],
    pageSize: 10,
    currentPage: 0,
  });
  return html`
    <div class="products-grid">
      ${eachPage(
        props.products,
        props.pageSize,
        props.currentPage,
        (product, globalIndex, pageIndex) => html`
          <product-card
            :product="${product}"
            data-global="${globalIndex}"
            data-page="${pageIndex}"
          ></product-card>
        `,
      )}
    </div>
  `;
});
```

### `switchOnLength` - Length-Based Rendering

Render different content based on array length.

```typescript
component('notification-manager', () => {
  const props = useProps({ notifications: [] as any[] });
  return html`
    ${switchOnLength(props.notifications, {
      empty: html`<div class="no-notifications">All caught up!</div>`,
      one: (notification) => html`
        <single-notification
          :notification="${notification}"
        ></single-notification>
      `,
      many: (notifications) => html`
        <notification-list
          :notifications="${notifications}"
        ></notification-list>
      `,
      exactly: {
        2: (notifications) =>
          html`<twin-notifications
            :pair="${notifications}"
          ></twin-notifications>`,
        5: (notifications) =>
          html`<priority-stack :items="${notifications}"></priority-stack>`,
      },
    })}
  `;
});
```

## ⏳ Async State Directives

### `switchOnPromise` - Promise State Handling

Render different content based on promise/async state.

```typescript
component('async-data-viewer', () => {
  const props = useProps({
    initialState: 'idle' as 'idle' | 'loading' | 'success' | 'error',
  });
  const apiState = ref(props.initialState);
  const data = ref(null as any);
  const error = ref(null as any);

  const loadData = async () => {
    apiState.value = 'loading';
    try {
      const response = await fetch('/api/data');
      data.value = await response.json();
      apiState.value = 'success';
    } catch (err) {
      error.value = err;
      apiState.value = 'error';
    }
  };

  return html`
    ${
      /*
      switchOnPromise expects a promise-state object: { loading?: boolean, data?: T, error?: E }
      Example usage below maps local refs into that shape so the directive can prioritize
      loading -> error -> success as implemented in the runtime.
    */ ''
    }
    ${switchOnPromise(
      {
        loading: apiState.value === 'loading',
        data: data.value,
        error: error.value,
      },
      {
        loading: html`<loading-spinner></loading-spinner>`,
        success: () => html` <data-view :data="${data.value}"></data-view> `,
        error: () => html`
          <error-message :error="${error.value}"></error-message>
        `,
        idle: html`<button @click="${loadData}">Load Data</button>`,
      },
    )}
  `;
});
```

## 📱 Responsive Directives

### `whenMedia` - Media Query Conditional

Render content when media query matches.

```typescript
component('responsive-navigation', () => {
  return html`
    ${whenMedia(
      '(min-width: 768px)',
      html` <desktop-navigation></desktop-navigation> `,
    )}
    ${whenMedia('(max-width: 767px)', html` <mobile-menu></mobile-menu> `)}
  `;
});
```

> Implementation note: `whenMedia` uses `window.matchMedia` under the hood and therefore only evaluates in browser environments. On SSR (no `window`) media queries are treated as not-matching (false). If you need server-side markup for responsive layouts, prefer `responsiveSwitch` with a `base` variant or render server-friendly fallbacks that the client can enhance.

### `responsive` Object - Breakpoint Utilities

Pre-built responsive helpers matching the style system.

```typescript
component('responsive-content', () => {
  return html`
    ${responsive.sm(html`<small-screen-content></small-screen-content>`)}
    ${responsive.md(html`<medium-screen-content></medium-screen-content>`)}
    ${responsive.lg(html`<large-screen-content></large-screen-content>`)}
    ${responsive.dark(html`<dark-mode-content></dark-mode-content>`)}
    ${responsive.light(html`<light-mode-content></light-mode-content>`)}
    ${responsive.touch(html`<touch-device-content></touch-device-content>`)}
    ${responsive.portrait(html`<portrait-content></portrait-content>`)}
  `;
});
```

**Available responsive helpers:**

- **Breakpoints**: `sm`, `md`, `lg`, `xl`, `2xl`
- **Color schemes**: `dark`, `light`
- **Interaction**: `touch`, `mouse`
- **Accessibility**: `reducedMotion`, `highContrast`
- **Orientation**: `portrait`, `landscape`

### `whenVariants` - Multi-Condition Responsive

Combine dark/light mode and responsive conditions (matches style system behavior).

```typescript
component('variant-layout', () => {
  return html`
    ${whenVariants(
      ['dark', 'lg'],
      html` <dark-large-screen-layout></dark-large-screen-layout> `,
    )}
    ${whenVariants(
      ['light', 'sm'],
      html` <light-mobile-layout></light-mobile-layout> `,
    )}
  `;
});
```

**How it works:**

- Processes dark/light mode first
- Then applies the **last** responsive breakpoint (matching CSS cascade behavior)
- Combines conditions with `and` operator

**Advanced examples:**

```typescript
component('theme-aware-content', () => {
  return html`
    <!-- Dark mode on large screens -->
    ${whenVariants(
      ['dark', 'lg'],
      html`
        <div class="bg-neutral-900 p-8">
          <h2 class="text-white text-2xl">Dark Desktop View</h2>
        </div>
      `,
    )}

    <!-- Light mode on mobile -->
    ${whenVariants(
      ['light', 'sm'],
      html`
        <div class="bg-white p-4">
          <h2 class="text-neutral-900 text-lg">Light Mobile View</h2>
        </div>
      `,
    )}

    <!-- Multiple breakpoints - last one wins (lg) -->
    ${whenVariants(
      ['dark', 'md', 'lg'],
      html` <div>Only shows on lg+ in dark mode</div> `,
    )}
  `;
});
```

**Supported variant keys:**

- **Color schemes**: `dark`, `light`
- **Breakpoints**: `sm`, `md`, `lg`, `xl`, `2xl`

**Note:** This matches the multi-variant processing in the style system. When multiple breakpoints are specified, only the last one is applied (e.g., `['sm', 'md', 'lg']` → applies `lg` only).

### `responsiveSwitch` - Breakpoint Content Switching

Render different content for different breakpoints.

```typescript
component('responsive-layout', () => {
  return html`
    ${responsiveSwitch({
      base: html`<mobile-view></mobile-view>`,
      md: html`<tablet-view></tablet-view>`,
      lg: html`<desktop-view></desktop-view>`,
      xl: html`<desktop-wide-view></desktop-wide-view>`,
      '2xl': html`<ultra-wide-view></ultra-wide-view>`,
    })}
  `;
});
```

**Real-world example - Dashboard layouts:**

```typescript
component('dashboard-layout', () => {
  const props = useProps({ metrics: [] as any[] });
  return html`
    ${responsiveSwitch({
      base: html`
        <div class="flex flex-col gap-4">
          ${props.metrics.map(
            (m) => html`<metric-card :metric="${m}"></metric-card>`,
          )}
        </div>
      `,
      md: html`
        <div class="grid grid-cols-2 gap-4">
          ${props.metrics.map(
            (m) => html`<metric-card :metric="${m}"></metric-card>`,
          )}
        </div>
      `,
      lg: html`
        <div class="grid grid-cols-3 gap-6">
          ${props.metrics.map(
            (m) =>
              html`<metric-card :metric="${m}" size="large"></metric-card>`,
          )}
        </div>
      `,
    })}
  `;
});
```

**Available breakpoints:**

- `base` - Mobile-first, no media query (always applies)
- `sm` - Small screens (640px+)
- `md` - Medium screens (768px+)
- `lg` - Large screens (1024px+)
- `xl` - Extra large screens (1280px+)
- `2xl` - 2X large screens (1536px+)

## 🔀 General Purpose Directives

### `switchOn` - Fluent Switch/Case

Declarative switch/case with fluent API for complex conditional logic.

```typescript
component('role-based-ui', () => {
  const props = useProps({ user: { role: 'guest' } as { role?: string } });
  return html`
    ${switchOn(props.user.role)
      .case('admin', html`<admin-panel></admin-panel>`)
      .case('moderator', html`<mod-tools></mod-tools>`)
      .when(
        (role) => String(role).startsWith('user'),
        html`<user-dashboard></user-dashboard>`,
      )
      .otherwise(html`<access-denied></access-denied>`)
      .done()}
  `;
});
```

**API Methods:**

- **`.case(matcher, content)`** - Match exact value or use predicate function
- **`.when(predicate, content)`** - Match using custom condition function
- **`.otherwise(content)`** - Fallback content if no cases match
- **`.done()`** - Execute and return the matching content

**Real-world examples:**

```typescript
// Status badge with color coding
component('status-badge', () => {
  const props = useProps({ status: 'unknown' as string });
  return html`
    ${switchOn(props.status)
      .case(
        'success',
        html`<span class="badge bg-success-500 text-white">✓ Success</span>`,
      )
      .case(
        'pending',
        html`<span class="badge bg-warning-500 text-white">⏳ Pending</span>`,
      )
      .case(
        'error',
        html`<span class="badge bg-error-500 text-white">✗ Error</span>`,
      )
      .otherwise(
        html`<span class="badge bg-neutral-500 text-white">Unknown</span>`,
      )
      .done()}
  `;
});

// Complex conditions with predicates
component('user-greeting', () => {
  const props = useProps({
    user: { age: 0, isPremium: false } as { age?: number; isPremium?: boolean },
  });
  return html`
    ${switchOn(props.user)
      .when((u) => (u?.age ?? 0) < 18, html`<div>Welcome, young user! 🎈</div>`)
      .when(
        (u) => Boolean(u?.isPremium) && (u?.age ?? 0) >= 18,
        html`<div>Welcome back, Premium Member! ⭐</div>`,
      )
      .when(
        (u) => (u?.age ?? 0) >= 65,
        html`<div>Welcome, valued senior member! 🎖️</div>`,
      )
      .otherwise(html`<div>Welcome! 👋</div>`)
      .done()}
  `;
});

// Range matching
component('price-tier', () => {
  const props = useProps({ price: 0 });
  return html`
    ${switchOn(props.price)
      .when(
        (p) => p < 10,
        html`<span class="tier-budget">Budget Friendly</span>`,
      )
      .when(
        (p) => p >= 10 && p < 50,
        html`<span class="tier-standard">Standard</span>`,
      )
      .when(
        (p) => p >= 50 && p < 100,
        html`<span class="tier-premium">Premium</span>`,
      )
      .when((p) => p >= 100, html`<span class="tier-luxury">Luxury</span>`)
      .otherwise(html`<span class="tier-unknown">Price TBD</span>`)
      .done()}
  `;
});

// Type-safe enum matching
type OrderStatus =
  | 'draft'
  | 'submitted'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

component('order-status-flow', () => {
  const props = useProps({ status: 'draft' as OrderStatus });
  return html`
    ${switchOn(props.status)
      .case(
        'draft',
        html`<step-indicator step="1">Creating Order</step-indicator>`,
      )
      .case(
        'submitted',
        html`<step-indicator step="2">Order Submitted</step-indicator>`,
      )
      .case(
        'processing',
        html`<step-indicator step="3">Processing Payment</step-indicator>`,
      )
      .case(
        'shipped',
        html`<step-indicator step="4">Out for Delivery</step-indicator>`,
      )
      .case(
        'delivered',
        html`<step-indicator step="5" complete>Delivered!</step-indicator>`,
      )
      .case(
        'cancelled',
        html`<error-indicator>Order Cancelled</error-indicator>`,
      )
      .done()}
  `;
});
```

**Why use `switchOn` over `match`?**

- **More readable** for multiple conditions
- **Fluent API** chains better in templates
- **Type inference** works better with the builder pattern
- **Predicate functions** allow complex matching logic
- **Explicit** - clearly shows all branches and fallback

## 📐 Breakpoint Values

The responsive directives use these breakpoint values (matching the style system). Both `mediaVariants` and `responsiveOrder` are exported constants you can import for advanced or custom responsive logic.

```typescript
import {
  mediaVariants,
  responsiveOrder,
} from '@jasonshimmy/custom-elements-runtime/directive-enhancements';

// mediaVariants: media query strings keyed by name
console.log(mediaVariants);
// {
//   sm: '(min-width:640px)',
//   md: '(min-width:768px)',
//   lg: '(min-width:1024px)',
//   xl: '(min-width:1280px)',
//   '2xl': '(min-width:1536px)',
//   dark: '(prefers-color-scheme: dark)',
// }

// responsiveOrder: ordered tuple of responsive breakpoint names
console.log(responsiveOrder);
// ['sm', 'md', 'lg', 'xl', '2xl']
```

These are useful when building custom responsive helpers that need to stay aligned with the style system's breakpoints — for example, iterating over breakpoints in order or looking up the media query string for a given variant name.

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
