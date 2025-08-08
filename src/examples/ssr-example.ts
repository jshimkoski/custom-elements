/**
 * SSR Example - demonstrates server-side rendering capabilities
 * 
 * This example shows how to:
 * 1. Define components that work both client and server-side
 * 2. Render components to HTML strings on the server
 * 3. Generate hydration scripts for client takeover
 * 4. Handle multiple components with shared styles
 */

import { 
  renderToString, 
  renderComponentsToString, 
  generateHydrationScript,
  type SSRComponentConfig,
  type ComponentState 
} from '../lib/runtime.js';

// ============================================================================
// EXAMPLE COMPONENTS FOR SSR
// ============================================================================

interface UserCardState extends ComponentState {
  name: string;
  email: string;
  avatar: string;
  isOnline: boolean;
}

interface CounterState extends ComponentState {
  count: number;
  step: number;
}

// Define component configurations that work for both SSR and client-side
const userCardConfig: SSRComponentConfig<UserCardState> = {
  tag: 'user-card',
  state: {
    name: 'John Doe',
    email: 'john@example.com', 
    avatar: 'https://via.placeholder.com/80x80',
    isOnline: true
  },
  computed: {
    statusText: (state) => state.isOnline ? 'Online' : 'Offline',
    displayName: (state) => state.name.toUpperCase()
  },
  template: (state, api) => `
    <div class="user-card">
      <img src="${state.avatar}" alt="${state.name}" class="avatar" />
      <div class="info">
        <h3 class="name">${api.state.displayName}</h3>
        <p class="email">${state.email}</p>
        <span class="status ${state.isOnline ? 'online' : 'offline'}">
          ${api.state.statusText}
        </span>
      </div>
    </div>
  `,
  style: (state) => `
    .user-card {
      display: flex;
      align-items: center;
      padding: 1rem;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin: 1rem 0;
    }
    
    .avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      margin-right: 1rem;
      object-fit: cover;
    }
    
    .info {
      flex: 1;
    }
    
    .name {
      margin: 0 0 0.5rem 0;
      color: #333;
      font-size: 1.2rem;
    }
    
    .email {
      margin: 0 0 0.5rem 0;
      color: #666;
      font-size: 0.9rem;
    }
    
    .status {
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: bold;
    }
    
    .status.online {
      background: ${state.isOnline ? '#e8f5e8' : '#f5e8e8'};
      color: ${state.isOnline ? '#2d5a2d' : '#5a2d2d'};
    }
    
    .status.offline {
      background: #f5e8e8;
      color: #5a2d2d;
    }
  `,
  attrs: {
    'data-component': 'user-card',
    'role': 'article'
  }
};

const counterConfig: SSRComponentConfig<CounterState> = {
  tag: 'simple-counter',
  state: {
    count: 0,
    step: 1
  },
  computed: {
    isEven: (state) => state.count % 2 === 0,
    canDecrement: (state) => state.count > 0
  },
  template: (state, api) => `
    <div class="counter">
      <h3>Counter Example</h3>
      <div class="display">
        <span class="count ${api.state.isEven ? 'even' : 'odd'}">${state.count}</span>
        <span class="info">(${api.state.isEven ? 'Even' : 'Odd'})</span>
      </div>
      <div class="controls">
        <button ${!api.state.canDecrement ? 'disabled' : ''} onclick="this.closest('simple-counter').updateCount(-1)">
          -${state.step}
        </button>
        <button onclick="this.closest('simple-counter').updateCount(${state.step})">
          +${state.step}
        </button>
      </div>
    </div>
  `,
  style: `
    .counter {
      text-align: center;
      padding: 2rem;
      border: 2px solid #007acc;
      border-radius: 8px;
      background: #f8f9fa;
      margin: 1rem 0;
    }
    
    .display {
      margin: 1rem 0;
    }
    
    .count {
      font-size: 3rem;
      font-weight: bold;
      display: block;
    }
    
    .count.even { color: #007acc; }
    .count.odd { color: #e74c3c; }
    
    .info {
      font-size: 1rem;
      color: #666;
    }
    
    .controls {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 1rem;
    }
    
    button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      background: #007acc;
      color: white;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    button:hover:not(:disabled) {
      background: #005a9e;
    }
    
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  `,
  attrs: {
    'data-component': 'counter'
  }
};

// ============================================================================
// SSR EXAMPLES
// ============================================================================

/**
 * Example 1: Basic SSR rendering of a single component
 */
export function example1_basicSSR(): string {
  console.log('=== Example 1: Basic SSR ===');
  
  const html = renderToString(userCardConfig, {
    includeStyles: true,
    prettyPrint: true
  });
  
  console.log('Rendered HTML:');
  console.log(html);
  
  return html;
}

/**
 * Example 2: Rendering multiple components with shared styles
 */
