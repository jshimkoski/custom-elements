# Dynamic Styling in Reactive Components

The runtime now supports dynamic styling that responds to component state changes. This feature is designed to be **performant**, **scalable**, and **easy to use**.

## Overview

Dynamic styling allows you to update component styles based on state changes using three different approaches:

1. **Function-based styling** - Complete CSS regeneration
2. **CSS Custom Properties** - Performant variable updates
3. **Hybrid approach** - Static base styles with dynamic properties

## API

```typescript
type StyleDefinition<TState> = 
  | string                                    // Static CSS
  | ((state: TState) => string)              // Dynamic CSS function
  | {                                        // Hybrid approach
      static?: string;
      dynamic?: (state: TState) => string | Record<string, string>;
    };
```

## Approach 1: Function-Based Dynamic Styling

This approach regenerates the entire stylesheet when state changes. Use for simple cases or when you need complete control.

```typescript
const ThemeButton = createReactiveComponent<ButtonState>({
  tag: 'theme-button',
  state: { variant: 'primary', disabled: false },
  
  style: (state) => `
    .btn {
      background: ${state.variant === 'primary' ? '#007bff' : '#6c757d'};
      opacity: ${state.disabled ? '0.5' : '1'};
      cursor: ${state.disabled ? 'not-allowed' : 'pointer'};
      transition: all 0.2s ease;
    }
    
    .btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
  `,
  
  template: (state) => `
    <button class="btn" ${state.disabled ? 'disabled' : ''}>
      <slot></slot>
    </button>
  `
});
```

### Pros:
- Complete control over CSS
- Can generate complex conditional styles
- Easy to understand

### Cons:
- Performance impact on every state change
- Entire stylesheet is recreated

## Approach 2: CSS Custom Properties (Recommended)

This approach uses CSS custom properties (CSS variables) for optimal performance. Only the variable values are updated, not the entire stylesheet.

```typescript
const ProgressBar = createReactiveComponent<ProgressState>({
  tag: 'progress-bar',
  state: { progress: 0, color: '#007bff' },
  
  style: {
    static: `
      .progress-container {
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
        transition: width 0.3s ease-out;
      }
    `,
    dynamic: (state) => ({
      '--progress-width': `${Math.max(0, Math.min(100, state.progress))}%`,
      '--progress-color': state.color
    })
  },
  
  template: (state) => `
    <div class="progress-container">
      <div class="progress-bar"></div>
    </div>
  `
});
```

### Pros:
- **Excellent performance** - Only CSS variables are updated
- **Smooth animations** - CSS transitions work perfectly
- **Browser optimized** - Leverages native CSS custom property performance

### Cons:
- Requires CSS custom property knowledge
- Limited to property-based changes

## Approach 3: String-Based Dynamic CSS

Return a CSS string from the dynamic function for more complex styling needs.

