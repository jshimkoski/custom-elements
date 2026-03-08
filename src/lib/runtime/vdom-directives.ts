/**
 * vdom-directives.ts
 *
 * Directive processors for the virtual DOM. Handles `:model`, `:bind`,
 * `:show`, `:class`, `:style`, and `:ref` directives as well as the
 * top-level `processDirectives` coordinator.
 */

import { isReactiveState } from './reactive';
import { getNestedValue, setNestedValue, toKebab } from './helpers';
import { EventManager } from './event-manager';
import { SecureExpressionEvaluator } from './secure-expression-evaluator';
import {
  hasValueChanged,
  updateStateValue,
  triggerStateUpdate,
  emitUpdateEvents,
  syncElementWithState,
  getCurrentStateValue,
} from './vdom-model-helpers';
import {
  isNativeControl,
  type PropsMap,
  type VDomGlobal,
} from './vdom-helpers';

/**
 * Process :model directive for two-way data binding
 * @param value
 * @param modifiers
 * @param props
 * @param attrs
 * @param listeners
 * @param context
 * @param el
 * @returns
 */
export function processModelDirective(
  value: string | unknown,
  modifiers: string[],
  props: Record<string, unknown>,
  attrs: Record<string, unknown>,
  listeners: Record<string, EventListener>,
  context?: Record<string, unknown>,
  el?: Element,
  arg?: string,
): void {
  if (!context) return;

  const hasLazy = modifiers.includes('lazy');
  const hasTrim = modifiers.includes('trim');
  const hasNumber = modifiers.includes('number');

  // Enhanced support for reactive state objects (functional API)

  const getCurrentValue = () => {
    if (isReactiveState(value)) {
      const unwrapped = (value as { value?: unknown }).value;
      // If this is a native input and an arg was provided (e.g. :model:name),
      // we should bind the nested property to the input's value.
      if (
        arg &&
        el &&
        (el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement)
      ) {
        if (typeof unwrapped === 'object' && unwrapped !== null) {
          return (unwrapped as Record<string, unknown>)[arg as string];
        }
      }
      // Otherwise return the full unwrapped value for custom element props
      return unwrapped;
    }
    // Fallback to string-based lookup (legacy config API)
    // Ensure we pass a Record<string, unknown> to getNestedValue
    const actualContext =
      ((context as { _state?: unknown } | undefined)?._state as Record<
        string,
        unknown
      >) || (context as Record<string, unknown>);
    return getNestedValue(actualContext, value as string);
  };

  const currentValue = getCurrentValue();

  // determine element/input type
  let inputType = 'text';
  if (el instanceof HTMLInputElement)
    inputType = (attrs?.type as string) || el.type || 'text';
  else if (el instanceof HTMLSelectElement) inputType = 'select';
  else if (el instanceof HTMLTextAreaElement) inputType = 'textarea';

  const isNativeInput =
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement;
  const defaultPropName =
    inputType === 'checkbox' || inputType === 'radio' ? 'checked' : 'value';
  const propName = isNativeInput ? defaultPropName : (arg ?? 'modelValue');

  // Initial sync: set prop/attrs so renderer can apply proper DOM state
  if (inputType === 'checkbox') {
    if (Array.isArray(currentValue)) {
      props[propName] = currentValue.includes(
        String(el?.getAttribute('value') ?? attrs?.value ?? ''),
      );
    } else {
      const trueValue = el?.getAttribute('true-value') ?? true;
      props[propName] = currentValue === trueValue;
    }
  } else if (inputType === 'radio') {
    props[propName] = currentValue === (attrs?.value ?? '');
  } else if (inputType === 'select') {
    // For multiple selects we also schedule option selection; otherwise set prop
    if (el && el.hasAttribute('multiple') && el instanceof HTMLSelectElement) {
      const arr = Array.isArray(currentValue) ? currentValue.map(String) : [];
      setTimeout(() => {
        Array.from((el as HTMLSelectElement).options).forEach((option) => {
          option.selected = arr.includes(option.value);
        });
      }, 0);
      props[propName] = Array.isArray(currentValue) ? currentValue : [];
    } else {
      props[propName] = currentValue;
    }
  } else {
    // For custom elements (non-native inputs) prefer assigning the
    // ReactiveState instance itself to the prop so child components that
    // call useProps can detect and unwrap the live ref. For native
    // inputs we must set the unwrapped current value.
    if (!isNativeInput && isReactiveState(value)) {
      props[propName] = value; // pass the ReactiveState instance
    } else {
      props[propName] = currentValue;
    }
    // Also set an attribute so custom element constructors / applyProps can
    // read initial values via getAttribute during their initialization.
    try {
      const attrName = toKebab(propName);
      if (attrs) attrs[attrName] = currentValue;
    } catch {
      // ignore
    }
  }

  // event type to listen for
  const eventType =
    hasLazy ||
    inputType === 'checkbox' ||
    inputType === 'radio' ||
    inputType === 'select'
      ? 'change'
      : 'input';

  const eventListener: EventListener = (event: Event) => {
    if (
      (event as { isComposing?: boolean }).isComposing ||
      (listeners as { _isComposing?: boolean })._isComposing
    )
      return;
    // Allow synthetic events during testing (when isTrusted is false)
    // but ignore them in production unless it's a synthetic test event
    const _proc = (globalThis as VDomGlobal).process;
    const isTestEnv =
      (!!_proc && _proc.env?.NODE_ENV === 'test') ||
      (typeof window !== 'undefined' && (globalThis as VDomGlobal).__vitest__);
    if ((event as { isTrusted?: boolean }).isTrusted === false && !isTestEnv)
      return;

    const target = event.target as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
      | null;
    if (!target || (target as { _modelUpdating?: boolean })._modelUpdating)
      return;

    let newValue: unknown = (target as { value?: unknown }).value;

    if (inputType === 'checkbox') {
      const fresh = getCurrentValue();
      if (Array.isArray(fresh)) {
        const v = target.getAttribute('value') ?? '';
        const arr = Array.from(fresh as unknown[]);
        if ((target as HTMLInputElement).checked) {
          if (!arr.includes(v)) arr.push(v);
        } else {
          const idx = arr.indexOf(v);
          if (idx > -1) arr.splice(idx, 1);
        }
        newValue = arr;
      } else {
        const trueV = target.getAttribute('true-value') ?? true;
        const falseV = target.getAttribute('false-value') ?? false;
        newValue = (target as HTMLInputElement).checked ? trueV : falseV;
      }
    } else if (inputType === 'radio') {
      newValue =
        target.getAttribute('value') ?? (target as { value?: unknown }).value;
    } else if (
      inputType === 'select' &&
      (target as HTMLSelectElement).multiple
    ) {
      newValue = Array.from((target as HTMLSelectElement).selectedOptions).map(
        (o) => o.value,
      );
    } else {
      if (hasTrim && typeof newValue === 'string') newValue = newValue.trim();
      if (hasNumber) {
        const n = Number(newValue);
        if (!isNaN(n)) newValue = n;
      }
    }

    const currentStateValue = getCurrentValue();
    const changed = hasValueChanged(newValue, currentStateValue);

    if (changed) {
      (target as HTMLElement & { _modelUpdating?: boolean })._modelUpdating =
        true;
      try {
        updateStateValue(isReactiveState(value), value, newValue, context, arg);
        triggerStateUpdate(context, isReactiveState(value), value, newValue);

        // Emit custom event for update:* listeners (emit both kebab and camel forms)
        if (target) {
          emitUpdateEvents(target, propName, newValue);
        }
      } finally {
        setTimeout(
          () =>
            ((
              target as HTMLElement & { _modelUpdating?: boolean }
            )._modelUpdating = false),
          0,
        );
      }
    }
  };

  // Custom element update event names (update:prop) for non-native inputs
  if (!isNativeInput) {
    const eventNameKebab = `update:${toKebab(propName)}`;
    const eventNameCamel = `update:${propName}`;
    // Remove existing listeners to prevent memory leaks
    if (listeners[eventNameKebab]) {
      const oldListener = listeners[eventNameKebab];
      if (el) EventManager.removeListener(el, eventNameKebab, oldListener);
    }
    if (listeners[eventNameCamel]) {
      const oldListener = listeners[eventNameCamel];
      if (el) EventManager.removeListener(el, eventNameCamel, oldListener);
    }

    listeners[eventNameKebab] = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      let newVal: unknown = detail !== undefined ? detail : undefined;
      if (newVal === undefined) {
        // Fallback: if the event target has a `value` property use it even
        // when it's not a real DOM element (tests may provide plain objects).
        const t = (event as unknown as { target?: unknown }).target;
        if (
          t &&
          typeof t === 'object' &&
          'value' in (t as Record<string, unknown>)
        ) {
          try {
            newVal = (t as Record<string, unknown>).value;
          } catch {
            newVal = undefined;
          }
        }
      }
      // Determine current state value depending on reactive-state vs string path
      const currentStateValue = getCurrentStateValue(
        isReactiveState(value),
        value,
        context,
        arg,
      );
      const changed = hasValueChanged(newVal, currentStateValue);

      if (changed) {
        try {
          /* nested handler invoked */
        } catch {
          void 0;
        }

        updateStateValue(isReactiveState(value), value, newVal, context, arg);
        triggerStateUpdate(context, isReactiveState(value), value, newVal);

        // Update the custom element's property to maintain sync
        const target = event.target as HTMLElement | null;
        if (target) {
          syncElementWithState(
            target,
            propName,
            isReactiveState(value) ? value : newVal,
            isReactiveState(value),
          );
        }
      }
    };
    // primary listener registered
    // If the bound reactive value is an object, also listen for nested
    // update events emitted by the child like `update:name` so the parent
    // can apply the change to the corresponding nested property on the
    // reactive state. This allows children to emit `update:<field>` when
    // they want to update a nested field of a bound object.
    if (
      isReactiveState(value) &&
      typeof (value as { value?: unknown }).value === 'object' &&
      (value as { value?: unknown }).value !== null
    ) {
      // Use Reflect.ownKeys to be robust across proxies; filter out internal keys
      let keys: Array<string | symbol>;
      try {
        keys = Reflect.ownKeys((value as { value?: unknown }).value!);
      } catch {
        keys = Object.keys((value as { value?: unknown }).value!);
      }
      const userKeys = (keys as Array<string | symbol>).filter(
        (k) =>
          typeof k === 'string' &&
          !String(k).startsWith('_') &&
          k !== 'constructor',
      );
      // preparing nested listeners
      for (const nestedKey of userKeys) {
        const nestedKeyStr = String(nestedKey);
        const nestedKebab = `update:${toKebab(nestedKeyStr)}`;
        const nestedCamel = `update:${nestedKeyStr}`;
        // Avoid overwriting the primary handler for the main prop
        // and avoid registering internal keys
        if (listeners[nestedKebab]) continue;
        listeners[nestedKebab] = (event: Event) => {
          const newVal =
            (event as CustomEvent).detail !== undefined
              ? (event as CustomEvent).detail
              : (event.target as { value?: unknown })?.value;
          const currentStateValue = isReactiveState(value)
            ? ((value as { value?: unknown }).value as Record<string, unknown>)[
                nestedKeyStr
              ]
            : getNestedValue(
                ((context as { _state?: unknown } | undefined)?._state as
                  | Record<string, unknown>
                  | undefined) || (context as Record<string, unknown>),
                value as string,
              );
          const changed = hasValueChanged(newVal, currentStateValue);
          if (!changed) return;

          // Update the ReactiveState with a shallow copy so reactivity triggers
          if (isReactiveState(value)) {
            const updated = {
              ...((value as { value?: unknown }).value as Record<
                string,
                unknown
              >),
            };
            (updated as Record<string, unknown>)[nestedKeyStr] = newVal;
            (value as { value?: unknown }).value = updated;
          } else {
            setNestedValue(
              ((context as { _state?: unknown } | undefined)?._state as Record<
                string,
                unknown
              >) || (context as Record<string, unknown>),
              value as string,
              newVal,
            );
          }

          triggerStateUpdate(context, isReactiveState(value), value, newVal);

          const host =
            (event.currentTarget as HTMLElement) ||
            el ||
            (event.target as HTMLElement);
          if (host) {
            syncElementWithState(
              host,
              propName,
              isReactiveState(value) ? value : newVal,
              isReactiveState(value),
            );
          }
        };
        listeners[nestedCamel] = listeners[nestedKebab];
      }
    }
    // Mirror handler under camel name for compatibility
    listeners[eventNameCamel] = listeners[eventNameKebab];
  } else {
    // Remove existing listener to prevent memory leaks
    if (listeners[eventType]) {
      const oldListener = listeners[eventType];
      if (el) {
        EventManager.removeListener(el, eventType, oldListener);
      }
    }
    listeners[eventType] = eventListener;
  }

  // IME composition handling for text-like inputs
  if (inputType === 'text' || inputType === 'textarea') {
    listeners.compositionstart = () =>
      ((listeners as { _isComposing?: boolean })._isComposing = true);
    listeners.compositionend = (event: Event) => {
      (listeners as { _isComposing?: boolean })._isComposing = false;
      const target = event.target as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
      if (!target) return;
      setTimeout(() => {
        const val = target.value;
        const actualState =
          ((context as { _state?: unknown } | undefined)?._state as Record<
            string,
            unknown
          >) || (context as Record<string, unknown>);
        const currentStateValue = getNestedValue(actualState, value as string);
        let newVal: string | number = val;
        if (hasTrim) newVal = newVal.trim();
        if (hasNumber) {
          const n = Number(newVal);
          if (!isNaN(n)) newVal = n;
        }
        const changed = hasValueChanged(newVal, currentStateValue);
        if (changed) {
          (
            target as HTMLElement & { _modelUpdating?: boolean }
          )._modelUpdating = true;
          try {
            setNestedValue(actualState, value as string, newVal);
            triggerStateUpdate(context, isReactiveState(value), value, newVal);
          } finally {
            setTimeout(
              () =>
                ((
                  target as HTMLElement & { _modelUpdating?: boolean }
                )._modelUpdating = false),
              0,
            );
          }
        }
      }, 0);
    };
  }
  // processModelDirective listeners prepared
}

