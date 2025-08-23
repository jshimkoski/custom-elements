import {
  component,
  asyncComponent,
  routeComponent,
  createAsyncTemplate,
  createRouteTemplate,
  html,
  type VNode
} from '../lib/runtime';
import { createAsyncRoute, createAsyncRoutes } from '../lib/router';

// --- Example 1: Basic Async Component ---

// Simple async component that loads content after a delay
asyncComponent('async-greeting', {
  state: { name: 'World', loaded: false },

  renderAsync: async (state) => {
    // Simulate API call or dynamic import
    await new Promise(resolve => setTimeout(resolve, 1000));

    state.loaded = true;

    return html`
      <div class="greeting">
        <h1>Hello, ${state.name}!</h1>
        <p>This content loaded asynchronously after 1 second.</p>
        <small>Loaded at: ${new Date().toLocaleTimeString()}</small>
      </div>
    `;
  },

  loadingTemplate: (state) => html`
    <div class="loading">
      <p>Loading greeting for ${state.name}...</p>
      <div class="spinner">⏳</div>
    </div>
  `,

  errorTemplate: (error, state) => html`
    <div class="error">
      <h3>Failed to load greeting</h3>
      <p>Error: ${error.message}</p>
      <button @click="${() => location.reload()}">Retry</button>
    </div>
  `,

  style: `
    .greeting {
      padding: 20px;
      border: 2px solid #4CAF50;
      border-radius: 8px;
    }
    .loading {
      text-align: center;
      padding: 20px;
    }
    .spinner {
      font-size: 24px;
      animation: spin 1s linear infinite;
    }
    .error {
      padding: 20px;
      border: 2px solid #f44336;
      border-radius: 8px;
      background: #ffebee;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `
});

// --- Example 2: Data-Dependent Async Template ---

asyncComponent('async-user-profile', {
  state: { userId: 1, user: null as any },

  renderAsync: createAsyncTemplate(
    async (state) => {
      // Simulate fetching user data
      const response = await fetch(`/api/users/${state.userId}`);
      const user = await response.json();

      // Update state with fetched data
      state.user = user;

      return html`
        <div class="profile">
          <img src="${user.avatar}" alt="${user.name}" />
          <h2>${user.name}</h2>
          <p>Email: ${user.email}</p>
          <p>Role: ${user.role}</p>
          <div class="stats">
            <span>Posts: ${user.posts}</span>
            <span>Followers: ${user.followers}</span>
          </div>
        </div>
      `;
    },
    {
      // Cache key based on userId - template will reload when userId changes
      cacheKey: (state) => `user-${state.userId}`,
      dependencies: ['userId']
    }
  ),

  loadingTemplate: (state) => html`
    <div class="profile-loading">
      <div class="skeleton-avatar"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text short"></div>
    </div>
  `,

  errorTemplate: (error, state) => html`
    <div class="profile-error">
      <h3>User not found</h3>
      <p>Could not load user ${state.userId}</p>
      <button @click="${() => { state.userId = 1; }}">Try Another User</button>
    </div>
  `,

  style: `
    .profile {
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
      text-align: center;
    }
    .profile img {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      margin-bottom: 10px;
    }
    .stats span {
      margin: 0 10px;
      padding: 5px 10px;
      background: #f0f0f0;
      border-radius: 4px;
    }
    .skeleton-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      margin: 0 auto 10px;
    }
    .skeleton-text {
      height: 20px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      margin-bottom: 10px;
      border-radius: 4px;
    }
    .skeleton-text.short {
      width: 60%;
      margin: 0 auto;
    }
    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `
});

// --- Example 3: Route-Based Async Component ---