```typescript
const ComplexCard = createReactiveComponent<CardState>({
  tag: 'complex-card',
  state: { theme: 'light', elevation: 1, status: 'default' },
  
  style: {
    static: `
      .card {
        padding: 16px;
        border-radius: 8px;
        transition: all 0.3s ease;
      }
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
      
      return `
        .card {
          background: ${state.theme === 'light' ? '#ffffff' : '#2d3748'};
          color: ${state.theme === 'light' ? '#2d3748' : '#ffffff'};
          box-shadow: ${elevations[state.elevation]};
        }
        
        .card.success { border-left: 4px solid #48bb78; }
        .card.warning { border-left: 4px solid #ed8936; }
        .card.error { border-left: 4px solid #f56565; }
      `;
    }
  }
});
```

## Performance Considerations

### 1. **CSS Custom Properties (Best Performance)**
```typescript
// ✅ Recommended: Only CSS variables are updated
dynamic: (state) => ({
  '--primary-color': state.color,
  '--opacity': state.disabled ? '0.5' : '1'
})
```

### 2. **Conditional Rendering (Good Performance)**
```typescript
// ✅ Good: Render skipped when styles haven't changed
style: (state) => {
  if (state.lastStyleState === state.theme) return lastGeneratedCSS;
  // Generate new CSS only when needed
}
```

### 3. **Avoid Heavy Computations (Poor Performance)**
```typescript
// ❌ Avoid: Heavy computation on every render
style: (state) => {
  // Expensive operations here will impact performance
  const complexCalculation = heavyFunction(state);
  return `/* CSS using ${complexCalculation} */`;
}
```

## Caching and Optimization

The runtime automatically caches stylesheets and only updates them when:
1. State changes (for dynamic styles)
2. The component is re-rendered
3. Template changes

```typescript
// Internal caching logic (handled automatically)
const StylesheetCache = new WeakMap<object, CSSStyleSheet>();
```

## Best Practices

### 1. Use CSS Custom Properties for Animations
```typescript
// ✅ Great for animations
style: {
  static: `
    .element {
      transform: translateX(var(--position));
      transition: transform 0.3s ease;
    }
  `,
  dynamic: (state) => ({
    '--position': `${state.x}px`
  })
}
```

### 2. Combine Static and Dynamic Styles
```typescript
// ✅ Optimal approach
style: {
  static: `
    /* Base styles that never change */
    .component { 
      display: flex; 
      border-radius: 4px; 
    }
  `,
  dynamic: (state) => ({
    /* Only dynamic values */
    '--bg-color': state.backgroundColor,
    '--text-color': state.textColor
  })
}
```

### 3. Use Semantic CSS Custom Properties
```typescript
// ✅ Semantic naming
dynamic: (state) => ({
  '--primary-color': state.theme.primary,
  '--secondary-color': state.theme.secondary,
  '--danger-color': state.theme.danger
})
```

### 4. Avoid Inline Styles in Templates
```typescript
// ❌ Avoid inline styles
template: (state) => `
  <div style="color: ${state.color}; background: ${state.bg}">
    Content
  </div>
`;

// ✅ Use CSS classes with dynamic properties
template: (state) => `<div class="themed-content">Content</div>`;
style: {
  static: `.themed-content { color: var(--text-color); background: var(--bg-color); }`,
  dynamic: (state) => ({
    '--text-color': state.color,
    '--bg-color': state.bg
  })
}
```

## Real-World Examples

### Theme System
```typescript
const ThemeProvider = createReactiveComponent<ThemeState>({
  tag: 'theme-provider',
  state: { mode: 'light', accentColor: '#007bff' },
  
  style: {
    static: `
      :host {
        display: block;
        color: var(--text-primary);
        background: var(--bg-primary);
      }
    `,
    dynamic: (state) => {
      const themes = {
        light: {
          '--text-primary': '#2d3748',
          '--text-secondary': '#718096',
          '--bg-primary': '#ffffff',
          '--bg-secondary': '#f7fafc'
        },
        dark: {
          '--text-primary': '#f7fafc',
          '--text-secondary': '#a0aec0',
          '--bg-primary': '#1a202c',
          '--bg-secondary': '#2d3748'
        }
      };
      
      return {
        ...themes[state.mode],
        '--accent-color': state.accentColor
      };
    }
  }
});
```

### Responsive Components
```typescript
const ResponsiveGrid = createReactiveComponent<GridState>({
  tag: 'responsive-grid',
  state: { columns: 3, gap: '16px', breakpoint: 'desktop' },
  
  style: {
    static: `
      .grid {
        display: grid;
        grid-template-columns: var(--grid-columns);
        gap: var(--grid-gap);
      }
    `,
    dynamic: (state) => ({
      '--grid-columns': `repeat(${state.columns}, 1fr)`,
      '--grid-gap': state.gap
    })
  }
});
```

## Migration from Static Styles

If you have existing components with static styles, you can easily migrate:

```typescript
// Before: Static styles
style: `
  .button {
    background: #007bff;
    padding: 12px 24px;
  }
`

// After: Dynamic styles
style: {
  static: `
    .button {
      padding: var(--button-padding);
      background: var(--button-bg);
    }
  `,
  dynamic: (state) => ({
    '--button-bg': state.variant === 'primary' ? '#007bff' : '#6c757d',
    '--button-padding': state.size === 'large' ? '16px 32px' : '12px 24px'
  })
}
```

This dynamic styling system provides the flexibility you need while maintaining excellent performance through smart caching and CSS custom property optimization.
