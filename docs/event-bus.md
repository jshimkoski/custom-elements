# 📢 Event Bus Guide

> How to use the built-in event bus for decoupled communication between components

## 📖 Overview

The event bus is a lightweight publish/subscribe system for sending and receiving custom events across components. It helps you keep your code modular and reactive without tight coupling.

## 🚀 Importing

**Standard API:**

```ts
import { eventBus } from '@jasonshimmy/custom-elements-runtime/event-bus';
```

**✨ Shorthand API (Recommended):**

```ts
// Import shorthand functions for cleaner code
import {
  emit,
  on,
  off,
  once,
  listen,
} from '@jasonshimmy/custom-elements-runtime/event-bus';

// Use directly without eventBus prefix
emit('cart:add', { id: 123 });
const unsubscribe = on('cart:add', (data) => console.log(data));
```

Both APIs work identically - the shorthand functions are just convenience exports that call `eventBus.*` internally.

## 📬 Sending Events

Use `eventBus.emit(eventName, payload?)` to broadcast an event.

```ts
// Send a custom event with optional data
eventBus.emit('cart:add', { id: 123, qty: 2 });
```

## 📥 Listening for Events

Use `eventBus.on(eventName, handler)` to listen for events. Returns an unsubscribe function.

```ts
const unsubscribe = eventBus.on('cart:add', (data) => {
  console.log('Item added:', data);
});

// To stop listening:
unsubscribe();
```

## 🔄 One-time Listeners

`once` has two separate overloads — choose the one that fits your style. **Do not mix them.**

**Callback form** — pass a handler, returns `void`:

```ts
// Handler is called exactly once, then automatically removed
eventBus.once('user:login', (user) => {
  alert(`Welcome, ${user.name}!`);
});

// Shorthand equivalent
once('user:login', (user) => {
  alert(`Welcome, ${user.name}!`);
});
```

**Promise form** — no handler argument, returns `Promise<T>`:

```ts
// Await the next emission of the event
const user = await eventBus.once<User>('user:login');
console.log('Logged in:', user.name);

// Shorthand equivalent
const user = await once<User>('user:login');
```

> **Note:** These are strict overloads. Passing a handler returns `void` (no Promise). Omitting the handler returns a Promise. The old dual-output form (handler + Promise together) is no longer supported.

## 🧹 Removing Listeners

You can remove listeners by calling the unsubscribe function returned by `.on()`. The `once` callback form self-removes after the first invocation — no manual cleanup needed.

## 🧩 Example: Component Communication

```ts
// Sender component
component('notification-sender', () => {
  return html`
    <button @click="${() => eventBus.emit('notify', 'Hello!')}">
      Send Notification
    </button>
  `;
});

// Receiver component
component('notification-receiver', () => {
  const message = ref('');

  // Subscribe on connect and clean up on disconnect so we don't leak handlers
  let unsubscribe: (() => void) | null = null;

  useOnConnected(() => {
    unsubscribe = eventBus.on('notify', (msg) => {
      message.value = msg;
    });
  });

  useOnDisconnected(() => {
    if (unsubscribe) {
      try {
        unsubscribe();
      } catch {
        /* swallow */
      }
      unsubscribe = null;
    }
  });

  return html`
    <div class="notification">
      ${message.value && html`<p>Received: ${message.value}</p>`}
    </div>
  `;
});
```

## 🧰 Utility Methods

The `GlobalEventBus` class (accessed via `eventBus`) exposes several utility methods for cleanup and debugging:

```ts
import {
  eventBus,
  GlobalEventBus,
} from '@jasonshimmy/custom-elements-runtime/event-bus';

// Remove all handlers for a specific event
eventBus.offAll('cart:add');

// List all event names that have at least one registered handler
const activeEvents: string[] = eventBus.getActiveEvents();

// Remove every registered handler (useful in tests or for full teardown)
eventBus.clear();

// Count how many handlers are currently registered for an event
const count: number = eventBus.getHandlerCount('cart:add');

// Get per-event emission counts and handler counts (for debugging)
const stats = eventBus.getEventStats();
// { 'cart:add': { count: 5, handlersCount: 2 }, ... }

// Reset emission counters (useful in tests or after resolving event storms)
eventBus.resetEventCounters();
```

### Event Storm Protection

The bus automatically throttles events that fire more than 50 times per second per event name (silent slowdown above 50, silent drop above 100). Use `resetEventCounters()` to clear these counters during testing or after a burst.

## 💡 Tips

- Use event namespacing (e.g., `user:login`) for clarity.
- Always clean up listeners on disconnect to avoid memory leaks.
- Payload can be any type: object, string, number, etc.
- Event bus works across all components in the same app ctx.

For more, see the [Cross-Component Communication guide](./cross-component-communication.md).
