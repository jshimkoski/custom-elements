import { component, html, css, type ComponentState } from '../../lib/runtime.ts';

// Import the notification system demo
import './NotificationSystem.ts';
// Import the reactive form demo
import './ReactiveForm.ts';

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

interface LiveTypingState extends ComponentState {
  text: string;
  charCount: number;
}

component<LiveTypingState>({
  tag: 'test-live-typing',
  
  state: {
    text: '',
    charCount: 0
  },

  template: (state) => html`
    <div style="padding: 20px; border: 1px solid #ccc;">
      <h3>Simple Live Typing Test</h3>
      <textarea 
        data-ref="textInput" 
        value="${state.text}"
        placeholder="Type here..."
        rows="4"
        cols="50"
      ></textarea>
      <p>Characters: ${state.charCount}</p>
      <button data-ref="clearBtn">Clear</button>
      <button data-ref="sampleBtn">Load Sample</button>
    </div>
  `,

  refs: {
    textInput: (textarea, _state, api) => {
      const textareaEl = textarea as HTMLTextAreaElement;
      
      textareaEl.addEventListener('input', (event) => {
        const target = event.target as HTMLTextAreaElement;
        const text = target.value;
        
        api.update({
          text,
          charCount: text.length
        });
      });
    },

    clearBtn: (btn, _state, api) => {
      btn.addEventListener('click', () => {
        console.log('Clear clicked - current text:', api.state.text);
        api.update({
          text: '',
          charCount: 0
        });
        console.log('Clear clicked - new text:', api.state.text);
      });
    },

    sampleBtn: (btn, _state, api) => {
      btn.addEventListener('click', () => {
        const sampleText = 'This is sample text to test the functionality.';
        console.log('Sample clicked - current text:', api.state.text);
        api.update({
          text: sampleText,
          charCount: sampleText.length
        });
        console.log('Sample clicked - new text:', api.state.text);
      });
    }
  }
});
