/**
 * Transitions module (top-level). This file provides the public Transition
 * and TransitionGroup APIs. It is an explicit entry used by the build so
 * consumers can import transitions separately: `.../transitions`.
 */
/**
 * Transitions Module
 * Vue-like transition system integrated with JIT CSS
 * Provides Transition and TransitionGroup components for enter/leave animations
 */

import { anchorBlock } from './directives';
import type { VNode } from './runtime/types';
import { processJITCSS } from './runtime/render-bridge';

/* --- Types --- */

/**
 * Transition class names for different animation phases
 * All values should be JIT CSS utility classes
 */
export interface TransitionClasses {
  /** Classes applied at the start of enter transition */
  enterFrom?: string;
  /** Classes applied during entire enter transition */
  enterActive?: string;
  /** Classes applied at the end of enter transition */
  enterTo?: string;
  /** Classes applied at the start of leave transition */
  leaveFrom?: string;
  /** Classes applied during entire leave transition */
  leaveActive?: string;
  /** Classes applied at the end of leave transition */
  leaveTo?: string;
}

/**
 * Lifecycle hooks for transition events
 */
export interface TransitionHooks {
  /** Called before enter transition starts */
  onBeforeEnter?: (el: HTMLElement) => void;
  /** Called during enter transition (with done callback for manual control) */
  onEnter?: (el: HTMLElement, done: () => void) => void;
  /** Called after enter transition completes */
  onAfterEnter?: (el: HTMLElement) => void;
  /** Called if enter transition is cancelled */
  onEnterCancelled?: (el: HTMLElement) => void;
  /** Called before leave transition starts */
  onBeforeLeave?: (el: HTMLElement) => void;
  /** Called during leave transition (with done callback for manual control) */
  onLeave?: (el: HTMLElement, done: () => void) => void;
  /** Called after leave transition completes */
  onAfterLeave?: (el: HTMLElement) => void;
  /** Called if leave transition is cancelled */
  onLeaveCancelled?: (el: HTMLElement) => void;
}

/**
 * Options for Transition component
 */
export interface TransitionOptions extends TransitionClasses, TransitionHooks {
  /** Preset name (fade, slide-right, scale, etc.) */
  preset?: keyof typeof transitionPresets;
  /** Whether to show the content */
  show: boolean;
  /** Transition mode: default, out-in (leave before enter), in-out (enter before leave) */
  mode?: 'default' | 'out-in' | 'in-out';
  /** Custom duration override (ms) */
  duration?: number | { enter: number; leave: number };
  /** Whether to apply transition on initial render */
  appear?: boolean;
  /** Whether to use CSS transitions (true) or JS-only hooks (false) */
  css?: boolean;
  /** Optional name for debugging */
  name?: string;
}

/**
 * Options for TransitionGroup component
 */
export interface TransitionGroupOptions extends Omit<
  TransitionOptions,
  'show'
> {
  /** HTML tag for the wrapper element */
  tag?: string;
  /** Class applied during move transitions (when items reorder) */
  moveClass?: string;
  /** Whether to show the group (defaults to true for TransitionGroup) */
  show?: boolean;
  /** CSS classes to apply to the wrapper element (e.g., 'flex gap-4' or 'grid grid-cols-3') */
  class?: string;
  /** Inline styles to apply to the wrapper element */
  style?: string | Record<string, string>;
}

/* --- Transition Presets --- */

/**
 * Pre-defined transition presets using JIT CSS classes
 * Users can reference these by name or define custom classes
 */
