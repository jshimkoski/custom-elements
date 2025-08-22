/**
 * vdom-v2.ts
 * Lightweight, strongly typed, functional virtual DOM renderer for custom elements.
 * Features: keyed diffing, incremental patching, focus/caret preservation, event delegation, SSR-friendly, no dependencies.
 */

export interface VNode {
  tag: string;
  key?: string;
  props?: { key?: string; props?: any; attrs?: Record<string, any> };
  children?: VNode[] | string;
}

export interface AnchorBlockVNode extends VNode {
  tag: "#anchor";
  key: string;
  children: VNode[];
  _startNode?: Comment;
  _endNode?: Comment;
}

function assignKeysDeep(
  nodeOrNodes: VNode | VNode[],
  baseKey: string,
): VNode | VNode[] {
  if (Array.isArray(nodeOrNodes)) {
    const usedKeys = new Set<string>();

    return nodeOrNodes.map((child) => {
      if (!child || typeof child !== "object") return child;

      // Determine the starting key
      let key = child.props?.key ?? child.key;

      if (!key) {
        // Build a stable identity from tag + stable attributes
        const tagPart = child.tag || "node";
        const idPart =
          child.props?.attrs?.id ??
          child.props?.attrs?.name ??
          child.props?.attrs?.["data-key"] ??
          "";
        key = idPart
          ? `${baseKey}:${tagPart}:${idPart}`
          : `${baseKey}:${tagPart}`;
      }

      // Ensure uniqueness among siblings
      let uniqueKey = key;
      let counter = 1;
      while (usedKeys.has(uniqueKey)) {
        uniqueKey = `${key}#${counter++}`;
      }
      usedKeys.add(uniqueKey);

      // Recurse into children with this node's unique key
      let children = child.children;
      if (Array.isArray(children)) {
        children = assignKeysDeep(children, uniqueKey) as VNode[];
      }

      return { ...child, key: uniqueKey, children };
    });
  }

  // Single node case
  const node = nodeOrNodes as VNode;
  let key = node.props?.key ?? node.key ?? baseKey;

  let children = node.children;
  if (Array.isArray(children)) {
    children = assignKeysDeep(children, key) as VNode[];
  }

  return { ...node, key, children };
}

/**
 * Patch props on an element.
 * Only update changed props, remove old, add new.
 */
function patchProps(
  el: HTMLElement,
  oldProps: Record<string, any>,
  newProps: Record<string, any>,
) {
  const oldPropProps = oldProps.props ?? {};
  const newPropProps = newProps.props ?? {};
  for (const key in { ...oldPropProps, ...newPropProps }) {
    const oldVal = oldPropProps[key];
    const newVal = newPropProps[key];
    if (oldVal !== newVal) {
      if (
        key === "value" &&
        (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
      ) {
        if (el.value !== newVal) el.value = newVal ?? "";
      } else if (key === "checked" && el instanceof HTMLInputElement) {
        el.checked = !!newVal;
      } else if (key.startsWith("on") && typeof newVal === "function") {
        if (typeof oldVal === "function")
          el.removeEventListener(key.slice(2).toLowerCase(), oldVal);
        el.addEventListener(key.slice(2).toLowerCase(), newVal);
      } else if (newVal === undefined || newVal === null) {
        el.removeAttribute(key);
      } else {
        el.setAttribute(key, String(newVal));
      }
    }
  }
  const oldAttrs = oldProps.attrs ?? {};
  const newAttrs = newProps.attrs ?? {};
  for (const key in { ...oldAttrs, ...newAttrs }) {
    const oldVal = oldAttrs[key];
    const newVal = newAttrs[key];
    if (oldVal !== newVal) {
      if (newVal === undefined || newVal === null) el.removeAttribute(key);
      else el.setAttribute(key, String(newVal));
    }
  }
}

function createElement(vnode: VNode | string): Node {
  // String VNode → plain text node (no key)
  if (typeof vnode === "string") {
    return document.createTextNode(vnode);
  }

  // Text VNode
  if (vnode.tag === "#text") {
    const textNode = document.createTextNode(
      typeof vnode.children === "string" ? vnode.children : "",
    );
    if (vnode.key != null) (textNode as any).key = vnode.key; // attach key
    return textNode;
  }

  // Anchor block VNode - ALWAYS create start/end boundaries
  if (vnode.tag === "#anchor") {
    const anchorVNode = vnode as AnchorBlockVNode;
    const children = Array.isArray(anchorVNode.children)
      ? anchorVNode.children
      : [];

    // Always create start/end markers for stable boundaries
    const start = document.createTextNode("");
    const end = document.createTextNode("");

    if (anchorVNode.key != null) {
      (start as any).key = `${anchorVNode.key}:start`;
      (end as any).key = `${anchorVNode.key}:end`;
    }
    anchorVNode._startNode = start;
    anchorVNode._endNode = end;

    const frag = document.createDocumentFragment();
    frag.appendChild(start);
    for (const child of children) {
      frag.appendChild(createElement(child));
    }
    frag.appendChild(end);
    return frag;
  }

  // Standard element VNode
  const el = document.createElement(vnode.tag);
  if (vnode.key != null) (el as any).key = vnode.key; // attach key

  const { props = {}, attrs = {} } = vnode.props ?? {};

  // Set attributes
  for (const key in attrs) {
    el.setAttribute(key, String(attrs[key]));
  }

  // Set props and event listeners
  for (const key in props) {
    const val = props[key];
    if (
      key === "value" &&
      (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
    ) {
      el.value = val ?? "";
    } else if (key === "checked" && el instanceof HTMLInputElement) {
      el.checked = !!val;
    } else if (key.startsWith("on") && typeof val === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), val);
    } else if (key.startsWith("on") && val === undefined) {
      continue; // skip undefined event handlers
    } else {
      el.setAttribute(key, String(val));
    }
  }

  // Append children
  if (Array.isArray(vnode.children)) {
    for (const child of vnode.children) {
      el.appendChild(createElement(child));
    }
  } else if (typeof vnode.children === "string") {
    el.textContent = vnode.children;
  }

  return el;
}

