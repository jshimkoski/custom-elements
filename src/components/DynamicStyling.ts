import { createReactiveComponent } from '../lib/runtime.js';

// Example 1: Basic Dynamic Styling with Function
type ThemeButtonState = {
  variant: 'primary' | 'secondary' | 'danger';
  size: 'small' | 'medium' | 'large';
  disabled: boolean;
};

const ThemeButton = createReactiveComponent<ThemeButtonState>({
  tag: 'theme-button',
  state: {
    variant: 'primary',
    size: 'medium',
    disabled: false
  },
  template: (state) => `
    <button 
      class="btn btn-${state.variant} btn-${state.size}" 
      ${state.disabled ? 'disabled' : ''}
    >
      <slot></slot>
    </button>
  `,
  style: (state) => `
    .btn {
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      font-weight: 500;
      transition: all 0.2s ease;
      opacity: ${state.disabled ? '0.5' : '1'};
      cursor: ${state.disabled ? 'not-allowed' : 'pointer'};
    }
    
    .btn-small { padding: 8px 16px; font-size: 14px; }
    .btn-medium { padding: 12px 24px; font-size: 16px; }
    .btn-large { padding: 16px 32px; font-size: 18px; }
    
    .btn-primary { 
      background: ${state.variant === 'primary' ? '#007bff' : '#6c757d'}; 
      color: white; 
    }
    .btn-secondary { 
      background: ${state.variant === 'secondary' ? '#6c757d' : '#007bff'}; 
      color: white; 
    }
    .btn-danger { 
      background: ${state.variant === 'danger' ? '#dc3545' : '#6c757d'}; 
      color: white; 
    }
    
    .btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
  `,
  attrs: {
    variant: { type: 'string', reflect: true },
    size: { type: 'string', reflect: true },
    disabled: { type: 'boolean', reflect: true }
  }
});

// Example 2: CSS Custom Properties Approach (More Performant)
type ProgressBarState = {
  progress: number;
  color: string;
  showPercentage: boolean;
  animationDuration: number;
};

const ProgressBar = createReactiveComponent<ProgressBarState>({
  tag: 'progress-bar',
  state: {
    progress: 0,
    color: '#007bff',
    showPercentage: true,
    animationDuration: 300
  },
  template: (state) => `
    <div class="progress-container">
      <div class="progress-bar"></div>
      ${state.showPercentage ? `<span class="percentage">${Math.round(state.progress)}%</span>` : ''}
    </div>
  `,
  style: {
    static: `
      :host {
        display: block;
        width: 100%;
      }
      
      .progress-container {
        position: relative;
        width: 100%;
        height: 20px;
        background-color: #f0f0f0;
        border-radius: 10px;
        overflow: hidden;
      }
      
      .progress-bar {
        height: 100%;
        background-color: var(--progress-color);
        width: var(--progress-width);
        transition: width var(--animation-duration) ease-out;
        border-radius: 10px;
      }
      
      .percentage {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 12px;
        font-weight: bold;
        color: var(--text-color);
      }
    `,
    dynamic: (state) => ({
      '--progress-width': `${Math.max(0, Math.min(100, state.progress))}%`,
      '--progress-color': state.color,
      '--animation-duration': `${state.animationDuration}ms`,
      '--text-color': state.progress > 50 ? 'white' : '#333'
    })
  },
  attrs: {
    progress: { type: 'number', reflect: true },
    color: { type: 'string', reflect: true },
    'show-percentage': { type: 'boolean', reflect: true },
    'animation-duration': { type: 'number', reflect: true }
  }
});

// Example 3: Complex Dynamic Styling with State-Based Classes
type CardState = {
  elevation: 0 | 1 | 2 | 3 | 4 | 5;
  theme: 'light' | 'dark';
  status: 'default' | 'success' | 'warning' | 'error';
  interactive: boolean;
  loading: boolean;
};