export const transitionPresets = {
  /** Simple fade in/out */
  fade: {
    enterFrom: 'opacity-0',
    enterActive: 'transition-opacity duration-300 ease-out',
    enterTo: 'opacity-100',
    leaveFrom: 'opacity-100',
    leaveActive: 'transition-opacity duration-200 ease-in',
    leaveTo: 'opacity-0',
  },

  /** Slide in from right */
  'slide-right': {
    enterFrom: 'translate-x-[100%] opacity-0',
    enterActive: 'transition-all duration-300 ease-out',
    enterTo: 'translate-x-[0%] opacity-100',
    leaveFrom: 'translate-x-[0%] opacity-100',
    leaveActive: 'transition-all duration-200 ease-in',
    leaveTo: 'translate-x-[100%] opacity-0',
  },

  /** Slide in from left */
  'slide-left': {
    enterFrom: 'translate-x-[-100%] opacity-0',
    enterActive: 'transition-all duration-300 ease-out',
    enterTo: 'translate-x-[0%] opacity-100',
    leaveFrom: 'translate-x-[0%] opacity-100',
    leaveActive: 'transition-all duration-200 ease-in',
    leaveTo: 'translate-x-[-100%] opacity-0',
  },

  /** Slide up from bottom */
  'slide-up': {
    enterFrom: 'translate-y-[100%] opacity-0',
    enterActive: 'transition-all duration-300 ease-out',
    enterTo: 'translate-y-[0%] opacity-100',
    leaveFrom: 'translate-y-[0%] opacity-100',
    leaveActive: 'transition-all duration-200 ease-in',
    leaveTo: 'translate-y-[100%] opacity-0',
  },

  /** Slide down from top */
  'slide-down': {
    enterFrom: 'translate-y-[-100%] opacity-0',
    enterActive: 'transition-all duration-300 ease-out',
    enterTo: 'translate-y-[0%] opacity-100',
    leaveFrom: 'translate-y-[0%] opacity-100',
    leaveActive: 'transition-all duration-200 ease-in',
    leaveTo: 'translate-y-[-100%] opacity-0',
  },

  /** Scale up from center */
  scale: {
    enterFrom: 'scale-95 opacity-0',
    enterActive: 'transition-all duration-200 ease-out',
    enterTo: 'scale-100 opacity-100',
    leaveFrom: 'scale-100 opacity-100',
    leaveActive: 'transition-all duration-150 ease-in',
    leaveTo: 'scale-95 opacity-0',
  },

  /** Scale down to center */
  'scale-down': {
    enterFrom: 'scale-105 opacity-0',
    enterActive: 'transition-all duration-200 ease-out',
    enterTo: 'scale-100 opacity-100',
    leaveFrom: 'scale-100 opacity-100',
    leaveActive: 'transition-all duration-150 ease-in',
    leaveTo: 'scale-105 opacity-0',
  },

  /** Bounce effect */
  bounce: {
    enterFrom: 'scale-0 opacity-0',
    enterActive: 'transition-all duration-500 ease-out',
    enterTo: 'scale-100 opacity-100',
    leaveFrom: 'scale-100 opacity-100',
    leaveActive: 'transition-all duration-200 ease-in',
    leaveTo: 'scale-0 opacity-0',
  },

  /** Zoom and fade */
  zoom: {
    enterFrom: 'scale-0 opacity-0',
    enterActive: 'transition-all duration-300 ease-out',
    enterTo: 'scale-100 opacity-100',
    leaveFrom: 'scale-100 opacity-100',
    leaveActive: 'transition-all duration-200 ease-in',
    leaveTo: 'scale-0 opacity-0',
  },

  /** Flip in */
  flip: {
    enterFrom: 'rotate-[90deg] opacity-0',
    enterActive: 'transition-all duration-400 ease-out',
    enterTo: 'rotate-[0deg] opacity-100',
    leaveFrom: 'rotate-[0deg] opacity-100',
    leaveActive: 'transition-all duration-300 ease-in',
    leaveTo: 'rotate-[90deg] opacity-0',
  },
} as const;

/* --- Core Functions --- */

/**
 * Transition component - wraps content with enter/leave animations
 *
 * @example
 * ```ts
 * // Using a preset
 * ${Transition({ preset: 'fade', show: isVisible.value }, html`<div>Content</div>`)}
 *
 * // Using custom JIT classes
 * ${Transition({
 *   show: isVisible.value,
 *   enterFrom: 'opacity-0 scale-95',
 *   enterActive: 'transition-all duration-300',
 *   enterTo: 'opacity-100 scale-100',
 *   leaveFrom: 'opacity-100 scale-100',
 *   leaveActive: 'transition-all duration-200',
 *   leaveTo: 'opacity-0 scale-95'
 * }, html`<div>Content</div>`)}
 *
 * // With lifecycle hooks
 * ${Transition({
 *   preset: 'slide-right',
 *   show: isVisible.value,
 *   onAfterEnter: (el) => console.log('Entered!'),
 *   onAfterLeave: (el) => console.log('Left!')
 * }, html`<div>Content</div>`)}
 *
 * // Lazy factory — only evaluated when show is true (avoids constructing
 * // expensive VNode trees when the content is hidden)
 * ${Transition({ show: isVisible.value }, () => html`<div>Expensive content</div>`)}
 * ```
 */