/**
 * Patch children using keys for node matching.
 */
function patchChildren(
  parent: HTMLElement,
  oldChildren: VNode[] | string | undefined,
  newChildren: VNode[] | string | undefined,
) {
  if (typeof newChildren === "string") {
    if (parent.textContent !== newChildren) parent.textContent = newChildren;
    return;
  }
  if (!Array.isArray(newChildren)) return;

  const oldNodes = Array.from(parent.childNodes);
  const oldVNodes: VNode[] = Array.isArray(oldChildren) ? oldChildren : [];

  // Map old VNodes by key
  const oldVNodeByKey = new Map<string | number, VNode>();
  for (const v of oldVNodes) {
    if (v && v.key != null) oldVNodeByKey.set(v.key, v);
  }

  // Map DOM nodes by key (elements, text, anchors)
  const oldNodeByKey = new Map<string | number, Node>();

  // Scan DOM for keyed nodes including anchor boundaries
  for (const node of oldNodes) {
    const k = (node as any).key;
    if (k != null) {
      oldNodeByKey.set(k, node);
    }
  }

  const usedNodes = new Set<Node>();
  let nextSibling: Node | null = parent.firstChild;

  function markRangeUsed(start: Comment, end?: Comment) {
    let cur: Node | null = start;
    while (cur) {
      usedNodes.add(cur);
      if (cur === end) break;
      cur = cur.nextSibling;
    }
  }

  // --- Integrated patchChildrenBetween ---
  function patchChildrenBetween(
    start: Comment,
    end: Comment,
    oldChildren: VNode[] | undefined,
    newChildren: VNode[],
  ) {
    const oldNodesInRange: Node[] = [];
    let cur: Node | null = start.nextSibling;
    while (cur && cur !== end) {
      oldNodesInRange.push(cur);
      cur = cur.nextSibling;
    }

    const oldVNodesInRange: VNode[] = Array.isArray(oldChildren)
      ? oldChildren
      : [];
    const hasKeys =
      newChildren.some((c) => c && c.key != null) ||
      oldVNodesInRange.some((c) => c && c.key != null);

    if (hasKeys) {
      // Keyed diff
      const oldVNodeByKeyRange = new Map<string | number, VNode>();
      const oldNodeByKeyRange = new Map<string | number, Node>();

      for (const v of oldVNodesInRange) {
        if (v && v.key != null) oldVNodeByKeyRange.set(v.key, v);
      }
      for (const node of oldNodesInRange) {
        const k = (node as any).key;
        if (k != null) oldNodeByKeyRange.set(k, node);
      }

      const usedInRange = new Set<Node>();
      let next: Node | null = start.nextSibling;

      for (const newVNode of newChildren) {
        let node: Node;
        if (newVNode.key != null && oldNodeByKeyRange.has(newVNode.key)) {
          const oldVNode = oldVNodeByKeyRange.get(newVNode.key)!;
          node = patch(
            oldNodeByKeyRange.get(newVNode.key)!,
            oldVNode,
            newVNode,
          );
          usedInRange.add(node);
          if (node !== next && parent.contains(node)) {
            parent.insertBefore(node, next);
          }
        } else {
          node = createElement(newVNode);
          parent.insertBefore(node, next);
          usedInRange.add(node);
        }
        next = node.nextSibling;
      }

      // Remove unused
      for (const node of oldNodesInRange) {
        if (!usedInRange.has(node) && parent.contains(node)) {
          parent.removeChild(node);
        }
      }
    } else {
      // Keyless fallback: index-based patch
      const commonLength = Math.min(
        oldVNodesInRange.length,
        newChildren.length,
      );

      for (let i = 0; i < commonLength; i++) {
        const oldVNode = oldVNodesInRange[i];
        const newVNode = newChildren[i];
        const node = patch(oldNodesInRange[i], oldVNode, newVNode);
        if (node !== oldNodesInRange[i]) {
          parent.insertBefore(node, oldNodesInRange[i]);
          parent.removeChild(oldNodesInRange[i]);
        }
      }

      // Add extra new
      for (let i = commonLength; i < newChildren.length; i++) {
        parent.insertBefore(createElement(newChildren[i]), end);
      }

      // Remove extra old
      for (let i = commonLength; i < oldNodesInRange.length; i++) {
        parent.removeChild(oldNodesInRange[i]);
      }
    }
  }
  // --- End integrated patchChildrenBetween ---

  for (const newVNode of newChildren) {
    let node: Node;

    // Handle AnchorBlocks
    if (newVNode.tag === "#anchor") {
      const aKey = newVNode.key!;
      const startKey = `${aKey}:start`;
      const endKey = `${aKey}:end`;

      let start = oldNodeByKey.get(startKey) as Node;
      let end = oldNodeByKey.get(endKey) as Node;
      const children = Array.isArray(newVNode.children)
        ? newVNode.children
        : [];

      // Create boundaries if they don't exist
      if (!start) {
        start = document.createTextNode("");
        (start as any).key = startKey;
      }
      if (!end) {
        end = document.createTextNode("");
        (end as any).key = endKey;
      }

      // Preserve anchor references on the new VNode
      (newVNode as AnchorBlockVNode)._startNode = start;
      (newVNode as AnchorBlockVNode)._endNode = end;

      // If boundaries aren't in DOM, insert the whole fragment
      if (!parent.contains(start) || !parent.contains(end)) {
        parent.insertBefore(start, nextSibling);
        for (const child of children) {
          parent.insertBefore(createElement(child), nextSibling);
        }
        parent.insertBefore(end, nextSibling);
      } else {
        // Patch children between existing boundaries
        patchChildrenBetween(
          start as Comment,
          end as Comment,
          (oldVNodeByKey.get(aKey) as VNode)?.children as VNode[] | undefined,
          children,
        );
      }

      markRangeUsed(start, end);
      nextSibling = end.nextSibling;
      continue;
    }

    // Normal keyed element/text
    if (newVNode.key != null && oldNodeByKey.has(newVNode.key)) {
      const oldVNode = oldVNodeByKey.get(newVNode.key)!;
      node = patch(oldNodeByKey.get(newVNode.key)!, oldVNode, newVNode);
      usedNodes.add(node);
      if (node !== nextSibling && parent.contains(node)) {
        if (nextSibling && !parent.contains(nextSibling)) nextSibling = null;
        parent.insertBefore(node, nextSibling);
      }
    } else {
      node = createElement(newVNode);
      if (nextSibling && !parent.contains(nextSibling)) nextSibling = null;
      parent.insertBefore(node, nextSibling);
      usedNodes.add(node);
    }

    nextSibling = node.nextSibling;
  }

  // Remove unused nodes
  for (const node of oldNodes) {
    if (!usedNodes.has(node) && parent.contains(node)) {
      parent.removeChild(node);
    }
  }
}

