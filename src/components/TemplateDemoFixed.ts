import { createReactiveComponent, css } from '../lib/runtime.js';

// Simple demo components that use explicit tags to avoid conflicts

// 1. Basic Template Interpolation Demo
export const SimpleDemo = createReactiveComponent({
  tag: 'simple-demo',
  state: { 
    name: 'World', 
    count: 0, 
    isVisible: true 
  },
  template: (state) => `
    <div class="demo">
      <h1>Hello, ${state.name}!</h1>
      <p>Count: ${state.count} (${state.count > 0 ? 'positive' : state.count < 0 ? 'negative' : 'zero'})</p>
      <p class="${state.isVisible ? 'visible' : 'hidden'}">
        Visibility: ${state.isVisible ? 'Shown' : 'Hidden'}
      </p>
      
      <div class="controls">
        <button data-ref="increment">+</button>
        <button data-ref="decrement">-</button>
        <button data-ref="reset">Reset</button>
        <button data-ref="toggle">Toggle</button>
      </div>
      
      <input 
        type="text" 
        value="${state.name}"
        data-ref="nameInput"
        placeholder="Enter name"
      >
    </div>
  `,
  events: {
    '[data-ref="increment"]': { click: (_e, state) => state.count++ },
    '[data-ref="decrement"]': { click: (_e, state) => state.count-- },
    '[data-ref="reset"]': { click: (_e, state) => state.count = 0 },
    '[data-ref="toggle"]': { click: (_e, state) => state.isVisible = !state.isVisible },
    '[data-ref="nameInput"]': { 
      input: (e, state) => {
        const target = e.target as HTMLInputElement;
        state.name = target.value;
      }
    }
  }
});

// 2. Expression Demo 
export const ExpressionDemo = createReactiveComponent({
  tag: 'expression-demo',
  state: {
    user: { firstName: 'John', lastName: 'Doe', age: 25 },
    items: ['apple', 'banana', 'cherry'],
    theme: 'light'
  },
  template: (state) => `
    <div class="expression-demo">
      <h2>${state.user.firstName} ${state.user.lastName}</h2>
      <p>Age: ${state.user.age} (${state.user.age >= 18 ? 'Adult' : 'Minor'})</p>
      <p>Initials: ${state.user.firstName[0] + state.user.lastName[0]}</p>
      <p>Full Name Length: ${(state.user.firstName + ' ' + state.user.lastName).length}</p>
      
      <div class="items">
        Items (${state.items.length}): ${state.items.join(', ')}
      </div>
      
      <div class="theme-${state.theme}">
        Current theme: ${state.theme}
      </div>
      
      <button data-ref="switch-theme">
        Switch to ${state.theme === 'light' ? 'dark' : 'light'}
      </button>
    </div>
  `,
  events: {
    '[data-ref="switch-theme"]': {
      click: (_e, state) => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
      }
    }
  }
});

// 3. Event Demo
export const EventDemo = createReactiveComponent({
  tag: 'event-demo',
  state: {
    message: '',
    log: [] as string[]
  },
  template: (state) => `
    <div class="event-demo">
      <h3>Event Handlers Demo</h3>
      
      <input 
        type="text"
        value="${state.message}"
        data-ref="message-input"
        placeholder="Type something and press Enter or Escape"
      >
      
      <div class="event-area" data-ref="event-area">
        <button data-ref="stop-button">Click me (stops propagation)</button>
        <a href="#" data-ref="prevent-link">Link (prevents default)</a>
      </div>
      
      <div class="log">
        <h4>Event Log:</h4>
        <div>${state.log.join('<br>')}</div>
        <button data-ref="clear-log">Clear Log</button>
      </div>
    </div>
  `,
  events: {
    '[data-ref="message-input"]': {
      input: (e, state) => {
        const target = e.target as HTMLInputElement;
        state.message = target.value;
      },
      keydown: (e, state, _api) => {
        const target = e.target as HTMLInputElement;
        if ((e as KeyboardEvent).key === 'Enter') {
          if (state.message.trim()) {
            state.log.push(`Submitted: "${state.message}"`);
            state.message = '';
            target.value = ''; // Clear the input field
          }
        } else if ((e as KeyboardEvent).key === 'Escape') {
          state.message = '';
          target.value = ''; // Clear the input field
          state.log.push('Message cleared with Escape');
        }
      }
    },
    '[data-ref="event-area"]': {
      click: (_e, state) => {
        state.log.push('Area clicked');
      }
    },
    '[data-ref="stop-button"]': {
      click: (e, state) => {
        e.stopPropagation();
        state.log.push('Button clicked (propagation stopped)');
      }
    },
    '[data-ref="prevent-link"]': {
      click: (e, state) => {
        e.preventDefault();
        state.log.push('Link clicked (default prevented)');
      }
    },
    '[data-ref="clear-log"]': {
      click: (_e, state) => {
        state.log = [];
      }
    }
  }
});

// Add basic styles
const demoStyles = css`
  simple-demo, expression-demo, event-demo {
    display: block;
  }
  
  .demo, .expression-demo, .event-demo {
    max-width: 500px;
    margin: 2rem auto;
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-family: Arial, sans-serif;
  }
  
  .controls {
    margin: 1rem 0;
  }
  
  .controls button {
    margin: 0 0.25rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
  }
  
  .visible {
    color: green;
  }
  
  .hidden {
    color: red;
  }
  
  .theme-light {
    background: #f9f9f9;
    color: #333;
    padding: 0.5rem;
    border-radius: 4px;
  }
  
  .theme-dark {
    background: #333;
    color: #f9f9f9;
    padding: 0.5rem;
    border-radius: 4px;
  }
  
  .event-area {
    border: 2px dashed #ccc;
    padding: 1rem;
    margin: 1rem 0;
  }
  
  .current-message {
    margin: 0.5rem 0;
    padding: 0.5rem;
    background: #e9ecef;
    border-radius: 4px;
    font-style: italic;
  }
  
  .log {
    background: #f5f5f5;
    padding: 1rem;
    border-radius: 4px;
    margin-top: 1rem;
  }
  
  input {
    width: 100%;
    padding: 0.5rem;
    margin: 0.5rem 0;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
`;

// Apply styles
const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(demoStyles);
document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet];