const DynamicCard = createReactiveComponent<CardState>({
  tag: 'dynamic-card',
  state: {
    elevation: 1,
    theme: 'light',
    status: 'default',
    interactive: false,
    loading: false
  },
  template: (state) => `
    <div class="card ${state.theme} ${state.status} ${state.interactive ? 'interactive' : ''} ${state.loading ? 'loading' : ''}">
      ${state.loading ? '<div class="loading-spinner"></div>' : ''}
      <slot></slot>
    </div>
  `,
  style: {
    static: `
      :host {
        display: block;
      }
      
      .card {
        padding: 16px;
        border-radius: 8px;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      
      .card.interactive {
        cursor: pointer;
      }
      
      .card.interactive:hover {
        transform: translateY(-2px);
      }
      
      .loading-spinner {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 20px;
        height: 20px;
        border: 2px solid transparent;
        border-top: 2px solid var(--spinner-color);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .card.light {
        background: var(--bg-light);
        color: var(--text-light);
      }
      
      .card.dark {
        background: var(--bg-dark);
        color: var(--text-dark);
      }
      
      .card.success { border-left: 4px solid var(--success-color); }
      .card.warning { border-left: 4px solid var(--warning-color); }
      .card.error { border-left: 4px solid var(--error-color); }
    `,
    dynamic: (state) => {
      const elevations = [
        'none',
        '0 1px 3px rgba(0,0,0,0.12)',
        '0 3px 6px rgba(0,0,0,0.16)',
        '0 6px 12px rgba(0,0,0,0.19)',
        '0 10px 20px rgba(0,0,0,0.22)',
        '0 15px 30px rgba(0,0,0,0.25)'
      ];
      
      return {
        '--elevation': elevations[state.elevation],
        '--bg-light': state.theme === 'light' ? '#ffffff' : '#2d3748',
        '--bg-dark': state.theme === 'dark' ? '#1a202c' : '#f7fafc',
        '--text-light': state.theme === 'light' ? '#2d3748' : '#f7fafc',
        '--text-dark': state.theme === 'dark' ? '#f7fafc' : '#2d3748',
        '--success-color': '#48bb78',
        '--warning-color': '#ed8936',
        '--error-color': '#f56565',
        '--spinner-color': state.theme === 'light' ? '#4299e1' : '#63b3ed',
        'box-shadow': elevations[state.elevation]
      };
    }
  },
  attrs: {
    elevation: { type: 'number', reflect: true },
    theme: { type: 'string', reflect: true },
    status: { type: 'string', reflect: true },
    interactive: { type: 'boolean', reflect: true },
    loading: { type: 'boolean', reflect: true }
  },
  events: {
    '.card.interactive': {
      click: (_e, state, api) => {
        if (!state.loading) {
          api.emit('card-clicked', { state });
        }
      }
    }
  }
});

// Example 4: Animated Theme Switcher
type ThemeSwitcherState = {
  isDark: boolean;
  animating: boolean;
};

const ThemeSwitcher = createReactiveComponent<ThemeSwitcherState>({
  tag: 'theme-switcher',
  state: {
    isDark: false,
    animating: false
  },
  template: (state) => `
    <button class="switch ${state.animating ? 'animating' : ''}" aria-label="Toggle theme">
      <span class="slider"></span>
      <span class="icon">${state.isDark ? '🌙' : '☀️'}</span>
    </button>
  `,
  style: {
    static: `
      .switch {
        position: relative;
        width: 60px;
        height: 30px;
        border: none;
        border-radius: 15px;
        cursor: pointer;
        transition: all 0.3s ease;
        overflow: hidden;
        background-color: var(--bg-color);
      }
      
      .slider {
        position: absolute;
        top: 2px;
        left: var(--slider-position);
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background-color: var(--slider-color);
        transition: all 0.3s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      
      .icon {
        position: absolute;
        top: 50%;
        left: var(--icon-position);
        font-size: 14px;
        transform: translateY(-50%);
        transition: all 0.3s ease;
        z-index: 1;
      }
      
      .switch.animating {
        transform: scale(0.95);
      }
    `,
    dynamic: (state) => ({
      '--bg-color': state.isDark ? '#4a5568' : '#cbd5e0',
      '--slider-color': state.isDark ? '#2d3748' : '#ffffff',
      '--slider-position': state.isDark ? '32px' : '2px',
      '--icon-position': state.isDark ? '8px' : '38px'
    })
  },
  events: {
    '.switch': {
      click: async (_e, state, api) => {
        state.animating = true;
        
        setTimeout(() => {
          state.isDark = !state.isDark;
          state.animating = false;
          
          api.emitGlobal('theme-changed', { 
            theme: state.isDark ? 'dark' : 'light' 
          });
        }, 150);
      }
    }
  }
});

export { ThemeButton, ProgressBar, DynamicCard, ThemeSwitcher };
