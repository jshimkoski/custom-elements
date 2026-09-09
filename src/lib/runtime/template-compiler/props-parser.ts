import { isReactiveState } from '../reactive';
import { devWarn } from '../logger';
import { getCacheSize, LRUCache } from './lru-cache';

export interface ParsePropsResult {
  props: Record<string, unknown>;
  attrs: Record<string, unknown>;
  directives: Record<
    string,
    { value: unknown; modifiers: string[]; arg?: string }
  >;
  bound: string[];
}

export interface PropToken {
  readonly prefix: string;
  readonly rawName: string;
  readonly rawValue: string;
  readonly standalone: boolean;
}

const PROP_TOKEN_CACHE = new LRUCache<string, readonly PropToken[]>(
  getCacheSize(),
);
const ATTRIBUTE_PATTERN =
  /([:@#]?)([a-zA-Z0-9-:.]+)(?:\s*=\s*("([^"\\]*(\\.[^"\\]*)*)"|'([^'\\]*(\\.[^'\\]*)*)'|([^\s>]+)))?/g;
const KNOWN_DIRECTIVES = new Set([
  'model',
  'bind',
  'show',
  'class',
  'style',
  'ref',
  'when',
]);

export function tokenizeProps(str: string): readonly PropToken[] {
  const cached = PROP_TOKEN_CACHE.get(str);
  if (cached) return cached;

  const tokens: PropToken[] = [];
  const matcher = new RegExp(ATTRIBUTE_PATTERN.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(str))) {
    let rawValue = '';
    for (let i = 3; i < match.length; i++) {
      if (match[i] !== undefined) {
        rawValue = match[i] as string;
        break;
      }
    }
    if (
      rawValue.length >= 2 &&
      ((rawValue[0] === '"' && rawValue[rawValue.length - 1] === '"') ||
        (rawValue[0] === "'" && rawValue[rawValue.length - 1] === "'"))
    ) {
      rawValue = rawValue.slice(1, -1);
    }
    tokens.push({
      prefix: match[1],
      rawName: match[2],
      rawValue,
      standalone: !/=/.test(match[0]),
    });
  }
  PROP_TOKEN_CACHE.set(str, tokens);
  return tokens;
}

/**
 * Validates event handlers to prevent common mistakes that lead to infinite loops
 */
export function validateEventHandler(value: unknown, eventName: string): void {
  // Check for null/undefined handlers
  if (value === null || value === undefined) {
    devWarn(
      `⚠️ Event handler for '@${eventName}' is ${value}. ` +
        `This will prevent the event from working. ` +
        `Use a function reference instead: @${eventName}="\${functionName}"`,
    );
    return;
  }

  // Check for immediate function invocation (most common mistake)
  if (typeof value !== 'function') {
    devWarn(
      `🚨 Potential infinite loop detected! Event handler for '@${eventName}' appears to be ` +
        `the result of a function call (${typeof value}) instead of a function reference. ` +
        `Change @${eventName}="\${functionName()}" to @${eventName}="\${functionName}" ` +
        `to pass the function reference instead of calling it immediately.`,
    );
  }

  // Additional check for common return values of mistaken function calls
  if (value === undefined && typeof value !== 'function') {
    devWarn(
      `💡 Tip: If your event handler function returns undefined, make sure you're passing ` +
        `the function reference, not calling it. Use @${eventName}="\${fn}" not @${eventName}="\${fn()}"`,
    );
  }
}

export function parseProps(
  str: string,
  values: unknown[] = [],
  context: Record<string, unknown> = {},
): ParsePropsResult {
  const props: Record<string, unknown> = {};
  const attrs: Record<string, unknown> = {};
  const directives: Record<
    string,
    { value: unknown; modifiers: string[]; arg?: string }
  > = {};
  const bound: string[] = [];

  for (const token of tokenizeProps(str)) {
    const { prefix, rawName, rawValue: rawVal, standalone: isStandalone } =
      token;

    // Interpolation detection
    // Full interpolation: the entire value is a single marker, e.g. `{{0}}`
    const interpMatch = rawVal.match(/^{{(\d+)}}$/);
    // Partial / mixed interpolation: the value contains markers mixed with
    // literal text, e.g. `"loader {{0}}"` → `"loader sm"`
    const hasMixedInterp = !interpMatch && /{{(\d+)}}/.test(rawVal);
    let value: unknown = isStandalone
      ? true // Standalone attributes are boolean true
      : interpMatch
        ? (values[Number(interpMatch[1])] ?? null)
        : hasMixedInterp
          ? rawVal.replace(/{{(\d+)}}/g, (_, idx) =>
              String(values[Number(idx)] ?? ''),
            )
          : rawVal;

    // Type inference for booleans, null, numbers
    if (!interpMatch && !hasMixedInterp) {
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (value === 'null') value = null;
      else if (!isNaN(Number(value))) value = Number(value);
    }

    // Known directive names
    if (prefix === ':') {
      // Support :model:checked (directive with argument) and :class.foo (modifiers)
      const [nameAndModifiers, argPart] = rawName.split(':');
      const [maybeDirective, ...modifierParts] = nameAndModifiers.split('.');
      if (KNOWN_DIRECTIVES.has(maybeDirective)) {
        const modifiers = [...modifierParts];
        // Allow multiple :model directives on the same tag by keying them with
        // their argument when present (e.g. 'model:test'). This preserves both
        // plain :model and :model:prop simultaneously.
        const directiveKey =
          maybeDirective === 'model' && argPart
            ? `model:${argPart}`
            : maybeDirective;
        directives[directiveKey] = {
          value,
          modifiers,
          arg: argPart,
        };
      } else {
        // Special-case certain boolean-like attributes to promote them to
        // props so runtime property assignment and coercion behave correctly
        // for native elements (e.g. :disabled should affect el.disabled).
        if (rawName === 'disabled') {
          // Be conservative: only promote disabled to props at compile-time
          // when the bound value is an explicit boolean-ish primitive
          // (boolean, empty-string presence, literal 'true'/'false', null, or number).
          // Otherwise leave it in attrs so the runtime can apply safer coercion.
          let propValue = value;
          if (propValue && isReactiveState(propValue))
            propValue = (propValue as { value: unknown }).value;
          const t = typeof propValue;
          const isBoolStr =
            t === 'string' && (propValue === 'true' || propValue === 'false');
          const shouldPromote =
            propValue === '' ||
            t === 'boolean' ||
            isBoolStr ||
            propValue == null ||
            t === 'number';
          if (shouldPromote) {
            props[rawName] = propValue;
          } else {
            // Unwrap reactive state objects for bound attributes and keep in attrs
            let attrValue = value;
            if (attrValue && isReactiveState(attrValue)) {
              attrValue = (attrValue as { value: unknown }).value; // This triggers dependency tracking
            }
            attrs[rawName] = attrValue;
          }
          bound.push(rawName);
        } else {
          // Unwrap reactive state objects for bound attributes
          let attrValue = value;
          if (attrValue && isReactiveState(attrValue)) {
            attrValue = (attrValue as { value: unknown }).value; // This triggers dependency tracking
          }
          attrs[rawName] = attrValue;
          bound.push(rawName);
        }
      }
    } else if (prefix === '@') {
      // Parse event modifiers: @click.prevent.stop
      const [eventName, ...modifierParts] = rawName.split('.');
      const modifiers = modifierParts;

      // Validate event handler to prevent common mistakes
      validateEventHandler(value, eventName);

      // Create wrapped event handler that applies modifiers
      const originalHandler: ((e: Event) => unknown) | undefined =
        typeof value === 'function'
          ? (value as (e: Event) => unknown)
          : typeof (context as Record<string, unknown>)[
                value as unknown as string
              ] === 'function'
            ? ((context as Record<string, unknown>)[value as string] as (
                e: Event,
              ) => unknown)
            : undefined;

      if (originalHandler) {
        const wrappedHandler = (event: Event) => {
          // Apply event modifiers
          if (modifiers.includes('prevent')) {
            event.preventDefault();
          }
          if (modifiers.includes('stop')) {
            event.stopPropagation();
          }
          if (
            modifiers.includes('self') &&
            event.target !== event.currentTarget
          ) {
            return;
          }

          // For .once modifier, we need to remove the listener after first call
          if (modifiers.includes('once')) {
            (event.currentTarget as Element)?.removeEventListener(
              eventName,
              wrappedHandler,
            );
          }

          // Call the original handler
          return originalHandler(event);
        };

        // Map @event to an `on<Event>` prop (DOM-first event listener convention)
        const onName =
          'on' + eventName.charAt(0).toUpperCase() + eventName.slice(1);
        props[onName] = wrappedHandler;
      }
    } else if (rawName === 'ref') {
      props.ref = value;
    } else {
      attrs[rawName] = value;
    }
  }

  return { props, attrs, directives, bound };
}
