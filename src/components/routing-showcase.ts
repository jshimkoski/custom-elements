import { component, html } from '../lib';
import { initRouter } from '../lib/router';
import { enableJITCSS } from '../lib/jit-css';

enableJITCSS();

// Export for test compatibility
export { homeDoSomething } from './routing-home';

const routes = [
  {
    path: '/routing',
    load: () => import('./routing-home'),
  },
  {
    path: '/about',
    load: () => import('./routing-about'),
  },
];

initRouter({ routes });

component(
  'routing-showcase',
  () => html`
    <div>
      <router-view></router-view>
    </div>
  `,
);
