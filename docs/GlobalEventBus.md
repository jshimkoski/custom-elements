# Global Event Bus Integration

The global event bus provides a clean way for components to communicate without tight coupling. Here's how to use it:

## Quick Start

```typescript
import { createReactiveComponent } from './runtime.ts';

const MyComponent = createReactiveComponent({
  tag: 'my-component',
  template: (state) => `<div>Count: ${state.count}</div>`,
  initialState: { count: 0 },
  
  hooks: {
    setupGlobalEvents() {
      // Listen to global events
      this.onGlobal('increment', () => {
        this.state.count++;
      });
      
      // Emit global events
      this.emitGlobal('component-mounted', { id: this.getAttribute('id') });
    }
  }
});
```

## API Reference

### Component Methods

All reactive components have these global event methods available:

#### `this.emitGlobal<T>(eventName: string, data?: T)`
Emit a global event that any component can listen to.

```typescript
this.emitGlobal('user-logged-in', { userId: 123, username: 'john' });
```

#### `this.onGlobal<T>(eventName: string, handler: (data: T) => void)`
Listen to a global event. Returns an unsubscribe function.

```typescript
const unsubscribe = this.onGlobal('theme-changed', (theme) => {
  this.updateTheme(theme);
});

// Later: unsubscribe();
```

#### `this.onceGlobal<T>(eventName: string, handler: (data: T) => void)`
Listen to a global event only once. Returns a Promise.

```typescript
const userData = await this.onceGlobal('user-data-loaded');
```

#### `this.listenGlobal<T>(eventName: string, handler: (event: CustomEvent<T>) => void, options?)`
Listen using native event listener with full CustomEvent object.

```typescript
this.listenGlobal('complex-event', (event) => {
  console.log(event.detail, event.timeStamp);
});
```

#### `this.offGlobal<T>(eventName: string, handler: (data: T) => void)`
Remove a specific event handler.

### External API

You can also use the event bus outside of components:

```typescript
import { emit, on, once, eventBus } from './event-bus.ts';

// Emit events
emit('global-update', { timestamp: Date.now() });

// Listen to events
const unsubscribe = on('user-action', (data) => {
  console.log('User action:', data);
});

// One-time listener
const result = await once('async-operation-complete');

// Direct access to event bus
eventBus.getActiveEvents(); // ['user-action', 'global-update']
```

## Patterns

### 1. Component Communication

```typescript
// Publisher Component
const Publisher = createReactiveComponent({
  tag: 'data-publisher',
  hooks: {
    setupGlobalEvents() {
      setInterval(() => {
        this.emitGlobal('data-update', { 
          timestamp: Date.now(),
          value: Math.random() 
        });
      }, 1000);
    }
  }
});

// Subscriber Component  
const Subscriber = createReactiveComponent({
  tag: 'data-subscriber',
  initialState: { lastValue: null },
  hooks: {
    setupGlobalEvents() {
      this.onGlobal('data-update', (data) => {
        this.state.lastValue = data.value;
      });
    }
  }
});
```

### 2. Global State Management

```typescript
const StateManager = createReactiveComponent({
  tag: 'state-manager',
  initialState: { theme: 'light', user: null },
  hooks: {
    setupGlobalEvents() {
      this.onGlobal('set-theme', (theme) => {
        this.state.theme = theme;
        this.emitGlobal('theme-changed', theme);
      });
      
      this.onGlobal('get-state', () => {
        this.emitGlobal('state-response', {
          theme: this.state.theme,
          user: this.state.user
        });
      });
    }
  }
});
```

### 3. Event Aggregation

```typescript
const EventLogger = createReactiveComponent({
  tag: 'event-logger',
  initialState: { events: [] },
  hooks: {
    setupGlobalEvents() {
      // Listen to all cart events
      ['cart:add', 'cart:remove', 'cart:clear'].forEach(eventName => {
        this.onGlobal(eventName, (data) => {
          this.state.events.push({
            type: eventName,
            data,
            timestamp: Date.now()
          });
        });
      });
    }
  }
});
```

## Best Practices

1. **Use Namespaced Event Names**: `cart:add-item` instead of `addItem`
2. **Include Relevant Data**: Always include useful context in event data
3. **Handle Errors Gracefully**: The event bus catches handler errors automatically
4. **Clean Up**: Event listeners are automatically cleaned up when components unmount
5. **Use TypeScript**: Define event data types for better development experience

```typescript
interface CartEvents {
  'cart:add-item': { name: string; price: number };
  'cart:remove-item': { id: number };
  'cart:clear': void;
}

// Usage with typing
this.emitGlobal<CartEvents['cart:add-item']>('cart:add-item', {
  name: 'Product',
  price: 29.99
});
```

## Debugging

The event bus includes debugging helpers:

```typescript
// Check active events
console.log(eventBus.getActiveEvents());

// Check handler count
console.log(eventBus.getHandlerCount('cart:add-item'));

// Clear all handlers (useful in tests)
eventBus.clear();
```
