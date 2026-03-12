import { devError } from './logger';

/**
 * Transition lifecycle hook signatures
 */
interface TransitionHooks {
  onBeforeEnter?: (el: HTMLElement) => void;
  onEnter?: (el: HTMLElement, done?: () => void) => void;
  onAfterEnter?: (el: HTMLElement) => void;
  onBeforeLeave?: (el: HTMLElement) => void;
  onLeave?: (el: HTMLElement, done?: () => void) => void;
  onAfterLeave?: (el: HTMLElement) => void;
  onEnterCancelled?: (el: HTMLElement) => void;
  onLeaveCancelled?: (el: HTMLElement) => void;
}

/**
 * Transition utilities for VDOM
 * Handles applying transition classes and managing animation lifecycles
 */

/**
 * Split space-separated class names into an array
 */
function splitClasses(classString?: string): string[] {
  return classString ? classString.split(/\s+/).filter(Boolean) : [];
}

/**
 * Add classes to an element
 * Optimized to filter out duplicates before adding
 */
function addClasses(el: HTMLElement, classes: string[]): void {
  if (classes.length === 0) return;

  // Filter out classes that already exist (more efficient than checking one by one)
  const newClasses = classes.filter(
    (cls) => cls && !el.classList.contains(cls),
  );
  if (newClasses.length > 0) {
    el.classList.add(...newClasses);
  }
}

/**
 * Remove classes from an element
 * Optimized to batch remove all classes at once
 */
function removeClasses(el: HTMLElement, classes: string[]): void {
  if (classes.length === 0) return;

  const validClasses = classes.filter(Boolean);
  if (validClasses.length > 0) {
    el.classList.remove(...validClasses);
  }
}

/**
 * Get computed transition duration in milliseconds
 */
function getTransitionDuration(el: HTMLElement): number {
  const computedStyle = window.getComputedStyle(el);
  const duration = computedStyle.transitionDuration || '0s';
  const delay = computedStyle.transitionDelay || '0s';

  const parseDuration = (value: string): number => {
    const num = parseFloat(value);
    return value.includes('ms') ? num : num * 1000;
  };

  return parseDuration(duration) + parseDuration(delay);
}

/**
 * Wait for transition to complete
 */
function waitForTransition(
  el: HTMLElement,
  expectedDuration?: number,
): Promise<void> {
  return new Promise((resolve) => {
    const duration = expectedDuration ?? getTransitionDuration(el);

    if (duration <= 0) {
      resolve();
      return;
    }

    let resolved = false;
    const done = () => {
      if (!resolved) {
        resolved = true;
        el.removeEventListener('transitionend', onTransitionEnd);
        el.removeEventListener('transitioncancel', onTransitionEnd);
        resolve();
      }
    };

    const onTransitionEnd = () => done();

    el.addEventListener('transitionend', onTransitionEnd);
    el.addEventListener('transitioncancel', onTransitionEnd);

    // Fallback timeout in case transitionend doesn't fire
    setTimeout(done, duration + 50);
  });
}

/**
 * Perform enter transition on an element
 */