routeComponent('route-page', {
  state: { path: '', params: {} },

  routeLoader: async () => {
    // Simulate loading route component
    const path = window.location.pathname;

    if (path.includes('about')) {
      return { default: (state: any) => html`
        <div class="page">
          <h1>About Us</h1>
          <p>This is the about page loaded asynchronously.</p>
          <p>Current path: ${state.path}</p>
        </div>
      `};
    } else if (path.includes('contact')) {
      return { default: (state: any) => html`
        <div class="page">
          <h1>Contact Us</h1>
          <p>Get in touch with us!</p>
          <form>
            <input type="text" placeholder="Your name" />
            <textarea placeholder="Your message"></textarea>
            <button type="submit">Send</button>
          </form>
        </div>
      `};
    } else {
      return { default: (state: any) => html`
        <div class="page">
          <h1>Home</h1>
          <p>Welcome to our website!</p>
          <nav>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
          </nav>
        </div>
      `};
    }
  },

  loadingTemplate: (state) => html`
    <div class="page-loading">
      <div class="loading-bar"></div>
      <p>Loading page...</p>
    </div>
  `,

  errorTemplate: (error, state) => html`
    <div class="page-error">
      <h1>Page Not Found</h1>
      <p>The requested page could not be loaded.</p>
      <a href="/">Go Home</a>
    </div>
  `,

  style: `
    .page {
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .page nav a {
      margin: 0 10px;
      padding: 10px 20px;
      background: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 4px;
    }
    .page form {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    }
    .page input, .page textarea {
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .page button {
      padding: 10px 20px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .loading-bar {
      width: 100%;
      height: 4px;
      background: #f0f0f0;
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 20px;
    }
    .loading-bar::after {
      content: '';
      display: block;
      width: 30%;
      height: 100%;
      background: #007bff;
      border-radius: 2px;
      animation: loading-progress 1.5s ease-in-out infinite;
    }
    @keyframes loading-progress {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(400%); }
    }
  `
});

// --- Example 4: Multiple Async Routes ---

const asyncRoutes = createAsyncRoutes([
  {
    path: '/dashboard',
    loader: async () => ({
      default: (state: any) => html`
        <div class="dashboard">
          <h1>Dashboard</h1>
          <div class="widgets">
            <div class="widget">
              <h3>Users</h3>
              <p>1,234</p>
            </div>
            <div class="widget">
              <h3>Revenue</h3>
              <p>$12,345</p>
            </div>
          </div>
        </div>
      `
    }),
    tagName: 'dashboard-page',
    loadingTemplate: () => html`<div>Loading dashboard...</div>`
  },
  {
    path: '/profile/:id',
    loader: async () => ({
      default: (state: any) => html`
        <div class="profile-page">
          <h1>User Profile</h1>
          <p>User ID: ${state.params?.id || 'unknown'}</p>
        </div>
      `
    }),
    tagName: 'profile-page'
  }
]);

// --- Example 5: Conditional Async Loading ---

component('conditional-async', {
  state: { showAsync: false, loadCount: 0 },

  render(state) {
    return html`
      <div>
        <button @click="${() => { state.showAsync = !state.showAsync; }}">
          ${state.showAsync ? 'Hide' : 'Show'} Async Content
        </button>

        ${state.showAsync ? html`<async-content load-count="${state.loadCount}"></async-content>` : ''}

        <button @click="${() => { state.loadCount++; }}">
          Increment Load Count (${state.loadCount})
        </button>
      </div>
    `;
  }
});

asyncComponent('async-content', {
  state: { data: null as any },
  props: {
    'load-count': { type: Number, default: 0 }
  },

  renderAsync: createAsyncTemplate(
    async (state) => {
      // Simulate API call based on load count
      await new Promise(resolve => setTimeout(resolve, 500));

      const loadCount = (state as any)['load-count'] || 0;
      state.data = {
        timestamp: new Date().toISOString(),
        loadCount,
        randomData: Math.random().toString(36).substr(2, 9)
      };

      return html`
        <div class="async-content">
          <h3>Async Content</h3>
          <p>Load Count: ${state.data.loadCount}</p>
          <p>Loaded at: ${state.data.timestamp}</p>
          <p>Random Data: ${state.data.randomData}</p>
        </div>
      `;
    },
    {
      // Cache key includes load count so it reloads when prop changes
      cacheKey: (state: any) => `content-${state['load-count']}`,
      dependencies: ['load-count']
    }
  ),

  loadingTemplate: () => html`
    <div class="loading">Loading content...</div>
  `,

  style: `
    .async-content {
      padding: 20px;
      border: 1px solid #ccc;
      border-radius: 4px;
      margin-top: 10px;
      background: #f9f9f9;
    }
    .loading {
      padding: 20px;
      text-align: center;
      color: #666;
    }
  `
});

// Export for use in other files
export { asyncRoutes };
