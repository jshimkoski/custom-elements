// Examples demonstrating the new concise API features
import { createReactiveComponent, component, simpleComponent } from '../lib/runtime.js';

// 1. Auto tag generation - tag is optional
type CounterState = {
  count: number;
  label: string;
};

const AutoTagCounter = createReactiveComponent<CounterState>({
  // tag: 'auto-counter', // This is now optional - will auto-generate
  state: { count: 0, label: 'Count' },
  template: (state) => `
    <button data-ref="btn">${state.label}: ${state.count}</button>
  `,
  // Lifecycle hook shortcuts - no need for hooks object
  onMounted: (state) => {
    console.log('Counter mounted with state:', state);
  },
  events: {
    '[data-ref="btn"]': {
      click: (_e, state) => state.count++
    }
  }
});

// 2. Attribute auto-inference from state
type TodoState = {
  text: string;
  done: boolean;
  priority: number;
  tags: string[];
  // Note: Computed properties will be defined separately
  displayText?: string;
  priorityLabel?: string;
};

const TodoItem = createReactiveComponent<TodoState>({
  tag: 'todo-item',
  state: {
    text: '',
    done: false,
    priority: 1,
    tags: []
  },
  // Computed properties are defined here instead of as getters
  computed: {
    displayText: (state) => state.done ? `✅ ${state.text}` : state.text,
    priorityLabel: (state) => state.priority === 1 ? 'Low' : state.priority === 2 ? 'Medium' : 'High'
  },
  // Auto-infer attributes from state (simplified syntax)
  attrs: ['text', 'done', 'priority'], // Auto-infer types and enable reflection
  template: (state) => `
    <div class="todo-item ${state.done ? 'done' : ''}">
      <span class="text">${state.displayText}</span>
      <span class="priority">${state.priorityLabel}</span>
      <button data-ref="toggle">Toggle</button>
    </div>
  `,
  // Direct lifecycle hooks (no hooks object needed)
  onMounted: (state) => {
    console.log('Todo mounted:', state.text);
  },
  onUnmounted: (state) => {
    console.log('Todo unmounted:', state.text);
  },
  events: {
    '[data-ref="toggle"]': {
      click: (_e, state) => state.done = !state.done
    }
  },
  style: `
    .todo-item {
      padding: 10px;
      border: 1px solid #ccc;
      margin: 5px 0;
    }
    .todo-item.done {
      opacity: 0.6;
      text-decoration: line-through;
    }
    .priority {
      font-size: 0.8em;
      color: #666;
      margin-left: 10px;
    }
  `
});

// 3. Using the new convenience functions
type SimpleButtonState = {
  text: string;
  count: number;
};

// Super simple component creation
const SimpleButton = simpleComponent<SimpleButtonState>(
  { text: 'Click me', count: 0 },
  (state) => `<button>${state.text} (${state.count})</button>`,
  {
    tag: 'simple-button',
    events: {
      'button': {
        click: (_e, state) => state.count++
      }
    },
    onMounted: () => console.log('Simple button mounted')
  }
);

// 4. Component function with auto tag
type ThemeState = {
  theme: 'light' | 'dark';
  primaryColor: string;
  cssClass?: string; // Will be computed
};

const ThemeProvider = component<ThemeState>({
  state: {
    theme: 'light',
    primaryColor: '#007bff'
  },
  computed: {
    cssClass: (state) => `theme-${state.theme}`
  },
  attrs: ['theme', 'primaryColor'], // Auto-infer types
  template: (state) => `
    <div class="${state.cssClass}" style="--primary-color: ${state.primaryColor}">
      <slot></slot>
    </div>
  `,
  onMounted: (state) => {
    // Setup global theme
    document.body.className = state.cssClass || '';
  },
  style: {
    static: `
      :host {
        display: block;
        color: var(--text-color);
        background: var(--bg-color);
      }
    `,
    dynamic: (state) => ({
      '--text-color': state.theme === 'dark' ? '#fff' : '#000',
      '--bg-color': state.theme === 'dark' ? '#222' : '#fff',
      '--primary-color': state.primaryColor
    })
  }
});

// 5. Even more concise with the component helper and tag specification
const QuickCounter = component('quick-counter', {
  state: { count: 0 },
  template: (state) => `<button>Count: ${state.count}</button>`,
  onMounted: () => console.log('Quick counter mounted'),
  events: {
    'button': {
      click: (_e, state) => state.count++
    }
  }
});

export {
  AutoTagCounter,
  TodoItem,
  SimpleButton,
  ThemeProvider,
  QuickCounter
};