export function Transition(
  options: TransitionOptions,
  content: VNode | VNode[] | (() => VNode | VNode[]),
): VNode {
  const {
    preset,
    show,
    mode = 'default',
    duration,
    appear = false,
    css = true,
    name,
    enterFrom,
    enterActive,
    enterTo,
    leaveFrom,
    leaveActive,
    leaveTo,
    onBeforeEnter,
    onEnter,
    onAfterEnter,
    onEnterCancelled,
    onBeforeLeave,
    onLeave,
    onAfterLeave,
    onLeaveCancelled,
  } = options;

  // Resolve classes from preset or explicit values
  let transitionClasses: TransitionClasses;
  if (preset && transitionPresets[preset]) {
    transitionClasses = { ...transitionPresets[preset] };
    // Allow overriding preset classes
    if (enterFrom) transitionClasses.enterFrom = enterFrom;
    if (enterActive) transitionClasses.enterActive = enterActive;
    if (enterTo) transitionClasses.enterTo = enterTo;
    if (leaveFrom) transitionClasses.leaveFrom = leaveFrom;
    if (leaveActive) transitionClasses.leaveActive = leaveActive;
    if (leaveTo) transitionClasses.leaveTo = leaveTo;
  } else {
    transitionClasses = {
      enterFrom,
      enterActive,
      enterTo,
      leaveFrom,
      leaveActive,
      leaveTo,
    };
  }

  // Resolve content: only call the factory when show is true so that expensive
  // VNode trees (e.g. those that trigger calender builds or heavy computeds)
  // are never constructed while the transition is hidden. Leave animations
  // operate on existing DOM nodes and do not require the content VNode.
  const resolvedContent: VNode | VNode[] =
    show && typeof content === 'function'
      ? content()
      : (content as VNode | VNode[]);

  // Create anchor block with transition metadata
  const transitionKey =
    name || (preset ? `transition-${preset}` : 'transition');
  const transitionVNode = anchorBlock(
    show ? resolvedContent : [],
    transitionKey,
  );

  // Attach metadata for VDOM to consume during patching
  (transitionVNode as VNode & { _transition?: unknown })._transition = {
    name: transitionKey,
    classes: transitionClasses,
    mode,
    duration,
    appear,
    css,
    state: show ? 'visible' : 'hidden',
    hooks: {
      onBeforeEnter,
      onEnter,
      onAfterEnter,
      onEnterCancelled,
      onBeforeLeave,
      onLeave,
      onAfterLeave,
      onLeaveCancelled,
    },
  };

  return transitionVNode;
}

/**
 * TransitionGroup component - animates lists with enter/leave/move transitions
 *
 * @example
 * ```ts
 * // Basic usage
 * ${TransitionGroup({
 *   preset: 'slide-right',
 *   tag: 'ul',
 *   moveClass: 'transition-transform duration-300'
 * }, each(items.value, (item) => html`
 *   <li key="${item.id}">${item.text}</li>
 * `))}
 *
 * // With flex layout
 * ${TransitionGroup({
 *   preset: 'fade',
 *   class: 'flex gap-4 flex-wrap'
 * }, each(items.value, (item) => html`
 *   <div key="${item.id}" class="shrink-0">${item.text}</div>
 * `))}
 *
 * // With grid layout
 * ${TransitionGroup({
 *   preset: 'scale',
 *   class: 'grid grid-cols-3 gap-4'
 * }, each(items.value, (item) => html`
 *   <div key="${item.id}">${item.text}</div>
 * `))}
 * ```
 */