export async function performEnterTransition(
  el: HTMLElement,
  transitionMeta: {
    classes?: Record<string, string | undefined>;
    hooks?: TransitionHooks;
    css?: boolean;
    duration?: number | { enter?: number; leave?: number };
    [key: string]: unknown;
  },
): Promise<void> {
  const { classes, hooks, css, duration } = transitionMeta;

  // Call before-enter hook
  if (hooks?.onBeforeEnter) {
    try {
      hooks.onBeforeEnter(el);
    } catch (e) {
      devError('Transition onBeforeEnter error:', e);
    }
  }

  if (!css) {
    // JS-only transition
    if (hooks?.onEnter) {
      return new Promise((resolve) => {
        const fn = hooks.onEnter;
        if (typeof fn === 'function') {
          fn(el, () => {
            if (hooks?.onAfterEnter) {
              try {
                hooks.onAfterEnter(el);
              } catch (e) {
                devError('Transition onAfterEnter error:', e);
              }
            }
            resolve();
          });
        } else {
          resolve();
        }
      });
    }
    return;
  }

  // CSS transition
  const enterFromClasses = splitClasses(classes?.enterFrom);
  const enterActiveClasses = splitClasses(classes?.enterActive);
  const enterToClasses = splitClasses(classes?.enterTo);

  // Step 1: Apply enter-from classes
  addClasses(el, enterFromClasses);

  // Force reflow to ensure enter-from is applied

  void el.offsetHeight;

  // Step 2: Add enter-active classes (transition property)
  addClasses(el, enterActiveClasses);

  // CRITICAL: Force another reflow so browser sees the transition property
  // applied BEFORE we change the transform/opacity values

  void el.offsetHeight;

  // Call enter hook
  let manualDone: (() => void) | undefined;
  if (hooks?.onEnter) {
    const promise = new Promise<void>((resolve) => {
      manualDone = resolve;
    });

    try {
      const fn = hooks.onEnter;
      if (typeof fn === 'function') {
        fn(el, () => {
          if (manualDone) manualDone();
        });
      }
    } catch (e) {
      devError('Transition onEnter error:', e);
    }

    // If hook provides done callback, wait for it
    if (manualDone) {
      await promise;
    }
  }

  // Wait one animation frame. The browser must paint a frame with enterFrom +
  // enterActive before we swap to the "to" state.
  //
  // At this point applyStyle() has already run synchronously (it executes right
  // after vdomRenderer() returns, before the rAF fires), so the shadow root's
  // adoptedStyleSheets already contain JIT CSS rules for all enterFrom / enterTo
  // classes. No getComputedStyle() call is needed to capture the "from" state.
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  // Force reflow so the browser confirms the "from" state before the swap.
  void el.offsetHeight;

  // Swap: remove enterFrom classes, add enterTo classes.
  //
  // The browser animates because:
  //   a) The transition-* timing properties (from enterActive) are already active.
  //   b) The element's computed values change when enterFrom leaves and enterTo arrives.
  //   c) Only one set is on the element at a time — no utility-class cascade
  //      conflict (equal specificity, only the matching selector applies).
  //
  // This matches Vue 3's Transition strategy, which also avoids reading computed
  // styles and does not use inline-style bridging.
  removeClasses(el, enterFromClasses);
  addClasses(el, enterToClasses);

  // Force reflow to ensure the class swap is processed.
  void el.offsetHeight;

  // Wait one more frame for the browser to start the transition.
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  // Get duration
  let transitionDuration: number | undefined;
  if (typeof duration === 'number') {
    transitionDuration = duration;
  } else if (duration && typeof duration === 'object' && 'enter' in duration) {
    transitionDuration = duration.enter;
  }

  // Wait for transition
  await waitForTransition(el, transitionDuration);

  // Step 3: Clean up only enterActive classes, keep enterTo as final state
  removeClasses(el, enterActiveClasses);
  // Note: We keep enterToClasses since that's the final visible state

  // Call after-enter hook
  if (hooks?.onAfterEnter) {
    try {
      hooks.onAfterEnter(el);
    } catch (e) {
      devError('Transition onAfterEnter error:', e);
    }
  }
}

/**
 * Perform leave transition on an element
 */
