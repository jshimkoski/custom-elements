# Watch Functionality

The watch feature provides Vue-like reactive watching capabilities for component state properties. When watched properties change, registered callback functions are automatically executed.

## Basic Usage

```typescript
import { component } from './src/lib/runtime.js';
import { html } from './src/lib/template-compiler.js';

component('my-component', {
  state: {
    counter: 0,
    message: 'Hello'
  },
  
  watch: {
    counter: (newValue, oldValue) => {
      console.log(`Counter changed from ${oldValue} to ${newValue}`);
    },
    
    message: (newValue, oldValue) => {
      console.log(`Message changed from "${oldValue}" to "${newValue}"`);
    }
  },
  
  render(state) {
    return html`
      <div>
        <p>Counter: ${state.counter}</p>
        <button onclick=${() => state.counter++}>Increment</button>
        
        <p>Message: ${state.message}</p>
        <input value=${state.message} 
               oninput=${(e) => state.message = e.target.value}>
      </div>
    `;
  }
});
```

## Watch Options

Watchers can be configured with additional options by using the array syntax:

```typescript
watch: {
  // Simple callback
  simpleProperty: (newVal, oldVal) => { /* ... */ },
  
  // With options
  complexProperty: [
    (newVal, oldVal) => { /* ... */ },
    { immediate: true, deep: true }
  ]
}
```

### Available Options

- **`immediate`** (boolean): Execute the watcher immediately when the component is created, with `oldValue` as `undefined`
- **`deep`** (boolean): Watch for nested property changes within objects and arrays

## Deep Watching

Deep watching allows you to monitor changes to nested properties within objects:

```typescript
component('user-profile', {
  state: {
    user: {
      name: 'John',
      profile: {
        email: 'john@example.com',
        settings: {
          theme: 'light'
        }
      }
    }
  },
  
  watch: {
    // Watch the entire user object for any nested changes
    'user': [
      (newValue, oldValue) => {
        console.log('User object changed (deep watch)');
      },
      { deep: true }
    ],
    
    // Watch specific nested properties
    'user.name': (newValue, oldValue) => {
      console.log(`Name changed from "${oldValue}" to "${newValue}"`);
    },
    
    'user.profile.email': (newValue, oldValue) => {
      console.log(`Email changed from "${oldValue}" to "${newValue}"`);
    },
    
    'user.profile.settings.theme': (newValue, oldValue) => {
      console.log(`Theme changed from "${oldValue}" to "${newValue}"`);
    }
  },
  
  render(state) {
    return html`
      <div>
        <h3>User Profile</h3>
        <input value=${state.user.name}
               oninput=${(e) => state.user.name = e.target.value}
               placeholder="Name">
        
        <input value=${state.user.profile.email}
               oninput=${(e) => state.user.profile.email = e.target.value}
               placeholder="Email">
        
        <select value=${state.user.profile.settings.theme}
                onchange=${(e) => state.user.profile.settings.theme = e.target.value}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
    `;
  }
});
```

## Immediate Watching

The `immediate` option executes the watcher callback immediately when the component initializes:

```typescript
component('immediate-example', {
  state: {
    value: 42,
    logs: []
  },
  
  watch: {
    value: [
      (newValue, oldValue) => {
        const message = oldValue === undefined
          ? `Initial value is: ${newValue}`
          : `Value changed from ${oldValue} to ${newValue}`;
        
        console.log(message);
      },
      { immediate: true }
    ]
  },
  
  render(state) {
    return html`
      <div>
        <p>Value: ${state.value}</p>
        <button onclick=${() => state.value = Math.random()}>
          Random Value
        </button>
      </div>
    `;
  }
});
```

## Best Practices

### 1. Avoid State Mutations in Watchers

Never directly modify state within a watcher callback, as this can cause infinite loops:

```typescript
// ❌ DON'T DO THIS
watch: {
  counter: (newVal, oldVal) => {
    state.counter = newVal + 1; // This will cause infinite recursion!
  }
}

// ✅ DO THIS INSTEAD
watch: {
  counter: (newVal, oldVal) => {
    // Perform side effects like API calls, logging, etc.
    console.log(`Counter changed to ${newVal}`);
    
    // If you need to modify state, do it asynchronously
    setTimeout(() => {
      // Safe to modify other properties, but still be careful
      state.otherProperty = newVal * 2;
    }, 0);
  }
}
```

### 2. Use Watchers for Side Effects

Watchers are perfect for:
- API calls triggered by state changes
- Logging and debugging
- Updating localStorage
- Triggering animations
- Sending analytics events

```typescript
watch: {
  searchQuery: (newQuery, oldQuery) => {
    if (newQuery && newQuery !== oldQuery) {
      // Debounce API calls
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        fetch(`/api/search?q=${encodeURIComponent(newQuery)}`)
          .then(response => response.json())
          .then(results => {
            // Update results in state
            state.searchResults = results;
          });
      }, 300);
    }
  },
  
  user: (newUser) => {
    // Save to localStorage
    localStorage.setItem('user', JSON.stringify(newUser));
  }
}
```

### 3. Cleanup in Watchers

For watchers that set up intervals, listeners, or other resources, remember to clean them up:

```typescript
let intervalId;

watch: {
  isActive: (newValue, oldValue) => {
    if (newValue && !oldValue) {
      // Start an interval when becoming active
      intervalId = setInterval(() => {
        console.log('Active!');
      }, 1000);
    } else if (!newValue && oldValue) {
      // Clean up when becoming inactive
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }
  }
}
```

### 4. Performance Considerations

- Use deep watching sparingly, as it can impact performance for large nested objects
- Prefer watching specific nested properties when possible
- Be mindful of expensive operations in frequently triggered watchers

## TypeScript Support

Watchers are fully typed when using TypeScript:

```typescript
interface MyState {
  count: number;
  user: {
    name: string;
    age: number;
  };
}

component<MyState>('typed-component', {
  state: {
    count: 0,
    user: { name: 'John', age: 30 }
  },
  
  watch: {
    count: (newValue: number, oldValue: number) => {
      // TypeScript knows the types here
    },
    
    'user.name': (newValue: string, oldValue: string) => {
      // Nested property types are also inferred
    }
  },
  
  render(state: MyState) {
    return html`<div>Count: ${state.count}</div>`;
  }
});
```

## Comparison with Vue.js

Our watch implementation is inspired by Vue's watch system but with some differences:

| Feature | Our Implementation | Vue.js |
|---------|-------------------|---------|
| Basic watching | ✅ Same syntax | ✅ |
| Immediate option | ✅ Same behavior | ✅ |
| Deep option | ✅ Same behavior | ✅ |
| Nested property paths | ✅ String paths like 'user.name' | ✅ |
| Watch functions | ❌ Not supported | ✅ |
| Watch arrays | ❌ No special syntax | ✅ Special `$watch` API |
| Unwatch | ❌ Auto cleanup only | ✅ Returns unwatch function |

## Examples

Check out these example files to see the watch functionality in action:

- `test-watch-simple.html` - Basic watch examples
- `test-watch-demo.html` - Comprehensive watch demonstrations

## Troubleshooting

### Watcher Not Firing

1. Make sure the property path is correct
2. Verify that the state property actually changes
3. Check for typos in the watch configuration

### Infinite Loops

1. Ensure you're not modifying the watched property within its watcher
2. Use `setTimeout` for asynchronous state updates if needed
3. Check for circular dependencies between watchers

### Performance Issues

1. Limit the use of deep watchers on large objects
2. Debounce expensive operations in watchers
3. Consider watching specific nested properties instead of entire objects