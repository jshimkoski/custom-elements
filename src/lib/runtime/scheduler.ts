/**
 * Update Scheduler for batching DOM updates
 * Prevents excessive re-renders and improves performance
 */
import { devError } from './logger';

class UpdateScheduler {
  private pendingUpdates = new Map<string | (() => void), () => void>();
  private isFlushScheduled = false;

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
      this.isFlushScheduled = true;

      // Check if we're in a test environment
      const maybeProcess = (
        globalThis as { process?: { env?: { NODE_ENV?: string } } }
      ).process;
      const isTestEnv =
        (typeof maybeProcess !== 'undefined' &&
          maybeProcess.env?.NODE_ENV === 'test') ||
        (typeof window !== 'undefined' &&
          ((window as { __vitest__?: unknown; Cypress?: unknown }).__vitest__ ||
            (window as { __vitest__?: unknown; Cypress?: unknown }).Cypress));

      if (isTestEnv) {
        // Execute synchronously in test environments to avoid timing issues
        this.flush();
      } else {
        queueMicrotask(() => this.flush());
      }
    }
  }

  /**
   * Execute all pending updates
   */
  private flush(): void {
    const updates = this.pendingUpdates;
    this.pendingUpdates = new Map();
    this.isFlushScheduled = false;

    // Execute all updates in batch
    for (const update of updates.values()) {
      try {
        update();
      } catch (error) {
        // Continue with other updates even if one fails
        devError('Error in batched update:', error);
      }
    }
  }

  /**
   * Get the number of pending updates
   */
  get pendingCount(): number {
    return this.pendingUpdates.size;
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
