import type { VNode } from "./types";
import { contextStack } from "./render";
import { toKebab, toCamel, getNestedValue, setNestedValue, safe } from "./helpers";
import { isReactiveState } from "./reactive";
import { devWarn } from "./logger";

// Strict LRU cache helper for fully static templates (no interpolations, no context)
class LRUCache<K, V> {
  private map = new Map<K, V>();
  private maxSize: number;
  constructor(maxSize: number) { this.maxSize = maxSize; }
  get(key: K): V | undefined {
    const v = this.map.get(key);
    if (v === undefined) return undefined;
    // move to end (LRU ordering)
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }
  set(key: K, value: V) {
    // Delete if exists to maintain insertion order
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.maxSize) {
      // remove oldest (first key)
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) this.map.delete(firstKey);
    }
  }
  has(key: K): boolean { return this.map.has(key); }
  clear() { this.map.clear(); }
}

const TEMPLATE_COMPILE_CACHE = new LRUCache<string, VNode | VNode[]>(500);

/**
 * Validates event handlers to prevent common mistakes that lead to infinite loops
 */
function validateEventHandler(value: any, eventName: string): void {
  // Check for null/undefined handlers
  if (value === null || value === undefined) {
    devWarn(
      `⚠️ Event handler for '@${eventName}' is ${value}. ` +
      `This will prevent the event from working. ` +
      `Use a function reference instead: @${eventName}="\${functionName}"`
    );
    return;
  }

  // Check for immediate function invocation (most common mistake)
  if (typeof value !== "function") {
    devWarn(
      `🚨 Potential infinite loop detected! Event handler for '@${eventName}' appears to be ` +
      `the result of a function call (${typeof value}) instead of a function reference. ` +
      `Change @${eventName}="\${functionName()}" to @${eventName}="\${functionName}" ` +
      `to pass the function reference instead of calling it immediately.`
    );
  }

  // Additional check for common return values of mistaken function calls
  if (value === undefined && typeof value !== "function") {
    devWarn(
      `💡 Tip: If your event handler function returns undefined, make sure you're passing ` +
      `the function reference, not calling it. Use @${eventName}="\${fn}" not @${eventName}="\${fn()}"`
    );
  }
}

export function h(
  tag: string,
  props: Record<string, any> = {},
  children?: VNode[] | string,
  key?: string | number,
): VNode {
  // Do NOT invent keys here; use only what the caller passes (or props.key).
  const finalKey = key ?? props.key;
  return { tag, key: finalKey, props, children };
}

export function isAnchorBlock(v: any): boolean {
  return (
    !!v &&
    typeof v === "object" &&
    ((v as any).type === "AnchorBlock" || (v as any).tag === "#anchor")
  );
}

export function isElementVNode(v: any): v is VNode {
  return (
    typeof v === "object" && v !== null && "tag" in v && !isAnchorBlock(v) // exclude anchor blocks from being treated as normal elements
  );
}

export function ensureKey(v: VNode, k: string): VNode {
  return v.key != null ? v : { ...v, key: k };
}

export interface ParsePropsResult {
  props: Record<string, any>;
  attrs: Record<string, any>;
  directives: Record<string, { value: any; modifiers: string[]; arg?: string }>;
  bound: string[];
}

