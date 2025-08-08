# Server-Side Rendering (SSR) Guide

This guide demonstrates how to use the SSR capabilities of the Custom Elements Runtime.

## Overview

The runtime provides treeshakable SSR support that allows you to:

- Render components to HTML strings on the server
- Generate hydration scripts for seamless client-side takeover
- Share styles between multiple components
- Maintain reactive state during hydration

## Key Features

✅ **Treeshakable** - SSR functions are only included when imported  
✅ **Type-safe** - Full TypeScript support for SSR configurations  
✅ **Hydration** - Seamless transition from server to client  
✅ **Computed Properties** - Computed state works in SSR  
✅ **Shared Styles** - Efficient CSS collection and deduplication  
✅ **Error Handling** - Graceful fallbacks for SSR errors  

## Basic Usage

### 1. Define SSR Component Configuration

```typescript
import { type SSRComponentConfig } from './lib/runtime.js';

interface UserState extends ComponentState {
  name: string;
  email: string;
  isOnline: boolean;
}

const userConfig: SSRComponentConfig<UserState> = {
  tag: 'user-card',
  state: {
    name: 'John Doe',
    email: 'john@example.com',
    isOnline: true
  },
  computed: {
    statusText: (state) => state.isOnline ? 'Online' : 'Offline'
  },
  template: (state, api) => `
    <div class="user">
      <h3>${state.name}</h3>
      <p>${state.email}</p>
      <span class="status">${api.state.statusText}</span>
    </div>
  `,
  style: `
    .user { 
      padding: 1rem; 
      border: 1px solid #ccc; 
    }
    .status { 
      color: green; 
    }
  `,
  attrs: {
    'data-component': 'user-card'
  }
};
```

### 2. Render to HTML String

```typescript
import { renderToString } from './lib/runtime.js';

// Single component
const html = renderToString(userConfig, {
  includeStyles: true,
  prettyPrint: true
});

console.log(html);
// Output: <user-card data-component="user-card">
//           <style>...</style>
//           <div class="user">...</div>
//         </user-card>
```

### 3. Multiple Components with Shared Styles

```typescript
import { renderComponentsToString, generateHydrationScript } from './lib/runtime.js';

const components = [userConfig, counterConfig, /* ... */];

const { html, styles, context } = renderComponentsToString(components, {
  prettyPrint: true
});

const hydrationScript = generateHydrationScript(context);

// Use in complete HTML page
const page = `
<!DOCTYPE html>
<html>
  <head>
    <style>${styles}</style>
  </head>
  <body>
    ${html}
    ${hydrationScript}
  </body>
</html>
`;
```

## Server Integration Examples

### Express.js Server

```typescript
import express from 'express';
import { renderComponentsToString, generateHydrationScript } from './lib/runtime.js';

const app = express();

app.get('/users/:id', async (req, res) => {
  // Fetch user data
  const user = await getUserById(req.params.id);
  
  // Define component with real data
  const components = [{
    tag: 'user-profile',
    state: {
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isOnline: user.isOnline
    },
    template: (state) => `
      <div class="profile">
        <img src="${state.avatar}" alt="${state.name}" />
        <h1>${state.name}</h1>
        <p>${state.email}</p>
      </div>
    `,
    style: `.profile { /* styles */ }`
  }];
  
  const { html, styles, context } = renderComponentsToString(components);
  const hydrationScript = generateHydrationScript(context);
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${user.name} - Profile</title>
        <style>${styles}</style>
      </head>
      <body>
        ${html}
        <script type="module" src="/client.js"></script>
        ${hydrationScript}
      </body>
    </html>
  `);
});
```

### Next.js Integration

```typescript
// pages/api/ssr-component.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { renderToString } from '../lib/runtime.js';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const html = renderToString({
    tag: 'my-component',
    state: { message: 'Hello from SSR!' },
    template: (state) => `<div>${state.message}</div>`,
    style: `div { color: blue; }`
  });
  
  res.status(200).json({ html });
}
```

## Client-Side Hydration

### 1. Register Components on Client

```typescript
// client.js
import { component } from './lib/runtime.js';

