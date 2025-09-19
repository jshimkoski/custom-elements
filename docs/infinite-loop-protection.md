# 🛡️ Infinite Loop Protection

The runtime includes comprehensive protection mechanisms to prevent common mistakes that lead to infinite render loops, providing helpful error messages and automatic safeguards.

## 🚨 Common Patterns That Cause Infinite Loops

### ❌ Immediate Function Invocation in Event Handlers

```typescript
// BAD: Calls function immediately during render
@click="${doSomething()}"

// GOOD: Passes function reference
@click="${doSomething}"
@click="${() => doSomething()}"
```

### ❌ State Modification During Render

```typescript
// BAD: Modifying state during render
component('bad-example', () => {
  const count = ref(0);
  
  // This causes infinite loop!
  count.value = count.value + 1;
  
  return html`<div>${count.value}</div>`;
});

// GOOD: Modify state in event handlers
component('good-example', () => {
  const count = ref(0);
  
  const increment = () => {
    count.value = count.value + 1;
  };
  
  return html`
    <div>${count.value}</div>
    <button @click="${increment}">+</button>
  `;
});
```

### ❌ Side Effects in Computed Properties

```typescript
// BAD: Computed modifying other state
const badComputed = computed(() => {
  if (count.value > 5) {
    message.value = 'High!'; // Causes infinite loop!
  }
  return count.value * 2;
});

// GOOD: Pure computed properties
const goodComputed = computed(() => {
  return count.value > 5 ? 'High!' : 'Normal';
});
```

## 🛡️ Protection Mechanisms

### 1. Event Handler Validation

The runtime automatically detects problematic event handlers:

```typescript
// Warns about null/undefined handlers
@click="${null}"          // ⚠️ Warning
@click="${undefined}"     // ⚠️ Warning

// Warns about immediate invocation results
@click="${someFunction()}" // 🚨 Error - immediate call
```

**Warning Message:**
```
🚨 Potential infinite loop detected! Event handler for '@click' appears to be 
the result of a function call (undefined) instead of a function reference. 
Change @click="${functionName()}" to @click="${functionName}" 
to pass the function reference instead of calling it immediately.
```

### 2. Render-Time State Modification Detection

Detects state changes during component render:

```typescript
component('protected-component', () => {
  const state = ref(0);
  
  // This triggers a warning:
  state.value = 1; // 🚨 State modification during render!
  
  return html`<div>${state.value}</div>`;
});
```

**Warning Message:**
```
🚨 State modification detected during render! This can cause infinite loops.
  • Move state updates to event handlers
  • Use useEffect/watch for side effects
  • Ensure computed properties don't modify state
```

### 3. Excessive Render Protection

Automatically throttles components with rapid re-renders:

- **5 renders in 16ms**: Early warning
- **15 renders in 16ms**: Error message with debugging tips
- **20+ renders in 16ms**: Automatic throttling with 100ms delay
- **Extreme cases**: Complete render blocking to prevent browser freeze

**Progressive Messages:**
```
⚠️ Component is re-rendering rapidly. This might indicate:
  • Event handler calling a function immediately: @click="${fn()}" should be @click="${fn}"
  • State modification during render
  • Missing dependencies in computed/watch

🚨 Infinite render loop detected! Component has rendered 15 times in rapid succession.
  Common causes:
  • @click="${handler()}" - should be @click="${handler}"
  • Modifying reactive state during render
  • State updates in computed properties without proper dependencies
  Component rendering will be throttled to prevent browser freeze.

🛑 Stopping runaway component render to prevent browser freeze
```

## 💡 Best Practices

### ✅ Correct Event Handler Patterns

```typescript
component('event-example', () => {
  const count = ref(0);
  const emit = useEmit();
  
  // All these are correct:
  const increment = () => count.value++;
  const decrement = () => count.value--;
  const reset = () => count.value = 0;
  const notify = () => emit('count-changed', count.value);
  
  return html`
    <div>Count: ${count.value}</div>
    <button @click="${increment}">+</button>
    <button @click="${decrement}">-</button>
    <button @click="${reset}">Reset</button>
    <button @click="${() => notify()}">Notify</button>
  `;
});
```

### ✅ Safe State Management

```typescript
component('safe-state', () => {
  const items = state<string[]>([]);
  const filter = ref('');
  
  // ✅ Pure computed - no side effects
  const filteredItems = computed(() =>
    items.value.filter(item => 
      item.toLowerCase().includes(filter.value.toLowerCase())
    )
  );
  
  // ✅ State updates in event handlers
  const addItem = (item: string) => {
    items.value = [...items.value, item];
  };
  
  const updateFilter = (e: Event) => {
    filter.value = (e.target as HTMLInputElement).value;
  };
  
  return html`
    <input @input="${updateFilter}" placeholder="Filter...">
    <ul>
      ${each(filteredItems.value, item => html`<li>${item}</li>`)}
    </ul>
  `;
});
```

## 🔧 Debugging Infinite Loops

If you encounter infinite loop warnings:

1. **Check event handlers** - Look for `@event="${fn()}"` patterns
2. **Review state modifications** - Ensure no state changes during render
3. **Examine computed properties** - Verify they're pure functions
4. **Use browser DevTools** - Check the call stack when warnings appear
5. **Enable verbose logging** - The runtime provides detailed error messages

## 🏗️ Architecture Benefits

This protection system:

- **Prevents browser freezes** from runaway components
- **Provides actionable feedback** with specific solutions
- **Maintains performance** with minimal runtime overhead
- **Enables confident development** without fear of infinite loops
- **Works automatically** - no configuration required

The protection is active in all environments but provides more detailed messages in development mode.