export async function performLeaveTransition(
  el: HTMLElement,
  transitionMeta: {
    classes?: Record<string, string | undefined>;
    hooks?: TransitionHooks;
    css?: boolean;
    duration?: number | { enter?: number; leave?: number };
    [key: string]: unknown;
  },
): Promise<void> {
  const { classes, hooks, css, duration } = transitionMeta;

  // Call before-leave hook
  if (hooks?.onBeforeLeave) {
    try {
      hooks.onBeforeLeave(el);
    } catch (e) {
      devError('Transition onBeforeLeave error:', e);
    }
  }

  if (!css) {
    // JS-only transition
    if (hooks?.onLeave) {
      return new Promise((resolve) => {
        const fn = hooks.onLeave;
        if (typeof fn === 'function') {
          fn(el, () => {
            if (hooks?.onAfterLeave) {
              try {
                hooks.onAfterLeave(el);
              } catch (e) {
                devError('Transition onAfterLeave error:', e);
              }
            }
            resolve();
          });
        } else {
          resolve();
        }
      });
    }
    return;
  }

  // CSS transition
  const leaveFromClasses = splitClasses(classes?.leaveFrom);
  const leaveActiveClasses = splitClasses(classes?.leaveActive);
  const leaveToClasses = splitClasses(classes?.leaveTo);

  // Step 1: Apply leave-from classes
  addClasses(el, leaveFromClasses);

  // Force reflow

  void el.offsetHeight;

  // Step 2: Add leave-active classes
  addClasses(el, leaveActiveClasses);

  // Call leave hook
  let manualDone: (() => void) | undefined;
  if (hooks?.onLeave) {
    const promise = new Promise<void>((resolve) => {
      manualDone = resolve;
    });

    try {
      const fn = hooks.onLeave;
      if (typeof fn === 'function') {
        fn(el, () => {
          if (manualDone) manualDone();
        });
      }
    } catch (e) {
      devError('Transition onLeave error:', e);
    }

    // If hook provides done callback, wait for it
    if (manualDone) {
      await promise;
    }
  }

  // Use requestAnimationFrame
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  // Remove leave-from and add leave-to
  removeClasses(el, leaveFromClasses);
  addClasses(el, leaveToClasses);

  // Get duration
  let transitionDuration: number | undefined;
  if (typeof duration === 'number') {
    transitionDuration = duration;
  } else if (duration && typeof duration === 'object' && 'leave' in duration) {
    transitionDuration = duration.leave;
  }

  // Wait for transition
  await waitForTransition(el, transitionDuration);

  // Step 3: Clean up transition classes
  removeClasses(el, leaveActiveClasses);
  removeClasses(el, leaveToClasses);
  removeClasses(el, leaveFromClasses);

  // Call after-leave hook
  if (hooks?.onAfterLeave) {
    try {
      hooks.onAfterLeave(el);
    } catch (e) {
      devError('Transition onAfterLeave error:', e);
    }
  }
}

/**
 * Cancel ongoing transition
 */
export function cancelTransition(
  el: HTMLElement,
  isEnter: boolean,
  transitionMeta: {
    classes?: Record<string, string | undefined>;
    hooks?: TransitionHooks;
    duration?: number | { enter?: number; leave?: number };
    [key: string]: unknown;
  },
): void {
  const { classes, hooks } = transitionMeta;

  if (isEnter) {
    const enterFromClasses = splitClasses(classes?.enterFrom);
    const enterActiveClasses = splitClasses(classes?.enterActive);
    const enterToClasses = splitClasses(classes?.enterTo);

    removeClasses(el, enterFromClasses);
    removeClasses(el, enterActiveClasses);
    removeClasses(el, enterToClasses);

    if (hooks?.onEnterCancelled) {
      try {
        hooks.onEnterCancelled(el);
      } catch (e) {
        devError('Transition onEnterCancelled error:', e);
      }
    }
  } else {
    const leaveFromClasses = splitClasses(classes?.leaveFrom);
    const leaveActiveClasses = splitClasses(classes?.leaveActive);
    const leaveToClasses = splitClasses(classes?.leaveTo);

    removeClasses(el, leaveFromClasses);
    removeClasses(el, leaveActiveClasses);
    removeClasses(el, leaveToClasses);

    if (hooks?.onLeaveCancelled) {
      try {
        hooks.onLeaveCancelled(el);
      } catch (e) {
        devError('Transition onLeaveCancelled error:', e);
      }
    }
  }
}