/**
 * Process :bind directive for attribute/property binding
 * @param value
 * @param props
 * @param attrs
 * @param context
 * @returns
 */
export function processBindDirective(
  value: unknown,
  props: PropsMap,
  attrs: PropsMap,
  context?: Record<string, unknown>,
  el?: Element,
): void {
  // Support both object and string syntax for :bind
  if (typeof value === 'object' && value !== null) {
    for (const [key, val] of Object.entries(value)) {
      // Only put clearly HTML-only attributes in attrs, everything else in props
      // For native input/select/textarea elements, boolean-like attributes
      // such as `disabled` should be applied as attributes rather than
      // props to avoid placing wrapper/complex values into props which
      // can later be misinterpreted as truthy and disable the control.
      if (
        key.startsWith('data-') ||
        key.startsWith('aria-') ||
        key === 'class'
      ) {
        attrs[key] = val;
      } else if (key === 'disabled' && el && isNativeControl(el)) {
        // For native controls, prefer promoting reactive/wrapper values to props
        // so property assignment keeps a live reference and updates via reactivity.
        // For primitive booleans/strings prefer attrs to avoid placing arbitrary
        // objects into props which can be misinterpreted.
        const isWrapper = val && typeof val === 'object' && 'value' in val;
        const isReactiveVal = (() => {
          try {
            return isReactiveState(val);
          } catch {
            return false;
          }
        })();
        if (isReactiveVal || isWrapper) {
          props[key] = val;
        } else {
          attrs[key] = val;
        }
      } else {
        props[key] = val;
      }
    }
  } else if (typeof value === 'string') {
    if (!context) return;
    try {
      // Try to evaluate as expression (could be object literal)
      const evaluated = evaluateExpression(value, context);
      if (typeof evaluated === 'object' && evaluated !== null) {
        for (const [key, val] of Object.entries(evaluated)) {
          // Mirror the object branch handling but we don't have access to
          // the element here; prefer attrs for booleanish disabled when
          // the expression produced primitive booleans or strings.
          if (
            key.startsWith('data-') ||
            key.startsWith('aria-') ||
            key === 'class'
          ) {
            attrs[key] = val;
          } else if (key === 'disabled' && el && isNativeControl(el)) {
            const isWrapper = val && typeof val === 'object' && 'value' in val;
            const isReactiveVal = (() => {
              try {
                return isReactiveState(val);
              } catch {
                return false;
              }
            })();
            if (isReactiveVal || isWrapper) {
              props[key] = val;
            } else {
              attrs[key] = val;
            }
          } else {
            props[key] = val;
          }
        }
        return;
      } else {
        // If not an object, treat as single value fallback
        attrs[value] = evaluated;
        return;
      }
    } catch {
      // Fallback: treat as single property binding
      const currentValue = getNestedValue(
        context as Record<string, unknown>,
        value as string,
      );
      attrs[value] = currentValue;
    }
  }
}

