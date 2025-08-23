# Watch Functionality

The Custom Elements Runtime now includes a powerful **watch** feature that provides Vue-like reactive watching capabilities for component state properties. When watched properties change, registered callback functions are automatically executed.

## ✨ Features

- 🔍 **Basic Watching** - Watch any state property for changes
- 🏗️ **Deep Watching** - Monitor nested object and array changes  
- ⚡ **Immediate Execution** - Execute watchers immediately on component initialization
- 🎯 **Nested Path Watching** - Watch specific nested properties using dot notation
- 📊 **Array Mutation Detection** - Automatically detect array mutations (push, pop, splice, etc.)
- 🛡️ **Error Handling** - Graceful error handling with console logging
- 🧹 **Automatic Cleanup** - Watchers are automatically cleaned up on component disconnect

## 📖 Basic Usage

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

## ⚙️ Watch Options

Watchers support additional configuration options:

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

| Option | Type | Description |
|--------|------|-------------|
| `immediate` | boolean | Execute the watcher immediately when component is created |
| `deep` | boolean | Watch for nested property changes within objects and arrays |

## 🏗️ Deep Watching

Monitor changes to nested properties within objects:

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
    // Watch entire user object for any nested changes
    'user': [
      (newValue, oldValue) => {
        console.log('User object changed (deep watch)');
      },
      { deep: true }
    ],
    
    // Watch specific nested properties
    'user.name': (newValue, oldValue) => {
      console.log(`Name changed: "${oldValue}" → "${newValue}"`);
    },
    
    'user.profile.settings.theme': (newValue, oldValue) => {
      console.log(`Theme changed: "${oldValue}" → "${newValue}"`);
    }
  },
  
  render(state) {
    return html`
      <div>
        <input value=${state.user.name}
               oninput=${(e) => state.user.name = e.target.value}>
        
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

## ⚡ Immediate Watching

Execute watchers immediately when the component initializes:

```typescript
component('config-component', {
  state: {
    apiUrl: 'https://api.example.com',
    timeout: 5000
  },
  
  watch: {
    apiUrl: [
      (newValue, oldValue) => {
        const message = oldValue === undefined
          ? `Initial API URL: ${newValue}`
          : `API URL changed: ${oldValue} → ${newValue}`;
        
        console.log(message);
        // Perform initialization or API connection check
      },
      { immediate: true }
    ]
  },
  
  render(state) {
    return html`<div>API URL: ${state.apiUrl}</div>`;
  }
});
```

## 📊 Array Mutation Detection

Automatically detect and react to array mutations:

```typescript
component('list-component', {
  state: {
    items: ['apple', 'banana', 'cherry']
  },
  
  watch: {
    items: (newArray, oldArray) => {
      console.log(`Array changed: length ${oldArray?.length || 0} → ${newArray.length}`);
      // React to array changes
    }
  },
  
  render(state) {
    return html`
      <div>
        <ul>
          ${state.items.map(item => html`<li>${item}</li>`)}
        </ul>
        
        <button onclick=${() => state.items.push('new item')}>Add Item</button>
        <button onclick=${() => state.items.pop()}>Remove Last</button>
        <button onclick=${() => state.items.reverse()}>Reverse</button>
      </div>
    `;
  }
});
```

## 🛡️ Best Practices

### 1. Avoid State Mutations in Watchers

Never directly modify state within a watcher callback to prevent infinite loops:

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
          .then(results => state.searchResults = results);
      }, 300);
    }
  },
  
  user: (newUser) => {
    // Save to localStorage
    localStorage.setItem('user', JSON.stringify(newUser));
  }
}
```

### 3. Performance Considerations

- Use deep watching sparingly on large nested objects
- Prefer watching specific nested properties when possible  
- Be mindful of expensive operations in frequently triggered watchers
- Consider debouncing for high-frequency updates

## 🧪 Examples

Check out these example files:

- [`examples/watch-showcase.html`](examples/watch-showcase.html) - Comprehensive interactive demo
- [`test-watch-simple.html`](test-watch-simple.html) - Basic examples
- [`test/watch.test.ts`](test/watch.test.ts) - Complete test suite

## 📝 TypeScript Support

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

## 🆚 Comparison with Vue.js

Our watch implementation is inspired by Vue's watch system:

| Feature | Our Implementation | Vue.js |
|---------|-------------------|---------|
| Basic watching | ✅ Same syntax | ✅ |
| Immediate option | ✅ Same behavior | ✅ |
| Deep option | ✅ Same behavior | ✅ |
| Nested property paths | ✅ String paths like 'user.name' | ✅ |
| Array mutations | ✅ Automatic detection | ✅ |
| Watch functions | ❌ Not supported | ✅ |
| Unwatch API | ❌ Auto cleanup only | ✅ |

## 🐛 Troubleshooting

### Watcher Not Firing
1. Verify the property path is correct
2. Ensure the state property actually changes  
3. Check for typos in watch configuration

### Infinite Loops
1. Don't modify the watched property within its watcher
2. Use `setTimeout` for asynchronous state updates
3. Check for circular dependencies between watchers

### Performance Issues  
1. Limit deep watchers on large objects
2. Debounce expensive operations
3. Watch specific nested properties instead of entire objects

## 🚀 Migration from Vue.js

If you're coming from Vue.js, the syntax should feel familiar:

```typescript
// Vue.js
export default {
  data() {
    return { count: 0 }
  },
  watch: {
    count(newVal, oldVal) {
      console.log(newVal, oldVal)
    }
  }
}

// Custom Elements Runtime  
component('my-component', {
  state: { count: 0 },
  watch: {
    count: (newVal, oldVal) => {
      console.log(newVal, oldVal)
    }
  },
  render(state) {
    return html`<div>${state.count}</div>`
  }
})
```

---

The watch functionality brings powerful reactive capabilities to the Custom Elements Runtime, making it easier to build complex, interactive web components with minimal boilerplate code.