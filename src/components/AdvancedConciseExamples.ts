// Advanced Conciseness Examples - showcasing the latest improvements
import { 
  createReactiveComponent, 
  simpleComponent, 
  quickComponent, 
  functionComponent,
  html,
  css,
  classes
} from '../lib/runtime.js';

// 1. CSS Object Syntax
type ButtonState = {
  variant: 'primary' | 'secondary';
  size: 'small' | 'large';
  disabled: boolean;
};

const StyledButton = createReactiveComponent<ButtonState>({
  state: { variant: 'primary', size: 'large', disabled: false },
  template: (state) => `
    <button class="btn btn-${state.variant} btn-${state.size}" ${state.disabled ? 'disabled' : ''}>
      <slot></slot>
    </button>
  `,
  // CSS Object Syntax - much cleaner than strings
  style: {
    '.btn': {
      padding: '0.5rem 1rem',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontFamily: 'inherit',
      transition: 'all 0.2s ease'
    },
    '.btn-primary': {
      background: '#007bff',
      color: 'white'
    },
    '.btn-secondary': {
      background: '#6c757d',
      color: 'white'
    },
    '.btn-small': {
      fontSize: '0.875rem',
      padding: '0.25rem 0.5rem'
    },
    '.btn-large': {
      fontSize: '1.125rem',
      padding: '0.75rem 1.5rem'
    },
    '.btn:disabled': {
      opacity: '0.6',
      cursor: 'not-allowed'
    }
  },
  forwardProps: true // Auto-forward all props as attributes
});

// 2. Action Shortcuts
type CounterState = {
  count: number;
  step: number;
};

const ActionCounter = createReactiveComponent<CounterState>({
  state: { count: 0, step: 1 },
  template: (state) => `
    <div class="counter">
      <button data-ref="decrement">-</button>
      <span class="count">${state.count}</span>
      <button data-ref="increment">+</button>
      <input type="number" value="${state.step}" data-ref="step" />
    </div>
  `,
  // Define reusable actions (for future use)
  actions: {
    increment: (state) => state.count += state.step,
    decrement: (state) => state.count -= state.step,
    reset: (state) => state.count = 0,
    setStep: (state, _api, value) => state.step = parseInt(value) || 1
  },
  // Use regular event handlers for now
  events: {
    '[data-ref="increment"]': { 
      click: (_e, state) => state.count += state.step
    },
    '[data-ref="decrement"]': { 
      click: (_e, state) => state.count -= state.step
    },
    '[data-ref="step"]': { 
      input: (e, _state, _api) => {
        const target = e.target as HTMLInputElement;
        const newStep = parseInt(target.value) || 1;
        _state.step = newStep;
      }
    }
  },
  style: css`
    .counter {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      border: 1px solid #ccc;
      border-radius: 8px;
    }
    .count {
      font-size: 1.5rem;
      font-weight: bold;
      min-width: 3rem;
      text-align: center;
    }
    button {
      width: 2rem;
      height: 2rem;
      border: none;
      border-radius: 4px;
      background: #007bff;
      color: white;
      cursor: pointer;
    }
  `
});

// 3. Quick Component with Inline Events (Vue/Alpine.js style)
const QuickTodo = quickComponent(
  { text: 'Sample todo', done: false },
  (state) => `
    <div class="todo ${classes({ done: state.done })}">
      <input type="checkbox" data-ref="toggle" ${state.done ? 'checked' : ''}>
      <span>${state.text}</span>
      <button data-ref="remove">×</button>
    </div>
  `,
  {
    toggleDone: (state) => state.done = !state.done,
    remove: (state) => console.log('Remove todo:', state.text)
  }
);

// 8. Function Component Style
const GreetingCard = functionComponent<{ name: string; age: number }>((props) => `
  <div class="card">
    <h2>Hello, ${props.name}!</h2>
    <p>You are ${props.age} years old.</p>
    <small>This is a functional component</small>
  </div>
`);

