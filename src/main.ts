import './style.css'
import typescriptLogo from './typescript.svg'
import viteLogo from '/vite.svg'

import './components/FancyCounter';
import './components/ShoppingCart';

import { on, emit } from './lib/event-bus.ts';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <fancy-counter></fancy-counter>

    <app-state-manager></app-state-manager>
    <notification-center></notification-center>
    <product-card name="Laptop" price="999.99" stock="3"></product-card>
    <product-card name="Mouse" price="29.99" stock="10"></product-card>
    <product-card name="Keyboard" price="79.99" stock="0"></product-card>
    <shopping-cart></shopping-cart>

    <a href="https://vite.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>Vite + TypeScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite and TypeScript logos to learn more
    </p>
  </div>
`

// Example of external event triggering:
setTimeout(() => {
  console.log('Emitting welcome notification...');
  emit('notify', { message: 'Welcome to our store!', type: 'success' });
}, 1000);

// Test direct cart addition
setTimeout(() => {
  console.log('Emitting direct cart add item...');
  emit('cart:add-item', { name: 'Test Product', price: 99.99 });
}, 2000);

// Add global debugging
(window as any).debugCart = () => {
  console.log('Manual cart debug triggered');
  emit('cart:add-item', { name: 'Debug Product', price: 123.45 });
};

// Example of listening to events outside components:
on('cart:item-added', (data) => {
  console.log('External listener: Item added to cart', data);
  // Could send analytics, update external systems, etc.
});

// Add a global debug function
(window as any).debugCart = function() {
  console.log('Manual cart test...');
  emit('cart:add-item', { name: 'Debug Item', price: 123.45 });
};

console.log('Debug function available: window.debugCart()');
