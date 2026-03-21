import { component, html, ref } from '../lib';

export function homeDoSomething() {
  console.log('Doing something');
}

component('home-page', () => {
  const name = ref('testing');
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

export default 'home-page';
