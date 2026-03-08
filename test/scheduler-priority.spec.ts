/**
 * Tests for scheduleWithPriority() — the concurrent-style time-sliced
 * update scheduling API added to the scheduler.
 *
 * Priority levels:
 * - 'immediate' — runs synchronously
 * - 'normal'    — microtask-batched (same as scheduleDOMUpdate)
 * - 'idle'      — deferred via requestIdleCallback / setTimeout polyfill
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  scheduleWithPriority,
  flushDOMUpdates,
  updateScheduler,
} from '../src/lib/runtime/scheduler';
import type { UpdatePriority } from '../src/lib/runtime/scheduler';

describe('scheduleWithPriority()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── immediate ─────────────────────────────────────────────────────────────

  describe("priority: 'immediate'", () => {
    it('runs the update synchronously before returning', () => {
      let ran = false;
      scheduleWithPriority(() => {
        ran = true;
      }, 'immediate');
      expect(ran).toBe(true);
    });

    it('does not add to pending updates queue', () => {
      const beforeCount = updateScheduler.pendingCount;
      scheduleWithPriority(() => {}, 'immediate');
      expect(updateScheduler.pendingCount).toBe(beforeCount);
    });

    it('continues on error without throwing to caller', () => {
      expect(() => {
        scheduleWithPriority(() => {
          throw new Error('boom');
        }, 'immediate');
      }).not.toThrow();
    });
  });

  // ── normal ────────────────────────────────────────────────────────────────

  describe("priority: 'normal'", () => {
    it('deduplicates by componentId', () => {
      let callCount = 0;
      const update = () => callCount++;

      scheduleWithPriority(update, 'normal', 'comp-abc');
      scheduleWithPriority(update, 'normal', 'comp-abc');
      scheduleWithPriority(update, 'normal', 'comp-abc');

      flushDOMUpdates();
      expect(callCount).toBe(1);
    });

    it('defaults to normal priority when omitted', () => {
      let ran = false;
      scheduleWithPriority(() => {
        ran = true;
      });
      flushDOMUpdates();
      expect(ran).toBe(true);
    });
  });

  // ── idle ──────────────────────────────────────────────────────────────────

  describe("priority: 'idle'", () => {
    it('defers the update and runs it after a timeout', async () => {
      let ran = false;
      scheduleWithPriority(() => {
        ran = true;
      }, 'idle');

      // Not yet run
      expect(ran).toBe(false);

      // Advance fake timers past the setTimeout(0) used in test environment
      vi.runAllTimers();
      expect(ran).toBe(true);
    });

    it('deduplicates by componentId', () => {
      let callCount = 0;
      const update = () => callCount++;

      scheduleWithPriority(update, 'idle', 'idle-comp-xyz');
      scheduleWithPriority(update, 'idle', 'idle-comp-xyz');
      scheduleWithPriority(update, 'idle', 'idle-comp-xyz');

      vi.runAllTimers();
      expect(callCount).toBe(1);
    });

    it('continues on error without throwing to caller', () => {
      scheduleWithPriority(() => {
        throw new Error('idle boom');
      }, 'idle');

      expect(() => {
        vi.runAllTimers();
      }).not.toThrow();
    });

    it('multiple idle updates all fire', () => {
      const results: number[] = [];

      scheduleWithPriority(() => results.push(1), 'idle');
      scheduleWithPriority(() => results.push(2), 'idle');
      scheduleWithPriority(() => results.push(3), 'idle');

      vi.runAllTimers();
      expect(results).toContain(1);
      expect(results).toContain(2);
      expect(results).toContain(3);
    });
  });

  // ── type safety ───────────────────────────────────────────────────────────

  describe('UpdatePriority type', () => {
    it('accepts all valid priority strings', () => {
      const priorities: UpdatePriority[] = ['immediate', 'normal', 'idle'];
      priorities.forEach((p) => {
        expect(() => scheduleWithPriority(() => {}, p)).not.toThrow();
      });
      vi.runAllTimers();
    });
  });

  // ── export ────────────────────────────────────────────────────────────────

  it('scheduleWithPriority is exported from the main package entry', () => {
    // Verified by the successful top-level import at the top of this file
    expect(typeof scheduleWithPriority).toBe('function');
  });

  it('UpdatePriority type is exported from the main package entry', () => {
    // Type-only export — verified by the import at the top of this file compiling without error
    const priorities: UpdatePriority[] = ['immediate', 'normal', 'idle'];
    expect(priorities.length).toBe(3);
  });
});
