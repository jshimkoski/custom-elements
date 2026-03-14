# Testing Guide

> How to write reliable tests for components built with Custom Elements Runtime

## Setup

### Recommended stack

- **[Vitest](https://vitest.dev/)** — fast, Vite-native test runner
- **[happy-dom](https://github.com/capricorn86/happy-dom)** or **[jsdom](https://github.com/jsdom/jsdom)** — DOM implementation for Node

```sh
npm install -D vitest happy-dom
```

### `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom', // or 'jsdom'
    globals: true,
  },
});
```

---

## Fundamentals

### Flushing DOM updates

The runtime batches DOM updates asynchronously. Use `flushDOMUpdates()` to apply all pending updates synchronously inside a test — no `setTimeout` or `await` needed.

```ts
import { component, html, useProps, flushDOMUpdates } from '@jasonshimmy/custom-elements-runtime';

it('renders the prop value', () => {
  component('my-label', () => {
    const props = useProps({ text: 'hello' });
    return html`<span>${props.text}</span>`;
  });

  const el = document.createElement('my-label');
  el.setAttribute('text', 'world');
  document.body.appendChild(el);
  flushDOMUpdates();

  expect(el.shadowRoot?.querySelector('span')?.textContent).toBe('world');
});
```

### Component registration

Custom element tags must be unique per page. Use a distinct tag name for each test, or register shared components once in a `beforeAll` block.

```ts
// option A — unique tag per test
it('test A', () => {
  component('test-a-button', () => html`<button>A</button>`);
  ...
});

// option B — shared registration
beforeAll(() => {
  component('shared-counter', () => { ... });
});
```

### Querying shadow DOM

All component output lives inside `element.shadowRoot`. Use standard DOM query methods on it.

```ts
const el = document.createElement('my-card');
document.body.appendChild(el);
flushDOMUpdates();

const heading = el.shadowRoot?.querySelector('h2');
expect(heading?.textContent).toBe('Card Title');
```

### Cleanup

Reset the document body between tests to avoid stale elements affecting later tests.

```ts
afterEach(() => {
  document.body.innerHTML = '';
});
```

---

## Testing Reactive Props

Props are read from attributes (strings) or JS properties (any type). Attribute values are coerced according to the default type declared in `useProps`.

```ts
import { component, html, useProps, flushDOMUpdates } from '@jasonshimmy/custom-elements-runtime';

component('prop-demo', () => {
  const props = useProps({ count: 0, enabled: false, label: '' });
  return html`
    <div>
      <span id="count">${props.count}</span>
      <span id="enabled">${props.enabled}</span>
      <span id="label">${props.label}</span>
    </div>
  `;
});

it('coerces attribute types from defaults', () => {
  const el = document.createElement('prop-demo') as HTMLElement;
  el.setAttribute('count', '42');
  el.setAttribute('enabled', 'true');
  el.setAttribute('label', 'Hello');
  document.body.appendChild(el);
  flushDOMUpdates();

  const sr = el.shadowRoot!;
  expect(sr.querySelector('#count')?.textContent).toBe('42');
  expect(sr.querySelector('#enabled')?.textContent).toBe('true');
  expect(sr.querySelector('#label')?.textContent).toBe('Hello');
});
```

### Complex props via JS properties

Attributes only carry strings. Pass arrays and objects as JS properties:

```ts
const el = document.createElement('my-list') as any;
el.items = ['a', 'b', 'c'];
document.body.appendChild(el);
flushDOMUpdates();
```

---

## Testing Reactive State

Trigger state changes by calling update functions, then flush and assert.

```ts
import { component, html, ref, flushDOMUpdates } from '@jasonshimmy/custom-elements-runtime';

const count = ref(0);

component('counter-test', () => {
  return html`<output>${count.value}</output>`;
});

it('re-renders when state changes', () => {
  const el = document.createElement('counter-test');
  document.body.appendChild(el);
  flushDOMUpdates();

  expect(el.shadowRoot?.querySelector('output')?.textContent).toBe('0');

  count.value = 5;
  flushDOMUpdates();

  expect(el.shadowRoot?.querySelector('output')?.textContent).toBe('5');
});
```

---

## Testing Emitted Events

Listen on the host element before triggering the action.

```ts
import { component, html, useEmit, flushDOMUpdates } from '@jasonshimmy/custom-elements-runtime';

