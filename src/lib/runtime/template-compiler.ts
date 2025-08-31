import type { VNode } from "./types";
import { contextStack } from "./render";

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

export function parseProps(
  str: string,
  values: unknown[] = [],
  context: Record<string, any> = {}
): {
  props: Record<string, any>;
  attrs: Record<string, any>;
  directives: Record<string, { value: string; modifiers: string[] }>;
} {
  const props: Record<string, any> = {};
  const attrs: Record<string, any> = {};
  const directives: Record<string, { value: any; modifiers: string[] }> = {};

  // Match attributes with optional prefix and support for single/double quotes
  const attrRegex =
    /([:@#]?)([a-zA-Z0-9-:\.]+)=("([^"\\]*(\\.[^"\\]*)*)"|'([^'\\]*(\\.[^'\\]*)*)')/g;

  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(str))) {
    const prefix = match[1];
    const rawName = match[2];
    const rawVal = (match[4] || match[6]) ?? ""; // Extract value from either quote type

    // Interpolation detection
    const interpMatch = rawVal.match(/^{{(\d+)}}$/);
    let value: any = interpMatch
      ? values[Number(interpMatch[1])] ?? null
      : rawVal;

    // Type inference
    if (!interpMatch) {
      if (value === "true") value = true;
      else if (value === "false") value = false;
      else if (value === "null") value = null;
      else if (!isNaN(Number(value))) value = Number(value);
    }

    if (prefix === ":") {
      if (typeof value === "boolean") {
        attrs[rawName] = value;
      } else if (value !== undefined && value !== null) {
        if (typeof context[value] !== "undefined") {
          props[rawName] = context[value];
        } else {
          props[rawName] = value;
        }
      }
    } else if (prefix === "@") {
      const onName = "on" + rawName.charAt(0).toUpperCase() + rawName.slice(1);
      props[onName] =
        typeof value === "function"
          ? value
          : typeof context[value] === "function"
          ? context[value]
          : undefined;
    } else if (prefix === "#") {
      const [directiveName, ...modifierParts] = rawName.split(".");
      const modifiers = [...modifierParts];

      let finalValue = value;
      let finalModifiers = [...modifiers];

      if (
        directiveName === "model" &&
        typeof finalValue === "string" &&
        finalValue.includes(".")
      ) {
        const commonModifiers = ["trim", "number", "lazy"];
        const valueParts = finalValue.split(".");
        let actualValue = finalValue;
        const valueModifiers: string[] = [];

        for (let i = valueParts.length - 1; i > 0; i--) {
          if (commonModifiers.includes(valueParts[i])) {
            valueModifiers.unshift(valueParts[i]);
            actualValue = valueParts.slice(0, i).join(".");
          } else {
            break;
          }
        }

        finalValue = actualValue;
        finalModifiers.push(...valueModifiers);
      }

      directives[directiveName] = {
        value: finalValue,
        modifiers: finalModifiers,
      };
    } else if (rawName === "ref") {
      props.ref = value;
    } else {
      attrs[rawName] = value;
    }
  }

  return { props, attrs, directives };
}