export function parseProps(
  str: string,
  values: unknown[] = [],
  context: Record<string, any> = {}
): ParsePropsResult {
  const props: Record<string, any> = {};
  const attrs: Record<string, any> = {};
  const directives: Record<string, { value: any; modifiers: string[]; arg?: string }> = {};
  const bound: string[] = [];

  // Match attributes with optional prefix and support for single/double quotes
  // Also matches standalone boolean attributes (without =value)
  const attrRegex =
    /([:@#]?)([a-zA-Z0-9-:\.]+)(?:=("([^"\\]*(\\.[^"\\]*)*)"|'([^'\\]*(\\.[^'\\]*)*)'))?/g;

  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(str))) {
    const prefix = match[1];
    const rawName = match[2];
    const rawVal = (match[4] || match[6]) ?? "";
    
    // If no value was provided (standalone attribute), treat as boolean true
    const isStandalone = match[3] === undefined && match[6] === undefined;

    // Interpolation detection
    const interpMatch = rawVal.match(/^{{(\d+)}}$/);
    let value: any = isStandalone
      ? true  // Standalone attributes are boolean true
      : interpMatch
      ? values[Number(interpMatch[1])] ?? null
      : rawVal;

    // Type inference for booleans, null, numbers
    if (!interpMatch) {
      if (value === "true") value = true;
      else if (value === "false") value = false;
      else if (value === "null") value = null;
      else if (!isNaN(Number(value))) value = Number(value);
    }

    // Known directive names
    const knownDirectives = ["model", "bind", "show", "class", "style", "ref", "when"];
    if (prefix === ":") {
      // Support :model:checked (directive with argument) and :class.foo (modifiers)
      const [nameAndModifiers, argPart] = rawName.split(":");
      const [maybeDirective, ...modifierParts] = nameAndModifiers.split(".");
      if (knownDirectives.includes(maybeDirective)) {
        const modifiers = [...modifierParts];
        // Allow multiple :model directives on the same tag by keying them with
        // their argument when present (e.g. 'model:test'). This preserves both
        // plain :model and :model:prop simultaneously.
        const directiveKey = maybeDirective === 'model' && argPart ? `model:${argPart}` : maybeDirective;
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
          if (propValue && isReactiveState(propValue)) propValue = (propValue as any).value;
          const t = typeof propValue;
          const isBoolStr = t === 'string' && (propValue === 'true' || propValue === 'false');
          const shouldPromote = propValue === '' || t === 'boolean' || isBoolStr || propValue == null || t === 'number';
          if (shouldPromote) {
            props[rawName] = propValue;
          } else{
            // Unwrap reactive state objects for bound attributes and keep in attrs
            let attrValue = value;
            if (attrValue && isReactiveState(attrValue)) {
              attrValue = (attrValue as any).value; // This triggers dependency tracking
            }
            attrs[rawName] = attrValue;
          }
          bound.push(rawName);
        } else {
          // Unwrap reactive state objects for bound attributes
          let attrValue = value;
          if (attrValue && isReactiveState(attrValue)) {
            attrValue = (attrValue as any).value; // This triggers dependency tracking
          }
          attrs[rawName] = attrValue;
          bound.push(rawName);
        }
      }
    } else if (prefix === "@") {
      // Parse event modifiers: @click.prevent.stop
      const [eventName, ...modifierParts] = rawName.split(".");
      const modifiers = modifierParts;
      
      // Validate event handler to prevent common mistakes
      validateEventHandler(value, eventName);
      
      // Create wrapped event handler that applies modifiers
      const originalHandler = typeof value === "function"
        ? value
        : typeof context[value] === "function"
        ? context[value]
        : undefined;
        
      if (originalHandler) {
        const wrappedHandler = (event: Event) => {
          // Apply event modifiers
          if (modifiers.includes("prevent")) {
            event.preventDefault();
          }
          if (modifiers.includes("stop")) {
            event.stopPropagation();
          }
          if (modifiers.includes("self") && event.target !== event.currentTarget) {
            return;
          }
          
          // For .once modifier, we need to remove the listener after first call
          if (modifiers.includes("once")) {
            (event.currentTarget as Element)?.removeEventListener(eventName, wrappedHandler);
          }
          
          // Call the original handler
          return originalHandler(event);
        };
        
        // Map @event to an `on<Event>` prop (DOM-first event listener convention)
        const onName = "on" + eventName.charAt(0).toUpperCase() + eventName.slice(1);
        props[onName] = wrappedHandler;
      }
    } else if (rawName === "ref") {
      props.ref = value;
    } else {
      attrs[rawName] = value;
    }
  }

  return { props, attrs, directives, bound };
}

/**
 * Transform VNodes with :when directive into anchor blocks for conditional rendering
 */
