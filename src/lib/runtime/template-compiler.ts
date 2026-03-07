import type { VNode } from './types';
import { contextStack } from './render';
import {
  toKebab,
  toCamel,
  getNestedValue,
  setNestedValue,
  safe,
  decodeEntities,
  isUnsafeHTML,
  safeSerializeAttr,
  isClassLikeAttr,
} from './helpers';
import { isReactiveState } from './reactive';
import { devWarn } from './logger';
import { isDiscoveryRender } from './discovery-state';

// Strict LRU cache helper for fully static templates (no interpolations, no context)
class LRUCache<K, V> {
  private map = new Map<K, V>();
  private maxSize: number;
  private accessOrder = new Map<K, number>();
  private accessCounter = 0;

  constructor(maxSize: number) {
    this.maxSize = Math.max(1, maxSize);
  }

  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value === undefined) return undefined;

    // Update access order efficiently
    this.accessOrder.set(key, ++this.accessCounter);
    return value;
  }

  set(key: K, value: V): void {
    const exists = this.map.has(key);
    this.map.set(key, value);
    this.accessOrder.set(key, ++this.accessCounter);

    // Only evict if we're over limit and this is a new key
    if (!exists && this.map.size > this.maxSize) {
      this.evictLRU();
    }
  }

  private evictLRU(): void {
    let lruKey: K | undefined;
    let lruAccess = Infinity;

    // Find least recently used key
    for (const [key, access] of this.accessOrder) {
      if (access < lruAccess) {
        lruAccess = access;
        lruKey = key;
      }
    }

    if (lruKey !== undefined) {
      this.map.delete(lruKey);
      this.accessOrder.delete(lruKey);
    }
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  clear(): void {
    this.map.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  get size(): number {
    return this.map.size;
  }
}

// Adaptive cache size based on environment
const getCacheSize = (): number => {
  if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
    // Use device memory to determine cache size (GB * 100, min 200, max 1000)
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number })
      .deviceMemory;
    if (deviceMemory) {
      return Math.min(1000, Math.max(200, deviceMemory * 100));
    }
  }
  // Default cache size with environment detection
  const isTest = (() => {
    try {
      const globalObj = globalThis as Record<string, unknown>;
      const processObj = globalObj.process as
        | Record<string, unknown>
        | undefined;
      const envObj = processObj?.env as Record<string, unknown> | undefined;
      return envObj?.NODE_ENV === 'test';
    } catch {
      return false;
    }
  })();
  return isTest ? 100 : 500; // Smaller cache in tests
};

const TEMPLATE_COMPILE_CACHE = new LRUCache<string, VNode | VNode[]>(
  getCacheSize(),
);

/**
 * Validates event handlers to prevent common mistakes that lead to infinite loops
 */