/**
 * Process :show directive for conditional display
 * @param value
 * @param attrs
 * @param context
 * @returns
 */
export function processShowDirective(
  value: unknown,
  attrs: Record<string, unknown>,
  context?: Record<string, unknown>,
): void {
  let isVisible: unknown;

  // Handle both string and direct value evaluation
  if (typeof value === 'string') {
    if (!context) return;
    isVisible = evaluateExpression(value, context);
  } else {
    isVisible = value;
  }

  // Use the same approach as :style directive for consistency
  const currentStyle = String(attrs.style || '');
  let newStyle = currentStyle;

  if (!isVisible) {
    // Element should be hidden - ensure display: none is set
    if (currentStyle) {
      const styleRules = String(currentStyle).split(';').filter(Boolean);
      const displayIndex = styleRules.findIndex((rule: string) =>
        rule.trim().startsWith('display:'),
      );

      if (displayIndex >= 0) {
        styleRules[displayIndex] = 'display: none';
      } else {
        styleRules.push('display: none');
      }

      newStyle = styleRules.join('; ');
    } else {
      newStyle = 'display: none';
    }
  } else {
    // Element should be visible - only remove display: none, don't interfere with other display values
    if (currentStyle) {
      const styleRules = String(currentStyle)
        .split(';')
        .map((rule: string) => rule.trim())
        .filter(Boolean);
      const displayIndex = styleRules.findIndex((rule: string) =>
        rule.startsWith('display:'),
      );

      if (displayIndex >= 0) {
        const displayRule = styleRules[displayIndex];
        if (displayRule === 'display: none') {
          // Remove only display: none, preserve other display values
          styleRules.splice(displayIndex, 1);
          newStyle = styleRules.length > 0 ? styleRules.join('; ') + ';' : '';
        }
        // If display is set to something other than 'none', leave it alone
      }
    }
    // If no existing style, don't add anything
  }

  // Only set style if it's different from current to avoid unnecessary updates
  if (newStyle !== currentStyle) {
    if (newStyle) {
      attrs.style = newStyle;
    } else {
      // Remove the style attribute entirely if empty
      // Set to undefined so downstream merging with older attrs will
      // override previous values (spreading objects does not remove
      // earlier keys). Using `undefined` ensures the attribute-removal
      // branch in patchProps triggers correctly.
      attrs.style = undefined;
    }
  }
}

