/**
 * Update Scheduler for batching DOM updates
 * Prevents excessive re-renders and improves performance
 */
import { devError } from './logger';

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

  constructor() {
    // Cache environment detection result to avoid repeated checks
    this.testEnv = detectTestEnvironment();
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
