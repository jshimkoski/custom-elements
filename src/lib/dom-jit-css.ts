/**
 * Non-Shadow DOM JIT CSS runtime scanner.
 *
 * Watches real DOM elements for class changes and injects utility CSS into
 * a shared `<style>` element (or constructable stylesheet) in the host document.
 *
 * @example
 * ```ts
 * import { createDOMJITCSS } from '@jasonshimmy/custom-elements-runtime/dom-jit-css';
 *
 * // Watch the full document body
 * const jit = createDOMJITCSS();
 * jit.mount();
 *
 * // Watch a specific container element
 * const jit = createDOMJITCSS({ root: document.getElementById('app')! });
 * jit.mount();
 *
 * // Tear down when no longer needed
 * jit.destroy();
 * ```
 *
 * ## `data-jitcss` attribute semantics
 *
 * | Attribute value                                        | Behaviour                                                         |
 * | ------------------------------------------------------ | ----------------------------------------------------------------- |
 * | `data-jitcss` (no value) or `data-jitcss="container"` | Scopes the observer to that element and its subtree               |
 * | `data-jitcss="self"`                                   | Only processes classes on that exact element, not descendants     |
 * | `data-jitcss="global"`                                 | Observer covers `document.body` (useful on `<html>` or `<body>`)  |
 *
 * When `createDOMJITCSS()` is called with no `root`, it auto-detects all
 * `[data-jitcss]` elements and registers an observer for each.
 */

import { jitCSS, enableJITCSS, type JITCSSOptions } from './runtime/style';

/**
 * Options for `createDOMJITCSS()`.
 */
export interface DOMJITCSSOptions extends JITCSSOptions {
  /**
   * The root element to observe. Defaults to auto-detecting `[data-jitcss]`
   * elements, then falling back to `document.body`.
   */
  root?: Element | ShadowRoot | null;
  /**
   * ID of the `<style>` element injected into the document head.
   * Defaults to `'cer-dom-jit-css'`.
   */
  styleId?: string;
}

/** Public handle returned by `createDOMJITCSS()`. */
export interface DOMJITCSSHandle {
  /** Start observing the DOM and injecting utility CSS. */
  mount(): void;
  /** Stop observing and remove the injected stylesheet. */
  destroy(): void;
  /** Get the number of unique classes processed so far. */
  readonly processedCount: number;
}

/**
 * Create a DOM JIT CSS instance that watches class attribute changes and
 * injects CSS utility rules into the document.
 *
 * @param options - Configuration options.
 * @returns A handle with `mount()` and `destroy()` methods.
 */