// Register the same component for client-side functionality
component({
  tag: 'user-card',
  state: { name: '', email: '', isOnline: false },
  computed: {
    statusText: (state) => state.isOnline ? 'Online' : 'Offline'
  },
  template: (state, api) => `
    <div class="user">
      <h3>${state.name}</h3>
      <p>${state.email}</p>
      <span class="status">${api.state.statusText}</span>
    </div>
  `,
  style: `/* same styles as SSR config */`,
  refs: {
    // Add client-side interactivity
    toggleStatus: (el, state, api) => {
      el.addEventListener('click', () => {
        api.updateKey('isOnline', !state.isOnline);
      });
    }
  }
});
```

### 2. Hydration Process

The generated hydration script automatically:

1. Detects SSR-rendered components
2. Restores their state from the SSR context
3. Attaches event listeners and refs
4. Enables reactive updates

```typescript
// Hydration happens automatically, but you can also manually hydrate:
const elements = document.querySelectorAll('user-card');
elements.forEach(el => {
  if (!el.hasAttribute('data-hydrated')) {
    // Component will hydrate with preserved state
    el.setAttribute('data-hydrated', 'true');
  }
});
```

## Advanced Features

### Custom Attribute Sanitization

```typescript
const html = renderToString(config, {
  sanitizeAttributes: (attrs) => {
    // Custom sanitization logic
    return Object.fromEntries(
      Object.entries(attrs).filter(([key]) => 
        !key.startsWith('data-internal-')
      )
    );
  }
});
```

### Error Handling

```typescript
// SSR automatically handles errors gracefully
const html = renderToString(faultyConfig);
// Returns: <my-component><div style="color: red;">SSR Error: ...</div></my-component>
```

### Environment Detection

```typescript
// The runtime automatically detects server vs client
if (typeof window === 'undefined') {
  // Server-side code
  const html = renderToString(config);
} else {
  // Client-side code
  component(config);
}
```

## Best Practices

### 1. Shared Configuration

Create shared configs that work for both SSR and client:

```typescript
// shared/components.ts
export const userCardConfig = {
  tag: 'user-card',
  template: (state, api) => `/* template */`,
  style: `/* styles */`,
  computed: {
    statusText: (state) => state.isOnline ? 'Online' : 'Offline'
  }
};

// server.ts
import { userCardConfig } from './shared/components.js';
const html = renderToString({ ...userCardConfig, state: userData });

// client.ts  
import { userCardConfig } from './shared/components.js';
component({ ...userCardConfig, state: defaultState, refs: { /* client refs */ } });
```

### 2. Progressive Enhancement

Use SSR for initial render, enhance with client-side features:

```typescript
// SSR provides basic functionality
const ssrConfig = {
  template: (state) => `<button>${state.label}</button>`,
  // No client-side interactions
};

// Client enhances with interactions
const clientConfig = {
  ...ssrConfig,
  refs: {
    button: (el, state, api) => {
      el.addEventListener('click', () => api.emit('clicked'));
    }
  }
};
```

### 3. Performance Optimization

```typescript
// Cache rendered components
const cache = new Map();

function cachedRender(config, cacheKey) {
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const html = renderToString(config);
  cache.set(cacheKey, html);
  return html;
}
```

## Limitations

- **No DOM APIs**: SSR templates cannot use `document`, `window`, etc.
- **No Event Listeners**: Events are attached during client hydration
- **Refs Don't Work**: Ref handlers only execute client-side
- **Static Rendering**: SSR produces static HTML; interactivity requires hydration

## Troubleshooting

### Issue: Components Not Hydrating

**Solution**: Ensure client-side component registration matches SSR config:

```typescript
// ❌ Tags don't match
renderToString({ tag: 'my-card', ... });        // SSR
component({ tag: 'my-component', ... });        // Client

// ✅ Tags match
renderToString({ tag: 'my-card', ... });        // SSR  
component({ tag: 'my-card', ... });             // Client
```

### Issue: Styles Not Applied

**Solution**: Include styles in SSR or collect them separately:

```typescript
// Option 1: Include in component
renderToString(config, { includeStyles: true });

// Option 2: Collect separately
const { html, styles } = renderComponentsToString([config]);
```

### Issue: State Not Preserved

**Solution**: Ensure hydration script is included and runs before component registration:

```html
<!-- Include hydration script BEFORE component imports -->
<script>/* hydration script */</script>
<script type="module" src="./components.js"></script>
```

## Complete Example

See `src/examples/ssr-example.ts` for a complete working example with multiple components, shared styles, and hydration.
