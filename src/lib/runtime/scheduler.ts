/**
 * Update Scheduler for batching DOM updates
 * Prevents excessive re-renders and improves performance
 */
import { devWarn, devError } from './logger';

/**
 * A scheduled update function to be executed in the next flush cycle.
 */
type ScheduledUpdate = () => void;

/**
 * Scheduling priority for update tasks.
 *
 * - `'immediate'` — Run synchronously before returning (use sparingly).
 * - `'normal'`    — Batch via microtask (default).
 * - `'idle'`      — Defer to browser idle time via `requestIdleCallback`
 *                    (time-sliced, non-blocking rendering for low-priority work).
 */
export type UpdatePriority = 'immediate' | 'normal' | 'idle';

/**
 * Environment detection utilities
 */
export interface TestEnvironment {
  isTest: boolean;
  isVitest: boolean;
  isCypress: boolean;
}

/**
 * Detect test environment with improved reliability
 */
export function detectTestEnvironment(): TestEnvironment {
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
  private pendingUpdates = new Map<string | (() => void), ScheduledUpdate>();
  private isFlushScheduled = false;
  private isFlushing = false;
  private readonly testEnv: TestEnvironment;
  private lastCleanup = 0;
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_PENDING_SIZE = 10000; // Prevent memory bloat

  // Idle / time-sliced priority support
  private pendingIdleUpdates = new Map<
    string | (() => void),
    ScheduledUpdate
  >();
  private idleCallbackHandle: ReturnType<typeof setTimeout> | null = null;

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
   * Execute all pending updates with priority ordering
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
   * Emergency cleanup when pending updates exceed safe limits.
   * @param queue - The specific map to trim; defaults to the normal queue.
   */
  private performEmergencyCleanup(
    queue: Map<string | (() => void), ScheduledUpdate> = this.pendingUpdates,
  ): void {
    devWarn(
      'Scheduler emergency cleanup: too many pending updates, clearing oldest entries',
    );

    // Clear half of the queue (oldest first by insertion order)
    const entries = Array.from(queue.entries());
    const toRemove = Math.floor(entries.length / 2);

    for (let i = 0; i < toRemove; i++) {
      queue.delete(entries[i][0]);
    }
  }

  /**
   * Schedule an update with an explicit priority level.
   *
   * - `'immediate'` — Runs synchronously before returning.
   * - `'normal'`    — Default microtask batching (same as `schedule()`).
   * - `'idle'`      — Deferred to browser idle time via `requestIdleCallback`
   *                    with time-slicing to avoid blocking the main thread.
   *                    Falls back to a 5 ms `setTimeout` when
   *                    `requestIdleCallback` is unavailable (e.g. Safari < 16).
   *
   * @example Defer a low-priority analytics flush
   * ```ts
   * scheduleWithPriority(() => flushAnalytics(), 'idle');
   * ```
   */
  scheduleWithPriority(
    update: () => void,
    priority: UpdatePriority = 'normal',
    componentId?: string,
  ): void {
    if (priority === 'immediate') {
      try {
        update();
      } catch (error) {
        devError('Error in immediate update:', error);
      }
      return;
    }

    if (priority === 'idle') {
      const key = componentId ?? update;
      if (this.pendingIdleUpdates.size >= this.MAX_PENDING_SIZE) {
        this.performEmergencyCleanup(this.pendingIdleUpdates);
      }
      this.pendingIdleUpdates.set(key, update);
      this.scheduleIdleFlush();
      return;
    }

    // 'normal' → microtask-batched path, always via queueMicrotask so that
    // multiple synchronous calls with the same componentId are deduped before
    // the flush fires (even in test environments where schedule() auto-flushes
    // synchronously to simplify timing).
    const key = componentId ?? update;
    if (this.pendingUpdates.size >= this.MAX_PENDING_SIZE) {
      this.performEmergencyCleanup();
    }
    this.pendingUpdates.set(key, update);
    if (!this.isFlushScheduled) {
      this.isFlushScheduled = true;
      queueMicrotask(() => this.flush());
    }
  }

  /**
   * Schedule a flush of idle-priority updates.
   * Uses `requestIdleCallback` when available; falls back to a short `setTimeout`.
   */
  private scheduleIdleFlush(): void {
    if (this.idleCallbackHandle !== null) return;

    if (this.testEnv.isTest) {
      // In tests, run after current call stack via microtask so updates are
      // observable synchronously in the same tick.
      this.idleCallbackHandle = setTimeout(() => {
        this.idleCallbackHandle = null;
        this.flushIdleUpdates(null);
      }, 0);
      return;
    }

    // Use requestIdleCallback when the browser supports it (Chrome/Firefox/Edge)
    if (typeof requestIdleCallback !== 'undefined') {
      const handle = requestIdleCallback(
        (deadline) => {
          this.idleCallbackHandle = null;
          this.flushIdleUpdates(deadline);
        },
        { timeout: 2000 },
      ) as unknown as ReturnType<typeof setTimeout>;
      this.idleCallbackHandle = handle;
    } else {
      // Polyfill: simulate a ~50 ms idle deadline via setTimeout
      this.idleCallbackHandle = setTimeout(() => {
        this.idleCallbackHandle = null;
        const start = Date.now();
        this.flushIdleUpdates({
          timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
          didTimeout: false,
        });
      }, 5);
    }
  }

  /**
   * Process pending idle-priority updates in a time-sliced manner.
   * Yields back to the browser when the deadline's `timeRemaining()` reaches
   * zero and reschedules any unprocessed work.
   */
  private flushIdleUpdates(
    deadline: { timeRemaining: () => number; didTimeout: boolean } | null,
  ): void {
    // Snapshot and clear current idle queue
    const updates = Array.from(this.pendingIdleUpdates.entries());
    this.pendingIdleUpdates = new Map();

    for (let i = 0; i < updates.length; i++) {
      // Yield if we've used our idle time (unless the callback timed out,
      // in which case we must finish to avoid indefinite deferral)
      if (deadline && !deadline.didTimeout && deadline.timeRemaining() <= 0) {
        // Re-queue remaining work for the next idle window
        for (let j = i; j < updates.length; j++) {
          this.pendingIdleUpdates.set(updates[j][0], updates[j][1]);
        }
        this.scheduleIdleFlush();
        return;
      }

      try {
        updates[i][1]();
      } catch (error) {
        devError('Error in idle update:', error);
      }
    }
  }
}

