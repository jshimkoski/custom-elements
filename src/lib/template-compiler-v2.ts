import type { VNode } from "./vdom-v2";

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

function isAnchorBlock(v: any): boolean {
  return (
    !!v &&
    typeof v === "object" &&
    ((v as any).type === "AnchorBlock" || (v as any).tag === "#anchor")
  );
}

function isElementVNode(v: any): v is VNode {
  return (
    typeof v === "object" && v !== null && "tag" in v && !isAnchorBlock(v) // exclude anchor blocks from being treated as normal elements
  );
}

function ensureKey(v: VNode, k: string): VNode {
  return v.key != null ? v : { ...v, key: k };
}

function parseProps(
  str: string,
  values: unknown[],
  context?: Record<string, any>,
): {
  props: Record<string, any>;
  attrs: Record<string, any>;
} {
  const props: Record<string, any> = {};
  const attrs: Record<string, any> = {};

  // Allow ":" for props, "@" for events.
  const attrRegex = /([:@])?([a-zA-Z0-9-:]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(str))) {
    const prefix = match[1]; // ":" or "@" or undefined
    const rawName = match[2];
    const rawVal = match[3];

    // Interpolation detection
    const interpMatch = rawVal.match(/^{{(\d+)}}$/);

    if (prefix === ":") {
      // Property binding
      if (interpMatch) {
        const idx = Number(interpMatch[1]);
        props[rawName] = values[idx];
      } else {
        props[rawName] = rawVal;
      }
    } else if (prefix === "@") {
      const toOnName = (ev: string) =>
        "on" + ev.charAt(0).toUpperCase() + ev.slice(1);
      const onName = toOnName(rawName);
      if (interpMatch) {
        const idx = Number(interpMatch[1]);
        if (values[idx] !== undefined) props[onName] = values[idx];
      } else {
        if (context && typeof context[rawVal] === "function")
          props[onName] = context[rawVal];
      }
    } else {
      // Plain attribute (string)
      attrs[rawName] = interpMatch ? values[Number(interpMatch[1])] : rawVal;
    }
  }

  return { props, attrs };
}

/**
 * Internal implementation allowing an optional compile context for v-model.
 * Fixes:
 *  - Recognize interpolation markers embedded in text ("World{{1}}") and replace them.
 *  - Skip empty arrays from directives so markers don't leak as text.
 *  - Pass AnchorBlocks through (and deep-normalize their children's keys) so the renderer can mount/patch them surgically.
 *  - Do not rewrap interpolated VNodes (preserve their keys); only fill in missing keys.
 */
function htmlImpl(
  strings: TemplateStringsArray,
  values: unknown[],
  context?: Record<string, any>,
): VNode | VNode[] {
  function textVNode(text: string, key: string): VNode {
    return h("#text", {}, text, key);
  }

  // Stitch template with interpolation markers
  let template = "";
  for (let i = 0; i < strings.length; i++) {
    template += strings[i];
    if (i < values.length) template += `{{${i}}}`;
  }

  // Matches: tags (open/close/self), standalone interpolation markers, or any other text
  const tagRegex = /<\/?([a-zA-Z0-9-]+)([^>]*)\/?>|{{(\d+)}}|([^<]+)/g;

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

  // Helper: merge object-like interpolation into currentProps
  function mergeIntoCurrentProps(maybe: any) {
    if (!maybe || typeof maybe !== "object") return;
    if (isAnchorBlock(maybe)) return; // do not merge AnchorBlocks
    if (maybe.props || maybe.attrs) {
      if (maybe.props)
        Object.assign(currentProps.props ?? currentProps, maybe.props);
      if (maybe.attrs)
        Object.assign(currentProps.attrs ?? currentProps, maybe.attrs);
    } else {
      Object.assign(currentProps.props ?? currentProps, maybe);
    }
  }

  // Helper: push an interpolated value into currentChildren/currentProps
  function pushInterpolation(val: any, baseKey: string) {
    if (!currentTag) return;

    if (isAnchorBlock(val)) {
      const anchorKey = (val as VNode).key ?? baseKey;
      let anchorChildren = (val as any).children as VNode[] | undefined;

      currentChildren.push({
        ...(val as VNode),
        key: anchorKey,
        children: anchorChildren,
      });
      return;
    }

    if (isElementVNode(val)) {
      // Leave key undefined so assignKeysDeep can generate a stable one
      currentChildren.push(ensureKey(val, undefined as any));
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
          currentChildren.push(textVNode(String(v), `${baseKey}-${i}`));
        }
      }
      return;
    }

    if (val !== null && typeof val === "object") {
      mergeIntoCurrentProps(val);
      return;
    }

    currentChildren.push(textVNode(String(val), baseKey));
  }

  while ((match = tagRegex.exec(template))) {
    if (match[1]) {
      // Tag token
      const tagName = match[1];
      const isClosing = match[0][1] === "/";
      const isSelfClosing = match[0][match[0].length - 2] === "/";

      const { props: rawProps, attrs: rawAttrs } = parseProps(
        match[2] || "",
        values,
        context,
      );

      // Shape props into { props, attrs } expected by VDOM
      const vnodeProps: {
        props: Record<string, unknown>;
        attrs: Record<string, unknown>;
      } = { props: {}, attrs: {} };

      for (const k in rawProps) vnodeProps.props[k] = rawProps[k];
      for (const k in rawAttrs) vnodeProps.attrs[k] = rawAttrs[k];

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
          root = node;
        }
      } else if (isSelfClosing) {
        const key = undefined;
        currentChildren.push(h(tagName, vnodeProps, undefined, key));
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

      if (!currentTag) continue;

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
          currentChildren.push(textVNode(part, key));
        }
      }
    }
  }

  // Clean empty text nodes at root level
  if (root && isElementVNode(root) && Array.isArray(root.children)) {
    root.children = (root.children as VNode[]).filter(
      (child): child is VNode =>
        isElementVNode(child)
          ? child.tag !== "#text" ||
            (typeof child.children === "string" && child.children.trim() !== "")
          : true, // keep non-element VNodes (including anchors) as-is
    );
  }

  return root ?? h("div", {}, "", "fallback-root");
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
