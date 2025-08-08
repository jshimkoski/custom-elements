import { component, html, css, type ComponentState } from '../../lib/runtime.ts';

// Import the notification system demo
import './NotificationSystem.ts';

// ============================================================================
// COUNTER EXAMPLE - Shows basic reactivity and performance
// ============================================================================

interface CounterState extends ComponentState {
  count: number;
  step: number;
}

component<CounterState>({
  tag: 'perf-counter',
  
  state: {
    count: 0,
    step: 1
  },

  computed: {
    isEven: (state) => state.count % 2 === 0,
    doubled: (state) => state.count * 2,
    message: (state) => `Count is ${state.count} (${(state as any).isEven ? 'even' : 'odd'})`
  },

  template: (state) => html`
    <div class="counter">
      <h2>Performance Counter</h2>
      <div class="display">
        <div class="count">${state.count}</div>
        <div class="info">${(state as any).message}</div>
        <div class="doubled">Doubled: ${(state as any).doubled}</div>
      </div>
      
      <div class="controls">
        <button data-ref="decrement">- ${state.step}</button>
        <input data-ref="stepInput" type="number" value="${state.step}" min="1" max="100">
        <button data-ref="increment">+ ${state.step}</button>
      </div>
      
      <div class="actions">
        <button data-ref="reset">Reset</button>
        <button data-ref="randomize">Random</button>
        <button data-ref="stress">Stress Test</button>
      </div>
    </div>
  `,

  style: css`
    .counter {
      max-width: 300px;
      margin: 1rem;
      padding: 1.5rem;
      border: 2px solid #007bff;
      border-radius: 12px;
      text-align: center;
      font-family: system-ui, sans-serif;
      background: linear-gradient(135deg, #f8f9fa, #e9ecef);
    }

    h2 {
      margin: 0 0 1rem 0;
      color: #007bff;
    }

    .display {
      margin: 1rem 0;
      padding: 1rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .count {
      font-size: 3rem;
      font-weight: bold;
      color: #28a745;
      margin-bottom: 0.5rem;
    }

    .info {
      font-size: 1.1rem;
      color: #6c757d;
      margin-bottom: 0.5rem;
    }

    .doubled {
      font-size: 0.9rem;
      color: #17a2b8;
    }

    .controls, .actions {
      display: flex;
      gap: 0.5rem;
      margin: 1rem 0;
      align-items: center;
    }

    button {
      padding: 0.5rem 1rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    button:hover {
      background: #f8f9fa;
      border-color: #007bff;
    }

    button:active {
      transform: translateY(1px);
    }

    input {
      width: 60px;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      text-align: center;
    }

    [data-ref="stress"] {
      background: #dc3545;
      color: white;
      border-color: #dc3545;
    }

    [data-ref="stress"]:hover {
      background: #c82333;
    }
  `,

  refs: {
    increment: (btn, state, api) => {
      btn.addEventListener('click', () => {
        api.updateKey('count', state.count + state.step);
      });
    },

    decrement: (btn, state, api) => {
      btn.addEventListener('click', () => {
        api.updateKey('count', state.count - state.step);
      });
    },

    stepInput: (input, _state, api) => {
      const inputEl = input as HTMLInputElement;
      inputEl.addEventListener('input', () => {
        const value = parseInt(inputEl.value) || 1;
        api.updateKey('step', Math.max(1, Math.min(100, value)));
      });
    },

    reset: (btn, _state, api) => {
      btn.addEventListener('click', () => {
        api.update({ count: 0, step: 1 });
      });
    },

    randomize: (btn, _state, api) => {
      btn.addEventListener('click', () => {
        api.updateKey('count', Math.floor(Math.random() * 1000));
      });
    },

    stress: (btn, state, api) => {
      btn.addEventListener('click', () => {
        // Test rapid updates - runtime should handle this gracefully
        const startTime = performance.now();
        let updates = 0;
        
        const interval = setInterval(() => {
          api.updateKey('count', state.count + 1);
          updates++;
          
          if (updates >= 100 || performance.now() - startTime > 1000) {
            clearInterval(interval);
            console.log(`Completed ${updates} updates in ${performance.now() - startTime}ms`);
          }
        }, 10);
      });
    }
  }
});

// ============================================================================
// FORM EXAMPLE - Shows form handling and validation
// ============================================================================

