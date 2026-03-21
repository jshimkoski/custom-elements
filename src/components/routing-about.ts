import { component, html } from '../lib';

component('about-page', () => {
  return html`
    <div>
      <h1>About</h1>
      <router-link
        to="/routing"
        class="rounded bg-primary-600 hover:bg-primary-500 text-white px-4 py-2"
        >Go to Home Page</router-link
      >
    </div>
  `;
});

export default 'about-page';
