import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  asyncComponent,
  routeComponent,
  createAsyncTemplate,
  createRouteTemplate,
  templateCache,
  invalidateTemplateCache,
  html
} from '../lib/runtime';

// Mock DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost:3000',
  pretendToBeVisual: true,
  resources: 'usable'
});

global.window = dom.window as any;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.CustomEvent = dom.window.CustomEvent;
global.customElements = dom.window.customElements;

// Mock fetch
global.fetch = vi.fn();

describe('Async Templates', () => {
  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';

    // Clear template cache
    invalidateTemplateCache();

    // Reset fetch mock
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any registered custom elements
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
      if (el.tagName.includes('-')) {
        el.remove();
      }
    });
  });

  describe('Basic Async Component', () => {
    it('should render loading state initially', async () => {
      asyncComponent('test-async', {
        state: { message: 'Hello' },

        renderAsync: async (state) => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return html`<div>${state.message}</div>`;
        },

        loadingTemplate: (state) => html`<div class="loading">Loading...</div>`
      });

      const element = document.createElement('test-async');
      document.body.appendChild(element);

      // Should show loading state initially
      await new Promise(resolve => setTimeout(resolve, 10));
      const loadingEl = element.shadowRoot?.querySelector('.loading');
      expect(loadingEl?.textContent).toBe('Loading...');
    });

    it('should render async content after loading', async () => {
      asyncComponent('test-async-content', {
        state: { message: 'Async Hello' },

        renderAsync: async (state) => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return html`<div class="content">${state.message}</div>`;
        },

        loadingTemplate: () => html`<div class="loading">Loading...</div>`
      });

      const element = document.createElement('test-async-content');
      document.body.appendChild(element);

      // Wait for async rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      const contentEl = element.shadowRoot?.querySelector('.content');
      expect(contentEl?.textContent).toBe('Async Hello');
    });

    it('should render error state on failure', async () => {
      asyncComponent('test-async-error', {
        state: { message: 'Hello' },

        renderAsync: async (state) => {
          await new Promise(resolve => setTimeout(resolve, 50));
          throw new Error('Template loading failed');
        },

        errorTemplate: (error, state) => html`<div class="error">Error: ${error.message}</div>`
      });

      const element = document.createElement('test-async-error');
      document.body.appendChild(element);

      // Wait for async rendering and error
      await new Promise(resolve => setTimeout(resolve, 100));

      const errorEl = element.shadowRoot?.querySelector('.error');
      expect(errorEl?.textContent).toBe('Error: Template loading failed');
    });
  });

  describe('Template Caching', () => {
    it('should cache templates with createAsyncTemplate', async () => {
      let callCount = 0;

      const asyncTemplate = createAsyncTemplate(
        async (state: { id: number }) => {
          callCount++;
          await new Promise(resolve => setTimeout(resolve, 50));
          return html`<div>Content ${state.id}</div>`;
        },
        {
          cacheKey: (state) => `content-${state.id}`,
          dependencies: ['id']
        }
      );

      asyncComponent('test-cached', {
        state: { id: 1 },
        renderAsync: asyncTemplate
      });

      // Create first element
      const element1 = document.createElement('test-cached');
      document.body.appendChild(element1);

      // Wait for loading
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(callCount).toBe(1);

      // Create second element with same state
      const element2 = document.createElement('test-cached');
      document.body.appendChild(element2);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should not call template function again (cached)
      expect(callCount).toBe(1);
    });

    it('should invalidate cache when dependencies change', async () => {
      let callCount = 0;

      const asyncTemplate = createAsyncTemplate(
        async (state: { id: number; name: string }) => {
          callCount++;
          await new Promise(resolve => setTimeout(resolve, 50));
          return html`<div>${state.name}-${state.id}</div>`;
        },
        {
          cacheKey: (state) => `user-${state.id}`,
          dependencies: ['id']
        }
      );

      asyncComponent('test-invalidate', {
        state: { id: 1, name: 'John' },
        renderAsync: asyncTemplate
      });

      const element = document.createElement('test-invalidate');
      document.body.appendChild(element);

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(callCount).toBe(1);

      // Change dependency (id)
      const state = (element as any)._state;
      state.id = 2;

      // Wait for re-render
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(callCount).toBe(2);
    });
  });

  describe('Route Components', () => {
    it('should create route component with dynamic loading', async () => {
      const mockLoader = vi.fn().mockResolvedValue({
        default: (state: any) => html`<div class="route-content">Route: ${state.path}</div>`
      });

      routeComponent('test-route', {
        state: { path: '/test' },
        routeLoader: mockLoader
      });

      const element = document.createElement('test-route');
      document.body.appendChild(element);

      // Wait for async loading
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockLoader).toHaveBeenCalled();
      const contentEl = element.shadowRoot?.querySelector('.route-content');
      expect(contentEl?.textContent).toBe('Route: /test');
    });
  });

  describe('Error Handling', () => {
    it('should handle async loading errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      asyncComponent('test-error-handling', {
        state: { data: null },

        renderAsync: async (state) => {
          throw new Error('Network error');
        },

        errorTemplate: (error, state) => html`
          <div class="error-display">
            <h3>Failed to load</h3>
            <p>${error.message}</p>
          </div>
        `
      });

      const element = document.createElement('test-error-handling');
      document.body.appendChild(element);

      // Wait for error to be handled
      await new Promise(resolve => setTimeout(resolve, 100));

      const errorEl = element.shadowRoot?.querySelector('.error-display h3');
      expect(errorEl?.textContent).toBe('Failed to load');

      const messageEl = element.shadowRoot?.querySelector('.error-display p');
      expect(messageEl?.textContent).toBe('Network error');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Template loading error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should show loading template while handling errors', async () => {
      let rejectPromise: (error: Error) => void;
      const loadingPromise = new Promise<never>((resolve, reject) => {
        rejectPromise = reject;
      });

      asyncComponent('test-loading-error', {
        state: { data: null },

        renderAsync: async (state) => {
          return await loadingPromise;
        },

        loadingTemplate: (state) => html`<div class="loading-indicator">Loading data...</div>`,

        errorTemplate: (error, state) => html`<div class="error-message">${error.message}</div>`
      });

      const element = document.createElement('test-loading-error');
      document.body.appendChild(element);

      // Should show loading initially
      await new Promise(resolve => setTimeout(resolve, 10));
      let loadingEl = element.shadowRoot?.querySelector('.loading-indicator');
      expect(loadingEl?.textContent).toBe('Loading data...');

      // Reject the promise
      rejectPromise!(new Error('Load failed'));

      // Wait for error handling
      await new Promise(resolve => setTimeout(resolve, 100));

      const errorEl = element.shadowRoot?.querySelector('.error-message');
      expect(errorEl?.textContent).toBe('Load failed');
    });
  });

  describe('State Management', () => {
    it('should update async template when state changes', async () => {
      let renderCount = 0;

      const asyncTemplate = createAsyncTemplate(
        async (state: { userId: number; version: number }) => {
          renderCount++;
          await new Promise(resolve => setTimeout(resolve, 50));
          return html`<div>User ${state.userId} v${state.version}</div>`;
        },
        {
          cacheKey: (state) => `user-${state.userId}-v${state.version}`,
          dependencies: ['userId', 'version']
        }
      );

      asyncComponent('test-state-update', {
        state: { userId: 1, version: 1 },
        renderAsync: asyncTemplate
      });

      const element = document.createElement('test-state-update');
      document.body.appendChild(element);

      // Wait for initial render
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(renderCount).toBe(1);

      // Update state
      const state = (element as any)._state;
      state.version = 2;

      // Wait for re-render
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(renderCount).toBe(2);

      const contentEl = element.shadowRoot?.querySelector('div');
      expect(contentEl?.textContent).toBe('User 1 v2');
    });

    it('should handle rapid state changes without race conditions', async () => {
      let completedRenders = 0;

      const asyncTemplate = createAsyncTemplate(
        async (state: { counter: number }) => {
          const currentCounter = state.counter;
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

          // Only count if this is still the current state
          if (state.counter === currentCounter) {
            completedRenders++;
          }

          return html`<div>Counter: ${currentCounter}</div>`;
        },
        {
          cacheKey: (state) => `counter-${state.counter}`,
          dependencies: ['counter']
        }
      );

      asyncComponent('test-race-conditions', {
        state: { counter: 0 },
        renderAsync: asyncTemplate
      });

      const element = document.createElement('test-race-conditions');
      document.body.appendChild(element);

      // Rapidly update state
      const state = (element as any)._state;
      for (let i = 1; i <= 5; i++) {
        state.counter = i;
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Wait for all renders to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should have handled race conditions properly
      expect(completedRenders).toBeGreaterThan(0);
      expect(completedRenders).toBeLessThanOrEqual(6); // Initial + 5 updates
    });
  });

  describe('Template Cache Management', () => {
    it('should allow manual cache invalidation', async () => {
      let callCount = 0;

      const asyncTemplate = createAsyncTemplate(
        async (state: { id: string }) => {
          callCount++;
          await new Promise(resolve => setTimeout(resolve, 50));
          return html`<div>Data ${state.id}</div>`;
        },
        {
          cacheKey: (state) => `data-${state.id}`,
          dependencies: ['id']
        }
      );

      asyncComponent('test-cache-invalidation', {
        state: { id: 'test' },
        renderAsync: asyncTemplate
      });

      const element = document.createElement('test-cache-invalidation');
      document.body.appendChild(element);

      // Initial load
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(callCount).toBe(1);

      // Manually invalidate cache
      invalidateTemplateCache('data-test');

      // Create new element (should reload due to cache invalidation)
      const element2 = document.createElement('test-cache-invalidation');
      document.body.appendChild(element2);

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(callCount).toBe(2);
    });

    it('should clear all cache when no key provided', async () => {
      templateCache.set('key1', html`<div>Test 1</div>`);
      templateCache.set('key2', html`<div>Test 2</div>`);

      expect(templateCache.has('key1')).toBe(true);
      expect(templateCache.has('key2')).toBe(true);

      invalidateTemplateCache();

      expect(templateCache.has('key1')).toBe(false);
      expect(templateCache.has('key2')).toBe(false);
    });
  });

  describe('Lifecycle Integration', () => {
    it('should cleanup async operations on disconnect', async () => {
      let cleanupCalled = false;

      asyncComponent('test-cleanup', {
        state: { data: null },

        renderAsync: async (state) => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return html`<div>Loaded</div>`;
        },

        onDisconnected(state, api) {
          cleanupCalled = true;
        }
      });

      const element = document.createElement('test-cleanup');
      document.body.appendChild(element);

      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 10));

      // Remove element
      element.remove();

      // Wait for disconnection
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(cleanupCalled).toBe(true);
    });
  });
});