interface FormState extends ComponentState {
  name: string;
  email: string;
  age: number;
  newsletter: boolean;
  errors: Record<string, string>;
}

component<FormState>({
  tag: 'smart-form',
  
  state: {
    name: '',
    email: '',
    age: 18,
    newsletter: false,
    errors: {}
  },

  computed: {
    isValid: (state) => {
      return state.name.length > 0 && 
             state.email.includes('@') && 
             state.age >= 13;
    },
    
    summary: (state) => {
      if (!(state as any).isValid) return 'Please complete the form';
      return `${state.name} (${state.age}) - ${state.email}${state.newsletter ? ' + newsletter' : ''}`;
    }
  },

  template: (state) => html`
    <form class="smart-form">
      <h3>Smart Form</h3>
      
      <div class="field">
        <label>Name *</label>
        <input 
          data-ref="nameInput" 
          type="text" 
          value="${state.name}"
          class="${state.errors.name ? 'error' : ''}"
        >
        ${state.errors.name ? html`<span class="error-msg">${state.errors.name}</span>` : ''}
      </div>

      <div class="field">
        <label>Email *</label>
        <input 
          data-ref="emailInput" 
          type="email" 
          value="${state.email}"
          class="${state.errors.email ? 'error' : ''}"
        >
        ${state.errors.email ? html`<span class="error-msg">${state.errors.email}</span>` : ''}
      </div>

      <div class="field">
        <label>Age</label>
        <input 
          data-ref="ageInput" 
          type="number" 
          value="${state.age}" 
          min="13" 
          max="120"
        >
      </div>

      <div class="field checkbox">
        <label>
          <input 
            data-ref="newsletterInput" 
            type="checkbox" 
            ${state.newsletter ? 'checked' : ''}
          >
          Subscribe to newsletter
        </label>
      </div>

      <div class="summary ${(state as any).isValid ? 'valid' : 'invalid'}">
        ${(state as any).summary}
      </div>

      <button type="button" data-ref="submitBtn" ${!(state as any).isValid ? 'disabled' : ''}>
        Submit Form
      </button>
    </form>
  `,

  style: css`
    .smart-form {
      max-width: 400px;
      margin: 1rem;
      padding: 1.5rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
    }

    h3 {
      margin: 0 0 1rem 0;
      color: #333;
    }

    .field {
      margin-bottom: 1rem;
    }

    label {
      display: block;
      margin-bottom: 0.25rem;
      font-weight: 500;
      color: #555;
    }

    input[type="text"], input[type="email"], input[type="number"] {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      box-sizing: border-box;
    }

    input.error {
      border-color: #dc3545;
      background-color: #fff5f5;
    }

    .error-msg {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.25rem;
      display: block;
    }

    .checkbox label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .summary {
      margin: 1rem 0;
      padding: 0.75rem;
      border-radius: 4px;
      font-weight: 500;
    }

    .summary.valid {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .summary.invalid {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    button {
      width: 100%;
      padding: 0.75rem;
      border: none;
      border-radius: 4px;
      background: #007bff;
      color: white;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    button:hover:not(:disabled) {
      background: #0056b3;
    }

    button:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }
  `,

  refs: {
    nameInput: (input, _state, api) => {
      const inputEl = input as HTMLInputElement;
      inputEl.addEventListener('input', () => {
        const value = inputEl.value;
        const errors = { ...api.state.errors };
        
        if (value.length === 0) {
          errors.name = 'Name is required';
        } else if (value.length < 2) {
          errors.name = 'Name must be at least 2 characters';
        } else {
          delete errors.name;
        }
        
        api.update({ name: value, errors });
      });
    },

    emailInput: (input, _state, api) => {
      const inputEl = input as HTMLInputElement;
      inputEl.addEventListener('input', () => {
        const value = inputEl.value;
        const errors = { ...api.state.errors };
        
        if (value.length === 0) {
          errors.email = 'Email is required';
        } else if (!value.includes('@')) {
          errors.email = 'Please enter a valid email';
        } else {
          delete errors.email;
        }
        
        api.update({ email: value, errors });
      });
    },

    ageInput: (input, _state, api) => {
      const inputEl = input as HTMLInputElement;
      inputEl.addEventListener('input', () => {
        const value = parseInt(inputEl.value) || 18;
        api.updateKey('age', Math.max(13, Math.min(120, value)));
      });
    },

    newsletterInput: (input, _state, api) => {
      const inputEl = input as HTMLInputElement;
      inputEl.addEventListener('change', () => {
        api.updateKey('newsletter', inputEl.checked);
      });
    },

    submitBtn: (btn, _state, api) => {
      console.log('🔗 Attaching submit button event listener');
      btn.addEventListener('click', () => {
        console.log('🖱️ Submit button clicked!');
        console.log('Form submitted from component:', api.state);
        api.emit('form-submit', api.state);
      });
    }
  }
});

