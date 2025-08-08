/**
 * Example Express.js server with SSR support
 * 
 * To run this example:
 * 1. npm install express
 * 2. node server-example.js
 * 3. Visit http://localhost:3000
 */

// Note: This would need to be adapted for your actual runtime imports
// For this example, we'll include a simplified version

// Simplified SSR functions for demo
function createSSRAPI(state) {
  return {
    state,
    emit: () => {},
    update: () => {},
    updateKey: () => {},
  };
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderToString(config, options = {}) {
  try {
    const computedState = { ...config.state };
    if (config.computed) {
      Object.entries(config.computed).forEach(([key, handler]) => {
        computedState[key] = handler(computedState);
      });
    }

    const api = createSSRAPI(computedState);
    const innerHTML = config.template(computedState, api);
    
    let styleContent = '';
    if (options.includeStyles && config.style) {
      const css = typeof config.style === 'function' 
        ? config.style(computedState) 
        : config.style;
      styleContent = `<style>${css}</style>`;
    }

    const attrs = config.attrs || {};
    const attrString = Object.entries(attrs)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');

    const openTag = attrString 
      ? `<${config.tag} ${attrString}>` 
      : `<${config.tag}>`;
    
    return `${openTag}${styleContent}${innerHTML}</${config.tag}>`;
    
  } catch (error) {
    return `<${config.tag}><div style="color: red;">SSR Error: ${escapeHTML(String(error))}</div></${config.tag}>`;
  }
}

// Mock Express for demonstration
const mockExpress = {
  get: (route, handler) => {
    console.log(`📝 Route registered: GET ${route}`);
    if (route === '/') {
      console.log('🌐 Simulating request to home page...');
      const mockReq = { 
        params: {},
        query: {},
        user: { name: 'Demo User', email: 'demo@example.com' }
      };
      const mockRes = {
        send: (html) => {
          console.log('📤 Response sent:');
          console.log(html.substring(0, 500) + '...\n');
        }
      };
      handler(mockReq, mockRes);
    }
  },
  listen: (port, callback) => {
    console.log(`🚀 Mock server listening on port ${port}`);
    callback && callback();
  }
};

// Sample component configurations
const userProfileConfig = {
  tag: 'user-profile',
  template: (state, api) => `
    <div class="profile">
      <h1>Welcome, ${state.name}!</h1>
      <p>Email: ${state.email}</p>
      <p>Status: ${api.state.statusMessage}</p>
      <div class="actions">
        <button data-ref="edit">Edit Profile</button>
        <button data-ref="logout">Logout</button>
      </div>
    </div>
  `,
  computed: {
    statusMessage: (state) => `Logged in as ${state.name}`
  },
  style: `
    .profile {
      max-width: 600px;
      margin: 2rem auto;
      padding: 2rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .profile h1 {
      color: #333;
      margin-bottom: 1rem;
    }
    .actions {
      margin-top: 2rem;
    }
    .actions button {
      margin-right: 1rem;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      background: #007acc;
      color: white;
      cursor: pointer;
    }
    .actions button:hover {
      background: #005a9e;
    }
  `,
  attrs: {
    'data-component': 'user-profile'
  }
};

const navigationConfig = {
  tag: 'main-nav',
  state: {
    items: [
      { label: 'Home', href: '/', active: true },
      { label: 'Profile', href: '/profile', active: false },
      { label: 'Settings', href: '/settings', active: false }
    ]
  },
  template: (state) => `
    <nav class="main-nav">
      <ul>
        ${state.items.map(item => `
          <li>
            <a href="${item.href}" ${item.active ? 'class="active"' : ''}>
              ${item.label}
            </a>
          </li>
        `).join('')}
      </ul>
    </nav>
  `,
  style: `
    .main-nav {
      background: #333;
      padding: 1rem 0;
      margin-bottom: 2rem;
    }
    .main-nav ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      gap: 2rem;
    }
    .main-nav a {
      color: white;
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .main-nav a:hover,
    .main-nav a.active {
      background: #007acc;
    }
  `
};

// Express.js server setup
const app = mockExpress;

app.get('/', (req, res) => {
  // In a real app, you'd fetch user data from database
  const userData = req.user || {
    name: 'Guest User',
    email: 'guest@example.com'
  };

  // Render components with user data
  const profileHTML = renderToString({
    ...userProfileConfig,
    state: userData
  }, { includeStyles: true });

  const navHTML = renderToString(navigationConfig, { includeStyles: true });

  // Complete HTML page
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${userData.name} - Dashboard</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin: 0;
      padding: 0;
      background: #f5f5f5;
    }
    .container {
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <div class="container">
    ${navHTML}
    ${profileHTML}
  </div>
  
  <!-- In a real app, this would import your actual runtime -->
  <script type="module">
    // Import and register components for client-side functionality
    /*
    import { component } from './lib/runtime.js';
    
    // Register components with client-side enhancements
    component({
      tag: 'user-profile',
      state: { name: '', email: '' },
      template: ${JSON.stringify(userProfileConfig.template.toString())},
      style: ${JSON.stringify(userProfileConfig.style)},
      refs: {
        edit: (el, state, api) => {
          el.addEventListener('click', () => {
            // Handle edit profile
            console.log('Edit profile clicked');
          });
        },
        logout: (el, state, api) => {
          el.addEventListener('click', () => {
            // Handle logout
            window.location.href = '/logout';
          });
        }
      }
    });
    */
    
    // Placeholder for demonstration
    console.log('🔧 Components would be registered here for client-side interactivity');
    
    // Simulate hydration
    setTimeout(() => {
      console.log('💧 Components hydrated - interactivity enabled');
    }, 100);
  </script>
  
  <!-- Hydration script would be generated here -->
  <script>
    // Auto-hydrate components when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
      console.log('🌱 DOM ready - components can now be hydrated');
    });
  </script>
</body>
</html>`.trim();

  res.send(html);
});

app.get('/api/user/:id', (req, res) => {
  // API endpoint that returns just the component HTML
  const userId = req.params.id;
  
  // Mock user data - in real app, fetch from database
  const userData = {
    name: `User ${userId}`,
    email: `user${userId}@example.com`
  };

  const html = renderToString({
    ...userProfileConfig,
    state: userData
  });

  res.send({ html, userData });
});

// Start server
app.listen(3000, () => {
  console.log('\n🎯 SSR Server Example');
  console.log('='.repeat(50));
  console.log('This demonstrates a complete SSR setup with:');
  console.log('✅ Server-side component rendering');
  console.log('✅ Dynamic data injection');
  console.log('✅ Client-side hydration preparation');
  console.log('✅ API endpoints for partial updates');
  console.log('\nIn a real implementation:');
  console.log('1. Replace mock express with real Express.js');
  console.log('2. Import actual runtime: import { renderToString } from "./lib/runtime.js"');
  console.log('3. Connect to your database for user data');
  console.log('4. Add proper error handling and validation');
  console.log('5. Implement client-side component registration');
});

console.log('\n💡 Key SSR Benefits:');
console.log('🚀 Faster initial page loads');
console.log('🔍 Better SEO (search engines see content)');
console.log('♿ Improved accessibility');
console.log('📱 Works without JavaScript');
console.log('💧 Progressive enhancement with hydration');