function transformWhenDirective(vnode: VNode): VNode {
  // Skip if not an element VNode or is already an anchor block
  if (!isElementVNode(vnode) || isAnchorBlock(vnode)) {
    return vnode;
  }

  // Check if this VNode has a :when directive
  const directives = vnode.props?.directives;
  if (directives && directives.when) {
    const whenCondition = directives.when.value;
    
    // Remove the :when directive from the VNode since we're handling it here
    const { when, ...remainingDirectives } = directives;
    const newProps = { ...vnode.props };
    if (Object.keys(remainingDirectives).length > 0) {
      newProps.directives = remainingDirectives;
    } else {
      delete newProps.directives;
    }
    
    // Create a new VNode without the :when directive
    const elementVNode: VNode = {
      ...vnode,
      props: newProps,
    };
    
    // Recursively transform children if they exist
    if (Array.isArray(elementVNode.children)) {
      elementVNode.children = elementVNode.children.map(child => 
        typeof child === 'object' && child !== null ? transformWhenDirective(child as VNode) : child
      );
    }
    
    // Wrap in an anchor block with the condition
    const anchorKey = vnode.key != null ? `when-${vnode.key}` : `when-${vnode.tag}`;
    return {
      tag: "#anchor",
      key: anchorKey,
      children: whenCondition ? [elementVNode] : [],
    };
  }
  
  // Recursively transform children if they exist
  if (Array.isArray(vnode.children)) {
    const transformedChildren = vnode.children.map(child => 
      typeof child === 'object' && child !== null ? transformWhenDirective(child as VNode) : child
    );
    return {
      ...vnode,
      children: transformedChildren,
    };
  }
  
  return vnode;
}

/**
 * Internal implementation allowing an optional compile context for :model.
 * Fixes:
 *  - Recognize interpolation markers embedded in text ("World{{1}}") and replace them.
 *  - Skip empty arrays from directives so markers don't leak as text.
 *  - Pass AnchorBlocks through (and deep-normalize their children's keys) so the renderer can mount/patch them surgically.
 *  - Do not rewrap interpolated VNodes (preserve their keys); only fill in missing keys.
 */