// Global scheduler instance
export const updateScheduler = new UpdateScheduler();

/**
 * Schedule a DOM update to be batched with optional component identity and priority.
 */
export function scheduleDOMUpdate(
  update: () => void,
  componentId?: string,
): void {
  updateScheduler.schedule(update, componentId);
}

/**
 * Schedule an update with explicit priority.
 * See `UpdateScheduler.scheduleWithPriority` for full documentation.
 *
 * @example
 * ```ts
 * // Defer low-priority work to browser idle time (time-sliced, non-blocking)
 * scheduleWithPriority(() => updateAnalyticsDashboard(), 'idle');
 *
 * // Run a critical update before any async code resumes
 * scheduleWithPriority(() => updateCriticalUI(), 'immediate');
 * ```
 */
export function scheduleWithPriority(
  update: () => void,
  priority: UpdatePriority = 'normal',
  componentId?: string,
): void {
  updateScheduler.scheduleWithPriority(update, priority, componentId);
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

/**
 * Returns a Promise that resolves after the next DOM update cycle completes.
 * Equivalent to Vue's `nextTick()` — useful when you need to observe DOM
 * state that reflects the latest reactive changes.
 *
 * @example
 * ```ts
 * count.value++;
 * await nextTick();
 * console.log(element.shadowRoot.querySelector('span').textContent); // updated
 * ```
 */
export function nextTick(): Promise<void> {
  // Flush all pending updates, including any new work enqueued during a flush
  // (e.g. watcher-triggered re-renders), before resolving. Looping ensures
  // callers always observe fully-settled DOM state rather than a partial flush.
  return new Promise<void>((resolve) => {
    const MAX_FLUSH_ITERATIONS = 100;
    let iterations = 0;
    while (updateScheduler.hasPendingUpdates && iterations < MAX_FLUSH_ITERATIONS) {
      updateScheduler.flushImmediately();
      iterations++;
    }
    if (iterations >= MAX_FLUSH_ITERATIONS) {
      devWarn(
        '[nextTick] Maximum flush iterations reached — possible circular update loop. ' +
          'Check for watchers or computed values that unconditionally mutate reactive state.',
      );
    }
    // Resolve after all synchronous flushes have completed.
    queueMicrotask(resolve);
  });
}