/**
 * Process :class directive for conditional CSS classes
 * @param value
 * @param attrs
 * @param context
 * @returns
 */
/**
 * Evaluate a JavaScript-like object literal string in the given context
 * Uses secure AST-based evaluation instead of Function() constructor
 * @param expression
 * @param context
 * @returns
 */
function evaluateExpression(
  expression: string,
  context: Record<string, unknown>,
): unknown {
  return SecureExpressionEvaluator.evaluate(expression, context);
}

export function processClassDirective(
  value: unknown,
  attrs: Record<string, unknown>,
  context?: Record<string, unknown>,
  // original vnode attrs (if available) - used to derive the static/base
  // class string so we don't accidentally reuse mutated attrs across
  // directive processing or renders.
  originalVnodeAttrs?: Record<string, unknown>,
): void {
  let classValue: unknown;

  // Handle both string and object values
  if (typeof value === 'string') {
    if (!context) return;
    classValue = evaluateExpression(value, context);
  } else {
    classValue = value;
  }

  // Unwrap reactive/computed wrappers (ReactiveState) to get the inner value
  try {
    if (classValue && typeof classValue === 'object') {
      if (isReactiveState(classValue)) {
        classValue = (classValue as { value: unknown }).value;
      } else if (
        'value' in classValue &&
        typeof (classValue as { value: unknown }).value !== 'undefined'
      ) {
        // Best-effort unwrap for objects with a `.value` property that
        // are not DOM nodes (avoid unwrapping nodes that expose `.value`).
        const maybe = (classValue as { value: unknown }).value;
        if (!(maybe instanceof Node)) {
          classValue = maybe;
        }
      }
    }
  } catch {
    // ignore
  }

  let classes: string[] = [];

  if (typeof classValue === 'string') {
    classes = [classValue];
  } else if (Array.isArray(classValue)) {
    classes = classValue.filter(Boolean);
  } else if (typeof classValue === 'object' && classValue !== null) {
    // Object syntax: { className: condition } - optimized without flatMap
    for (const [className, condition] of Object.entries(classValue)) {
      if (condition) {
        classes.push(className);
      }
    }
  }

  const classString = classes.join(' ');

  // Derive base/static classes from the original vnode attrs when
  // available. This avoids accidentally concatenating previously
  // processed dynamic classes that may have been written into the
  // working `attrs` object in earlier passes.
  const baseClasses =
    (originalVnodeAttrs && (originalVnodeAttrs.class as string)) ||
    (attrs.class as string) ||
    '';

  // Merge base (static) classes with the computed dynamic classes and
  // ensure no accidental double-spaces. If there are no resulting
  // classes, delete the property so downstream code can remove the
  // attribute when appropriate.
  const merged = baseClasses
    ? `${baseClasses} ${classString}`.trim()
    : classString.trim();

  if (merged) attrs.class = merged;
  else {
    // See note above for style: set to undefined so later merging of
    // processed directives (which is spread last) will override any
    // previously-present class value from old vnode attrs and allow
    // patchProps to remove the attribute from the DOM.
    attrs.class = undefined;
  }
}

