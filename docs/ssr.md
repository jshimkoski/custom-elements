# 🌐 Server-Side Rendering (SSR)

## SSR Support

- Use `renderToString`, `renderComponentsToString`, and `generateHydrationScript` for server-side rendering and hydration.
- Hydration is opt-in via the `hydrate` property in your component config. If no region is marked, the entire shadow root is hydrated.
- SSR templates must match client templates for correct hydration.

## Complete SSR example with hydration (using helpers):

```typescript
// server-example.js (or .ts)
import {
  renderToString,
  renderComponentsToString,
  generateHydrationScript,
  compile,
  css,
  type SSRComponentConfig
} from '@jasonshimmy/custom-elements-runtime';

const userCardConfig: SSRComponentConfig<{ name: string; email: string; avatar: string; isOnline: boolean }> = {
  state: {
    name: 'John Doe',
    email: 'john@example.com',
    avatar: 'https://via.placeholder.com/80x80',
    isOnline: true
    ## Complete SSR Example with Hydration, Router, and Error Boundaries
  template: ({ name, email, avatar, isOnline }) => compile`
    <div class="user-card">
      <img src="${avatar}" alt="${name}" class="avatar" />
      <div class="info">
        <h3>${name}</h3>
        <p>${email}</p>
        <span class="status ${isOnline ? 'online' : 'offline'}">
          ${isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
    </div>
  `({ name, email, avatar, isOnline }),
  style: css`
    .user-card { display: flex; align-items: center; padding: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .avatar { width: 60px; height: 60px; border-radius: 50%; margin-right: 1rem; }
    .info h3 { margin: 0 0 1rem 0; color: #333; }
    .info p { margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem; }
    .status { padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.8rem; font-weight: bold; }
    .status.online { background: #d4edda; color: #155724; }
    .status.offline { background: #f8d7da; color: #721c24; }
  `
};

const dashboardConfig: SSRComponentConfig<{ title: string; widgets: Array<{ id: number; name: string; value: number }> }> = {
  state: {
    title: 'Analytics Dashboard',
    widgets: [
      { id: 1, name: 'Users', value: 1234 },
      { id: 2, name: 'Revenue', value: 56789 },
      { id: 3, name: 'Orders', value: 432 }
    ]
  },
  template: ({ title, widgets }) => compile`
    <div class="dashboard">
      <h1>${title}</h1>
      <div class="widgets">
        ${widgets.map(widget => `
          <div class="widget">
            <h3>${widget.name}</h3>
            <div class="value">${widget.value.toLocaleString()}</div>
          </div>
        `).join('')}
      </div>
      <div class="summary">
        Total: ${widgets.reduce((sum, w) => sum + w.value, 0).toLocaleString()}
      </div>
    </div>
  `({ title, widgets }),
  style: css`
    .dashboard { padding: 2rem; font-family: system-ui, sans-serif; }
    .widgets { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0; }
    .widget { padding: 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; text-align: center; }
    .widget h3 { margin: 0 0 1rem 0; font-size: 1rem; opacity: 0.9; }
    .value { font-size: 2rem; font-weight: bold; }
    .summary { text-align: center; font-size: 1.2rem; font-weight: bold; color: #333; }
  `
};

const { html, styles, context } = renderComponentsToString([
  userCardConfig,
  dashboardConfig
], {
  includeStyles: false,
  prettyPrint: true
});

const hydrationScript = generateHydrationScript(context);

const fullPage = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SSR Demo</title>
  <style>
    body { margin: 0; padding: 2rem; background: #f5f5f5; font-family: system-ui, sans-serif; }
    const routes = [
      { path: '/', component: 'home-page' },
      { path: '/about', component: 'about-page' }
    ];

    const homePageConfig: SSRComponentConfig<{ title: string }> = {
      state: { title: 'Welcome Home' },
      template: ({ title }) => compile`<h1>${title}</h1>`({ title }),
      style: css`h1 { color: #333; }`,
      onError: (error, state) => `<div>Error: ${error.message}</div>`
    };

    const aboutPageConfig: SSRComponentConfig<{ info: string }> = {
      state: { info: 'About this site' },
      template: ({ info }) => compile`<div>${info}</div>`({ info }),
      style: css`div { font-size: 1.2rem; }`,
      onError: (error, state) => `<div>Error: ${error.message}</div>`
    };

    const matched = matchRouteSSR(routes, '/about');
    const html = renderToString(aboutPageConfig);
    const hydrationScript = generateHydrationScript();
    ${styles}
  </style>
</head>
<body>
  <h1>Server-Side Rendered Components</h1>
  ${html}
  <!-- Hydration script for client-side takeover -->
  ${hydrationScript}
  <!-- Your client-side JavaScript -->
  <script type="module" src="/main.js"></script>
</body>
</html>
`;

// Example server handler (Express, Fastify, etc.)
export function handleSSR(req: any, res: any) {
  res.setHeader('Content-Type', 'text/html');
  res.send(fullPage);
}
```