component('emit-test', () => {
  const emit = useEmit();
  return html`<button @click="${() => emit('selected', 42)}">Pick</button>`;
});

it('emits the selected event with detail', () => {
  const el = document.createElement('emit-test');
  const received: unknown[] = [];
  el.addEventListener('selected', (e) => received.push((e as CustomEvent).detail));

  document.body.appendChild(el);
  flushDOMUpdates();

  el.shadowRoot?.querySelector('button')?.click();

  expect(received).toEqual([42]);
});
```

---

## Testing Lifecycle Hooks

### `useOnConnected`

Verify side effects that run when the element enters the DOM.

```ts
import { component, html, ref, useOnConnected, flushDOMUpdates } from '@jasonshimmy/custom-elements-runtime';

it('runs useOnConnected when appended', () => {
  let connected = false;

  component('lifecycle-connect', () => {
    useOnConnected(() => { connected = true; });
    return html`<div></div>`;
  });

  const el = document.createElement('lifecycle-connect');
  expect(connected).toBe(false);

  document.body.appendChild(el);
  flushDOMUpdates();

  expect(connected).toBe(true);
});
```

### `useOnDisconnected`

```ts
it('runs useOnDisconnected when removed', () => {
  let disconnected = false;

  component('lifecycle-disconnect', () => {
    useOnDisconnected(() => { disconnected = true; });
    return html`<div></div>`;
  });

  const el = document.createElement('lifecycle-disconnect');
  document.body.appendChild(el);
  flushDOMUpdates();

  expect(disconnected).toBe(false);
  el.remove();

  expect(disconnected).toBe(true);
});
```

---

## Testing Async Components

Async render functions return a `Promise<VNode>`. Use `nextTick()` to wait for the promise to resolve and the DOM to update.

```ts
import { component, html, nextTick } from '@jasonshimmy/custom-elements-runtime';

component('async-demo', async () => {
  const data = await Promise.resolve('loaded');
  return html`<p>${data}</p>`;
});

it('renders async content after resolution', async () => {
  const el = document.createElement('async-demo');
  document.body.appendChild(el);

  await nextTick();

  expect(el.shadowRoot?.querySelector('p')?.textContent).toBe('loaded');
});
```

---

## Testing `defineModel` / Two-Way Binding

`defineModel` emits `update:<propName>` when `model.value` is set. Listen for that event from the outside.

```ts
import { component, html, defineModel, flushDOMUpdates } from '@jasonshimmy/custom-elements-runtime';

component('model-test', () => {
  const name = defineModel('name', '');
  return html`<input :model="${name}" />`;
});

it('emits update:name when the input changes', () => {
  const el = document.createElement('model-test');
  const updates: string[] = [];
  el.addEventListener('update:name', (e) => updates.push((e as CustomEvent).detail));

  document.body.appendChild(el);
  flushDOMUpdates();

  const input = el.shadowRoot?.querySelector('input') as HTMLInputElement;
  input.value = 'Alice';
  input.dispatchEvent(new Event('input'));

  expect(updates).toEqual(['Alice']);
});
```

---

## Testing with `watch` and `watchEffect`

Side effects registered with `watch` or `watchEffect` run asynchronously by default. After triggering a reactive change, call `flushDOMUpdates()` to drain the scheduler.

```ts
import { ref, watch, flushDOMUpdates } from '@jasonshimmy/custom-elements-runtime';

it('watch fires after state change', () => {
  const log: number[] = [];
  const n = ref(0);
  watch(n, (v) => log.push(v));

  n.value = 1;
  flushDOMUpdates();

  expect(log).toEqual([1]);
});
```

---

## Tips and Common Pitfalls

| Situation | Recommendation |
|-----------|----------------|
| Test hangs or times out | Replace `setTimeout` / `await` with `flushDOMUpdates()` |
| "Already defined" error for a tag | Register the component once in `beforeAll`, not inside each `it` |
| Shadow DOM query returns `null` | Call `flushDOMUpdates()` before querying; the initial render is async |
| Attribute not reflected | Check that the prop name matches the kebab-case attribute (`camelCase` → `kebab-case`) |
| Events not received | Attach listeners before appending the element to the DOM |

---

For more examples see [Real-World Examples](../src/components/examples/) in the source tree.