function validateEventHandler(value: unknown, eventName: string): void {
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

export function h(
  tag: string,
  props: Record<string, unknown> = {},
  children?: VNode[] | string,
  key?: string | number,
): VNode {
  // Do NOT invent keys here; use only what the caller passes (or props.key).
  const finalKey = (key ?? (props.key as unknown as string | undefined)) as
    | string
    | undefined;
  return { tag, key: finalKey, props, children };
}

export function isAnchorBlock(v: unknown): boolean {
  return (
    !!v &&
    typeof v === 'object' &&
    ((v as { type?: string }).type === 'AnchorBlock' ||
      (v as { tag?: string }).tag === '#anchor')
  );
}

export function isElementVNode(v: unknown): v is VNode {
  return (
    typeof v === 'object' && v !== null && 'tag' in v && !isAnchorBlock(v) // exclude anchor blocks from being treated as normal elements
  );
}

export function ensureKey(v: VNode, k?: string): VNode {
  // Keep behavior consistent with the older compiler: only surface the
  // provided key when present. Do not invent a random key here — that
  // causes remounts and breaks deterministic tests (especially for
  // form controls like <select>). If caller passes `undefined`, we
  // preserve `undefined` so downstream key-assignment logic can decide.
  return v.key != null ? v : { ...v, key: k };
}

export interface ParsePropsResult {
  props: Record<string, unknown>;
  attrs: Record<string, unknown>;
  directives: Record<
    string,
    { value: unknown; modifiers: string[]; arg?: string }
  >;
  bound: string[];
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

  // Match attributes with optional prefix and support for single/double quotes
  // and unquoted values (so `:model=${...}` or `@click=${...}` work without
  // requiring surrounding quotes). Also matches standalone boolean attributes
  // (without =value).
  const attrRegex =
    /([:@#]?)([a-zA-Z0-9-:.]+)(?:\s*=\s*("([^"\\]*(\\.[^"\\]*)*)"|'([^'\\]*(\\.[^'\\]*)*)'|([^\s>]+)))?/g;

  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(str))) {
    const prefix = match[1];
    const rawName = match[2];
    // Extract the first non-undefined capture for the attribute value.
    // We avoid relying on hard-coded group indexes because nested groups
    // in the regex can shift indexes across environments/transpilers.
    let rawVal = '';
    for (let i = 3; i < match.length; i++) {
      if (match[i] !== undefined) {
        rawVal = match[i] as string;
        break;
      }
    }

    // Defensive quote stripping if surrounding quotes remain
    if (
      rawVal.length >= 2 &&
      ((rawVal[0] === '"' && rawVal[rawVal.length - 1] === '"') ||
        (rawVal[0] === "'" && rawVal[rawVal.length - 1] === "'"))
    ) {
      rawVal = rawVal.slice(1, -1);
    }

    // If no value was provided (standalone attribute), treat as boolean true
    // Determine standalone by checking whether the matched token contains '='
    const isStandalone = !/=/.test(match[0]);

    // Interpolation detection
    const interpMatch = rawVal.match(/^{{(\d+)}}$/);
    let value: unknown = isStandalone
      ? true // Standalone attributes are boolean true
      : interpMatch
        ? (values[Number(interpMatch[1])] ?? null)
        : rawVal;

    // Type inference for booleans, null, numbers
    if (!interpMatch) {
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (value === 'null') value = null;
      else if (!isNaN(Number(value))) value = Number(value);
    }

    // Known directive names
    const knownDirectives = [
      'model',
      'bind',
      'show',
      'class',
      'style',
      'ref',
      'when',
    ];
    if (prefix === ':') {
      // Support :model:checked (directive with argument) and :class.foo (modifiers)
      const [nameAndModifiers, argPart] = rawName.split(':');
      const [maybeDirective, ...modifierParts] = nameAndModifiers.split('.');
      if (knownDirectives.includes(maybeDirective)) {
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
    const rawWhen = directives.when.value;
    // If the directive value is a ReactiveState, unwrap it so the condition
    // reflects the current boolean value (e.g. ref(false) -> false).
    const whenCondition = isReactiveState(rawWhen)
      ? (rawWhen as { value: unknown }).value
      : rawWhen;

    // Remove the :when directive from the VNode since we're handling it here
    const remainingDirectives = { ...directives };
    delete remainingDirectives.when;
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
      elementVNode.children = elementVNode.children.map((child) =>
        typeof child === 'object' && child !== null
          ? transformWhenDirective(child as VNode)
          : child,
      );
    }

    // Wrap in an anchor block with the condition
    const anchorKey =
      vnode.key != null ? `when-${vnode.key}` : `when-${vnode.tag}`;
    return {
      tag: '#anchor',
      key: anchorKey,
      children: whenCondition ? [elementVNode] : [],
    };
  }

  // Recursively transform children if they exist
  if (Array.isArray(vnode.children)) {
    const transformedChildren = vnode.children.map((child) =>
      typeof child === 'object' && child !== null
        ? transformWhenDirective(child as VNode)
        : child,
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
  context?: Record<string, unknown>,
): VNode | VNode[] {
  // Retrieve current context from stack (transparent injection)
  const injectedContext =
    contextStack.length > 0 ? contextStack[contextStack.length - 1] : undefined;

  // Use injected context if no explicit context provided
  const effectiveContext = context ?? injectedContext;

  // Conservative caching: only cache templates that have no interpolations
  // (values.length === 0) and no explicit context. This avoids incorrectly
  // reusing parsed structures that depend on runtime values or context.
  const canCache = !context && values.length === 0;
  const cacheKey = canCache ? strings.join('<!--TEMPLATE_DELIM-->') : null;
  if (canCache && cacheKey) {
    const cached = TEMPLATE_COMPILE_CACHE.get(cacheKey);
    if (cached) return cached;
  }

  // Create a text VNode for interpolations (do NOT decode entity sequences)
  function textVNode(text: string, key: string): VNode {
    return h('#text', {}, text, key);
  }

  // Create a text VNode for literal template text (decode HTML entities so
  // authors can write `&lt;` inside template bodies and get the literal
  // character in the DOM). This should NOT be used for interpolated values
  // where the runtime should preserve the original string provided by the
  // consumer.
  function decodedTextVNode(
    text: string,
    key: string,
    preserveWhitespace = false,
  ): VNode {
    let decoded = typeof text === 'string' ? decodeEntities(text) : text;
    // If the literal template text contains newlines or carriage returns,
    // collapse any run of whitespace (including newlines and indentation)
    // into a single space. This preserves single-space separators while
    // eliminating incidental indentation/newline leakage inside elements.
    // EXCEPT when inside whitespace-preserving elements like <pre>, <code>, <textarea>
    if (
      !preserveWhitespace &&
      typeof decoded === 'string' &&
      /[\r\n]/.test(decoded)
    ) {
      decoded = decoded.replace(/\s+/g, ' ');
    }
    return h('#text', {}, decoded as string, key);
  }

  // Stitch template with interpolation markers
  let template = '';
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
    props: Record<string, unknown>;
    children: VNode[];
    key: string | number | undefined;
  }> = [];
  const root: VNode | null = null;
  let match: RegExpExecArray | null;
  let currentChildren: VNode[] = [];
  let currentTag: string | null = null;
  let currentProps: Record<string, unknown> = {};
  let currentKey: string | number | undefined = undefined;
  let nodeIndex = 0;
  const fragmentChildren: VNode[] = []; // Track root-level nodes for fragments

  // Whitespace-preserving elements: pre, code, textarea, script, style
  const whitespacePreservingTags = new Set([
    'pre',
    'code',
    'textarea',
    'script',
    'style',
  ]);

  // Helper to check if we're inside a whitespace-preserving element
  function isInWhitespacePreservingContext(): boolean {
    if (currentTag && whitespacePreservingTags.has(currentTag.toLowerCase())) {
      return true;
    }
    // Check stack for nested contexts
    for (const frame of stack) {
      if (whitespacePreservingTags.has(frame.tag.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  // Helper: merge object-like interpolation into currentProps
  type MaybeVNodeLike =
    | { props?: Record<string, unknown>; attrs?: Record<string, unknown> }
    | Record<string, unknown>;

  function mergeIntoCurrentProps(maybe: unknown) {
    if (!maybe || typeof maybe !== 'object') return;
    if (isAnchorBlock(maybe)) return; // do not merge AnchorBlocks
    const mm = maybe as MaybeVNodeLike;
    const cp = currentProps as {
      props?: Record<string, unknown>;
      attrs?: Record<string, unknown>;
    };
    if (
      (mm as { props?: unknown }).props ||
      (mm as { attrs?: unknown }).attrs
    ) {
      const mmWith = mm as {
        props?: Record<string, unknown>;
        attrs?: Record<string, unknown>;
      };
      if (mmWith.props) {
        // Ensure currentProps.props exists
        if (!cp.props) cp.props = {};
        Object.assign(cp.props, mmWith.props);
      }
      if (mmWith.attrs) {
        // Ensure currentProps.attrs exists
        if (!cp.attrs) cp.attrs = {};

        // Handle special merging for style and class attributes
        Object.keys(mmWith.attrs).forEach((key) => {
          if (key === 'style' && cp.attrs!.style) {
            // Merge style attributes by concatenating with semicolon
            const existingStyle = String(cp.attrs!.style).replace(/;?\s*$/, '');
            const newStyle = String(mmWith.attrs!.style).replace(/^;?\s*/, '');
            cp.attrs!.style = existingStyle + '; ' + newStyle;
          } else if (key === 'class' && cp.attrs!.class) {
            // Merge class attributes by concatenating with space
            const existingClasses = String(cp.attrs!.class)
              .trim()
              .split(/\s+/)
              .filter(Boolean);
            const newClasses = String(mmWith.attrs!.class)
              .trim()
              .split(/\s+/)
              .filter(Boolean);
            const allClasses = [
              ...new Set([...existingClasses, ...newClasses]),
            ];
            cp.attrs!.class = allClasses.join(' ');
          } else {
            // For other attributes, just assign (later values override)
            cp.attrs![key] = mmWith.attrs![key];
          }
        });
      }
    } else {
      // If no props/attrs structure, merge directly into props
      if (!cp.props) cp.props = {};
      Object.assign(cp.props, mm as Record<string, unknown>);
    }
  }

  // Helper: push an interpolated value into currentChildren/currentProps or fragments
  function pushInterpolation(val: unknown, baseKey: string) {
    const targetChildren = currentTag ? currentChildren : fragmentChildren;

    if (isAnchorBlock(val)) {
      const anchorKey = (val as VNode).key ?? baseKey;
      const anchorChildren = (val as { children?: VNode[] }).children;
      targetChildren.push({
        ...(val as VNode),
        key: anchorKey,
        children: anchorChildren,
      });
      return;
    }

    if (isElementVNode(val)) {
      // Leave key undefined so assignKeysDeep can generate a stable one
      targetChildren.push(ensureKey(val, undefined));
      return;
    }

    if (Array.isArray(val)) {
      if (val.length === 0) return;
      for (let i = 0; i < val.length; i++) {
        const v = val[i];
        if (isAnchorBlock(v) || isElementVNode(v) || Array.isArray(v)) {
          // recurse or push without forcing a key
          pushInterpolation(v, `${baseKey}-${i}`);
        } else if (v !== null && typeof v === 'object') {
          // If the object is an unsafe HTML marker, push a raw vnode
          if (isUnsafeHTML(v)) {
            targetChildren.push(
              h(
                '#raw',
                {},
                (v as { __rawHTML: string }).__rawHTML,
                `${baseKey}-${i}`,
              ),
            );
          } else {
            mergeIntoCurrentProps(v);
          }
        } else {
          targetChildren.push(textVNode(String(v), `${baseKey}-${i}`));
        }
      }
      return;
    }

    if (val !== null && typeof val === 'object') {
      if (isUnsafeHTML(val)) {
        const raw = (val as { __rawHTML?: string }).__rawHTML ?? '';
        targetChildren.push(h('#raw', {}, raw, baseKey));
        return;
      }
      mergeIntoCurrentProps(val);
      return;
    }

    targetChildren.push(textVNode(String(val), baseKey));
  }

  const voidElements = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
  ]);

  while ((match = tagRegex.exec(template))) {
    // Skip HTML comments (they are matched by the regex but ignored)
    if (match[0].startsWith('<!--') && match[0].endsWith('-->')) {
      continue;
    }

    if (match[1]) {
      // Tag token
      const tagName = match[1];
      const isClosing = match[0][1] === '/';
      const isSelfClosing =
        match[0][match[0].length - 2] === '/' || voidElements.has(tagName);

      const {
        props: rawProps,
        attrs: rawAttrs,
        directives,
        bound: boundList,
      } = parseProps(
        match[2] || '',
        values,
        (effectiveContext ?? {}) as Record<string, unknown>,
      ) as ParsePropsResult;

      // No runtime registration here; compiler will set `isCustomElement`
      // on vnodeProps where appropriate. Runtime will consult that flag or
      // the strict registry if consumers register tags at runtime.

      // Shape props into { props, attrs, directives } expected by VDOM
      const vnodeProps: {
        props: Record<string, unknown>;
        attrs: Record<string, unknown>;
        directives?: Record<string, { value: unknown; modifiers: string[] }>;
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
        !(
          vnodeProps.props &&
          Object.prototype.hasOwnProperty.call(vnodeProps.props, 'key')
        )
      ) {
        safe(() => {
          vnodeProps.props.key = vnodeProps.attrs['key'];
        });
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
          input: [
            'value',
            'checked',
            'readonly',
            'required',
            'placeholder',
            'maxlength',
            'minlength',
          ],
          textarea: [
            'value',
            'readonly',
            'required',
            'placeholder',
            'maxlength',
            'minlength',
          ],
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
            if (
              boundList &&
              boundList.includes(propName) &&
              propName in vnodeProps.attrs &&
              !(vnodeProps.props && propName in vnodeProps.props)
            ) {
              let attrValue = vnodeProps.attrs[propName];
              // Unwrap reactive state objects during promotion
              if (attrValue && isReactiveState(attrValue)) {
                attrValue = (attrValue as { value: unknown }).value; // This triggers dependency tracking
                // Promote the unwrapped primitive value
                vnodeProps.props[propName] = attrValue;
                delete vnodeProps.attrs[propName];
              } else if (
                attrValue &&
                typeof attrValue === 'object' &&
                'value' in (attrValue as Record<string, unknown>) &&
                !(attrValue instanceof Node)
              ) {
                // Support simple wrapper objects that carry a `value` property
                // (for example useProps/ref-like wrappers that aren't our
                // ReactiveState instances). Promote their inner primitive
                // value for native element properties such as <select>.value.
                try {
                  const unwrapped = (attrValue as { value: unknown }).value;
                  // For native select/option values prefer string primitives so
                  // the DOM <select>.value matches option values exactly.
                  vnodeProps.props[propName] =
                    (lname === 'select' || lname === 'option') &&
                    propName === 'value'
                      ? String(unwrapped)
                      : unwrapped;
                  delete vnodeProps.attrs[propName];
                } catch {
                  void 0;
                }
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
                  const isBoolStr =
                    t === 'string' &&
                    (attrValue === 'true' || attrValue === 'false');
                  const shouldPromote =
                    attrValue === '' ||
                    t === 'boolean' ||
                    isBoolStr ||
                    attrValue == null ||
                    t === 'number';
                  if (shouldPromote) {
                    vnodeProps.props[propName] = attrValue;
                    // DEV INSTRUMENTATION: record compiler-time promotions of disabled
                    // (dev instrumentation removed)
                    delete vnodeProps.attrs[propName];
                  } else {
                    // leave complex objects/unknown strings in attrs so the
                    // runtime can make a safer decision when applying props
                  }
                } else {
                  if (
                    attrValue === '' ||
                    t === 'string' ||
                    t === 'number' ||
                    t === 'boolean' ||
                    attrValue == null
                  ) {
                    // Coerce select/option `value` to string to avoid mismatch
                    const promoted =
                      (lname === 'select' || lname === 'option') &&
                      propName === 'value'
                        ? String(attrValue)
                        : attrValue;
                    vnodeProps.props[propName] = promoted;
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
        const isCustom =
          tagName.includes('-') ||
          Boolean(
            (
              effectiveContext as { __customElements?: Set<string> }
            )?.__customElements?.has?.(tagName),
          );
        if (isCustom) {
          // Always mark custom elements, regardless of bound attributes
          vnodeProps.isCustomElement = true;

          if (boundList && vnodeProps.attrs) {
            // Preserve attributes that may be used for stable key generation
            const keyAttrs = new Set(['id', 'name', 'data-key', 'key']);
            for (const b of boundList) {
              if (
                b in vnodeProps.attrs &&
                !(vnodeProps.props && b in vnodeProps.props)
              ) {
                // Convert kebab-case to camelCase for JS property names on custom elements
                const camel = b.includes('-') ? toCamel(b) : b;
                const attrValue = vnodeProps.attrs[b];
                // Preserve ReactiveState instances for custom elements so the
                // runtime can assign the live ReactiveState to the element
                // property (children using useProps will read .value). Do not
                // unwrap here; let the renderer/runtime decide how to apply.
                vnodeProps.props[camel] = attrValue;
                // Preserve potential key attributes in attrs to avoid unstable keys
                // For custom elements, preserve host-visible class-like attributes
                // so that compile-time HTML serialization (shadowRoot.innerHTML)
                // contains utility-class tokens for the JIT extractor. We treat
                // the following as class-like and attempt to keep them in attrs:
                //  - `class`
                //  - any camelCase that ends with `Class` (e.g. activeClass)
                //  - any kebab-case that ends with `-class` (e.g. active-class)
                const preserveInAttrs = keyAttrs.has(b) || isClassLikeAttr(b);
                if (preserveInAttrs) {
                  try {
                    const serialized = safeSerializeAttr(vnodeProps.attrs[b]);
                    if (serialized === null) delete vnodeProps.attrs[b];
                    else vnodeProps.attrs[b] = serialized as string;
                  } catch {
                    delete vnodeProps.attrs[b];
                  }
                } else {
                  delete vnodeProps.attrs[b];
                }
              }
            }
          }
          // Ensure common model-binding attribute forms are available as
          // JS props on custom elements even when they were passed as
          // attributes (for example :model-value="..." -> attrs['model-value']).
          // This helps ensure consistent behavior for `:model-value` (bind)
          // usage where downstream component expects a `modelValue` prop.
          try {
            if (
              vnodeProps.attrs &&
              !(vnodeProps.props && 'modelValue' in vnodeProps.props)
            ) {
              const mv =
                (vnodeProps.attrs as Record<string, unknown>)['model-value'] ??
                (vnodeProps.attrs as Record<string, unknown>)['modelValue'];
              if (typeof mv !== 'undefined') vnodeProps.props.modelValue = mv;
            }
          } catch {
            void 0;
          }
        }
      } catch {
        // Best-effort; ignore failures to keep runtime robust.
      }

      // Compiler-side canonical transform: convert :model and :model:prop on
      // custom elements into explicit prop + event handler so runtime hosts
      // that don't process directives can still work. Support multiple
      // :model variants on the same tag by iterating directive keys.
      if (
        directives &&
        Object.keys(directives).some(
          (k) => k === 'model' || k.startsWith('model:'),
        )
      ) {
        try {
          const GLOBAL_REG_KEY = Symbol.for('cer.registry');
          const globalRegistry = (globalThis as { [key: symbol]: unknown })[
            GLOBAL_REG_KEY
          ] as Set<string> | Map<string, unknown> | undefined;
          const isInGlobalRegistry = Boolean(
            globalRegistry &&
              typeof globalRegistry.has === 'function' &&
              globalRegistry.has(tagName),
          );

          const ctx = effectiveContext as
            | ({
                __customElements?: Set<string>;
                __isCustomElements?: string[];
              } & Record<string, unknown>)
            | undefined;

          const isInContext = Boolean(
            ctx &&
              ((ctx.__customElements instanceof Set &&
                ctx.__customElements.has(tagName)) ||
                (Array.isArray(ctx.__isCustomElements) &&
                  ctx.__isCustomElements.includes(tagName))),
          );

          const isHyphenated = tagName.includes('-');

          const isCustomFromContext = Boolean(
            isHyphenated || isInContext || isInGlobalRegistry,
          );

          if (isCustomFromContext) {
            for (const dk of Object.keys(directives)) {
              if (dk !== 'model' && !dk.startsWith('model:')) continue;
              const model = directives[dk] as {
                value: unknown;
                modifiers: string[];
                arg?: string;
              };
              const arg =
                model.arg ??
                (dk.includes(':') ? dk.split(':', 2)[1] : undefined);
              const modelVal = model.value;

              const argToUse = arg ?? 'modelValue';

              const getNested = getNestedValue;
              const setNested = setNestedValue;

              const actualState =
                (effectiveContext as { _state?: unknown } | undefined)
                  ?._state ||
                (effectiveContext as Record<string, unknown> | undefined);

              let initial: unknown = undefined;
              if (typeof modelVal === 'string' && actualState) {
                initial = getNested(
                  actualState as Record<string, unknown>,
                  modelVal,
                );
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
                if (!vnodeProps.attrs) vnodeProps.attrs = {};
                // Only set attributes for primitive values; skip objects/refs
                if (
                  initial !== undefined &&
                  initial !== null &&
                  (typeof initial === 'string' ||
                    typeof initial === 'number' ||
                    typeof initial === 'boolean')
                ) {
                  vnodeProps.attrs[attrName] = initial;
                }
              } catch {
                /* best-effort */
              }

              vnodeProps.isCustomElement = true;

              const eventName = `update:${toKebab(argToUse)}`;
              // Convert kebab-case event name to camelCase handler key
              const camelEventName = eventName.replace(
                /-([a-z])/g,
                (_, letter) => letter.toUpperCase(),
              );
              const handlerKey =
                'on' +
                camelEventName.charAt(0).toUpperCase() +
                camelEventName.slice(1);

              vnodeProps.props[handlerKey] = function (
                ev: Event & { detail?: unknown },
              ) {
                const newVal =
                  (ev as { detail?: unknown }).detail !== undefined
                    ? (ev as { detail?: unknown }).detail
                    : ev.target
                      ? (ev.target as { value?: unknown }).value
                      : undefined;
                if (!actualState) return;

                // Handle reactive state objects (functional API)
                if (modelVal && isReactiveState(modelVal)) {
                  // Compiled handler: update reactive modelVal when event received
                  const current = modelVal.value;
                  const changed =
                    Array.isArray(newVal) && Array.isArray(current)
                      ? JSON.stringify([...newVal].sort()) !==
                        JSON.stringify([...current].sort())
                      : newVal !== current;
                  if (changed) {
                    modelVal.value = newVal;
                    try {
                      const eff = effectiveContext as
                        | Record<string, unknown>
                        | undefined;
                      if (eff) {
                        const rr = (eff as { requestRender?: unknown })
                          .requestRender;
                        const _rr = (eff as { _requestRender?: unknown })
                          ._requestRender;
                        if (typeof rr === 'function') (rr as () => void)();
                        else if (typeof _rr === 'function')
                          (_rr as () => void)();
                      }
                    } catch {
                      void 0;
                    }
                  }
                } else {
                  // Legacy string-based state handling
                  const current = getNested(
                    (actualState as Record<string, unknown>) || {},
                    typeof modelVal === 'string' ? modelVal : String(modelVal),
                  );
                  const changed =
                    Array.isArray(newVal) && Array.isArray(current)
                      ? JSON.stringify([...newVal].sort()) !==
                        JSON.stringify([...current].sort())
                      : newVal !== current;
                  if (changed) {
                    setNested(
                      (actualState as Record<string, unknown>) || {},
                      typeof modelVal === 'string'
                        ? modelVal
                        : String(modelVal),
                      newVal,
                    );
                    try {
                      const eff = effectiveContext as
                        | Record<string, unknown>
                        | undefined;
                      if (eff) {
                        const rr = (eff as { requestRender?: unknown })
                          .requestRender;
                        const _rr = (eff as { _requestRender?: unknown })
                          ._requestRender;
                        if (typeof rr === 'function') (rr as () => void)();
                        else if (typeof _rr === 'function')
                          (_rr as () => void)();
                      }
                    } catch {
                      void 0;
                    }
                  }
                }
              };

              delete directives[dk];
            }
          }
        } catch {
          // ignore transform errors and fall back to runtime directive handling
        }
      }

      // Process built-in directives that should be converted to props/attrs
      // Only attach directives to VNode; normalization/merging is handled in vdom.ts
      if (Object.keys(directives).length > 0) {
        vnodeProps.directives = { ...directives };
      }

      if (isClosing) {
        // If there are any non-text children (elements, anchors, raw), we
        // will trim incidental whitespace-only text nodes that result from
        // template indentation/newlines only at the boundaries (leading
        // and trailing). This avoids turning indentation into real text
        // nodes while preserving interior whitespace that may be used as
        // separators between interpolations.
        const hasNonTextChild = currentChildren.some(
          (c) => typeof c === 'object' && (c as VNode).tag !== '#text',
        );

        let effectiveChildren = currentChildren;
        if (hasNonTextChild && currentChildren.length > 0) {
          // Trim leading whitespace-only text nodes
          let start = 0;
          while (start < currentChildren.length) {
            const node = currentChildren[start];
            if (
              !isElementVNode(node) ||
              node.tag !== '#text' ||
              typeof node.children !== 'string' ||
              node.children.trim() !== ''
            ) {
              break;
            }
            start++;
          }

          // Trim trailing whitespace-only text nodes
          let end = currentChildren.length - 1;
          while (end >= 0) {
            const node = currentChildren[end];
            if (
              !isElementVNode(node) ||
              node.tag !== '#text' ||
              typeof node.children !== 'string' ||
              node.children.trim() !== ''
            ) {
              break;
            }
            end--;
          }

          if (start === 0 && end === currentChildren.length - 1) {
            effectiveChildren = currentChildren;
          } else if (start > end) {
            effectiveChildren = [];
          } else {
            effectiveChildren = currentChildren.slice(start, end + 1);
          }
        }

        const node = h(
          currentTag!,
          currentProps,
          effectiveChildren.length === 1 &&
            isElementVNode(effectiveChildren[0]) &&
            effectiveChildren[0].tag === '#text'
            ? typeof effectiveChildren[0].children === 'string'
              ? effectiveChildren[0].children
              : ''
            : effectiveChildren.length
              ? effectiveChildren
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
    } else if (typeof match[3] !== 'undefined') {
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
          // This branch is for literal template text (not interpolation markers)
          // so decode entity sequences here. Check if we're in a whitespace-preserving
          // context (pre, code, textarea) and pass that info to decodedTextVNode.
          const preserveWhitespace = isInWhitespacePreservingContext();
          targetChildren.push(decodedTextVNode(part, key, preserveWhitespace));
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
      if (child.tag === '#text') {
        return (
          typeof child.children === 'string' && child.children.trim() !== ''
        );
      }
      return true;
    }
    // Always keep anchor blocks and non-element nodes
    return true;
  });

  // Transform nodes with :when directive into anchor blocks
  const transformedFragments = cleanedFragments.map((child) =>
    transformWhenDirective(child),
  );

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
  return h('div', {}, '', 'fallback-root');
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
  // Short-circuit during discovery renders to avoid template parsing side effects.
  // useProps() and other hook registrations still run because they happen before
  // the html`` call in the render function body.
  if (isDiscoveryRender()) return [];

  // If last value is a context object, use it
  const last = values[values.length - 1];
  const context =
    typeof last === 'object' && last && !Array.isArray(last)
      ? (last as Record<string, unknown>)
      : undefined;

  return htmlImpl(strings, values, context);
}