export function htmlImpl(
  strings: TemplateStringsArray,
  values: unknown[],
  context?: Record<string, any>,
): VNode | VNode[] {
  // Retrieve current context from stack (transparent injection)
  const injectedContext = contextStack.length > 0 ? contextStack[contextStack.length - 1] : undefined;
  
  // Use injected context if no explicit context provided
  const effectiveContext = context ?? injectedContext;

  // Conservative caching: only cache templates that have no interpolations
  // (values.length === 0) and no explicit context. This avoids incorrectly
  // reusing parsed structures that depend on runtime values or context.
  const canCache = (!context && values.length === 0);
  const cacheKey = canCache ? strings.join('<!--TEMPLATE_DELIM-->') : null;
  if (canCache && cacheKey) {
    const cached = TEMPLATE_COMPILE_CACHE.get(cacheKey);
    if (cached) return cached;
  }

  function textVNode(text: string, key: string): VNode {
    return h("#text", {}, text, key);
  }

  // Stitch template with interpolation markers
  let template = "";
  for (let i = 0; i < strings.length; i++) {
    template += strings[i];
    if (i < values.length) template += `{{${i}}}`;
  }

  // Matches: comments, tags (open/close/self), standalone interpolation markers, or any other text
  // How this works:
  // const tagRegex =
  //   /<!--[\s\S]*?-->                                 # HTML comments
  //   |<\/?([a-zA-Z0-9-]+)                            # tag name
  //   (                                               # start attributes group
  //     (?:\s+                                        # whitespace before attribute
  //       [^\s=>/]+                                   # attribute name
  //       (?:\s*=\s*                                  # optional equals
  //         (?:
  //           "(?:\\.|[^"])*"                         # double-quoted value
  //           |'(?:\\.|[^'])*'                        # single-quoted value
  //           |[^\s>]+                                # unquoted value
  //         )
  //       )?
  //     )*                                            # repeat for multiple attributes
  //   )\s*\/?>                                        # end of tag
  //   |{{(\d+)}}                                      # placeholder
  //   |([^<]+)                                        # text node
  //   /gmx;
  // We explicitly match attributes one by one, and if a value is quoted, we allow anything inside (including >).
  // Handles both ' and " quotes.
  // Matches unquoted attributes like disabled or checked.
  // Keeps {{(\d+)}} and text node capture groups intact.
  // Added support for HTML comments which are ignored during parsing.
  const tagRegex =
    /<!--[\s\S]*?-->|<\/?([a-zA-Z0-9-]+)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^\s>]+))?)*)\s*\/?>|{{(\d+)}}|([^<]+)/g;

  const stack: Array<{
    tag: string;
    props: Record<string, any>;
    children: VNode[];
    key: string | number | undefined;
  }> = [];
  let root: VNode | null = null;
  let match: RegExpExecArray | null;
  let currentChildren: VNode[] = [];
  let currentTag: string | null = null;
  let currentProps: Record<string, any> = {};
  let currentKey: string | number | undefined = undefined;
  let nodeIndex = 0;
  let fragmentChildren: VNode[] = []; // Track root-level nodes for fragments

  // Helper: merge object-like interpolation into currentProps
  function mergeIntoCurrentProps(maybe: any) {
    if (!maybe || typeof maybe !== "object") return;
    if (isAnchorBlock(maybe)) return; // do not merge AnchorBlocks
    if (maybe.props || maybe.attrs) {
      if (maybe.props) {
        // Ensure currentProps.props exists
        if (!currentProps.props) currentProps.props = {};
        Object.assign(currentProps.props, maybe.props);
      }
      if (maybe.attrs) {
        // Ensure currentProps.attrs exists
        if (!currentProps.attrs) currentProps.attrs = {};

        // Handle special merging for style and class attributes
        Object.keys(maybe.attrs).forEach((key) => {
          if (key === "style" && currentProps.attrs.style) {
            // Merge style attributes by concatenating with semicolon
            const existingStyle = currentProps.attrs.style.replace(
              /;?\s*$/,
              "",
            );
            const newStyle = maybe.attrs.style.replace(/^;?\s*/, "");
            currentProps.attrs.style = existingStyle + "; " + newStyle;
          } else if (key === "class" && currentProps.attrs.class) {
            // Merge class attributes by concatenating with space
            const existingClasses = currentProps.attrs.class
              .trim()
              .split(/\s+/)
              .filter(Boolean);
            const newClasses = maybe.attrs.class
              .trim()
              .split(/\s+/)
              .filter(Boolean);
            const allClasses = [
              ...new Set([...existingClasses, ...newClasses]),
            ];
            currentProps.attrs.class = allClasses.join(" ");
          } else {
            // For other attributes, just assign (later values override)
            currentProps.attrs[key] = maybe.attrs[key];
          }
        });
      }
    } else {
      // If no props/attrs structure, merge directly into props
      if (!currentProps.props) currentProps.props = {};
      Object.assign(currentProps.props, maybe);
    }
  }

  // Helper: push an interpolated value into currentChildren/currentProps or fragments
  function pushInterpolation(val: any, baseKey: string) {
    const targetChildren = currentTag ? currentChildren : fragmentChildren;

    if (isAnchorBlock(val)) {
      const anchorKey = (val as VNode).key ?? baseKey;
      let anchorChildren = (val as any).children as VNode[] | undefined;
      targetChildren.push({
        ...(val as VNode),
        key: anchorKey,
        children: anchorChildren,
      });
      return;
    }

    if (isElementVNode(val)) {
      // Leave key undefined so assignKeysDeep can generate a stable one
      targetChildren.push(ensureKey(val, undefined as any));
      return;
    }

    if (Array.isArray(val)) {
      if (val.length === 0) return;
      for (let i = 0; i < val.length; i++) {
        const v = val[i];
        if (isAnchorBlock(v) || isElementVNode(v) || Array.isArray(v)) {
          // recurse or push without forcing a key
          pushInterpolation(v, `${baseKey}-${i}`);
        } else if (v !== null && typeof v === "object") {
          mergeIntoCurrentProps(v);
        } else {
          targetChildren.push(textVNode(String(v), `${baseKey}-${i}`));
        }
      }
      return;
    }

    if (val !== null && typeof val === "object") {
      mergeIntoCurrentProps(val);
      return;
    }

    targetChildren.push(textVNode(String(val), baseKey));
  }

  const voidElements = new Set([
    'area','base','br','col','embed','hr','img','input',
    'link','meta','param','source','track','wbr'
  ]);

  while ((match = tagRegex.exec(template))) {
    // Skip HTML comments (they are matched by the regex but ignored)
    if (match[0].startsWith('<!--') && match[0].endsWith('-->')) {
      continue;
    }

    if (match[1]) {
      // Tag token
      const tagName = match[1];
      const isClosing = match[0][1] === "/";
      const isSelfClosing = match[0][match[0].length - 2] === "/" || voidElements.has(tagName);

      const {
        props: rawProps,
        attrs: rawAttrs,
        directives,
        bound: boundList,
      } = parseProps(match[2] || "", values, effectiveContext) as ParsePropsResult;

      // No runtime registration here; compiler will set `isCustomElement`
      // on vnodeProps where appropriate. Runtime will consult that flag or
      // the strict registry if consumers register tags at runtime.

      // Shape props into { props, attrs, directives } expected by VDOM
      const vnodeProps: {
        props: Record<string, unknown>;
        attrs: Record<string, unknown>;
        directives?: Record<string, { value: any, modifiers: string[] }>;
        isCustomElement?: boolean;
      } = { props: {}, attrs: {} };

      for (const k in rawProps) vnodeProps.props[k] = rawProps[k];
      for (const k in rawAttrs) vnodeProps.attrs[k] = rawAttrs[k];

      // If a `key` attribute was provided, surface it as a vnode prop so the
      // renderer/assignKeysDeep can use it as the vnode's key and avoid
      // unnecessary remounts when children order/state changes.
      if (
        vnodeProps.attrs &&
        Object.prototype.hasOwnProperty.call(vnodeProps.attrs, 'key') &&
        !(vnodeProps.props && Object.prototype.hasOwnProperty.call(vnodeProps.props, 'key'))
      ) {
        safe(() => { vnodeProps.props.key = vnodeProps.attrs['key']; });
      }

      // Ensure native form control properties are set as JS props when the
      // template used `:value` or `:checked` (the parser places plain
      // `:value` into attrs). Textareas and inputs show their content from
      // the element property (el.value / el.checked), not the HTML attribute.
      // Only promote when the attribute was a bound attribute (e.g. used
      // with `:value`), otherwise leave static attributes in attrs for
      // tests and expected behavior.
      try {
        // Conservative promotion map: promote attributes that must be properties
        // for correct native behavior (value/checked/etc.). We intentionally
        // avoid promoting `disabled` at compile-time because early promotion
        // can cause accidental enabling/disabling when bound expressions or
        // wrapper proxies evaluate to truthy values. The runtime already
        // performs defensive coercion for boolean-like values; prefer that.
        const nativePromoteMap: Record<string, string[]> = {
          input: ['value', 'checked', 'readonly', 'required', 'placeholder', 'maxlength', 'minlength'],
          textarea: ['value', 'readonly', 'required', 'placeholder', 'maxlength', 'minlength'],
          select: ['value', 'required', 'multiple'],
          option: ['selected', 'value'],
          video: ['muted', 'autoplay', 'controls', 'loop', 'playsinline'],
          audio: ['muted', 'autoplay', 'controls', 'loop'],
          img: ['src', 'alt', 'width', 'height'],
          button: ['type', 'name', 'value', 'autofocus', 'form'],
        };

        const lname = tagName.toLowerCase();
        const promotable = nativePromoteMap[lname] ?? [];

        if (vnodeProps.attrs) {
          for (const propName of promotable) {
            if (boundList && boundList.includes(propName) && propName in vnodeProps.attrs && !(vnodeProps.props && propName in vnodeProps.props)) {
              let attrValue = vnodeProps.attrs[propName];
                // Unwrap reactive state objects during promotion
                if (attrValue && isReactiveState(attrValue)) {
                  attrValue = (attrValue as any).value; // This triggers dependency tracking
                  // Promote the unwrapped primitive value
                  vnodeProps.props[propName] = attrValue;
                  delete vnodeProps.attrs[propName];
                } else {
                  // Only promote primitive values to native element properties.
                  // For most attributes we accept string/number/boolean/empty-string
                  // but for boolean-like attributes such as `disabled` be more
                  // conservative: only promote when the value is a real boolean,
                  // an explicit empty-string (attribute presence), or the
                  // literal strings 'true'/'false'. This avoids promoting other
                  // non-boolean strings which could be misinterpreted as
                  // truthy and accidentally enable native controls.
                  const t = typeof attrValue;
                  if (propName === 'disabled') {
                    const isBoolStr = t === 'string' && (attrValue === 'true' || attrValue === 'false');
                    const shouldPromote = attrValue === '' || t === 'boolean' || isBoolStr || attrValue == null || t === 'number';
                    if (shouldPromote) {
                        vnodeProps.props[propName] = attrValue;
                        // DEV INSTRUMENTATION: record compiler-time promotions of disabled
                        safe(() => {
                          const w = (globalThis as any) as any;
                          if (!w.__VDOM_DISABLED_PROMOTIONS) w.__VDOM_DISABLED_PROMOTIONS = [];
                          w.__VDOM_DISABLED_PROMOTIONS.push({ phase: 'compiler-promotion', tag: tagName, propName, value: attrValue, time: Date.now(), stack: (new Error()).stack });
                        });
                      delete vnodeProps.attrs[propName];
                    } else {
                      // leave complex objects/unknown strings in attrs so the
                      // runtime can make a safer decision when applying props
                    }
                  } else {
                    if (attrValue === '' || t === 'string' || t === 'number' || t === 'boolean' || attrValue == null) {
                      vnodeProps.props[propName] = attrValue;
                      delete vnodeProps.attrs[propName];
                    } else {
                      // leave complex objects in attrs so the runtime can decide how
                      // to apply them (for example, :bind object form or custom handling)
                    }
                  }
                }
            }
          }
        }
        // If this looks like a custom element (hyphenated tag), promote all bound attrs to props
        const isCustom = tagName.includes('-') || Boolean((effectiveContext as any)?.__customElements?.has?.(tagName));
        if (isCustom) {
          // Always mark custom elements, regardless of bound attributes
          vnodeProps.isCustomElement = true;
          
          if (boundList && vnodeProps.attrs) {
            // Preserve attributes that may be used for stable key generation
            const keyAttrs = new Set(['id', 'name', 'data-key', 'key']);
            for (const b of boundList) {
              if (b in vnodeProps.attrs && !(vnodeProps.props && b in vnodeProps.props)) {
                // Convert kebab-case to camelCase for JS property names on custom elements
                const camel = b.includes('-') ? toCamel(b) : b;
                let attrValue = vnodeProps.attrs[b];
                // Preserve ReactiveState instances for custom elements so the
                // runtime can assign the live ReactiveState to the element
                // property (children using useProps will read .value). Do not
                // unwrap here; let the renderer/runtime decide how to apply.
                vnodeProps.props[camel] = attrValue;
                // Preserve potential key attributes in attrs to avoid unstable keys
                if (!keyAttrs.has(b)) {
                  delete vnodeProps.attrs[b];
                }
              }
            }
          }
        }
      } catch (e) {
        // Best-effort; ignore failures to keep runtime robust.
      }

      // Compiler-side canonical transform: convert :model and :model:prop on
      // custom elements into explicit prop + event handler so runtime hosts
      // that don't process directives can still work. Support multiple
      // :model variants on the same tag by iterating directive keys.
      if (directives && Object.keys(directives).some(k => k === 'model' || k.startsWith('model:'))) {
        try {
          const GLOBAL_REG_KEY = Symbol.for('cer.registry');
          const globalRegistry = (globalThis as any)[GLOBAL_REG_KEY] as Set<string> | Map<string, any> | undefined;
          const isInGlobalRegistry = Boolean(globalRegistry && typeof globalRegistry.has === 'function' && globalRegistry.has(tagName));

          const isInContext = Boolean(
            effectiveContext && (
              ((effectiveContext as any).__customElements instanceof Set && (effectiveContext as any).__customElements.has(tagName)) ||
              (Array.isArray((effectiveContext as any).__isCustomElements) && (effectiveContext as any).__isCustomElements.includes(tagName))
            )
          );

          const isHyphenated = tagName.includes('-');

          const isCustomFromContext = Boolean(isHyphenated || isInContext || isInGlobalRegistry);

          if (isCustomFromContext) {
            for (const dk of Object.keys(directives)) {
              if (dk !== 'model' && !dk.startsWith('model:')) continue;
              const model = directives[dk] as { value: any; modifiers: string[]; arg?: string };
              const arg = model.arg ?? (dk.includes(':') ? dk.split(':', 2)[1] : undefined);
              const modelVal = model.value;

              const argToUse = arg ?? 'modelValue';

              const getNested = getNestedValue;
              const setNested = setNestedValue;

              const actualState = effectiveContext ? ((effectiveContext as any)._state || effectiveContext) : undefined;

              let initial: any = undefined;
              if (typeof modelVal === 'string' && effectiveContext) {
                initial = getNested(actualState, modelVal);
              } else {
                initial = modelVal;
                // Unwrap reactive state objects
                // Keep ReactiveState objects intact for runtime so children
                // receive the ReactiveState instance instead of an unwrapped
                // plain object. The runtime knows how to handle ReactiveState
                // when applying props/attrs.
              }

              vnodeProps.props[argToUse] = initial;

              try {
                const attrName = toKebab(argToUse);
                if (!vnodeProps.attrs) vnodeProps.attrs = {} as any;
                // Only set attributes for primitive values; skip objects/refs
                if (initial !== undefined && initial !== null && (typeof initial === 'string' || typeof initial === 'number' || typeof initial === 'boolean')) {
                  vnodeProps.attrs[attrName] = initial;
                }
              } catch (e) {
                /* best-effort */
              }

              vnodeProps.isCustomElement = true;

              const eventName = `update:${toKebab(argToUse)}`;
              // Convert kebab-case event name to camelCase handler key
              const camelEventName = eventName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
              const handlerKey = 'on' + camelEventName.charAt(0).toUpperCase() + camelEventName.slice(1);

              vnodeProps.props[handlerKey] = function (ev: Event & { detail?: any }) {
                const newVal = (ev as any).detail !== undefined ? (ev as any).detail : (ev.target ? (ev.target as any).value : undefined);
                if (!actualState) return;
                
                // Handle reactive state objects (functional API)
                if (modelVal && isReactiveState(modelVal)) {
                  // Compiled handler: update reactive modelVal when event received
                  const current = modelVal.value;
                  const changed = Array.isArray(newVal) && Array.isArray(current)
                    ? JSON.stringify([...newVal].sort()) !== JSON.stringify([...current].sort())
                    : newVal !== current;
                  if (changed) {
                    modelVal.value = newVal;
                    if ((effectiveContext as any)?.requestRender) (effectiveContext as any).requestRender();
                    else if ((effectiveContext as any)?._requestRender) (effectiveContext as any)._requestRender();
                  }
                } else {
                  // Legacy string-based state handling
                  const current = getNested(actualState, typeof modelVal === 'string' ? modelVal : String(modelVal));
                  const changed = Array.isArray(newVal) && Array.isArray(current)
                    ? JSON.stringify([...newVal].sort()) !== JSON.stringify([...current].sort())
                    : newVal !== current;
                  if (changed) {
                    setNested(actualState, typeof modelVal === 'string' ? modelVal : String(modelVal), newVal);
                    if ((effectiveContext as any)?.requestRender) (effectiveContext as any).requestRender();
                    else if ((effectiveContext as any)?._requestRender) (effectiveContext as any)._requestRender();
                  }
                }
              };

              delete directives[dk];
            }
          }
        } catch (e) {
          // ignore transform errors and fall back to runtime directive handling
        }
      }

      // Process built-in directives that should be converted to props/attrs
      // Only attach directives to VNode; normalization/merging is handled in vdom.ts
      if (Object.keys(directives).length > 0) {
        vnodeProps.directives = { ...directives };
      }

      if (isClosing) {
        const node = h(
          currentTag!,
          currentProps,
          currentChildren.length === 1 &&
            isElementVNode(currentChildren[0]) &&
            currentChildren[0].tag === "#text"
            ? typeof currentChildren[0].children === "string"
              ? currentChildren[0].children
              : ""
            : currentChildren.length
              ? currentChildren
              : undefined,
          currentKey,
        );
        const prev = stack.pop();
        if (prev) {
          currentTag = prev.tag;
          currentProps = prev.props;
          currentKey = prev.key;
          currentChildren = prev.children;
          currentChildren.push(node);
        } else {
          // If there is no previous tag, this is a root-level node
          fragmentChildren.push(node);
          currentTag = null;
          currentProps = {};
          currentKey = undefined;
          currentChildren = [];
        }
      } else if (isSelfClosing) {
        const key = undefined;
        // Always push self-closing tags to fragmentChildren if not inside another tag
        if (currentTag) {
          currentChildren.push(h(tagName, vnodeProps, undefined, key));
        } else {
          fragmentChildren.push(h(tagName, vnodeProps, undefined, key));
        }
      } else {
        if (currentTag) {
          stack.push({
            tag: currentTag,
            props: currentProps,
            children: currentChildren,
            key: currentKey,
          });
        }
        currentTag = tagName;
        currentProps = vnodeProps;
        currentChildren = [];
      }
    } else if (typeof match[3] !== "undefined") {
      // Standalone interpolation marker {{N}}
      const idx = Number(match[3]);
      const val = values[idx];
      const baseKey = `interp-${idx}`;
      pushInterpolation(val, baseKey);
    } else if (match[4]) {
      // Plain text (may contain embedded interpolation markers like "...{{N}}...")
      const text = match[4];

      const targetChildren = currentTag ? currentChildren : fragmentChildren;

      // Split text by embedded markers and handle parts
      const parts = text.split(/({{\d+}})/);
      for (const part of parts) {
        if (!part) continue;

        const interp = part.match(/^{{(\d+)}}$/);
        if (interp) {
          const idx = Number(interp[1]);
          const val = values[idx];
          const baseKey = `interp-${idx}`;
          pushInterpolation(val, baseKey);
        } else {
          const key = `text-${nodeIndex++}`;
          targetChildren.push(textVNode(part, key));
        }
      }
    }
  }

  // Normalize output: prefer array for true multi-root, single node for single root
  if (root) {
    // If root is an anchor block or element, return as-is
    return root;
  }

  // Filter out empty text nodes and whitespace-only nodes
  const cleanedFragments = fragmentChildren.filter((child): child is VNode => {
    if (isElementVNode(child)) {
      if (child.tag === "#text") {
        return typeof child.children === "string" && child.children.trim() !== "";
      }
      return true;
    }
    // Always keep anchor blocks and non-element nodes
    return true;
  });

  // Transform nodes with :when directive into anchor blocks
  const transformedFragments = cleanedFragments.map(child => transformWhenDirective(child));

  if (transformedFragments.length === 1) {
    // Single non-empty root node
    const out = transformedFragments[0];
      if (canCache && cacheKey) TEMPLATE_COMPILE_CACHE.set(cacheKey, out);
    return out;
  } else if (transformedFragments.length > 1) {
    // True multi-root: return array
    const out = transformedFragments;
    if (canCache && cacheKey) {
      TEMPLATE_COMPILE_CACHE.set(cacheKey, out);
    }
    return out;
  }

  // Fallback for empty content
  return h("div", {}, "", "fallback-root");
}

/**
 * Clear the template compile cache (useful for tests)
 */
export function clearTemplateCompileCache(): void {
  TEMPLATE_COMPILE_CACHE.clear();
}

/**
 * Default export: plain html.
 */
export function html(
  strings: TemplateStringsArray,
  ...values: unknown[]
): VNode | VNode[] {
  // If last value is a context object, use it
  const last = values[values.length - 1];
  const context =
    typeof last === "object" && last && !Array.isArray(last)
      ? (last as Record<string, any>)
      : undefined;

  return htmlImpl(strings, values, context);
}