export function createDOMJITCSS(
  options: DOMJITCSSOptions = {},
): DOMJITCSSHandle {
  const {
    root: rootOption,
    styleId = 'cer-dom-jit-css',
    ...jitOptions
  } = options;

  // Apply JIT CSS options (e.g. extendedColors, customColors) globally
  if (Object.keys(jitOptions).length > 0) {
    enableJITCSS(jitOptions);
  }

  // Monotonically growing set of processed class names.
  // We never shrink this — rules remain valid even if classes are removed.
  const processedClasses = new Set<string>();
  // CSS text that has been injected. Grown incrementally.
  let injectedCSS = '';

  let styleEl: HTMLStyleElement | null = null;
  let adoptedSheet: CSSStyleSheet | null = null;
  let useAdoptedSheet = false;
  let observer: MutationObserver | null = null;
  let pendingClasses = new Set<string>();
  let flushScheduled = false;
  let isMounted = false;
  // The target for adoptedStyleSheets / <style> injection. Set during mount().
  // When rootOption is a ShadowRoot the sheet is scoped to that shadow tree;
  // otherwise styles are adopted by the host document.
  let adoptionTarget: Document | ShadowRoot | null = null;

  function injectStylesheet(): void {
    if (typeof document === 'undefined') return;

    // Scope stylesheet injection to the shadow root when one was supplied,
    // so the generated utility classes do not leak into the host document.
    adoptionTarget = rootOption instanceof ShadowRoot ? rootOption : document;

    // Try constructable stylesheets first (faster incremental updates)
    if (
      typeof CSSStyleSheet !== 'undefined' &&
      'replaceSync' in CSSStyleSheet.prototype &&
      adoptionTarget.adoptedStyleSheets !== undefined
    ) {
      try {
        adoptedSheet = new CSSStyleSheet();
        adoptionTarget.adoptedStyleSheets = [
          ...adoptionTarget.adoptedStyleSheets,
          adoptedSheet,
        ];
        useAdoptedSheet = true;
        return;
      } catch {
        // Fall through to style element
      }
    }

    // Fallback: a plain <style> element.
    // For a ShadowRoot target, append directly inside the shadow tree.
    // ShadowRoot has no getElementById(), so we always create a fresh element.
    if (rootOption instanceof ShadowRoot) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      rootOption.appendChild(styleEl);
    } else {
      styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        (document.head ?? document.documentElement).appendChild(styleEl);
      }
    }
  }

  function applyNewCSS(css: string): void {
    if (!css) return;
    injectedCSS += `\n${css}`;
    if (useAdoptedSheet && adoptedSheet) {
      try {
        // Replace the entire sheet with the accumulated CSS wrapped in a single
        // @layer block. replaceSync handles nested at-rules (@media, @container,
        // @supports) correctly — the previous insertRule approach used a flat
        // regex that stripped at-rule wrappers, causing dark: and responsive
        // variants to apply unconditionally.
        adoptedSheet.replaceSync(`@layer cer-utilities {\n${injectedCSS}\n}`);
        return;
      } catch {
        // Fall through to style element
      }
    }
    if (styleEl) {
      // Wrap everything in a single @layer block for the <style> fallback path
      styleEl.textContent = `@layer cer-utilities {\n${injectedCSS}\n}`;
    }
  }

  function extractClasses(el: Element): string[] {
    const cls = el.getAttribute('class');
    if (!cls) return [];
    return cls.split(/\s+/).filter(Boolean);
  }

  function scheduleFlush(): void {
    if (flushScheduled) return;
    flushScheduled = true;
    queueMicrotask(flushPending);
  }

  function flushPending(): void {
    flushScheduled = false;
    if (pendingClasses.size === 0) return;

    // Compute delta — only process classes we haven't seen before
    const newClasses: string[] = [];
    for (const cls of pendingClasses) {
      if (!processedClasses.has(cls)) {
        processedClasses.add(cls);
        newClasses.push(cls);
      }
    }
    pendingClasses = new Set<string>();

    if (newClasses.length === 0) return;

    // Build a minimal HTML string containing only the new class names so
    // the jitCSS engine parses only the delta (not the full DOM).
    const fakeHTML = `<div class="${newClasses.join(' ')}"></div>`;
    const newCSS = jitCSS(fakeHTML);
    if (newCSS) {
      applyNewCSS(newCSS);
    }
  }

  function addClassesFromElement(el: Element): void {
    for (const cls of extractClasses(el)) {
      pendingClasses.add(cls);
    }
  }

  function scanSubtree(root: Element | Document | ShadowRoot): void {
    // Use TreeWalker for maximum performance on initial scan
    const walker = document.createTreeWalker(
      root instanceof Document ? document.body : (root as Node),
      NodeFilter.SHOW_ELEMENT,
    );
    let node: Node | null = walker.currentNode;
    while (node) {
      if (node instanceof Element) {
        addClassesFromElement(node);
      }
      node = walker.nextNode();
    }
    scheduleFlush();
  }

  function getObserverRoot(): Element | ShadowRoot | null {
    if (rootOption) {
      // Return the ShadowRoot directly so the MutationObserver observes inside
      // the shadow tree. Previously we returned rootOption.host which caused the
      // observer to watch the light DOM of the host element instead.
      return rootOption;
    }

    // Auto-detect [data-jitcss] elements
    if (typeof document !== 'undefined') {
      const scoped = document.querySelectorAll('[data-jitcss]');
      if (scoped.length > 0) {
        // Use the first scoped element; if multiple, observe body
        return scoped.length === 1 ? (scoped[0] as Element) : document.body;
      }
      return document.body;
    }

    return null;
  }

  function getDataJITCSSMode(el: Element): 'container' | 'self' | 'global' {
    const val = el.getAttribute('data-jitcss');
    if (val === 'self') return 'self';
    if (val === 'global') return 'global';
    return 'container';
  }

  function mount(): void {
    if (isMounted) return;
    isMounted = true;

    injectStylesheet();

    const observerRoot = getObserverRoot();
    if (!observerRoot) return;

    // ShadowRoot does not inherit hasAttribute() from Element; guard with an
    // instanceof check so passing a ShadowRoot as root does not throw.
    const mode =
      observerRoot instanceof Element &&
      observerRoot.hasAttribute('data-jitcss')
        ? getDataJITCSSMode(observerRoot)
        : 'container';
    const actualRoot = mode === 'global' ? document.body : observerRoot;

    // Initial scan
    if (mode === 'self' && actualRoot instanceof Element) {
      addClassesFromElement(actualRoot);
      scheduleFlush();
    } else {
      scanSubtree(actualRoot);
    }

    // Set up MutationObserver
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class'
        ) {
          if (mutation.target instanceof Element) {
            addClassesFromElement(mutation.target);
          }
        } else if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node instanceof Element) {
              if (mode === 'self') continue; // Only own classes in self mode
              // scanSubtree already processes the root element as its first
              // walker node, so a separate addClassesFromElement call here
              // would process the same element twice.
              scanSubtree(node);
            }
          }
        }
      }
      scheduleFlush();
    });

    observer.observe(actualRoot, {
      subtree: mode !== 'self',
      attributes: true,
      attributeFilter: ['class'],
      childList: mode !== 'self',
      characterData: false,
    });
  }

  function destroy(): void {
    if (!isMounted) return;
    isMounted = false;

    if (observer) {
      observer.disconnect();
      observer = null;
    }

    // Remove injected styles
    if (useAdoptedSheet && adoptedSheet) {
      try {
        const target = adoptionTarget ?? document;
        target.adoptedStyleSheets = target.adoptedStyleSheets.filter(
          (s) => s !== adoptedSheet,
        );
      } catch {
        // ignore
      }
      adoptedSheet = null;
    }

    if (styleEl) {
      styleEl.remove();
      styleEl = null;
    }

    processedClasses.clear();
    pendingClasses.clear();
    injectedCSS = '';
    flushScheduled = false;
    adoptionTarget = null;
  }

  return {
    mount,
    destroy,
    get processedCount() {
      return processedClasses.size;
    },
  };
}
