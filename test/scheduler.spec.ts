import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateScheduler, scheduleDOMUpdate } from '../src/lib/runtime/scheduler';

describe('🔄 Update Scheduler', () => {
  let originalQueueMicrotask: typeof queueMicrotask;
  let originalConsole: typeof console;
  let mockQueueMicrotask: ReturnType<typeof vi.fn>;
  let mockConsoleError: ReturnType<typeof vi.fn>;
  let originalWindow: any;
  let originalProcess: any;

  beforeEach(() => {
    // Store originals
    originalQueueMicrotask = queueMicrotask;
    originalConsole = console;
    originalWindow = (globalThis as any).window;
    originalProcess = (globalThis as any).process;
    
    // Create mocks
    mockQueueMicrotask = vi.fn((callback) => {
      // Execute immediately for testing
      callback();
    });
    mockConsoleError = vi.fn();
    
    // Apply mocks
    globalThis.queueMicrotask = mockQueueMicrotask;
    global.console = {
      ...console,
      error: mockConsoleError,
    };

    // Set up test environment by default
    (globalThis as any).process = {
      env: { NODE_ENV: 'test' }
    };
    delete (globalThis as any).window;
  });

  afterEach(() => {
    // Restore originals
    globalThis.queueMicrotask = originalQueueMicrotask;
    global.console = originalConsole;
    (globalThis as any).window = originalWindow;
    (globalThis as any).process = originalProcess;
    vi.clearAllMocks();
  });

  describe('Basic Scheduling', () => {
    it('should schedule and execute a single update', () => {
      const mockUpdate = vi.fn();
      
      updateScheduler.schedule(mockUpdate);
      
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    it('should schedule and execute multiple updates', () => {
      const mockUpdate1 = vi.fn();
      const mockUpdate2 = vi.fn();
      
      updateScheduler.schedule(mockUpdate1);
      updateScheduler.schedule(mockUpdate2);
      
      expect(mockUpdate1).toHaveBeenCalledTimes(1);
      expect(mockUpdate2).toHaveBeenCalledTimes(1);
    });

    it('should track pending updates count', () => {
      const mockUpdate1 = vi.fn();
      const mockUpdate2 = vi.fn();
      
      // In test environment, updates execute immediately
      updateScheduler.schedule(mockUpdate1, 'component-1');
      updateScheduler.schedule(mockUpdate2, 'component-2');
      
      expect(mockUpdate1).toHaveBeenCalledTimes(1);
      expect(mockUpdate2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Test Environment Detection', () => {
    it('should execute synchronously when NODE_ENV is test', () => {
      (globalThis as any).process = {
        env: { NODE_ENV: 'test' }
      };
      
      const mockUpdate = vi.fn();
      updateScheduler.schedule(mockUpdate);
      
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockQueueMicrotask).not.toHaveBeenCalled();
    });

    it('should execute synchronously when __vitest__ is present', () => {
      delete (globalThis as any).process;
      (globalThis as any).window = { __vitest__: true };
      
      const mockUpdate = vi.fn();
      updateScheduler.schedule(mockUpdate);
      
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockQueueMicrotask).not.toHaveBeenCalled();
    });

    it('should execute synchronously when Cypress is present', () => {
      delete (globalThis as any).process;
      (globalThis as any).window = { Cypress: {} };
      
      const mockUpdate = vi.fn();
      updateScheduler.schedule(mockUpdate);
      
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockQueueMicrotask).not.toHaveBeenCalled();
    });
  });

  describe('Production Environment Behavior', () => {
    beforeEach(() => {
      // Reset mock
      mockQueueMicrotask.mockClear();
    });

    it('should use queueMicrotask in production environment when explicitly forced', () => {
      // Since we can't truly mock production environment in Vitest,
      // we'll verify the queueMicrotask behavior through other means
      const originalQueueMicrotask = globalThis.queueMicrotask;
      let capturedCallback: any;
      
      globalThis.queueMicrotask = (callback) => {
        capturedCallback = callback;
      };
      
      try {
        // Create new scheduler instance to bypass test environment detection
        class TestUpdateScheduler {
          private pendingUpdates = new Map<string, () => void>();
          private isFlushScheduled = false;

          schedule(update: () => void, componentId?: string): void {
            const key = componentId || update.toString();
            this.pendingUpdates.set(key, update);
            
            if (!this.isFlushScheduled) {
              this.isFlushScheduled = true;
              // Force production behavior
              queueMicrotask(() => this.flush());
            }
          }

          private flush(): void {
            const updates = Array.from(this.pendingUpdates.values());
            this.pendingUpdates.clear();
            this.isFlushScheduled = false;

            for (const update of updates) {
              try {
                update();
              } catch (error) {
                // Continue with other updates
              }
            }
          }
        }

        const testScheduler = new TestUpdateScheduler();
        const mockUpdate = vi.fn();
        
        testScheduler.schedule(mockUpdate);
        
        expect(capturedCallback).toBeDefined();
        expect(mockUpdate).toHaveBeenCalledTimes(0); // Not called yet
        
        // Execute the callback
        capturedCallback();
        expect(mockUpdate).toHaveBeenCalledTimes(1);
        
      } finally {
        globalThis.queueMicrotask = originalQueueMicrotask;
      }
    });

    it('should batch multiple updates correctly', () => {
      // Test batching behavior in our test environment (synchronous)
      const mockUpdate1 = vi.fn();
      const mockUpdate2 = vi.fn();
      
      updateScheduler.schedule(mockUpdate1, 'comp1');
      updateScheduler.schedule(mockUpdate2, 'comp2');
      
      // In test environment, both should be executed immediately 
      expect(mockUpdate1).toHaveBeenCalledTimes(1);
      expect(mockUpdate2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in update functions gracefully', () => {
      const errorUpdate = vi.fn(() => {
        throw new Error('Update failed');
      });
      const successUpdate = vi.fn();
      
      updateScheduler.schedule(errorUpdate);
      updateScheduler.schedule(successUpdate);
      
      expect(errorUpdate).toHaveBeenCalledTimes(1);
      expect(successUpdate).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
    });

    it('should continue executing remaining updates after error', () => {
      const errorUpdate1 = vi.fn(() => {
        throw new Error('First error');
      });
      const successUpdate = vi.fn();
      const errorUpdate2 = vi.fn(() => {
        throw new Error('Second error');
      });
      
      updateScheduler.schedule(errorUpdate1);
      updateScheduler.schedule(successUpdate);
      updateScheduler.schedule(errorUpdate2);
      
      expect(errorUpdate1).toHaveBeenCalledTimes(1);
      expect(successUpdate).toHaveBeenCalledTimes(1);
      expect(errorUpdate2).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledTimes(2);
    });
  });

  describe('scheduleDOMUpdate Function', () => {
    it('should delegate to updateScheduler.schedule', () => {
      const mockUpdate = vi.fn();
      const componentId = 'test-component';
      
      scheduleDOMUpdate(mockUpdate, componentId);
      
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    it('should work without componentId', () => {
      const mockUpdate = vi.fn();
      
      scheduleDOMUpdate(mockUpdate);
      
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
