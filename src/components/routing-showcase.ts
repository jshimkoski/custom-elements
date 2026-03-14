import { component, html, ref } from '../lib';
import { initRouter } from '../lib/router';
import { enableJITCSS } from '../lib/jit-css';

enableJITCSS();

// Export a top-level function so tests can exercise and cover it directly.
export function homeDoSomething() {
  console.log('Doing something');
}

component('home-page', () => {
  const name = ref('testing');

  // Use the top-level function in the template so runtime still wires the
  // click handler to the same behavior while allowing coverage tools to
  // attribute execution to a named function.
  const doSomething = homeDoSomething;

  return html`
    <div class="space-y-4 p-4">
      <h1>Home</h1>
      <router-link
        to="/about"
        class="block rounded bg-primary-600 hover:bg-primary-500 text-white px-4 py-2"
        exact-active-class="bg-primary-800"
        >Go to About Page</router-link
      >
      <input class="px-2 py-1 border" type="text" :model="${name}" />
      <button @click="${doSomething}">Do Something</button>
      <p>${name.value}</p>
    </div>
  `;
});

component(
  'about-page',
  () => html`
    <div>
      <h1>About</h1>
      <router-link
        to="/routing"
        class="rounded bg-primary-600 hover:bg-primary-500 text-white px-4 py-2"
        >Go to Home Page</router-link
      >
      <home-page></home-page>
    </div>
  `,
);

const routes = [
  { path: '/routing', component: 'home-page' },
  { path: '/about', component: 'about-page' },
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