/**
 * Internal implementation allowing an optional compile context for #model.
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
  // How this works:
  // const tagRegex =
  //   /<\/?([a-zA-Z0-9-]+)                            # tag name
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
  const tagRegex =
    /<\/?([a-zA-Z0-9-]+)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^\s>]+))?)*)\s*\/?>|{{(\d+)}}|([^<]+)/g;

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
    if (match[1]) {
      // Tag token
      const tagName = match[1];
      const isClosing = match[0][1] === "/";
      const isSelfClosing = match[0][match[0].length - 2] === "/" || voidElements.has(tagName);

      const {
        props: rawProps,
        attrs: rawAttrs,
        directives,
      } = parseProps(match[2] || "", values, effectiveContext);

      // Shape props into { props, attrs, directives } expected by VDOM
      const vnodeProps: {
        props: Record<string, unknown>;
        attrs: Record<string, unknown>;
        directives?: Record<string, { value: any, modifiers: string[] }>;
      } = { props: {}, attrs: {} };

      for (const k in rawProps) vnodeProps.props[k] = rawProps[k];
      for (const k in rawAttrs) vnodeProps.attrs[k] = rawAttrs[k];

      // Process built-in directives that should be converted to props/attrs
      for (const [directiveName, directive] of Object.entries(directives)) {
        if (directiveName === "bind") {
          // #bind directive - can be object syntax or simple value
          if (typeof directive.value === "object" && directive.value !== null) {
            for (const [key, value] of Object.entries(directive.value)) {
              if (typeof value === "boolean") {
                vnodeProps.attrs[key] = value;
              } else if (value != null) {
                vnodeProps.attrs[key] = String(value);
              }
            }
          } else if (directive.value != null) {
            vnodeProps.attrs[directiveName] = String(directive.value);
          }
        }
        // Always preserve #show, #class, #style in props.directives for root-level diagnostics
        if (["show", "class", "style"].includes(directiveName)) {
          if (!vnodeProps.directives) vnodeProps.directives = {};
          vnodeProps.directives[directiveName] = directive;
        }
        if (directiveName === "show") {
          const visible = Boolean(directive.value);
          vnodeProps.attrs.style =
            (vnodeProps.attrs.style || "") +
            (visible ? "" : "; display: none !important");
        } else if (directiveName === "class") {
          const classValue = directive.value;
          let classNames: string[] = [];
          if (typeof classValue === "string") {
            classNames = classValue.split(/\s+/).filter(Boolean);
          } else if (Array.isArray(classValue)) {
            for (const cls of classValue as any[]) {
              if (typeof cls === "string") {
                classNames.push(...cls.split(/\s+/).filter(Boolean));
              } else if (cls && typeof cls === "object") {
                for (const [className, condition] of Object.entries(cls)) {
                  if (condition) {
                    classNames.push(...className.split(/\s+/).filter(Boolean));
                  }
                }
              }
            }
          } else if (classValue && typeof classValue === "object") {
            for (const [className, condition] of Object.entries(classValue)) {
              if (condition) {
                classNames.push(...className.split(/\s+/).filter(Boolean));
              }
            }
          }
          const existingClass = (vnodeProps.attrs.class as string) || "";
          const newClasses = [
            ...new Set([
              ...existingClass.split(/\s+/).filter(Boolean),
              ...classNames,
            ]),
          ];
          vnodeProps.attrs.class = newClasses.join(" ");
        } else if (directiveName === "style") {
          const styleValue = directive.value;
          let styleString = "";
          if (typeof styleValue === "string") {
            styleString = styleValue;
          } else if (styleValue && typeof styleValue === "object") {
            const styleRules: string[] = [];
            for (const [property, value] of Object.entries(styleValue)) {
              if (value != null && value !== "") {
                const kebabProperty = property.replace(
                  /[A-Z]/g,
                  (match) => `-${match.toLowerCase()}`,
                );
                const needsPx = [
                  "width",
                  "height",
                  "top",
                  "right",
                  "bottom",
                  "left",
                  "margin",
                  "margin-top",
                  "margin-right",
                  "margin-bottom",
                  "margin-left",
                  "padding",
                  "padding-top",
                  "padding-right",
                  "padding-bottom",
                  "padding-left",
                  "font-size",
                  "line-height",
                  "border-width",
                  "border-radius",
                  "min-width",
                  "max-width",
                  "min-height",
                  "max-height",
                ];
                let cssValue = String(value);
                if (
                  typeof value === "number" &&
                  needsPx.includes(kebabProperty)
                ) {
                  cssValue = `${value}px`;
                }
                styleRules.push(`${kebabProperty}: ${cssValue}`);
              }
            }
            styleString =
              styleRules.join("; ") + (styleRules.length > 0 ? ";" : "");
          }
          const existingStyle = (vnodeProps.attrs.style as string) || "";
          vnodeProps.attrs.style =
            existingStyle +
            (existingStyle && !existingStyle.endsWith(";") ? "; " : "") +
            styleString;
        }
      }

      // Add remaining directives that need special handling by the VDOM renderer
      const remainingDirectives: Record<
        string,
        { value: any; modifiers: string[] }
      > = {};
      for (const [directiveName, directive] of Object.entries(directives)) {
        if (!["bind", "show", "class", "style"].includes(directiveName)) {
          remainingDirectives[directiveName] = directive;
        }
      }

      if (Object.keys(remainingDirectives).length > 0) {
        vnodeProps.directives = remainingDirectives;
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

  if (cleanedFragments.length === 1) {
    // Single non-empty root node
    return cleanedFragments[0];
  } else if (cleanedFragments.length > 1) {
    // True multi-root: return array
    return cleanedFragments;
  }

  // Fallback for empty content
  return h("div", {}, "", "fallback-root");
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
