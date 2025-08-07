// Comprehensive example showcasing all template helpers
import { component } from '../lib/easy.js';
import { html, css, classes, styles } from '../lib/template-helpers.js';

// State type for the showcase component
type ShowcaseState = {
  // Basic state
  count: number;
  name: string;
  email: string;
  isEnabled: boolean;
  theme: 'light' | 'dark';
  
  // Style state
  primaryColor: string;
  fontSize: number;
  borderRadius: number;
  
  // Dynamic content
  items: Array<{ id: number; text: string; priority: 'low' | 'medium' | 'high'; completed: boolean }>;
  filter: 'all' | 'active' | 'completed';
  
  // UI state
  showModal: boolean;
  loading: boolean;
  error: string | null;
  
  // Computed properties (read-only)
  readonly filteredItems?: Array<{ id: number; text: string; priority: 'low' | 'medium' | 'high'; completed: boolean }>;
  readonly totalItems?: number;
  readonly completedItems?: number;
};

const TemplateHelpersShowcase = component<ShowcaseState>('template-helpers-showcase')({
  state: {
    count: 0,
    name: 'John Doe',
    email: 'john@example.com',
    isEnabled: true,
    theme: 'light',
    primaryColor: '#007bff',
    fontSize: 16,
    borderRadius: 8,
    items: [
      { id: 1, text: 'Learn template helpers', priority: 'high', completed: true },
      { id: 2, text: 'Build awesome components', priority: 'medium', completed: false },
      { id: 3, text: 'Ship to production', priority: 'low', completed: false }
    ],
    filter: 'all',
    showModal: false,
    loading: false,
    error: null
  },

  computed: {
    filteredItems: (state) => {
      switch (state.filter) {
        case 'active': return state.items.filter((item: any) => !item.completed);
        case 'completed': return state.items.filter((item: any) => item.completed);
        default: return state.items;
      }
    },
    totalItems: (state) => state.items.length,
    completedItems: (state) => state.items.filter((item: any) => item.completed).length
  },

  template: (state) => html`
    <div class="showcase-container">
      <header class="showcase-header">
        <h1>🎨 Template Helpers Showcase</h1>
        <p>Demonstrating all template helper functions</p>
      </header>

      <!-- Section 1: HTML Template Literal Helper -->
      <section class="section">
        <h2>1. HTML Template Literal (html\`\`)</h2>
        <p>The <code>html</code> helper provides syntax highlighting and better IDE support:</p>
        
        <div class="demo-box">
          ${html`
            <div class="html-demo">
              <p>✅ This content is rendered using the html template literal</p>
              <p>Current count: <strong>${state.count}</strong></p>
              <button data-action="increment">Increment Count</button>
            </div>
          `}
        </div>
      </section>

      <!-- Section 2: CSS Template Literal Helper -->
      <section class="section">
        <h2>2. CSS Template Literal (css\`\`)</h2>
        <p>The <code>css</code> helper provides syntax highlighting for CSS:</p>
        
        <div class="demo-box">
          <div class="css-demo" style="${styles({
            backgroundColor: state.primaryColor,
            color: 'white',
            padding: '1rem',
            borderRadius: state.borderRadius + 'px',
            fontSize: state.fontSize + 'px'
          })}">
            <p>🎨 This box uses dynamic CSS with the styles() helper</p>
            <p>Background: ${state.primaryColor}</p>
            <p>Font Size: ${state.fontSize}px</p>
            <p>Border Radius: ${state.borderRadius}px</p>
          </div>
        </div>
      </section>

      <!-- Section 3: Classes Helper -->
      <section class="section">
        <h2>3. Classes Helper (classes())</h2>
        <p>The <code>classes</code> helper conditionally applies CSS classes:</p>
        
        <div class="demo-box">
          <div class="${classes({
            'status-box': true,
            'enabled': state.isEnabled,
            'disabled': !state.isEnabled,
            'dark-theme': state.theme === 'dark',
            'light-theme': state.theme === 'light',
            'loading': state.loading
          })}">
            <p>📦 Status Box</p>
            <p>Enabled: ${state.isEnabled ? '✅' : '❌'}</p>
            <p>Theme: ${state.theme}</p>
            <p>Loading: ${state.loading ? '⏳' : '✅'}</p>
            
            <div class="controls">
              <button data-action="toggle-enabled">
                ${state.isEnabled ? 'Disable' : 'Enable'}
              </button>
              <button data-action="toggle-theme">
                Switch to ${state.theme === 'light' ? 'Dark' : 'Light'}
              </button>
              <button data-action="toggle-loading">
                ${state.loading ? 'Stop Loading' : 'Start Loading'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 4: Styles Helper -->
      <section class="section">
        <h2>4. Styles Helper (styles())</h2>
        <p>The <code>styles</code> helper generates inline styles from an object:</p>
        
        <div class="demo-box">
          <div class="style-controls">
            <label>
              Primary Color:
              <input type="color" value="${state.primaryColor}" data-ref="colorPicker" />
            </label>
            <label>
              Font Size: ${state.fontSize}px
              <input type="range" min="12" max="24" value="${state.fontSize}" data-ref="fontSlider" />
            </label>
            <label>
              Border Radius: ${state.borderRadius}px
              <input type="range" min="0" max="20" value="${state.borderRadius}" data-ref="radiusSlider" />
            </label>
          </div>
          
          <div class="dynamic-styles-demo" style="${styles({
            border: `3px solid ${state.primaryColor}`,
            borderRadius: state.borderRadius + 'px',
            fontSize: state.fontSize + 'px',
            padding: '1rem',
            margin: '1rem 0',
            backgroundColor: state.theme === 'dark' ? '#333' : '#f9f9f9',
            color: state.theme === 'dark' ? 'white' : '#333',
            boxShadow: `0 4px 8px rgba(0,0,0,0.1)`,
            transform: state.loading ? 'scale(1.05)' : 'scale(1)',
            transition: 'all 0.3s ease'
          })}">
            🎯 This element's styles are dynamically generated using the styles() helper!
          </div>
        </div>
      </section>

      <!-- Section 5: Form Example with All Helpers -->
      <section class="section">
        <h2>5. Complete Form Example</h2>
        <p>A form showcasing multiple helpers working together:</p>
        
        <div class="demo-box">
          <form class="showcase-form" data-ref="showcaseForm">
            <div class="form-group">
              <label for="name-input">Name:</label>
              <input 
                id="name-input"
                type="text" 
                value="${state.name}"
                data-ref="nameInput"
                class="${classes({
                  'form-input': true,
                  'error': Boolean(state.error && state.name.length < 2),
                  'valid': state.name.length >= 2
                })}"
                style="${styles({
                  borderColor: state.error && state.name.length < 2 ? '#dc3545' : state.primaryColor,
                  fontSize: state.fontSize + 'px'
                })}"
              />
            </div>
            
            <div class="form-group">
              <label for="email-input">Email:</label>
              <input 
                id="email-input"
                type="email" 
                value="${state.email}"
                data-ref="emailInput"
                class="${classes({
                  'form-input': true,
                  'error': Boolean(state.error && !state.email.includes('@')),
                  'valid': state.email.includes('@')
                })}"
                style="${styles({
                  borderColor: state.error && !state.email.includes('@') ? '#dc3545' : state.primaryColor,
                  fontSize: state.fontSize + 'px'
                })}"
              />
            </div>
            
            <div class="${classes({
              'form-actions': true,
              'loading': state.loading
            })}">
              <button type="submit" 
                style="${styles({
                  backgroundColor: state.primaryColor,
                  fontSize: state.fontSize + 'px',
                  borderRadius: state.borderRadius + 'px'
                })}"
                ${state.loading ? 'disabled' : ''}
              >
                ${state.loading ? '⏳ Submitting...' : '✉️ Submit Form'}
              </button>
              
              <button type="button" data-action="show-modal"
                style="${styles({
                  borderColor: state.primaryColor,
                  color: state.primaryColor,
                  fontSize: state.fontSize + 'px',
                  borderRadius: state.borderRadius + 'px'
                })}"
              >
                📋 Show Details
              </button>
            </div>
          </form>
        </div>
      </section>

      <!-- Section 6: Dynamic List with Filtering -->
      <section class="section">
        <h2>6. Dynamic List with Filtering</h2>
        <p>A todo-style list demonstrating conditional rendering:</p>
        
        <div class="demo-box">
          <div class="list-controls">
            <div class="filter-buttons">
              ${['all', 'active', 'completed'].map(filter => html`
                <button 
                  class="${classes({
                    'filter-btn': true,
                    'active': state.filter === filter
                  })}"
                  style="${styles({
                    backgroundColor: state.filter === filter ? state.primaryColor : 'transparent',
                    borderColor: state.primaryColor,
                    color: state.filter === filter ? 'white' : state.primaryColor
                  })}"
                  data-filter="${filter}"
                >
                  ${filter} (${filter === 'all' ? state.totalItems : 
                              filter === 'completed' ? state.completedItems : 
                              (state.totalItems || 0) - (state.completedItems || 0)})
                </button>
              `).join('')}
            </div>
          </div>
          
          <div class="items-list">
            ${(state.filteredItems || []).map(item => html`
              <div class="${classes({
                'list-item': true,
                'completed': item.completed,
                'priority-high': item.priority === 'high',
                'priority-medium': item.priority === 'medium',
                'priority-low': item.priority === 'low'
              })}" style="${styles({
                borderLeftColor: item.priority === 'high' ? '#dc3545' : 
                                item.priority === 'medium' ? '#ffc107' : '#28a745',
                opacity: item.completed ? '0.7' : '1'
              })}">
                <input 
                  type="checkbox" 
                  ${item.completed ? 'checked' : ''}
                  data-item-id="${item.id}"
                />
                <span class="${classes({
                  'item-text': true,
                  'completed-text': item.completed
                })}">${item.text}</span>
                <span class="priority-badge priority-${item.priority}">${item.priority}</span>
                <button class="delete-btn" data-delete-id="${item.id}">×</button>
              </div>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- Modal Example -->
      ${state.showModal ? html`
        <div class="modal-backdrop" data-action="close-modal">
          <div class="modal-content" style="${styles({
            borderRadius: state.borderRadius + 'px',
            borderColor: state.primaryColor
          })}">
            <div class="modal-header">
              <h3>📊 Current State Details</h3>
              <button class="modal-close" data-action="close-modal">×</button>
            </div>
            <div class="modal-body">
              <pre style="${styles({
                fontSize: (state.fontSize - 2) + 'px',
                backgroundColor: state.theme === 'dark' ? '#2d3748' : '#f8f9fa',
                color: state.theme === 'dark' ? '#e2e8f0' : '#495057'
              })}">${JSON.stringify({
                count: state.count,
                name: state.name,
                email: state.email,
                isEnabled: state.isEnabled,
                theme: state.theme,
                primaryColor: state.primaryColor,
                fontSize: state.fontSize,
                borderRadius: state.borderRadius,
                totalItems: state.totalItems,
                completedItems: state.completedItems,
                filter: state.filter
              }, null, 2)}</pre>
            </div>
          </div>
        </div>
      ` : ''}

      ${state.error ? html`
        <div class="error-toast" style="${styles({
          backgroundColor: '#dc3545',
          color: 'white',
          borderRadius: state.borderRadius + 'px'
        })}">
          ❌ ${state.error}
          <button data-action="clear-error">×</button>
        </div>
      ` : ''}
    </div>
  `,

  events: {
    '[data-action="increment"]': {
      click: (_e, state) => {
        state.count++;
      }
    },
    '[data-action="toggle-enabled"]': {
      click: (_e, state) => {
        state.isEnabled = !state.isEnabled;
      }
    },
    '[data-action="toggle-theme"]': {
      click: (_e, state) => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
      }
    },
    '[data-action="toggle-loading"]': {
      click: (_e, state) => {
        state.loading = !state.loading;
      }
    },
    '[data-ref="colorPicker"]': {
      input: (e, state) => {
        state.primaryColor = (e.target as HTMLInputElement).value;
      }
    },
    '[data-ref="fontSlider"]': {
      input: (e, state) => {
        state.fontSize = parseInt((e.target as HTMLInputElement).value);
      }
    },
    '[data-ref="radiusSlider"]': {
      input: (e, state) => {
        state.borderRadius = parseInt((e.target as HTMLInputElement).value);
      }
    },
    '[data-ref="nameInput"]': {
      input: (e, state) => {
        state.name = (e.target as HTMLInputElement).value;
        if (state.error) state.error = null;
      }
    },
    '[data-ref="emailInput"]': {
      input: (e, state) => {
        state.email = (e.target as HTMLInputElement).value;
        if (state.error) state.error = null;
      }
    },
    '[data-ref="showcaseForm"]': {
      submit: (e, state) => {
        e.preventDefault();
        
        if (state.name.length < 2) {
          state.error = 'Name must be at least 2 characters';
          return;
        }
        
        if (!state.email.includes('@')) {
          state.error = 'Please enter a valid email';
          return;
        }
        
        state.loading = true;
        state.error = null;
        
        // Simulate API call
        setTimeout(() => {
          state.loading = false;
          state.showModal = true;
        }, 2000);
      }
    },
    '[data-action="show-modal"]': {
      click: (_e, state) => {
        state.showModal = true;
      }
    },
    '[data-action="close-modal"]': {
      click: (e, state) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.action === 'close-modal') {
          state.showModal = false;
        }
      }
    },
    '[data-filter]': {
      click: (e, state) => {
        const filter = (e.target as HTMLElement).dataset.filter;
        if (filter) {
          state.filter = filter as any;
        }
      }
    },
    '[data-item-id]': {
      change: (e, state) => {
        const id = parseInt((e.target as HTMLElement).dataset.itemId || '0');
        const item = state.items.find((item: any) => item.id === id);
        if (item) {
          item.completed = !item.completed;
        }
      }
    },
    '[data-delete-id]': {
      click: (e, state) => {
        const id = parseInt((e.target as HTMLElement).dataset.deleteId || '0');
        state.items = state.items.filter((item: any) => item.id !== id);
      }
    },
    '[data-action="clear-error"]': {
      click: (_e, state) => {
        state.error = null;
      }
    }
  },

  style: css`
    .showcase-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6;
    }

    .showcase-header {
      text-align: center;
      margin-bottom: 3rem;
      padding: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
    }

    .section {
      margin-bottom: 3rem;
      padding: 2rem;
      border: 1px solid #e1e1e1;
      border-radius: 8px;
      background: white;
    }

    .section h2 {
      color: #333;
      border-bottom: 2px solid #007bff;
      padding-bottom: 0.5rem;
      margin-bottom: 1rem;
    }

    .demo-box {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      padding: 1.5rem;
      margin: 1rem 0;
    }

    .html-demo {
      background: white;
      padding: 1rem;
      border-radius: 4px;
      border-left: 4px solid #28a745;
    }

    .css-demo {
      transition: all 0.3s ease;
      text-align: center;
    }

    .status-box {
      padding: 1.5rem;
      border-radius: 8px;
      text-align: center;
      transition: all 0.3s ease;
      border: 2px solid #dee2e6;
    }

    .status-box.enabled {
      background: #d4edda;
      border-color: #28a745;
      color: #155724;
    }

    .status-box.disabled {
      background: #f8d7da;
      border-color: #dc3545;
      color: #721c24;
    }

    .status-box.dark-theme {
      background: #343a40;
      color: #f8f9fa;
      border-color: #6c757d;
    }

    .status-box.loading {
      animation: pulse 1.5s ease-in-out infinite alternate;
    }

    @keyframes pulse {
      from { transform: scale(1); }
      to { transform: scale(1.02); }
    }

    .controls {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      margin-top: 1rem;
      flex-wrap: wrap;
    }

    .style-controls {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .style-controls label {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-weight: 500;
    }

    .dynamic-styles-demo {
      text-align: center;
      font-weight: 500;
    }

    .showcase-form {
      max-width: 500px;
      margin: 0 auto;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #333;
    }

    .form-input {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #dee2e6;
      border-radius: 4px;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
    }

    .form-input.error {
      box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.25);
    }

    .form-input.valid {
      box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.25);
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .form-actions.loading {
      opacity: 0.7;
    }

    button {
      padding: 0.75rem 1.5rem;
      border: 2px solid transparent;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s ease;
      background: #007bff;
      color: white;
    }

    button:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    button[type="button"] {
      background: transparent;
      border-color: #007bff;
      color: #007bff;
    }

    .list-controls {
      margin-bottom: 1rem;
    }

    .filter-buttons {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .filter-btn {
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
    }

    .items-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .list-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      border-left-width: 4px;
      transition: all 0.2s ease;
    }

    .list-item:hover {
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .list-item.completed {
      background: #f8f9fa;
    }

    .item-text {
      flex: 1;
      font-weight: 500;
    }

    .completed-text {
      text-decoration: line-through;
      opacity: 0.7;
    }

    .priority-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .priority-high {
      background: #f8d7da;
      color: #721c24;
    }

    .priority-medium {
      background: #fff3cd;
      color: #856404;
    }

    .priority-low {
      background: #d4edda;
      color: #155724;
    }

    .delete-btn {
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 50%;
      width: 2rem;
      height: 2rem;
      font-size: 1.2rem;
      line-height: 1;
      padding: 0;
    }

    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 8px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      max-height: 80vh;
      width: 90%;
      overflow: hidden;
      border: 3px solid #007bff;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid #dee2e6;
      background: #f8f9fa;
    }

    .modal-header h3 {
      margin: 0;
      color: #333;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-body {
      padding: 1rem;
      max-height: 400px;
      overflow-y: auto;
    }

    .modal-body pre {
      margin: 0;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .error-toast {
      position: fixed;
      top: 2rem;
      right: 2rem;
      padding: 1rem;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1001;
      display: flex;
      align-items: center;
      gap: 1rem;
      max-width: 400px;
    }

    .error-toast button {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      border-radius: 50%;
      width: 1.5rem;
      height: 1.5rem;
      font-size: 1rem;
      cursor: pointer;
      padding: 0;
    }

    code {
      background: #f8f9fa;
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      color: #e83e8c;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .showcase-container {
        padding: 1rem;
      }
      
      .style-controls {
        grid-template-columns: 1fr;
      }
      
      .form-actions {
        flex-direction: column;
      }
      
      .filter-buttons {
        justify-content: center;
      }
      
      .list-item {
        flex-wrap: wrap;
        gap: 0.5rem;
      }
    }
  `
});

export { TemplateHelpersShowcase };