/**
 * Process :style directive for dynamic inline styles
 * @param value
 * @param attrs
 * @param context
 * @returns
 */
export function processStyleDirective(
  value: unknown,
  attrs: Record<string, unknown>,
  context?: Record<string, unknown>,
): void {
  let styleValue: unknown;

  if (typeof value === 'string') {
    if (!context) return;
    styleValue = evaluateExpression(value, context);
  } else {
    styleValue = value;
  }

  let styleString = '';

  if (typeof styleValue === 'string') {
    styleString = styleValue;
  } else if (styleValue && typeof styleValue === 'object') {
    const styleRules: string[] = [];
    for (const [property, val] of Object.entries(styleValue)) {
      if (val != null && val !== '') {
        const kebabProperty = property.replace(
          /[A-Z]/g,
          (match) => `-${match.toLowerCase()}`,
        );
        const needsPx = [
          'width',
          'height',
          'top',
          'right',
          'bottom',
          'left',
          'margin',
          'margin-top',
          'margin-right',
          'margin-bottom',
          'margin-left',
          'padding',
          'padding-top',
          'padding-right',
          'padding-bottom',
          'padding-left',
          'font-size',
          'line-height',
          'border-width',
          'border-radius',
          'min-width',
          'max-width',
          'min-height',
          'max-height',
        ];
        let cssValue = String(val);
        if (typeof val === 'number' && needsPx.includes(kebabProperty)) {
          cssValue = `${val}px`;
        }
        styleRules.push(`${kebabProperty}: ${cssValue}`);
      }
    }
    styleString = styleRules.join('; ') + (styleRules.length > 0 ? ';' : '');
  }

  const existingStyle = String(attrs.style || '');
  attrs.style =
    existingStyle +
    (existingStyle && !existingStyle.endsWith(';') ? '; ' : '') +
    styleString;
}