/**
 * Patch a node using keys for node matching.
 */
function patch(
  dom: Node,
  oldVNode: VNode | string | null,
  newVNode: VNode | string | null,
): Node {
  if (oldVNode === newVNode) return dom;

  if (typeof newVNode === "string") {
    if (dom.nodeType === Node.TEXT_NODE) {
      if (dom.textContent !== newVNode) dom.textContent = newVNode;
      return dom;
    } else {
      const textNode = document.createTextNode(newVNode);
      dom.parentNode?.replaceChild(textNode, dom);
      return textNode;
    }
  }

  if (newVNode && typeof newVNode !== "string" && newVNode.tag === "#anchor") {
    const anchorVNode = newVNode as AnchorBlockVNode;
    const children = Array.isArray(anchorVNode.children)
      ? anchorVNode.children
      : [];

    const start = anchorVNode._startNode ?? document.createTextNode("");
    const end = anchorVNode._endNode ?? document.createTextNode("");

    if (anchorVNode.key != null) {
      (start as any).key = `${anchorVNode.key}:start`;
      (end as any).key = `${anchorVNode.key}:end`;
    }

    anchorVNode._startNode = start;
    anchorVNode._endNode = end;

    const frag = document.createDocumentFragment();
    frag.appendChild(start);
    for (const child of children) {
      frag.appendChild(createElement(child));
    }
    frag.appendChild(end);
    dom.parentNode?.replaceChild(frag, dom);
    return start;
  }

  if (!newVNode) {
    const placeholder = document.createComment("removed");
    dom.parentNode?.replaceChild(placeholder, dom);
    return placeholder;
  }

  if (!oldVNode || typeof oldVNode === "string") {
    const newEl = createElement(newVNode);
    dom.parentNode?.replaceChild(newEl, dom);
    return newEl;
  }

  if (newVNode.tag === "#anchor") {
    const children = Array.isArray(newVNode.children) ? newVNode.children : [];
    const start = (newVNode as any)._startNode ?? document.createTextNode("");
    const end = (newVNode as any)._endNode ?? document.createTextNode("");

    if (newVNode.key != null) {
      (start as any).key = `${newVNode.key}:start`;
      (end as any).key = `${newVNode.key}:end`;
    }

    (newVNode as any)._startNode = start;
    (newVNode as any)._endNode = end;

    const frag = document.createDocumentFragment();
    frag.appendChild(start);
    for (const child of children) {
      frag.appendChild(createElement(child));
    }
    frag.appendChild(end);
    dom.parentNode?.replaceChild(frag, dom);
    return start;
  }

  if (
    typeof oldVNode !== "string" &&
    typeof newVNode !== "string" &&
    oldVNode.tag === newVNode.tag &&
    oldVNode.key === newVNode.key
  ) {
    const el = dom as HTMLElement;
    patchProps(el, oldVNode.props || {}, newVNode.props || {});
    patchChildren(el, oldVNode.children, newVNode.children);
    return el;
  }

  const newEl = createElement(newVNode);
  dom.parentNode?.replaceChild(newEl, dom);
  return newEl;
}