// Demo usage - create and append to show it works
const greetingElement = GreetingCard({ name: 'Alice', age: 25 });
if (greetingElement instanceof HTMLElement) {
  document.body.appendChild(greetingElement);
}

// 5. Template String Interpolation
type ProfileState = {
  name: string;
  email: string;
  avatar: string;
  online: boolean;
};

const UserProfile = createReactiveComponent<ProfileState>({
  state: {
    name: 'John Doe',
    email: 'john@example.com',
    avatar: '/default-avatar.png',
    online: false
  },
  // Template string interpolation - no need for function
  template: `
    <div class="profile {{online ? 'online' : 'offline'}}">
      <img src="{{avatar}}" alt="{{name}}" class="avatar">
      <div class="info">
        <h3>{{name}}</h3>
        <p>{{email}}</p>
        <span class="status">{{online ? 'Online' : 'Offline'}}</span>
      </div>
    </div>
  `,
  style: {
    '.profile': {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '1rem',
      border: '1px solid #e0e0e0',
      borderRadius: '8px'
    },
    '.profile.online': {
      borderColor: '#4caf50'
    },
    '.profile.offline': {
      borderColor: '#f44336'
    },
    '.avatar': {
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      objectFit: 'cover'
    },
    '.status': {
      fontSize: '0.875rem',
      fontWeight: 'bold'
    },
    '.online .status': {
      color: '#4caf50'
    },
    '.offline .status': {
      color: '#f44336'
    }
  },
  forwardProps: true
});

// 6. Declarative Watchers
type ThemeState = {
  mode: 'light' | 'dark';
  fontSize: number;
  primaryColor: string;
};

// 6. Enhanced Component with Watchers and Advanced Styles
const ThemeManager = createReactiveComponent<ThemeState>({
  state: { mode: 'light', fontSize: 16, primaryColor: '#007bff' },
  template: (state) => `
    <div class=${classes({ active: state.fontSize > 20 })}>
      <h3>Theme: ${state.mode}</h3>
      <p style="font-size: ${state.fontSize}px; color: ${state.primaryColor}">
        Sample text with dynamic styling
      </p>
      <button data-ref="toggle">Toggle Theme</button>
      <input type="range" min="12" max="32" value="${state.fontSize}" data-ref="fontSize">
      <input type="color" value="${state.primaryColor}" data-ref="color">
    </div>
  `,
  events: {
    '[data-ref="toggle"]': { 
      click: (_e, state) => state.mode = state.mode === 'light' ? 'dark' : 'light' 
    },
    '[data-ref="fontSize"]': { 
      input: (e, state) => {
        const target = e.target as HTMLInputElement;
        state.fontSize = parseInt(target.value);
      }
    },
    '[data-ref="color"]': { 
      input: (e, state) => {
        const target = e.target as HTMLInputElement;
        state.primaryColor = target.value;
      }
    }
  },
  style: css`
    .active { border: 2px solid red; }
    div { 
      padding: 1rem; 
      border-radius: 8px;
      transition: all 0.3s ease;
    }
  `
});

// 7. Ultra-concise with all features
const MegaSimpleComponent = simpleComponent(
  { message: 'Hello World!', count: 0 },
  (state) => html`
    <div class=${classes({ active: state.count > 0 })}>
      <p>{{message}}</p>
      <button @click="increment">Clicked {{count}} times</button>
    </div>
  `,
  {
    tag: 'mega-simple',
    actions: {
      increment: (state) => state.count++
    },
    style: {
      'div': { padding: '1rem' },
      'div.active': { background: '#e8f5e8' },
      'button': { 
        background: '#007bff', 
        color: 'white', 
        border: 'none', 
        padding: '0.5rem 1rem',
        borderRadius: '4px',
        cursor: 'pointer'
      }
    }
  }
);

export {
  StyledButton,
  ActionCounter,
  QuickTodo,
  GreetingCard,
  UserProfile,
  ThemeManager,
  MegaSimpleComponent
};