// ============================================================================
// LIVE TYPING EXAMPLE - Real-time state updates as you type
// ============================================================================

interface LiveTypingState extends ComponentState {
  text: string;
  charCount: number;
  wordCount: number;
  lineCount: number;
  lastTyped: string;
  typingSpeed: number;
  lastKeystroke: number;
}

component<LiveTypingState>({
  tag: 'live-typing-demo',
  
  state: {
    text: '',
    charCount: 0,
    wordCount: 0,
    lineCount: 1,
    lastTyped: '',
    typingSpeed: 0,
    lastKeystroke: Date.now()
  },

  computed: {
    isEmpty: (state) => state.text.length === 0,
    hasText: (state) => state.text.length > 0,
    wordsPerMinute: (state) => Math.round(state.typingSpeed * 60 / 5), // Assuming 5 chars per word
    textPreview: (state) => state.text.length > 100 ? state.text.substring(0, 100) + '...' : state.text,
    textStats: (state) => ({
      chars: state.charCount,
      words: state.wordCount,
      lines: state.lineCount,
      wpm: Math.round(state.typingSpeed * 60 / 5)
    })
  },

  template: (state) => html`
    <div class="live-typing">
      <h2>Live Typing Demo</h2>
      <p class="description">Watch the state update in real-time as you type!</p>
      
      <div class="input-section">
        <label for="textInput">Type something:</label>
        <textarea 
          data-ref="textInput" 
          placeholder="Start typing to see live updates..."
          rows="6"
          cols="50"
        >${state.text}</textarea>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${state.charCount}</div>
          <div class="stat-label">Characters</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">${state.wordCount}</div>
          <div class="stat-label">Words</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">${state.lineCount}</div>
          <div class="stat-label">Lines</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">${(state as any).wordsPerMinute}</div>
          <div class="stat-label">WPM</div>
        </div>
      </div>

      <div class="live-display">
        <h3>Live State Display</h3>
        <div class="state-viewer">
          <div class="state-row">
            <span class="state-key">text:</span>
            <span class="state-value">"${(state as any).textPreview}"</span>
          </div>
          <div class="state-row">
            <span class="state-key">charCount:</span>
            <span class="state-value">${state.charCount}</span>
          </div>
          <div class="state-row">
            <span class="state-key">wordCount:</span>
            <span class="state-value">${state.wordCount}</span>
          </div>
          <div class="state-row">
            <span class="state-key">lineCount:</span>
            <span class="state-value">${state.lineCount}</span>
          </div>
          <div class="state-row">
            <span class="state-key">lastTyped:</span>
            <span class="state-value">"${state.lastTyped}"</span>
          </div>
          <div class="state-row">
            <span class="state-key">typingSpeed:</span>
            <span class="state-value">${state.typingSpeed.toFixed(2)} chars/sec</span>
          </div>
        </div>
      </div>

      <div class="actions">
        <button data-ref="clearBtn">Clear Text</button>
        <button data-ref="sampleBtn">Load Sample</button>
      </div>
    </div>
  `,

  style: css`
    .live-typing {
      max-width: 600px;
      margin: 1rem;
      padding: 1.5rem;
      border: 2px solid #17a2b8;
      border-radius: 12px;
      font-family: system-ui, sans-serif;
      background: linear-gradient(135deg, #f0f8ff, #e6f3ff);
    }

    h2 {
      margin: 0 0 0.5rem 0;
      color: #17a2b8;
    }

    .description {
      margin: 0 0 1.5rem 0;
      color: #6c757d;
      font-style: italic;
    }

    .input-section {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #495057;
    }

    textarea {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #ced4da;
      border-radius: 8px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.9rem;
      resize: vertical;
      transition: border-color 0.2s;
    }

    textarea:focus {
      outline: none;
      border-color: #17a2b8;
      box-shadow: 0 0 0 3px rgba(23, 162, 184, 0.1);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-card {
      background: white;
      padding: 1rem;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border: 1px solid #e9ecef;
    }

    .stat-value {
      font-size: 1.8rem;
      font-weight: bold;
      color: #28a745;
      margin-bottom: 0.25rem;
    }

    .stat-label {
      font-size: 0.9rem;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .live-display {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      border: 1px solid #dee2e6;
    }

    .live-display h3 {
      margin: 0 0 1rem 0;
      color: #495057;
      font-size: 1.1rem;
    }

    .state-viewer {
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.85rem;
      line-height: 1.6;
    }

    .state-row {
      margin-bottom: 0.5rem;
      display: flex;
      align-items: flex-start;
    }

    .state-key {
      color: #6f42c1;
      font-weight: 600;
      min-width: 120px;
      flex-shrink: 0;
    }

    .state-value {
      color: #e83e8c;
      word-break: break-all;
      flex: 1;
    }

    .actions {
      display: flex;
      gap: 0.75rem;
    }

    button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    button:first-child {
      background: #dc3545;
      color: white;
    }

    button:first-child:hover {
      background: #c82333;
      transform: translateY(-1px);
    }

    button:last-child {
      background: #6c757d;
      color: white;
    }

    button:last-child:hover {
      background: #545b62;
      transform: translateY(-1px);
    }

    button:active {
      transform: translateY(0);
    }
  `,

  refs: {
    textInput: (textarea, _state, api) => {
      const textareaEl = textarea as HTMLTextAreaElement;
      
      // Store reference to textarea for other handlers to access
      (api as any).textareaElement = textareaEl;
      
      // Handle input events for real-time updates
      textareaEl.addEventListener('input', (event) => {
        const target = event.target as HTMLTextAreaElement;
        const text = target.value;
        const now = Date.now();
        
        // Calculate character count
        const charCount = text.length;
        
        // Calculate word count (split by whitespace, filter empty strings)
        const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
        
        // Calculate line count
        const lineCount = text === '' ? 1 : text.split('\n').length;
        
        // Get last typed character
        const lastTyped = text.length > 0 ? text.charAt(text.length - 1) : '';
        
        // Calculate typing speed (characters per second)
        const timeDiff = (now - api.state.lastKeystroke) / 1000;
        const typingSpeed = timeDiff > 0 && timeDiff < 5 ? 1 / timeDiff : 0;
        
        // Update all state at once
        api.update({
          text,
          charCount,
          wordCount,
          lineCount,
          lastTyped,
          typingSpeed,
          lastKeystroke: now
        });
      });

      // Handle keydown for more responsive feedback
      textareaEl.addEventListener('keydown', (event) => {
        const key = event.key;
        if (key.length === 1 || key === 'Backspace' || key === 'Delete') {
          api.updateKey('lastTyped', key === 'Backspace' ? '⌫' : key === 'Delete' ? '⌦' : key);
        }
      });
    },

    clearBtn: (btn, _state, api) => {
      btn.addEventListener('click', () => {
        // Update both state and textarea value
        const textareaEl = (api as any).textareaElement as HTMLTextAreaElement;
        if (textareaEl) {
          textareaEl.value = '';
        }
        
        api.update({
          text: '',
          charCount: 0,
          wordCount: 0,
          lineCount: 1,
          lastTyped: '',
          typingSpeed: 0,
          lastKeystroke: Date.now()
        });
      });
    },

    sampleBtn: (btn, _state, api) => {
      btn.addEventListener('click', () => {
        const sampleText = `This is a sample text to demonstrate the live typing feature.

You can see how the state updates in real-time as you type, including:
- Character count
- Word count
- Line count
- Typing speed
- Last typed character

Try editing this text to see the live updates!`;

        const charCount = sampleText.length;
        const wordCount = sampleText.trim().split(/\s+/).length;
        const lineCount = sampleText.split('\n').length;

        // Update both state and textarea value
        const textareaEl = (api as any).textareaElement as HTMLTextAreaElement;
        if (textareaEl) {
          textareaEl.value = sampleText;
        }

        api.update({
          text: sampleText,
          charCount,
          wordCount,
          lineCount,
          lastTyped: '',
          typingSpeed: 0,
          lastKeystroke: Date.now()
        });
      });
    }
  }
});
