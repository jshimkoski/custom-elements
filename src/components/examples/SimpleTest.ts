import { component, html, type ComponentState } from '../../lib/runtime';

interface SimpleTestState extends ComponentState {
  message: string;
  clicked: boolean;
}

// Simple test component to verify registration
component<SimpleTestState>('simple-test-component', {
  state: {
    message: 'Hello from Simple Test Component!',
    clicked: false,
  },

  computed: {
    uppercasedMessage: (state: SimpleTestState) => state.message.toUpperCase()
  },

  template: (state) => html`
    <div style="border: 2px solid red; padding: 1rem; margin: 1rem; background: #ffe6e6;">
      <h3>🔴 Simple Test Component</h3>
      <p>${state.message}</p>
      <input type="text" data-model="message" />
      <button data-on-click="uppercasedMessage">${state.uppercasedMessage}</button>
      ${state.clicked ? html`<p>✅ Clicked!</p>` : ''}
    </div>
  `(state),

  updateMessage: (_e: Event, state: SimpleTestState) => {
    const input = _e.target as HTMLInputElement;
    state.message = input.value;
  },

  uppercasedMessage: (_e: Event, state: SimpleTestState) => {
    state.message = 'Updated Message';
    state.clicked = !state.clicked;
    console.log(state.uppercasedMessage);
  }
});

console.log('✅ Simple test component registered!');
