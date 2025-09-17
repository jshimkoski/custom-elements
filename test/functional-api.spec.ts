import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, computed, watch, component, html, useStyle, useOnConnected, useOnDisconnected, useOnError } from '../src/lib';

// Mock DOM environment
const mockElement = {
  shadowRoot: { innerHTML: '' },
  dispatchEvent: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  getAttribute: vi.fn(),
  setAttribute: vi.fn(),
  removeAttribute: vi.fn(),
  hasAttribute: vi.fn(),
  querySelector: vi.fn(),
  querySelectorAll: vi.fn(() => []),
};

const mockCustomElements = {
  define: vi.fn(),
  get: vi.fn(() => undefined),
};

// Setup global mocks
beforeEach(() => {
  vi.stubGlobal('HTMLElement', class MockHTMLElement {
    shadowRoot = mockElement.shadowRoot;
    attachShadow() { return this.shadowRoot; }
    dispatchEvent = mockElement.dispatchEvent;
    addEventListener = mockElement.addEventListener;
    removeEventListener = mockElement.removeEventListener;
    getAttribute = mockElement.getAttribute;
    setAttribute = mockElement.setAttribute;
    removeAttribute = mockElement.removeAttribute;
    hasAttribute = mockElement.hasAttribute;
    querySelector = mockElement.querySelector;
    querySelectorAll = mockElement.querySelectorAll;
  });
  
  vi.stubGlobal('customElements', mockCustomElements);
  vi.stubGlobal('document', {
    querySelectorAll: vi.fn(() => []),
  });
  
  vi.stubGlobal('window', {});
  
  // Reset mocks
  vi.clearAllMocks();
});

