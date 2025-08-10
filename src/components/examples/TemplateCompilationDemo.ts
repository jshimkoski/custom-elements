import { component, html, compile, type ComponentState } from '../../lib/runtime';

// Minimal test versions first
// Define the state shape for better typing
interface CompiledExampleState extends ComponentState {
  count: number;
}

component<CompiledExampleState>('compiled-template-example', {
  state: {
    count: 0
  },
  template: (state) => compile`
    <div style="border: 2px solid blue; padding: 1rem; background: #e6f3ff;">
      <h3>🚀 Compiled Template Example</h3>
      <p>Count: ${(state: CompiledExampleState) => state.count}</p>
      <button data-on-click="increment">Increment</button>
      <small style="display: block; margin-top: 0.5rem; color: #666;">
        ⚡ This template is compiled for better performance
      </small>
    </div>
  `(state),

  increment: (_e: Event, state: CompiledExampleState) => {
    const currentCount = state.count as number;
    state.count = currentCount + 1;
  }
});

component<CompiledExampleState>('traditional-template-example', {
  state: {
    count: 0
  },
  
  template: (state) => html`
    <div style="border: 2px solid green; padding: 1rem; background: #e6ffe6;">
      <h3>📝 Traditional Template Example</h3>
      <p>Count: ${state.count}</p>
      <button data-on-click="increment">Increment</button>
      <small style="display: block; margin-top: 0.5rem; color: #666;">
        📝 This template uses standard html tag
      </small>
    </div>
  `(state),

  increment: (_e: Event, state: CompiledExampleState) => {
    state.count = state.count + 1;
  }
});