/**
 * Process :ref directive for element references
 * @param value
 * @param props
 * @param context
 * @returns
 */
export function processRefDirective(
  value: unknown,
  props: Record<string, unknown>,
  context?: Record<string, unknown>,
): void {
  let resolvedValue = value;

  // If value is a string, evaluate it in the context to resolve variables
  if (typeof value === 'string' && context) {
    resolvedValue = evaluateExpression(value, context);
  }

  // Support both reactive state objects (functional API) and string refs (legacy)
  if (isReactiveState(resolvedValue)) {
    // For reactive state objects, store the reactive state object itself as the ref
    // The VDOM renderer will handle setting the value
    props.reactiveRef = resolvedValue;
  } else {
    // Legacy string-based ref or direct object ref
    props.ref = resolvedValue;
  }
}

/**
 * Process directives and return merged props, attrs, and event listeners
 * @param directives
 * @param context
 * @param el
 * @param vnodeAttrs
 * @returns
 */
export function processDirectives(
  directives: Record<
    string,
    { value: unknown; modifiers: string[]; arg?: string }
  >,
  context?: Record<string, unknown>,
  el?: Element,
  vnodeAttrs?: PropsMap,
): {
  props: Record<string, unknown>;
  attrs: Record<string, unknown>;
  listeners: Record<string, EventListener>;
} {
  const props: PropsMap = {};
  const attrs: PropsMap = { ...(vnodeAttrs || {}) };
  const listeners: Record<string, EventListener> = {};

  for (const [directiveName, directive] of Object.entries(directives)) {
    const { value, modifiers, arg } = directive;

    if (directiveName === 'model' || directiveName.startsWith('model:')) {
      // Extract arg from directiveName if present (model:prop)
      const parts = directiveName.split(':');
      const runtimeArg = parts.length > 1 ? parts[1] : arg;
      processModelDirective(
        value, // Pass the original value (could be string or reactive state object)
        modifiers,
        props,
        attrs,
        listeners,
        context,
        el,
        runtimeArg,
      );
      continue;
    }

    switch (directiveName) {
      case 'bind':
        processBindDirective(value, props, attrs, context, el);
        break;
      case 'show':
        processShowDirective(value, attrs, context);
        break;
      case 'class':
        processClassDirective(value, attrs, context, vnodeAttrs);
        break;
      case 'style':
        processStyleDirective(value, attrs, context);
        break;
      case 'ref':
        processRefDirective(value, props, context);
        break;
      case 'when':
        // The :when directive is handled during template compilation
        // by wrapping the element in an anchor block
        // This case should not normally be reached, but we handle it gracefully
        break;
      // Add other directive cases here as needed
    }
  }

  // Defensive post-processing: avoid leaving primitive non-wrapper
  // `disabled` values in processed props for native form controls.
  // Some code paths may incorrectly place a primitive boolean/string into
  // props which later becomes authoritative and disables native inputs.
  // To be safe, if `disabled` was placed into props by directives but is
  // a plain primitive (not a ReactiveState or wrapper with `.value`) and
  // the target element is a native input/select/textarea, move it to attrs
  // so the final disabled decision uses attribute/coercion rules instead.
  try {
    const had = Object.prototype.hasOwnProperty.call(props, 'disabled');
    if (had && el && isNativeControl(el)) {
      const candidate = props['disabled'];
      const isWrapper =
        candidate && typeof candidate === 'object' && 'value' in candidate;
      let isReactiveVal = false;
      try {
        isReactiveVal = isReactiveState(candidate);
      } catch {
        isReactiveVal = false;
      }
      // If it's NOT reactive/wrapper, prefer attrs to avoid accidental truthiness
      if (!isWrapper && !isReactiveVal) {
        try {
          attrs['disabled'] = candidate;
          delete props['disabled'];
          const w = globalThis as VDomGlobal;
          if (!w.__VDOM_DISABLED_PROMOTIONS) w.__VDOM_DISABLED_PROMOTIONS = [];
          (w.__VDOM_DISABLED_PROMOTIONS as unknown[]).push({
            phase: 'bind-directive:postfix-move',
            location: 'attrs',
            key: 'disabled',
            value: candidate,
            time: Date.now(),
            stack: new Error().stack,
          });
        } catch {
          // ignore
        }
      }
    }
  } catch {
    void 0;
  }

  return { props, attrs, listeners };
}
