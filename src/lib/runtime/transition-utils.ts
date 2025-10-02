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
  const newClasses = classes.filter(cls => cls && !el.classList.contains(cls));
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
 * Track if we've successfully waited for styles at least once
 * After the first successful load, we don't need to wait again
 */
let stylesLoadedOnce = false;

/**
 * Wait for styles to be computed and applied to an element.
 * This ensures CSS is loaded before attempting to read computed styles.
 * Uses a timeout to prevent infinite waiting.
 */
async function waitForStyles(el: HTMLElement, _classesToCheck: string[], maxAttempts = 10): Promise<void> {
  // If we've already loaded styles once, skip the wait
  if (stylesLoadedOnce) {
    return;
  }
  
  // If element is not in the document, styles won't compute
  if (!el.isConnected) {
    console.warn('⚠️ Element not connected to DOM, skipping style wait');
    return;
  }
  
  // Check if any of the classes produce computed styles
  for (let i = 0; i < maxAttempts; i++) {
    const computed = window.getComputedStyle(el);
    
    // Check if transform or opacity has been computed (non-empty)
    // Empty string means CSS hasn't loaded yet
    // 'none' for transform or '0'/'1' for opacity means CSS IS loaded
    const hasTransform = computed.transform && computed.transform !== '';
    const hasOpacity = computed.opacity && computed.opacity !== '';
    
    // If we have valid computed values (even if they're 'none' or '0'), styles are loaded
    if (hasTransform || hasOpacity) {
      stylesLoadedOnce = true;
      return;
    }
    
    // Wait a frame and try again
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
  }
  
  // If we timeout, continue anyway - styles might not be for transform/opacity
  // But mark as loaded so we don't keep checking
  stylesLoadedOnce = true;
  console.warn('⚠️ Styles did not load in time for transition, continuing anyway');
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
function waitForTransition(el: HTMLElement, expectedDuration?: number): Promise<void> {
  return new Promise(resolve => {
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
  transitionMeta: any
): Promise<void> {
  const { classes, hooks, css, duration } = transitionMeta;

  // Call before-enter hook
  if (hooks?.onBeforeEnter) {
    try {
      hooks.onBeforeEnter(el);
    } catch (e) {
      console.error('Transition onBeforeEnter error:', e);
    }
  }
  
  if (!css) {
    // JS-only transition
    if (hooks?.onEnter) {
      return new Promise(resolve => {
        hooks.onEnter(el, () => {
          if (hooks?.onAfterEnter) {
            try {
              hooks.onAfterEnter(el);
            } catch (e) {
              console.error('Transition onAfterEnter error:', e);
            }
          }
          resolve();
        });
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
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  el.offsetHeight;
  
  // Step 2: Add enter-active classes (transition property)
  addClasses(el, enterActiveClasses);

  // CRITICAL: Force another reflow so browser sees the transition property
  // applied BEFORE we change the transform/opacity values
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  el.offsetHeight;
  
  // Call enter hook
  let manualDone: (() => void) | undefined;
  if (hooks?.onEnter) {
    const promise = new Promise<void>(resolve => {
      manualDone = resolve;
    });
    
    try {
      hooks.onEnter(el, () => {
        if (manualDone) manualDone();
      });
    } catch (e) {
      console.error('Transition onEnter error:', e);
    }
    
    // If hook provides done callback, wait for it
    if (manualDone) {
      await promise;
    }
  }
  
  // Wait for next frame - this is critical for the transition to work  
  // The browser needs a frame where it sees: element + enterFrom + enterActive
  await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
  
  // Force another reflow to ensure styles are applied
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  el.offsetHeight;
  
  // CRITICAL: CSS class-based transitions with conflicting properties don't work
  // reliably because of cascade conflicts. When both translate-x-[100%] and
  // translate-x-[0%] are utility classes with same specificity, whichever appears
  // last in the stylesheet wins immediately - no animation.
  //
  // SOLUTION: Use inline styles for the actual transition values.
  // - Inline styles have highest specificity
  // - We capture the "from" computed values as inline styles
  // - Then add "to" classes which override the inline values
  // - Browser animates from inline styles to class-based styles
  //
  // The JIT CSS classes are still used for:
  // - transition-all, duration-300, ease-out (timing/easing)
  // - Non-animated properties (padding, colors, etc.)
  //
  // Only the ANIMATED values (transform, opacity during transition) use inline.
  
  // Capture current computed values
  const computedStyle = window.getComputedStyle(el);
  const fromTransform = computedStyle.transform;
  const fromOpacity = computedStyle.opacity;

  // Remove enterFrom classes
  removeClasses(el, enterFromClasses);

  // Apply captured values as inline styles (highest specificity)
  if (fromTransform && fromTransform !== 'none') {
    el.style.transform = fromTransform;
  }
  if (fromOpacity && fromOpacity !== '') {
    el.style.opacity = fromOpacity;
  }

  // Force reflow
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  el.offsetHeight;
  
  // Wait for next frame
  await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

  // Remove inline styles and add enterTo classes
  // Browser will animate from inline values to class values
  el.style.transform = '';
  el.style.opacity = '';
  addClasses(el, enterToClasses);
  
  // Force reflow to ensure styles are applied
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  el.offsetHeight;
  
  // Wait for next frame so browser recalculates computed styles
  await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

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
      console.error('Transition onAfterEnter error:', e);
    }
  }
}

/**
 * Perform leave transition on an element
 */
export async function performLeaveTransition(
  el: HTMLElement,
  transitionMeta: any
): Promise<void> {
  const { classes, hooks, css, duration } = transitionMeta;

  // Call before-leave hook
  if (hooks?.onBeforeLeave) {
    try {
      hooks.onBeforeLeave(el);
    } catch (e) {
      console.error('Transition onBeforeLeave error:', e);
    }
  }
  
  if (!css) {
    // JS-only transition
    if (hooks?.onLeave) {
      return new Promise(resolve => {
        hooks.onLeave(el, () => {
          if (hooks?.onAfterLeave) {
            try {
              hooks.onAfterLeave(el);
            } catch (e) {
              console.error('Transition onAfterLeave error:', e);
            }
          }
          resolve();
        });
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
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  el.offsetHeight;
  
  // Step 2: Add leave-active classes
  addClasses(el, leaveActiveClasses);
  
  // Call leave hook
  let manualDone: (() => void) | undefined;
  if (hooks?.onLeave) {
    const promise = new Promise<void>(resolve => {
      manualDone = resolve;
    });
    
    try {
      hooks.onLeave(el, () => {
        if (manualDone) manualDone();
      });
    } catch (e) {
      console.error('Transition onLeave error:', e);
    }
    
    // If hook provides done callback, wait for it
    if (manualDone) {
      await promise;
    }
  }
  
  // Use requestAnimationFrame
  await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
  
  // Wait for CSS to be applied
  await waitForStyles(el, [...leaveFromClasses, ...leaveActiveClasses]);
  
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
      console.error('Transition onAfterLeave error:', e);
    }
  }
}

/**
 * Cancel ongoing transition
 */
export function cancelTransition(el: HTMLElement, isEnter: boolean, transitionMeta: any): void {
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
        console.error('Transition onEnterCancelled error:', e);
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
        console.error('Transition onLeaveCancelled error:', e);
      }
    }
  }
}