export function example2_multipleComponents(): { html: string; styles: string; hydrationScript: string } {
  console.log('\n=== Example 2: Multiple Components with Shared Styles ===');
  
  // Create multiple instances with different state
  const users: SSRComponentConfig<UserCardState>[] = [
    {
      ...userCardConfig,
      state: { ...userCardConfig.state, name: 'Alice Smith', email: 'alice@example.com', isOnline: true }
    },
    {
      ...userCardConfig, 
      state: { ...userCardConfig.state, name: 'Bob Johnson', email: 'bob@example.com', isOnline: false }
    }
  ];
  
  const components = [...users, counterConfig];
  
  const result = renderComponentsToString(components, {
    prettyPrint: true
  });
  
  const hydrationScript = generateHydrationScript(result.context);
  
  console.log('Components HTML:');
  console.log(result.html);
  console.log('\nShared Styles:');
  console.log(result.styles);
  console.log('\nHydration Script:');
  console.log(hydrationScript);
  
  return {
    html: result.html,
    styles: result.styles,
    hydrationScript
  };
}

/**
 * Example 3: Complete HTML page with SSR
 */
export function example3_completePage(): string {
  console.log('\n=== Example 3: Complete SSR Page ===');
  
  const { html, styles, hydrationScript } = example2_multipleComponents();
  
  const completePage = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SSR Example - Custom Elements</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      background: #f5f5f5;
    }
    h1 {
      color: #333;
      text-align: center;
    }
    ${styles}
  </style>
</head>
<body>
  <h1>Server-Side Rendered Components</h1>
  <div id="app">
    ${html}
  </div>
  
  <!-- Import the runtime for client-side hydration -->
  <script type="module">
    import { component } from './lib/runtime.js';
    
    // Register components for client-side functionality
    // These should match the SSR configurations
    
    component({
      tag: 'user-card',
      state: { name: '', email: '', avatar: '', isOnline: false },
      computed: {
        statusText: (state) => state.isOnline ? 'Online' : 'Offline',
        displayName: (state) => state.name.toUpperCase()
      },
      template: (state, api) => \`
        <div class="user-card">
          <img src="\${state.avatar}" alt="\${state.name}" class="avatar" />
          <div class="info">
            <h3 class="name">\${api.state.displayName}</h3>
            <p class="email">\${state.email}</p>
            <span class="status \${state.isOnline ? 'online' : 'offline'}">
              \${api.state.statusText}
            </span>
          </div>
        </div>
      \`,
      style: \`/* styles would go here */\`
    });
    
    component({
      tag: 'simple-counter',
      state: { count: 0, step: 1 },
      computed: {
        isEven: (state) => state.count % 2 === 0,
        canDecrement: (state) => state.count > 0
      },
      template: (state, api) => \`
        <div class="counter">
          <h3>Counter Example</h3>
          <div class="display">
            <span class="count \${api.state.isEven ? 'even' : 'odd'}">\${state.count}</span>
            <span class="info">(\${api.state.isEven ? 'Even' : 'Odd'})</span>
          </div>
          <div class="controls">
            <button \${!api.state.canDecrement ? 'disabled' : ''} data-ref="decrement">
              -\${state.step}
            </button>
            <button data-ref="increment">
              +\${state.step}
            </button>
          </div>
        </div>
      \`,
      refs: {
        increment: (el, state, api) => {
          el.addEventListener('click', () => api.updateKey('count', state.count + state.step));
        },
        decrement: (el, state, api) => {
          el.addEventListener('click', () => {
            if (state.count > 0) {
              api.updateKey('count', state.count - state.step);
            }
          });
        }
      },
      style: \`/* styles would go here */\`
    });
  </script>
  
  ${hydrationScript}
</body>
</html>`.trim();

  console.log('Complete HTML page generated with SSR support!');
  return completePage;
}

/**
 * Example 4: Node.js server usage (pseudo-code)
 */
export function example4_serverUsage(): string {
  return `
// server.js - Example Express.js server with SSR
import express from 'express';
import { renderComponentsToString, generateHydrationScript } from './lib/runtime.js';

const app = express();

app.get('/', (req, res) => {
  // Define components based on request data
  const components = [
    {
      tag: 'user-card',
      state: {
        name: req.user?.name || 'Guest',
        email: req.user?.email || '',
        avatar: req.user?.avatar || '/default-avatar.png',
        isOnline: true
      },
      template: (state) => \`<div>Hello \${state.name}</div>\`,
      style: \`.user { color: blue; }\`
    }
  ];
  
  const { html, styles, context } = renderComponentsToString(components);
  const hydrationScript = generateHydrationScript(context);
  
  const page = \`
    <!DOCTYPE html>
    <html>
      <head>
        <style>\${styles}</style>
      </head>
      <body>
        \${html}
        \${hydrationScript}
      </body>
    </html>
  \`;
  
  res.send(page);
});

app.listen(3000, () => {
  console.log('SSR server running on port 3000');
});
  `.trim();
}

// ============================================================================
// RUN EXAMPLES
// ============================================================================

if (typeof window === 'undefined') {
  // Only run on server/Node.js
  console.log('Running SSR Examples...\n');
  
  try {
    example1_basicSSR();
    example2_multipleComponents();
    
    example3_completePage();
    
    console.log('\n=== Example 4: Server Usage ===');
    console.log(example4_serverUsage());
    
    console.log('\n✅ All SSR examples completed successfully!');
    console.log('\nTo use in production:');
    console.log('1. Import SSR functions: import { renderToString } from "./lib/runtime.js"');
    console.log('2. Use renderToString() on your server');
    console.log('3. Include the hydration script in your HTML');
    console.log('4. Register matching components on the client');
    
  } catch (error) {
    console.error('❌ SSR example failed:', error);
  }
}
