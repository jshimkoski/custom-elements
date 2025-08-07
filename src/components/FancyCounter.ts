
import { createReactiveComponent } from '../lib/runtime';

type CounterState = {
  label: string;
  count: number;
  theme: 'light' | 'dark';
  isDark?: boolean;
};

createReactiveComponent<CounterState>({
  tag: 'fancy-counter',
  state: {
    label: 'Clicks',
    count: 0,
    theme: 'light'
  },
  computed: {
    isDark: (state) => state.theme === 'dark'
  },
  attrs: {
    label: { type: 'string' },
    count: { type: 'number', reflect: true },
    theme: {
      type: 'string',
      serialize: (val) => val.toUpperCase(),
      deserialize: (val) => val.toLowerCase(),
    }
  },
  template: (state) => `
    <div class="container ${state.theme}">
      <h2>${state.label}: <span data-ref="count">${state.count}</span></h2>
      ${state.isDark ? '<p>Dark mode is enabled</p>' : ''}
      <button data-ref="btn">+</button>
      <slot></slot>
    </div>
  `,
  style: `
    .container {
      font-family: sans-serif;
      padding: 1rem;
      border-radius: 8px;
    }
    .container.light {
      background: #f9f9f9;
      color: #222;
    }
    .container.dark {
      background: #222;
      color: #f9f9f9;
    }
    button {
      padding: 0.5rem 1rem;
      font-size: 1.1rem;
    }
  `,
  refs: {
    btn: (el, _state, _api) => el.setAttribute('aria-label', 'Increment button'),
    count: (el, _state, _api) => el.setAttribute('aria-live', 'polite')
  },
  events: {
    '[data-ref="btn"]': {
      click: (_e, state, api) => {
        state.count++;
        api.emitGlobal('counter-incremented', { count: state.count });
      }
    }
  },
  hooks: {
    onMounted(state, api) {
      console.log('FancyCounter mounted:', state);
      api.emitGlobal('component-mounted', { type: 'fancy-counter', state });
    },
    onUnmounted(_state, _api) {
      console.log('FancyCounter unmounted');
    },
    onAccessibleRender(shadow, _state, _api) {
      const heading = shadow.querySelector('h2');
      if (heading) heading.setAttribute('role', 'status');
    }
  },
  disposables: [
    (state, api) => {
      const interval = setInterval(() => {
        console.log('💡 FancyCounter heartbeat');
        api.emitGlobal('heartbeat', { component: 'fancy-counter', count: state.count });
      }, 5000);
      return {
        dispose: () => clearInterval(interval)
      };
    }
  ],
  watch: {
    count(newVal, oldVal, _state, api) {
      console.log(`Count changed from ${oldVal} to ${newVal}`);
      api.emit('count-changed', { newVal, oldVal });
    },
    label(newVal, oldVal, _state, _api) {
      console.log(`Label changed from "${oldVal}" to "${newVal}"`);
    }
  },
  // reflectAttributes: true
});
