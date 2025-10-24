import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { devError, devWarn, devLog } from '../src/lib/runtime/logger';

describe('🔧 Logger Utilities', () => {
  let originalConsole: typeof console;
  let mockConsole: {
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    log: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Store original console methods
    originalConsole = console;

    // Create mock console methods
    mockConsole = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    // Replace console methods
    global.console = {
      ...console,
      error: mockConsole.error,
      warn: mockConsole.warn,
      log: mockConsole.log,
    };
  });

  afterEach(() => {
    // Restore original console
    global.console = originalConsole;
    vi.clearAllMocks();
  });

  describe('Development Mode Logging (Test Environment)', () => {
    // In test environment, NODE_ENV is 'test' which is !== 'production', so logging should work

    describe('devError', () => {
      it('should log error with message in development mode', () => {
        const message = 'Test error message';

        devError(message);

        expect(mockConsole.error).toHaveBeenCalledTimes(1);
        expect(mockConsole.error).toHaveBeenCalledWith(message);
      });

      it('should log error with message and arguments', () => {
        const message = 'Error with data';
        const arg1 = { key: 'value' };
        const arg2 = 'string arg';
        const arg3 = 123;

        devError(message, arg1, arg2, arg3);

        expect(mockConsole.error).toHaveBeenCalledTimes(1);
        expect(mockConsole.error).toHaveBeenCalledWith(
          message,
          arg1,
          arg2,
          arg3,
        );
      });

      it('should handle multiple consecutive error calls', () => {
        devError('First error');
        devError('Second error', { data: 'test' });
        devError('Third error');

        expect(mockConsole.error).toHaveBeenCalledTimes(3);
        expect(mockConsole.error).toHaveBeenNthCalledWith(1, 'First error');
        expect(mockConsole.error).toHaveBeenNthCalledWith(2, 'Second error', {
          data: 'test',
        });
        expect(mockConsole.error).toHaveBeenNthCalledWith(3, 'Third error');
      });

      it('should handle complex objects as arguments', () => {
        const complexObj = {
          nested: { deep: { value: 'test' } },
          array: [1, 2, 3],
          fn: () => 'test',
        };

        devError('Complex object error', complexObj);

        expect(mockConsole.error).toHaveBeenCalledTimes(1);
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Complex object error',
          complexObj,
        );
      });
    });

    describe('devWarn', () => {
      it('should log warning with message in development mode', () => {
        const message = 'Test warning message';

        devWarn(message);

        expect(mockConsole.warn).toHaveBeenCalledTimes(1);
        expect(mockConsole.warn).toHaveBeenCalledWith(message);
      });

      it('should log warning with message and arguments', () => {
        const message = 'Warning with data';
        const arg1 = [1, 2, 3];
        const arg2 = new Error('test error');

        devWarn(message, arg1, arg2);

        expect(mockConsole.warn).toHaveBeenCalledTimes(1);
        expect(mockConsole.warn).toHaveBeenCalledWith(message, arg1, arg2);
      });

      it('should handle empty string messages', () => {
        devWarn('');

        expect(mockConsole.warn).toHaveBeenCalledTimes(1);
        expect(mockConsole.warn).toHaveBeenCalledWith('');
      });
    });

    describe('devLog', () => {
      it('should log info with message in development mode', () => {
        const message = 'Test info message';

        devLog(message);

        expect(mockConsole.log).toHaveBeenCalledTimes(1);
        expect(mockConsole.log).toHaveBeenCalledWith(message);
      });

      it('should log info with message and arguments', () => {
        const message = 'Info with data';
        const arg1 = true;
        const arg2 = null;
        const arg3 = undefined;

        devLog(message, arg1, arg2, arg3);

        expect(mockConsole.log).toHaveBeenCalledTimes(1);
        expect(mockConsole.log).toHaveBeenCalledWith(message, arg1, arg2, arg3);
      });

      it('should handle very long messages', () => {
        const longMessage = 'A'.repeat(10000);

        devLog(longMessage);

        expect(mockConsole.log).toHaveBeenCalledTimes(1);
        expect(mockConsole.log).toHaveBeenCalledWith(longMessage);
      });
    });

    describe('Mixed Logging', () => {
      it('should handle mixed logging calls', () => {
        devError('Error message');
        devWarn('Warning message', { data: 'test' });
        devLog('Log message', 123);

        expect(mockConsole.error).toHaveBeenCalledTimes(1);
        expect(mockConsole.warn).toHaveBeenCalledTimes(1);
        expect(mockConsole.log).toHaveBeenCalledTimes(1);

        expect(mockConsole.error).toHaveBeenCalledWith('Error message');
        expect(mockConsole.warn).toHaveBeenCalledWith('Warning message', {
          data: 'test',
        });
        expect(mockConsole.log).toHaveBeenCalledWith('Log message', 123);
      });
    });
  });

  describe('Console Availability', () => {
    it('should throw when console object is missing', () => {
      global.console = undefined as any;

      // The logger expects console to exist, so it should throw
      expect(() => {
        devError('No console object');
      }).toThrow();

      expect(() => {
        devWarn('No console object');
      }).toThrow();

      expect(() => {
        devLog('No console object');
      }).toThrow();
    });

    it('should throw when console methods are missing', () => {
      global.console = {} as any;

      // The logger expects console methods to exist, so it should throw
      expect(() => {
        devError('No console methods');
      }).toThrow('console.error is not a function');

      expect(() => {
        devWarn('No console methods');
      }).toThrow('console.warn is not a function');

      expect(() => {
        devLog('No console methods');
      }).toThrow('console.log is not a function');
    });

    it('should work with partial console object for available methods', () => {
      global.console = { error: mockConsole.error } as any;

      // Only error method exists, so only devError should work
      devError('Has error method');
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledWith('Has error method');

      // These should throw since the methods don't exist
      expect(() => {
        devWarn('Missing warn method');
      }).toThrow('console.warn is not a function');

      expect(() => {
        devLog('Missing log method');
      }).toThrow('console.log is not a function');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined arguments', () => {
      devError('Error with nulls', null, undefined);
      devWarn('Warning with nulls', null, undefined);
      devLog('Log with nulls', null, undefined);

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error with nulls',
        null,
        undefined,
      );
      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Warning with nulls',
        null,
        undefined,
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        'Log with nulls',
        null,
        undefined,
      );
    });

    it('should handle circular references', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      // Should not throw, let console handle circular references
      expect(() => {
        devError('Circular reference', circular);
        devWarn('Circular reference', circular);
        devLog('Circular reference', circular);
      }).not.toThrow();

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Circular reference',
        circular,
      );
      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Circular reference',
        circular,
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        'Circular reference',
        circular,
      );
    });

    it('should handle symbols as arguments', () => {
      const sym = Symbol('test symbol');

      devError('Symbol error', sym);
      devWarn('Symbol warning', sym);
      devLog('Symbol log', sym);

      expect(mockConsole.error).toHaveBeenCalledWith('Symbol error', sym);
      expect(mockConsole.warn).toHaveBeenCalledWith('Symbol warning', sym);
      expect(mockConsole.log).toHaveBeenCalledWith('Symbol log', sym);
    });

    it('should handle empty arguments', () => {
      devError('Error with no args');
      devWarn('Warning with no args');
      devLog('Log with no args');

      expect(mockConsole.error).toHaveBeenCalledWith('Error with no args');
      expect(mockConsole.warn).toHaveBeenCalledWith('Warning with no args');
      expect(mockConsole.log).toHaveBeenCalledWith('Log with no args');
    });

    it('should handle many arguments', () => {
      const args = Array.from({ length: 100 }, (_, i) => `arg${i}`);

      devError('Many args', ...args);
      devWarn('Many args', ...args);
      devLog('Many args', ...args);

      expect(mockConsole.error).toHaveBeenCalledWith('Many args', ...args);
      expect(mockConsole.warn).toHaveBeenCalledWith('Many args', ...args);
      expect(mockConsole.log).toHaveBeenCalledWith('Many args', ...args);
    });
  });

  describe('Function Reference Stability', () => {
    it('should maintain consistent function references', () => {
      // These should be the same function references throughout the test
      expect(typeof devError).toBe('function');
      expect(typeof devWarn).toBe('function');
      expect(typeof devLog).toBe('function');
    });
  });

  describe('Production Behavior Documentation', () => {
    it('should document production behavior expectations', () => {
      // This test documents the expected production behavior
      // In a real production build, these functions would be tree-shaken out
      // or the isDev check would be false, preventing any logging

      // In test environment (NODE_ENV !== 'production'), logging should work
      devError('Test production behavior');
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Test production behavior',
      );

      // Note: To test actual production behavior, the bundler would need
      // to replace process.env.NODE_ENV with 'production' at build time
      // and dead code elimination would remove the logging calls entirely
    });
  });
});
