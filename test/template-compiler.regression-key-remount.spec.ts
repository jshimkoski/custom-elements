import { it, expect } from 'vitest';
import { component, html, when, each, match } from '../src/lib';

// Mount counter for async-greeting to detect remounts
let asyncMounts = 0;

// Duplicate async-greeting from main.ts (with a small counter increment in render)
component('async-greeting', {
  state: { name: 'World' },

  reload: async (e: Event, state: any) => {
    state.name = 'Dude';
  },

  render: async (state: any) => {
    // count mounts
    asyncMounts++;
    // Simulate API call or dynamic import
    await new Promise((resolve) => setTimeout(resolve, 0));

    return html`
      <div class="greeting">
        <h1>Hello, ${state.name}!</h1>
        <p>This content loaded asynchronously.</p>
        <small>Loaded</small>
        <button @click="${state.reload}">Reload</button>
      </div>
    `;
  },

  loadingTemplate: (state: any) => html`
    <div class="loading">
      <p>Loading greeting for ${state.name}...</p>
      <div class="spinner">⏳</div>
    </div>
  `,

  errorTemplate: (error: any, state: any) => html`
    <div class="error">
      <h3>Failed to load greeting</h3>
      <p>Error: ${error.message}</p>
      <button @click="${() => location.reload()}">Retry</button>
    </div>
  `,
});

// Duplicate my-greeting (simplified to relevant parts) from main.ts
component('my-greeting', {
  state: {
    name: 'World',
    array: ['A', 'B', 'C'],
    email: 'test@me.com',
    age: 25,
    isActive: true,
    color: 'red',
  },
  computed: {
    funnyName(state: any) {
      return `Funny ${state.name}`;
    },
  },
  render(state: any) {
    return html`
      <div>
        <async-greeting></async-greeting>
        <child-component test="${state.name}">
          <stateless-component></stateless-component>
        </child-component>
        <h2>Hello, <span>${state.name}</span></h2>

        <div class="form-group">
          <label>Name:</label>
          <input type="text" :model="name" :show="${state.isActive}" />
        </div>

        <button
          @click="${() => {
            state.name = 'Custom Element';
            state.array = ['D', 'E', 'F'];
          }}"
        >
          Change Name
        </button>
      </div>
    `;
  },
});

it('my-greeting change does not remount async-greeting', async () => {
  asyncMounts = 0;
  const wrapper = document.createElement('div');
  document.body.appendChild(wrapper);
  wrapper.innerHTML = `<my-greeting></my-greeting>`;

  // Allow any microtasks / immediate async renders
  await new Promise((r) => setTimeout(r, 0));

  expect(asyncMounts).toBeGreaterThanOrEqual(1);
  const before = asyncMounts;

  // Find and click the Change Name button inside the component to update state
  const parentEl = wrapper.querySelector('my-greeting') as HTMLElement;
  if (!parentEl) throw new Error('my-greeting not found');

  // Wait for the component to attach shadow DOM and render its content
  let changeBtn: HTMLElement | null = null;
  for (let i = 0; i < 20; i++) {
    if (parentEl.shadowRoot) {
      changeBtn = parentEl.shadowRoot.querySelector('button');
      if (changeBtn) break;
    }
    // wait a bit and retry
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 10));
  }

  if (!changeBtn) throw new Error('Change Name button not found inside my-greeting (shadowRoot)');

  // Capture vnode state before the click
  const beforeVNode = (parentEl.shadowRoot as any)?._prevVNode;
  const beforeChildren = beforeVNode && beforeVNode.children ? beforeVNode.children.map((c: any) => ({ tag: c.tag, key: c.key, props: c.props })) : null;
  // Capture actual DOM element for async-greeting
  const beforeAsyncEl = parentEl.shadowRoot ? parentEl.shadowRoot.querySelector('async-greeting') : null;
  // eslint-disable-next-line no-console
  console.log('BEFORE async element exists', !!beforeAsyncEl);
  // eslint-disable-next-line no-console
  console.log('BEFORE async element outerHTML', beforeAsyncEl ? beforeAsyncEl.outerHTML : '<null>');

  changeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

  // Allow microtasks / async renders
  await new Promise((r) => setTimeout(r, 0));

  // Capture vnode state after the click
  const afterVNode = (parentEl.shadowRoot as any)?._prevVNode;
  const afterChildren = afterVNode && afterVNode.children ? afterVNode.children.map((c: any) => ({ tag: c.tag, key: c.key, props: c.props })) : null;
  // Capture actual DOM element for async-greeting after update
  const afterAsyncEl = parentEl.shadowRoot ? parentEl.shadowRoot.querySelector('async-greeting') : null;
  // eslint-disable-next-line no-console
  console.log('AFTER async element exists', !!afterAsyncEl);
  // eslint-disable-next-line no-console
  console.log('AFTER async element outerHTML', afterAsyncEl ? afterAsyncEl.outerHTML : '<null>');
  // eslint-disable-next-line no-console
  console.log('ASYNC ELEMENT SAME INSTANCE', beforeAsyncEl === afterAsyncEl);

  // Log for debugging
  // eslint-disable-next-line no-console
  console.log('BEFORE CHILDREN', JSON.stringify(beforeChildren, null, 2));
  // eslint-disable-next-line no-console
  console.log('AFTER CHILDREN', JSON.stringify(afterChildren, null, 2));

  expect(asyncMounts).toBe(before);
});

