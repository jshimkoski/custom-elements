/**
 * Update Scheduler for batching DOM updates
 * Prevents excessive re-renders and improves performance
 */
import { devWarn, devError } from './logger';

/**
 * Environment detection utilities
 */
interface TestEnvironment {
  isTest: boolean;
  isVitest: boolean;
  isCypress: boolean;
}

/**
 * Detect test environment with improved reliability
 */
function detectTestEnvironment(): TestEnvironment {
  // Check Node.js environment first
  const nodeEnv = (() => {
    try {
      const process = (
        globalThis as { process?: { env?: { NODE_ENV?: string } } }
      ).process;
      return process?.env?.NODE_ENV;
    } catch {
      return undefined;
    }
  })();

  // Check browser test environments
  const browserTestEnv = (() => {
    try {
      if (typeof window === 'undefined')
        return { vitest: false, cypress: false };

      const win = window as { __vitest__?: unknown; Cypress?: unknown };
      return {
        vitest: Boolean(win.__vitest__),
        cypress: Boolean(win.Cypress),
      };
    } catch {
      return { vitest: false, cypress: false };
    }
  })();

  const isTest =
    nodeEnv === 'test' || browserTestEnv.vitest || browserTestEnv.cypress;

  return {
    isTest,
    isVitest: browserTestEnv.vitest,
    isCypress: browserTestEnv.cypress,
  };
}

class UpdateScheduler {
  private pendingUpdates = new Map<string | (() => void), () => void>();
  private isFlushScheduled = false;
  private isFlushing = false;
  private readonly testEnv: TestEnvironment;
  private lastCleanup = 0;
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_PENDING_SIZE = 10000; // Prevent memory bloat

  constructor() {
    // Cache environment detection result to avoid repeated checks
    this.testEnv = detectTestEnvironment();
    this.schedulePeriodicCleanup();
  }

  /**
   * Schedule an update to be executed in the next microtask
   * Uses component identity to deduplicate multiple render requests for the same component
   */
  schedule(update: () => void, componentId?: string): void {
    // IMPORTANT: Never use update.toString() as it breaks with minification!
    // Use the componentId if provided, otherwise use the function reference directly as the key
    // since Map supports using function references as keys (identity-based comparison)
    const key = componentId || update;

    // Prevent memory bloat by limiting pending updates
    if (this.pendingUpdates.size >= this.MAX_PENDING_SIZE) {
      this.performEmergencyCleanup();
    }

    this.pendingUpdates.set(key, update);

    if (!this.isFlushScheduled) {
      this.scheduleFlush();
    }
  }

  /**
   * Schedule the flush operation based on environment
   */
  private scheduleFlush(): void {
    this.isFlushScheduled = true;

    if (this.testEnv.isTest && !this.isFlushing) {
      // Safe to flush synchronously in test environment to avoid timing issues
      this.flush();
    } else {
      // Batch via microtask in production or when already flushing
      queueMicrotask(() => this.flush());
    }
  }

  /**
   * Execute all pending updates
   */
  private flush(): void {
    // Prevent reentrant flushes
    if (this.isFlushing) {
      return;
    }

    this.isFlushing = true;

    // Capture current updates and reset state
    const updates = this.pendingUpdates;
    this.pendingUpdates = new Map();
    this.isFlushScheduled = false;

    try {
      // Execute all updates in batch
      for (const update of updates.values()) {
        try {
          update();
        } catch (error) {
          // Continue with other updates even if one fails
          devError('Error in batched update:', error);
        }
      }
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Force flush any pending DOM updates immediately. This is useful in
   * test environments or callers that require synchronous guarantees after
   * state changes. Prefer relying on the scheduler's automatic flush when
   * possible; use this only when a caller needs to synchronously observe
   * rendered DOM changes.
   */
  flushImmediately(): void {
    if (this.pendingUpdates.size === 0) {
      return;
    }

    // Clear any scheduled flush since we're doing it now
    this.isFlushScheduled = false;
    this.flush();
  }

  /**
   * Get the number of pending updates
   */
  get pendingCount(): number {
    return this.pendingUpdates.size;
  }

  /**
   * Check if there are pending updates
   */
  get hasPendingUpdates(): boolean {
    return this.pendingUpdates.size > 0;
  }

  /**
   * Check if currently flushing updates
   */
  get isFlushingUpdates(): boolean {
    return this.isFlushing;
  }

  /**
   * Schedule periodic cleanup to prevent memory leaks
   */
  private schedulePeriodicCleanup(): void {
    if (this.testEnv.isTest) return; // Skip in tests

    const cleanup = () => {
      this.performPeriodicCleanup();
      if (!this.testEnv.isTest) {
        setTimeout(cleanup, this.CLEANUP_INTERVAL);
      }
    };

    setTimeout(cleanup, this.CLEANUP_INTERVAL);
  }

  /**
   * Perform periodic cleanup of stale entries
   */
  private performPeriodicCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.CLEANUP_INTERVAL) return;

    // In normal operation, pending updates should be processed quickly
    // If we have many pending updates for a long time, something might be wrong
    if (this.pendingUpdates.size > 100) {
      devWarn(
        `Scheduler has ${this.pendingUpdates.size} pending updates. Consider investigating.`,
      );
    }

    this.lastCleanup = now;
  }

  /**
   * Emergency cleanup when pending updates exceed safe limits
   */
  private performEmergencyCleanup(): void {
    devWarn(
      'Scheduler emergency cleanup: too many pending updates, clearing oldest entries',
    );

    // Clear half of the pending updates (oldest first by insertion order)
    const entries = Array.from(this.pendingUpdates.entries());
    const toRemove = Math.floor(entries.length / 2);

    for (let i = 0; i < toRemove; i++) {
      this.pendingUpdates.delete(entries[i][0]);
    }
  }
}

// Global scheduler instance
export const updateScheduler = new UpdateScheduler();

/**
 * Schedule a DOM update to be batched with optional component identity
 */
export function scheduleDOMUpdate(
  update: () => void,
  componentId?: string,
): void {
  updateScheduler.schedule(update, componentId);
}

/**
 * Force flush any pending DOM updates immediately. This is useful in
 * test environments or callers that require synchronous guarantees after
 * state changes. Prefer relying on the scheduler's automatic flush when
 * possible; use this only when a caller needs to synchronously observe
 * rendered DOM changes.
 */
export function flushDOMUpdates(): void {
  updateScheduler.flushImmediately();
}
