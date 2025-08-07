import { createReactiveComponent } from '../lib/runtime.js';

// Example: Basic string styling (unchanged from before)
type SimpleButtonState = {
  text: string;
  count: number;
};

const SimpleButton = createReactiveComponent<SimpleButtonState>({
  tag: 'simple-button',
  state: {
    text: 'Click me',
    count: 0
  },
  template: (state) => `
    <button class="btn">
      ${state.text} (${state.count})
    </button>
  `,
  // ✅ Basic string styling works exactly as before
  style: `
    .btn {
      background: #007bff;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      font-size: 16px;
      transition: background 0.2s ease;
    }
    
    .btn:hover {
      background: #0056b3;
    }
    
    .btn:active {
      transform: translateY(1px);
    }
  `,
  events: {
    '.btn': {
      click: (_e, state, _api) => {
        state.count++;
      }
    }
  }
});

// Example: Mixed usage - some components with basic styles, others with dynamic
type StaticCardState = {
  title: string;
  content: string;
};

const StaticCard = createReactiveComponent<StaticCardState>({
  tag: 'static-card',
  state: {
    title: 'Static Card',
    content: 'This card uses basic string styling'
  },
  template: (state) => `
    <div class="card">
      <h3 class="title">${state.title}</h3>
      <p class="content">${state.content}</p>
    </div>
  `,
  // ✅ Simple string styling - no dynamic features needed
  style: `
    .card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      margin: 10px;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .title {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 18px;
    }
    
    .content {
      margin: 0;
      color: #666;
      line-height: 1.5;
    }
  `,
  attrs: {
    title: { type: 'string', reflect: true },
    content: { type: 'string', reflect: true }
  }
});

export { SimpleButton, StaticCard };