/**
 * Main renderer: uses patching and keys for node reuse.
 * Never uses innerHTML. Only updates what has changed.
 */
export function vdomRenderer(root: ShadowRoot, vnodeOrArray: VNode | VNode[]) {
  const wrap = (v: VNode): VNode =>
    v.key == null ? { ...v, key: "__root__" } : v;
  let newVNode = Array.isArray(vnodeOrArray)
    ? { tag: "div", key: "__root__", children: vnodeOrArray }
    : wrap(vnodeOrArray);

  newVNode = assignKeysDeep(newVNode, String(newVNode.key ?? "root")) as VNode;

  console.log("[vdomRenderer] newVNode:", newVNode);

  // Track previous VNode and DOM node
  const prevVNode: VNode | null = (root as any)._prevVNode ?? null;
  const prevDom: Node | null =
    (root as any)._prevDom ?? root.firstChild ?? null;

  let newDom: Node;

  if (prevVNode && prevDom) {
    // Only replace if tag or key changed
    if (
      typeof prevVNode !== "string" &&
      typeof newVNode !== "string" &&
      prevVNode.tag === newVNode.tag &&
      prevVNode.key === newVNode.key
    ) {
      newDom = patch(prevDom, prevVNode, newVNode);
    } else {
      newDom = createElement(newVNode);
      root.replaceChild(newDom, prevDom);
    }
  } else {
    newDom = createElement(newVNode);
    if (root.firstChild) root.replaceChild(newDom, root.firstChild);
    else root.appendChild(newDom);
  }

  // Remove any extra nodes
  while (root.childNodes.length > 1) root.removeChild(root.childNodes[0]);

  // Update tracked VNode and DOM node
  (root as any)._prevVNode = newVNode;
  (root as any)._prevDom = newDom;
}

/**
 * SSR-friendly: serialize VNode to HTML string.
 */
export function renderToString(vnode: VNode): string {
  if (typeof vnode === "string") return vnode;

  if (vnode.tag === "#text") {
    return typeof vnode.children === "string" ? vnode.children : "";
  }

  if (vnode.tag === "#anchor") {
    const children = Array.isArray(vnode.children) ? vnode.children : [];
    return children.map(renderToString).join("");
  }

  const props = vnode.props
    ? Object.entries(vnode.props)
        .map(([k, v]) => ` ${k}="${v}"`)
        .join("")
    : "";
  const children = Array.isArray(vnode.children)
    ? vnode.children.map(renderToString).join("")
    : vnode.children || "";
  return `<${vnode.tag}${props}>${children}</${vnode.tag}>`;
}