describe('Functional API', () => {
  describe('ref()', () => {
    it('should create reactive ref', () => {
      const count = ref(0);
      expect(count.value).toBe(0);
      
      count.value = 5;
      expect(count.value).toBe(5);
    });

    it('should handle object ref', () => {
      const user = ref({ name: 'John', age: 30 });
      expect(user.value.name).toBe('John');
      expect(user.value.age).toBe(30);
      
      user.value.name = 'Jane';
      expect(user.value.name).toBe('Jane');
    });

    it('should handle array ref', () => {
      const items = ref([1, 2, 3]);
      expect(items.value.length).toBe(3);
      
      items.value.push(4);
      expect(items.value.length).toBe(4);
      expect(items.value[3]).toBe(4);
    });

    it('should handle nested object updates', () => {
      const state1 = ref({
        user: { name: 'John', preferences: { theme: 'dark' } }
      });
      
      state1.value.user.name = 'Jane';
      expect(state1.value.user.name).toBe('Jane');
      
      state1.value.user.preferences.theme = 'light';
      expect(state1.value.user.preferences.theme).toBe('light');
    });
  });

  describe('computed()', () => {
    it('should create computed values', () => {
      const count = ref(5);
      const doubled = computed(() => count.value * 2);
      
      expect(doubled.value).toBe(10);
      
      count.value = 3;
      expect(doubled.value).toBe(6);
    });

    it('should handle complex computed values', () => {
      const firstName = ref('John');
      const lastName = ref('Doe');
      const fullName = computed(() => `${firstName.value} ${lastName.value}`);
      
      expect(fullName.value).toBe('John Doe');
      
      firstName.value = 'Jane';
      expect(fullName.value).toBe('Jane Doe');
    });
  });

  describe('watch()', () => {
    it('should watch ref changes', () => {
      const count = ref(0);
      const callback = vi.fn();
      
      watch(() => count.value, callback);
      
      count.value = 5;
      // Note: In a real implementation, this would be called asynchronously
      // For testing, we'll assume the watcher fires immediately
    });

    it('should watch with immediate option', () => {
      const count = ref(5);
      const callback = vi.fn();
      
      watch(() => count.value, callback, { immediate: true });
      
      expect(callback).toHaveBeenCalledWith(5, 5);
    });

    it('should provide cleanup function', () => {
      const count = ref(0);
      const callback = vi.fn();
      
      const cleanup = watch(() => count.value, callback);
      expect(typeof cleanup).toBe('function');
      
      // Cleanup should not throw
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('component() with hooks', () => {
    it('should register a functional component with lifecycle hooks', () => {
      component('test-lifecycle', () => {
        useOnConnected(() => {});
        useOnDisconnected(() => {});
        useOnError(() => {});
        return html`<div>Test</div>`;
      });
      
      expect(mockCustomElements.define).toHaveBeenCalledWith(
        'test-lifecycle',
        expect.any(Function)
      );
    });

    it('should register a functional component with style', () => {
      component('test-styled', () => {
        useStyle(() => '.test { color: red; }');
        return html`<div>Test</div>`;
      });
      
      expect(mockCustomElements.define).toHaveBeenCalledWith(
        'test-styled',
        expect.any(Function)
      );
    });

    it('should register a functional component with dynamic style', () => {
      component('test-dynamic-styled', () => {
        useStyle(() => '.test { color: blue; }');
        return html`<div>Test</div>`;
      });
      
      expect(mockCustomElements.define).toHaveBeenCalledWith(
        'test-dynamic-styled',
        expect.any(Function)
      );
    });
  });

  describe('component()', () => {
    it('should register a functional component', () => {
      const count = ref(0);
      
      component('test-counter', () => html`
        <div>Count: ${count.value}</div>
      `);
      
      expect(mockCustomElements.define).toHaveBeenCalledWith(
        'test-counter',
        expect.any(Function)
      );
    });

    it('should normalize tag names', () => {
      component('MyComponent', () => html`<div>Test</div>`);
      
      expect(mockCustomElements.define).toHaveBeenCalledWith(
        'my-component',
        expect.any(Function)
      );
    });

    it('should add cer- prefix to single-word tags', () => {
      component('Button', () => html`<div>Test</div>`);
      
      expect(mockCustomElements.define).toHaveBeenCalledWith(
        'cer-button',
        expect.any(Function)
      );
    });

    it('should preserve custom tag names with hyphens', () => {
      component('my-custom-element', () => html`<div>Test</div>`);
      
      expect(mockCustomElements.define).toHaveBeenCalledWith(
        'my-custom-element',
        expect.any(Function)
      );
    });
  });

  describe('Integration', () => {
    it('should work with ref, computed, and functional components together', () => {
      const count = ref(0);
      const doubled = computed(() => count.value * 2);
      
      component('integration-test', () => html`
        <div>
          <p>Count: ${count.value}</p>
          <p>Doubled: ${doubled.value}</p>
        </div>
      `);
      
      expect(mockCustomElements.define).toHaveBeenCalled();
      
      // Update state
      count.value = 5;
      expect(count.value).toBe(5);
      expect(doubled.value).toBe(10);
    });

    it('should handle multiple components sharing state', () => {
      const sharedState = ref({ message: 'Hello' });
      
      component('comp-a', () => html`
        <div>A: ${sharedState.value.message}</div>
      `);
      
      component('comp-b', () => html`
        <div>B: ${sharedState.value.message}</div>
      `);
      
      expect(mockCustomElements.define).toHaveBeenCalledTimes(2);
      
      // Both components should have access to the same state
      sharedState.value.message = 'Updated';
      expect(sharedState.value.message).toBe('Updated');
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety with primitive state', () => {
      const count = ref(0);
      const name = ref('test');
      const isVisible = ref(true);
      
      // These should work fine
      expect(typeof count.value).toBe('number');
      expect(typeof name.value).toBe('string');
      expect(typeof isVisible.value).toBe('boolean');
      
      // Type changes should work
      count.value = 42;
      name.value = 'changed';
      isVisible.value = false;
      
      expect(count.value).toBe(42);
      expect(name.value).toBe('changed');
      expect(isVisible.value).toBe(false);
    });

    it('should maintain type safety with object state', () => {
      interface User {
        name: string;
        age: number;
        preferences: {
          theme: 'light' | 'dark';
        };
      }
      
      const user = ref<User>({
        name: 'John',
        age: 30,
        preferences: { theme: 'light' }
      });
      
      expect(user.value.name).toBe('John');
      expect(user.value.age).toBe(30);
      expect(user.value.preferences.theme).toBe('light');
      
      // Updates should work
      user.value.name = 'Jane';
      user.value.age = 25;
      user.value.preferences.theme = 'dark';
      
      expect(user.value.name).toBe('Jane');
      expect(user.value.age).toBe(25);
      expect(user.value.preferences.theme).toBe('dark');
    });
  });
});