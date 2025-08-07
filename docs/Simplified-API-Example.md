# Simplified Component API

The runtime has been updated to eliminate the need for component authors to use `this` references. All callbacks now receive the component state and API as parameters.

## Before (using `this`)

```typescript
createReactiveComponent({
  tag: 'my-component',
  state: { count: 0 },
  events: {
    'button': {
      click: function(this: any, e: Event) {
        this.state.count++;
        this.emitGlobal('count-changed', this.state.count);
      }
    }
  },
  hooks: {
    onMounted(this: any) {
      console.log('Mounted with state:', this.state);
      this.onGlobal('reset', () => {
        this.state.count = 0;
      });
    }
  },
  watch: {
    count(this: any, newVal, oldVal) {
      this.emit('count-updated', { newVal, oldVal });
    }
  }
});
```

## After (functional approach)

```typescript
createReactiveComponent({
  tag: 'my-component',
  state: { count: 0 },
  events: {
    'button': {
      click: (e, state, api) => {
        state.count++;
        api.emitGlobal('count-changed', state.count);
      }
    }
  },
  hooks: {
    onMounted: (state, api) => {
      console.log('Mounted with state:', state);
      api.onGlobal('reset', () => {
        state.count = 0;
      });
    }
  },
  watch: {
    count: (newVal, oldVal, state, api) => {
      api.emit('count-updated', { newVal, oldVal });
    }
  }
});
```

## Benefits

1. **No more `this` context** - Everything is passed as parameters
2. **Better TypeScript support** - Clearer parameter types
3. **Functional programming style** - More predictable and testable
4. **Direct access to state and API** - No need to remember what `this` refers to
5. **Easier to understand** - Clear parameter names make the code self-documenting

## Component API

All callbacks receive a `ComponentAPI` object with these methods:

- `emit(eventName, detail)` - Emit a custom event from the component
- `emitGlobal(eventName, data)` - Emit a global event via the event bus
- `onGlobal(eventName, handler)` - Listen to global events
- `onceGlobal(eventName, handler)` - Listen to a global event once
- `listenGlobal(eventName, handler, options)` - Listen to global DOM events
- `offGlobal(eventName, handler)` - Remove a global event listener

## Callback Signatures

### Events
```typescript
events: {
  '[selector]': {
    [eventType]: (event: Event, state: TState, api: ComponentAPI) => void
  }
}
```

### Refs
```typescript
refs: {
  [refKey]: (element: Element, state: TState, api: ComponentAPI) => void
}
```

### Hooks
```typescript
hooks: {
  onMounted: (state: TState, api: ComponentAPI) => void,
  onUnmounted: (state: TState, api: ComponentAPI) => void,
  beforeRender: (state: TState, api: ComponentAPI) => boolean | void,
  renderShadow: (root: ShadowRoot, state: TState, api: ComponentAPI) => void,
  onAccessibleRender: (root: ShadowRoot, state: TState, api: ComponentAPI) => void,
  setupGlobalEvents: (state: TState, api: ComponentAPI) => void
}
```

### Watch
```typescript
watch: {
  [property]: (newValue: any, oldValue: any, state: TState, api: ComponentAPI) => void
}
```

### Computed
```typescript
computed: {
  [property]: (state: TState, api: ComponentAPI) => any
}
```

### Disposables
```typescript
disposables: [
  (state: TState, api: ComponentAPI) => Disposable
]
```

This approach makes component development more intuitive and removes the confusion around JavaScript's `this` binding.