export function TransitionGroup(
  options: TransitionGroupOptions,
  children: VNode[],
): VNode {
  const {
    tag = 'div',
    moveClass = 'transition-transform duration-300',
    preset,
    show = true,
    mode = 'default',
    duration,
    appear = false,
    css = true,
    name,
    class: className,
    style,
    enterFrom,
    enterActive,
    enterTo,
    leaveFrom,
    leaveActive,
    leaveTo,
    onBeforeEnter,
    onEnter,
    onAfterEnter,
    onEnterCancelled,
    onBeforeLeave,
    onLeave,
    onAfterLeave,
    onLeaveCancelled,
  } = options;

  // Resolve classes from preset or explicit values
  let transitionClasses: TransitionClasses;
  if (preset && transitionPresets[preset]) {
    transitionClasses = { ...transitionPresets[preset] };
    // Allow overriding preset classes
    if (enterFrom) transitionClasses.enterFrom = enterFrom;
    if (enterActive) transitionClasses.enterActive = enterActive;
    if (enterTo) transitionClasses.enterTo = enterTo;
    if (leaveFrom) transitionClasses.leaveFrom = leaveFrom;
    if (leaveActive) transitionClasses.leaveActive = leaveActive;
    if (leaveTo) transitionClasses.leaveTo = leaveTo;
  } else {
    transitionClasses = {
      enterFrom,
      enterActive,
      enterTo,
      leaveFrom,
      leaveActive,
      leaveTo,
    };
  }

  // Create wrapper element with transition group metadata
  const groupKey =
    name || (preset ? `transition-group-${preset}` : 'transition-group');

  // Flatten anchor block children to enable proper keyed diffing
  // When each() is used, it creates anchor blocks. We need to extract the actual elements
  // and give them keys from their anchor blocks for proper reordering
  const flattenedChildren: VNode[] = [];
  for (const child of show ? children : []) {
    if (child && typeof child === 'object' && child.tag === '#anchor') {
      // Extract children from anchor block
      const anchorChildren = Array.isArray(child.children)
        ? child.children
        : [];
      for (const anchorChild of anchorChildren) {
        if (anchorChild && typeof anchorChild === 'object') {
          // Use anchor block's key for the child element
          const keyedChild = {
            ...anchorChild,
            key: child.key || anchorChild.key,
            props: {
              ...anchorChild.props,
              _anchorKey: child.key, // Preserve original anchor key
            },
          };
          flattenedChildren.push(keyedChild);
        } else {
          flattenedChildren.push(anchorChild);
        }
      }
    } else {
      flattenedChildren.push(child);
    }
  }

  // Serialize style object to a CSS string for the attrs record so it matches
  // the expected primitive attribute value types.
  const styleAttr = (() => {
    if (!style) return undefined;
    if (typeof style === 'string') return style;
    return Object.entries(style)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');
  })();

  return {
    tag,
    children: flattenedChildren,
    key: groupKey,
    props: {
      attrs: {
        ...(className ? { class: className } : {}),
        ...(styleAttr ? { style: styleAttr } : {}),
      },
      _transitionGroup: {
        name: groupKey,
        classes: transitionClasses,
        moveClass,
        mode,
        duration,
        appear,
        css,
        hooks: {
          onBeforeEnter,
          onEnter,
          onAfterEnter,
          onEnterCancelled,
          onBeforeLeave,
          onLeave,
          onAfterLeave,
          onLeaveCancelled,
        },
      },
    },
  };
}

/**
 * Helper to create custom transition presets
 *
 * @example
 * ```ts
 * const customFade = createTransitionPreset({
 *   enterFrom: 'opacity-0',
 *   enterActive: 'transition-opacity duration-500 ease-out',
 *   enterTo: 'opacity-100',
 *   leaveFrom: 'opacity-100',
 *   leaveActive: 'transition-opacity duration-300 ease-in',
 *   leaveTo: 'opacity-0'
 * });
 *
 * ${Transition({ ...customFade, show: visible.value }, content)}
 * ```
 */
export function createTransitionPreset(
  classes: TransitionClasses,
): TransitionClasses {
  return { ...classes };
}

/**
 * Pre-generate CSS for all transition preset classes
 * This ensures the JIT CSS system has the styles ready when transitions are used
 */
let transitionStyleSheet: CSSStyleSheet | null = null;

/**
 * Get the global transition stylesheet (creates it if needed)
 */
export function getTransitionStyleSheet(): CSSStyleSheet {
  if (!transitionStyleSheet) {
    // If constructable stylesheets aren't available (SSR / old browsers),
    // return a no-op stub to avoid throwing during import or server render.
    if (typeof CSSStyleSheet === 'undefined') {
      transitionStyleSheet = {
        cssRules: [],
        replaceSync: () => {},
        toString: () => '',
      } as unknown as CSSStyleSheet;
      return transitionStyleSheet;
    }

    const allClasses: string[] = [];

    // Collect all classes from presets
    Object.values(transitionPresets).forEach((preset) => {
      if (preset.enterFrom) allClasses.push(preset.enterFrom);
      if (preset.enterActive) allClasses.push(preset.enterActive);
      if (preset.enterTo) allClasses.push(preset.enterTo);
      if (preset.leaveFrom) allClasses.push(preset.leaveFrom);
      if (preset.leaveActive) allClasses.push(preset.leaveActive);
      if (preset.leaveTo) allClasses.push(preset.leaveTo);
    });

    // Create a fake HTML string with all transition classes
    const fakeHtml = `<div class="${allClasses.join(' ')}"></div>`;

    // Trigger JIT CSS generation (no-op if JIT CSS engine is not loaded)
    const generatedCSS = processJITCSS(fakeHtml);

    // Create stylesheet
    try {
      transitionStyleSheet = new CSSStyleSheet();
      transitionStyleSheet.replaceSync(generatedCSS);
    } catch {
      // If creating a constructable stylesheet fails for any reason,
      // fallback to a stub to avoid breaking SSR or older environments.
      transitionStyleSheet = {
        cssRules: [],
        replaceSync: () => {},
        toString: () => generatedCSS || '',
      } as unknown as CSSStyleSheet;
    }
  }

  return transitionStyleSheet;
}

