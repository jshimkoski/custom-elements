import { beforeEach, describe, expect, it, vi } from "vitest";
import { component } from "../src/lib/runtime.js";
import { html } from "../src/lib/template-compiler.js";

describe("Watch Functionality", () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Clean up any existing custom elements
    const existingElements = document.querySelectorAll('[data-test-component]');
    existingElements.forEach(el => el.remove());

    // Create a fresh container for each test
    container = document.createElement('div');
    container.setAttribute('data-test-container', 'true');
    document.body.appendChild(container);

    // Clear the component registry
    const registry = (globalThis as any).componentRegistry;
    if (registry) {
      registry.clear();
    }
  });

  afterEach(() => {
    // Clean up after each test
    container?.remove();
  });

  it("should execute basic watchers when state properties change", async () => {
    const watcherCallback = vi.fn();
    const componentTag = 'basic-watch-test';

    component(componentTag, {
      state: {
        counter: 0,
        message: 'initial'
      },
      watch: {
        counter: watcherCallback,
        message: (newVal, oldVal) => {
          watcherCallback('message', newVal, oldVal);
        }
      },
      render(state) {
        return html`<div>Counter: ${state.counter}, Message: ${state.message}</div>`;
      }
    });

    const element = document.createElement(componentTag) as any;
    container.appendChild(element);

    // Wait for component to initialize
    await new Promise(resolve => setTimeout(resolve, 0));

    // Change counter
    element._state.counter = 5;
    await new Promise(resolve => setTimeout(resolve, 0));

    // Change message
    element._state.message = 'updated';
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(watcherCallback).toHaveBeenCalledWith(5, 0);
    expect(watcherCallback).toHaveBeenCalledWith('message', 'updated', 'initial');
  });

  it("should support immediate watchers", async () => {
    const immediateCallback = vi.fn();
    const componentTag = 'immediate-watch-test';

    component(componentTag, {
      state: {
        value: 42
      },
      watch: {
        value: [immediateCallback, { immediate: true }]
      },
      render(state) {
        return html`<div>Value: ${state.value}</div>`;
      }
    });

    const element = document.createElement(componentTag) as any;
    container.appendChild(element);

    // Wait for component to initialize
    await new Promise(resolve => setTimeout(resolve, 0));

    // Should have been called immediately with current value and undefined oldValue
    expect(immediateCallback).toHaveBeenCalledWith(42, undefined);
  });

  it("should support deep watching of nested objects", async () => {
    const deepWatcher = vi.fn();
    const nestedWatcher = vi.fn();
    const componentTag = 'deep-watch-test';

    component(componentTag, {
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
        'user': [deepWatcher, { deep: true }],
        'user.name': nestedWatcher,
        'user.profile.email': (newVal, oldVal) => {
          nestedWatcher('email', newVal, oldVal);
        }
      },
      render(state) {
        return html`<div>User: ${state.user.name}</div>`;
      }
    });

    const element = document.createElement(componentTag) as any;
    container.appendChild(element);

    // Wait for component to initialize
    await new Promise(resolve => setTimeout(resolve, 0));

    // Change nested property
    element._state.user.name = 'Jane';
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(nestedWatcher).toHaveBeenCalledWith('Jane', 'John');

    // Change deeply nested property
    element._state.user.profile.email = 'jane@example.com';
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(nestedWatcher).toHaveBeenCalledWith('email', 'jane@example.com', 'john@example.com');

    // Deep watcher should have been triggered by nested changes
    expect(deepWatcher).toHaveBeenCalled();
  });

  it("should handle array modifications", async () => {
    const arrayWatcher = vi.fn();
    const componentTag = 'array-watch-test';

    component(componentTag, {
      state: {
        items: ['a', 'b', 'c']
      },
      watch: {
        items: arrayWatcher
      },
      render(state) {
        return html`<div>Items: ${state.items.join(',')}</div>`;
      }
    });

    const element = document.createElement(componentTag) as any;
    container.appendChild(element);

    // Wait for component to initialize
    await new Promise(resolve => setTimeout(resolve, 0));

    // Push new item
    const originalArray = element._state.items;
    element._state.items.push('d');
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(arrayWatcher).toHaveBeenCalled();

    // Replace array
    element._state.items = ['x', 'y', 'z'];
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(arrayWatcher).toHaveBeenCalledTimes(2);
  });

  it("should not trigger watchers during initialization", async () => {
    const watcherCallback = vi.fn();
    const componentTag = 'init-watch-test';

    component(componentTag, {
      state: {
        counter: 10
      },
      watch: {
        counter: watcherCallback
      },
      render(state) {
        return html`<div>Counter: ${state.counter}</div>`;
      }
    });

    const element = document.createElement(componentTag) as any;
    container.appendChild(element);

    // Wait for component to initialize
    await new Promise(resolve => setTimeout(resolve, 0));

    // Watcher should not have been called during initialization (unless immediate: true)
    expect(watcherCallback).not.toHaveBeenCalled();
  });

  it("should handle multiple watchers on the same property", async () => {
    const watcher1 = vi.fn();
    const watcher2 = vi.fn();
    const componentTag = 'multiple-watch-test';

    // This test demonstrates a limitation - we can't directly have multiple watchers
    // on the same property with our current API design. This is different from Vue.js
    // where you can have multiple watchers. Our implementation follows a simpler model
    // where each property can have one watcher configuration.

    component(componentTag, {
      state: {
        value: 0
      },
      watch: {
        value: (newVal, oldVal) => {
          watcher1(newVal, oldVal);
          watcher2(newVal, oldVal);
        }
      },
      render(state) {
        return html`<div>Value: ${state.value}</div>`;
      }
    });

    const element = document.createElement(componentTag) as any;
    container.appendChild(element);

    // Wait for component to initialize
    await new Promise(resolve => setTimeout(resolve, 0));

    element._state.value = 5;
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(watcher1).toHaveBeenCalledWith(5, 0);
    expect(watcher2).toHaveBeenCalledWith(5, 0);
  });

  it("should handle watcher errors gracefully", async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const goodWatcher = vi.fn();
    const componentTag = 'error-watch-test';

    component(componentTag, {
      state: {
        value1: 0,
        value2: 0
      },
      watch: {
        value1: () => {
          throw new Error('Watcher error');
        },
        value2: goodWatcher
      },
      render(state) {
        return html`<div>Values: ${state.value1}, ${state.value2}</div>`;
      }
    });

    const element = document.createElement(componentTag) as any;
    container.appendChild(element);

    // Wait for component to initialize
    await new Promise(resolve => setTimeout(resolve, 0));

    // Trigger both watchers
    element._state.value1 = 1;
    element._state.value2 = 2;
    await new Promise(resolve => setTimeout(resolve, 0));

    // Error should have been logged
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error in watcher for "value1"'),
      expect.any(Error)
    );

    // Good watcher should still have executed
    expect(goodWatcher).toHaveBeenCalledWith(2, 0);

    consoleSpy.mockRestore();
  });

  it("should clean up watchers on disconnect", async () => {
    const watcherCallback = vi.fn();
    const componentTag = 'cleanup-watch-test';

    component(componentTag, {
      state: {
        value: 0
      },
      watch: {
        value: watcherCallback
      },
      render(state) {
        return html`<div>Value: ${state.value}</div>`;
      }
    });

    const element = document.createElement(componentTag) as any;
    container.appendChild(element);

    // Wait for component to initialize
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify watcher is working
    element._state.value = 1;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(watcherCallback).toHaveBeenCalledWith(1, 0);

    // Disconnect component
    element.remove();
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify watchers map is cleared
    expect(element._watchers.size).toBe(0);
  });

  it("should support watching computed properties indirectly", async () => {
    const computedWatcher = vi.fn();
    const componentTag = 'computed-watch-test';

    component(componentTag, {
      state: {
        firstName: 'John',
        lastName: 'Doe'
      },
      computed: {
        fullName: (state) => `${state.firstName} ${state.lastName}`
      },
      watch: {
        firstName: () => computedWatcher('firstName changed'),
        lastName: () => computedWatcher('lastName changed')
      },
      render(state) {
        return html`<div>Full name: ${state.fullName}</div>`;
      }
    });

    const element = document.createElement(componentTag) as any;
    container.appendChild(element);

    // Wait for component to initialize
    await new Promise(resolve => setTimeout(resolve, 0));

    // Change properties that affect computed value
    element._state.firstName = 'Jane';
    await new Promise(resolve => setTimeout(resolve, 0));

    element._state.lastName = 'Smith';
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(computedWatcher).toHaveBeenCalledWith('firstName changed');
    expect(computedWatcher).toHaveBeenCalledWith('lastName changed');
  });

  it("should handle complex nested path watching", async () => {
    const pathWatcher = vi.fn();
    const componentTag = 'complex-path-watch-test';

    component(componentTag, {
      state: {
        data: {
          users: [
            {
              id: 1,
              profile: {
                preferences: {
                  theme: 'light'
                }
              }
            }
          ]
        }
      },
      watch: {
        'data.users': pathWatcher
      },
      render(state) {
        return html`<div>Users: ${state.data.users.length}</div>`;
      }
    });

    const element = document.createElement(componentTag) as any;
    container.appendChild(element);

    // Wait for component to initialize
    await new Promise(resolve => setTimeout(resolve, 0));

    // Modify the watched nested array
    element._state.data.users = [
      { id: 2, profile: { preferences: { theme: 'dark' } } }
    ];
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(pathWatcher).toHaveBeenCalledWith(
      [{ id: 2, profile: { preferences: { theme: 'dark' } } }],
      [{ id: 1, profile: { preferences: { theme: 'light' } } }]
    );
  });
});
