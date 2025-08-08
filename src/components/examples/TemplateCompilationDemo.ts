import { component, html, compile } from '../../lib/runtime';

// Minimal test versions first
// Define the state shape for better typing
interface CompiledExampleState extends Record<string, unknown> {
  count: number;
}

// Pre-compile the template outside the component for better performance
const compiledTemplate = compile<CompiledExampleState>`<div style="border: 2px solid blue; padding: 1rem; background: #e6f3ff;">
  <h3>🚀 Compiled Template Example</h3>
  <p>Count: ${(state: CompiledExampleState) => state.count}</p>
  <button data-ref="increment">Increment</button>
  <small style="display: block; margin-top: 0.5rem; color: #666;">
    ⚡ This template is compiled for better performance
  </small>
</div>`;

component({
  tag: 'compiled-template-example',
  
  state: {
    count: 0
  },
  
  template: (_state) => {
    // Return the pre-compiled template
    return compiledTemplate;
  },
  
  refs: {
    increment: (el, state, api) => {
      el.addEventListener('click', () => {
        const currentCount = state.count as number;
        api.updateKey('count', currentCount + 1);
      });
    }
  }
});

component({
  tag: 'traditional-template-example',
  
  state: {
    count: 0
  },
  
  template: (state) => {
    return html`
      <div style="border: 2px solid green; padding: 1rem; background: #e6ffe6;">
        <h3>📝 Traditional Template Example</h3>
        <p>Count: ${state.count}</p>
        <button data-ref="increment">Increment</button>
        <small style="display: block; margin-top: 0.5rem; color: #666;">
          📝 This template uses standard html tag
        </small>
      </div>
    `;
  },
  
  refs: {
    increment: (el, state, api) => {
      el.addEventListener('click', () => {
        api.updateKey('count', state.count + 1);
      });
    }
  }
});
