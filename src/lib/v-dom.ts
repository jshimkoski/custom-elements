/**
 * Utility: Generate a stable key for a VNode
 */
export function getVNodeKey(type: string, parentPath: string, childIndex: number, model?: string, value?: string): string {
  // Always include parentPath and childIndex for uniqueness
  if (model && value) return `${parentPath}.${type}[${childIndex}]:${model}:${value}`;
  if (model) return `${parentPath}.${type}[${childIndex}]:${model}`;
  return `${parentPath}.${type}[${childIndex}]`;
}

/**
 * Virtual Node (VNode) structure for incremental migration
 */
export interface VNode {
  type: string; // tag name or '#text'
  key?: string;
  props: Record<string, any>;
  children: VNode[];
  dom?: Element | Text;
}

/**
 * Safely replaces a child node, guarding against NotFoundError and out-of-sync trees.
 * Falls back to appendChild if oldChild is not present.
 * Logs mutation for debugging if enabled.
 * @param parent - Parent node
 * @param newChild - New node to insert
 * @param oldChild - Old node to replace
 */
export function safeReplaceChild(parent: Node | null, newChild: Node, oldChild: Node): void {
  if (!parent || !(parent instanceof Element)) {
    return;
  }
  if (parent.contains(oldChild) && oldChild.parentNode === parent) {
    try {
      parent.replaceChild(newChild, oldChild);
    } catch (err) {
      console.error('[VDOM] safeReplaceChild: error replacing child', err, {
        parent,
        newChild,
        oldChild,
        parentHTML: (parent as Element).outerHTML,
        newChildHTML: (newChild as Element).outerHTML,
        oldChildHTML: (oldChild as Element).outerHTML
      });
    }
  }
}

/**
 * Mounts a VNode to the DOM and returns the created node.
 * Handles text, fragment, and element nodes.
 * @param vnode - Virtual node to mount
 * @returns DOM node or null
 */
export function mountVNode(vnode: VNode): Element | Text | null {
  if (vnode.type === '#whitespace') {
    return null;
  }
  if (vnode.type === '#text') {
    const textNode = document.createTextNode(vnode.props.nodeValue ?? '');
    vnode.dom = textNode;
    return textNode;
  }
  const el = document.createElement(vnode.type);
  for (const [k, v] of Object.entries(vnode.props)) {
    if (k === 'value' && el instanceof HTMLInputElement) {
      if (el.type === 'radio') {
        // Always set value attribute for radios, never assign to property
        el.setAttribute('value', v as string);
      } else if (el.type === 'checkbox') {
        // Always set value property and attribute for checkboxes
        el.value = v as string;
        el.setAttribute('value', v as string);
      } else {
        el.value = v as string;
        el.setAttribute('value', v as string);
      }
    } else {
      el.setAttribute(k, v as string);
    }
  }
  vnode.dom = el;
  for (const child of vnode.children) {
    const childNode = mountVNode(child);
    if (childNode) el.appendChild(childNode);
  }
  return el;
}

/**
 * Parses an HTML string into a VNode tree.
 * Supports basic tags, attributes, text, and key/data-model.
 * @param html - HTML string
 * @returns VNode tree
 */
export function parseVNodeFromHTML(html: string): VNode {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const nodes = Array.from(template.content.childNodes);
  // If only one root node, return as before
  if (nodes.length === 1) {
    const vnode = createVNodeFromElement(nodes[0]);
    return vnode;
  }
  // If multiple root nodes, create a fragment VNode
  const fragmentVNode = {
    type: '#fragment',
    key: undefined,
    props: {},
    children: nodes.map((node, idx) => createVNodeFromElement(node, '#fragment', idx)),
    dom: undefined
  };
  return fragmentVNode;
}

/**
 * Creates a VNode from a DOM ChildNode (Element or Text).
 * Assigns a stable, deterministic key for VDOM reconciliation.
 * @param node - DOM node
 * @param parentPath - Path for key generation
 * @param childIndex - Index for key generation
 * @returns VNode
 */
export function createVNodeFromElement(node: ChildNode, parentPath: string = '', childIndex: number = 0): VNode {
  if (!node) {
    // Guard: skip undefined/null nodes
    return { type: '#unknown', key: undefined, props: {}, children: [], dom: undefined };
  }
  if (node.nodeType === Node.TEXT_NODE) {
    // Ignore pure whitespace text nodes
    if (!node.nodeValue || /^\s*$/.test(node.nodeValue)) {
      return { type: '#whitespace', key: undefined, props: {}, children: [], dom: undefined };
    }
    return { type: '#text', key: getVNodeKey('#text', parentPath, childIndex), props: { nodeValue: node.nodeValue }, children: [], dom: node as Text };
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const elem = node as Element;
    const props: Record<string, any> = {};
    Array.from(elem.attributes).forEach(attr => {
      props[attr.name] = attr.value;
    });
    const tagName = elem.tagName.toLowerCase();
    let vnodeKey: string | undefined = undefined;
    // --- Stable key for controlled inputs ---
    if ((tagName === 'input' || tagName === 'select' || tagName === 'textarea') && elem.hasAttribute('data-model')) {
      const model = elem.getAttribute('data-model')!;
      const inputType = elem.getAttribute('type') ?? '';
      // Use model+type as key, ignore parentPath/childIndex for stability
      vnodeKey = `${tagName}:${model}:${inputType}`;
      props['data-uid'] = vnodeKey;
      elem.setAttribute('data-uid', vnodeKey);
      let valueAttr = elem.getAttribute('value');
      let checkedAttr = elem.getAttribute('checked');
      if (valueAttr) props['value'] = valueAttr;
      if (checkedAttr) props['checked'] = checkedAttr;
    } else if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || elem.hasAttribute('contenteditable')) {
      vnodeKey = `${tagName}:${parentPath}:${childIndex}`;
      props['data-uid'] = vnodeKey;
      elem.setAttribute('data-uid', vnodeKey);
    } else {
      vnodeKey = getVNodeKey(tagName, parentPath, childIndex);
      if (tagName === 'li') {
        props['data-uid'] = vnodeKey;
        elem.setAttribute('data-uid', vnodeKey);
      }
    }
    const children: VNode[] = Array.from(elem.childNodes).map((child, idx) => createVNodeFromElement(child, vnodeKey!, idx));
    const vnode = {
      type: tagName,
      key: vnodeKey,
      props,
      children,
      dom: elem
    };
    return vnode;
  }
  // Fallback for unsupported node types
  return { type: '#unknown', key: undefined, props: {}, children: [], dom: undefined };
}

/**
 * Patches two VNodes and updates the DOM, preserving controlled inputs.
 * Handles keyed and index-based reconciliation.
 * @param parent - Parent DOM element
 * @param oldVNode - Previous VNode
 * @param newVNode - New VNode
 */
export function patchVNode(parent: Element, oldVNode: VNode, newVNode: VNode): void {
  if (!oldVNode || !newVNode) return;

  // Filter meaningful children
  function isMeaningfulVNode(v: VNode | undefined): v is VNode {
    return !!v && v.type !== '#whitespace' && !(v.type === '#text' && (!v.props?.nodeValue || /^\s*$/.test(v.props.nodeValue)));
  }
  const oldChildren: VNode[] = Array.isArray(oldVNode.children) ? oldVNode.children.filter(isMeaningfulVNode) : [];
  const newChildren: VNode[] = Array.isArray(newVNode.children) ? newVNode.children.filter(isMeaningfulVNode) : [];

  // Only replace node if type or key differ, NOT just because it's controlled
  const isControlled = newVNode.type === 'input' || newVNode.type === 'select' || newVNode.type === 'textarea';
  if (oldVNode.type !== newVNode.type || oldVNode.key !== newVNode.key) {
    const newDom = mountVNode(newVNode);
    if (newDom instanceof Node && oldVNode.dom instanceof Node && parent.contains(oldVNode.dom)) {
      safeReplaceChild(parent, newDom, oldVNode.dom);
      // React/Vue: set value/checked only on the newly inserted node
      if (isControlled && newVNode.props && parent.firstChild instanceof HTMLInputElement) {
        const inputEl = parent.firstChild as HTMLInputElement;
        if (inputEl.type === 'radio') {
          inputEl.value = newVNode.props.value;
          inputEl.setAttribute('value', newVNode.props.value);
        } else if (inputEl.type === 'checkbox') {
          inputEl.value = newVNode.props.value;
          inputEl.setAttribute('value', newVNode.props.value);
        } else {
          inputEl.value = newVNode.props.value;
          inputEl.setAttribute('value', newVNode.props.value);
        }
        if ('checked' in newVNode.props) {
          inputEl.checked = newVNode.props.checked === true || newVNode.props.checked === 'true';
        }
      }
    } else if ((newDom as any) instanceof Node) {
      if (newDom) {
        parent.appendChild(newDom);
        newVNode.dom = newDom;
        // React/Vue: set value/checked only on the newly inserted node
        if (isControlled && newVNode.props && parent.firstChild instanceof HTMLInputElement) {
          const inputEl = parent.firstChild as HTMLInputElement;
          if (inputEl.type === 'radio') {
            inputEl.setAttribute('value', newVNode.props.value);
          } else if (inputEl.type === 'checkbox') {
            inputEl.value = newVNode.props.value;
            inputEl.setAttribute('value', newVNode.props.value);
          } else {
            inputEl.value = newVNode.props.value;
            inputEl.setAttribute('value', newVNode.props.value);
          }
          if ('checked' in newVNode.props) {
            inputEl.checked = newVNode.props.checked === true || newVNode.props.checked === 'true';
          }
        }
      } else {
        newVNode.dom = undefined;
      }
    } else {
      newVNode.dom = undefined;
    }
    return;
  }
  // For controlled elements, patch props and preserve node (React/Vue style)
  if (isControlled && oldVNode.dom instanceof HTMLElement && newVNode.props) {
    // Update value/checked on all possible DOM references for compatibility
    for (const [k, v] of Object.entries(newVNode.props)) {
      if (k === 'value' && parent.firstChild instanceof HTMLInputElement) {
        (parent.firstChild as HTMLInputElement).value = v as string;
      } else if (k === 'checked' && parent.firstChild instanceof HTMLInputElement) {
        (parent.firstChild as HTMLInputElement).checked = v === true || v === 'true';
      } else if (k in oldVNode.dom) {
        try { (oldVNode.dom as any)[k] = v; } catch {}
      } else {
        oldVNode.dom.setAttribute(k, v as string);
      }
    }
    // Orphan removal block: remove extra oldChildren
    for (let i = newVNode.children.length; i < oldChildren.length; i++) {
      if (
        oldChildren[i] &&
        oldChildren[i].dom &&
        oldVNode.dom && oldVNode.dom.contains(oldChildren[i].dom as Node)
      ) {
        oldVNode.dom.removeChild(oldChildren[i].dom as Node);
      }
    }
    return;
  }

  // Patch props for Element
  const oldDom = oldVNode.dom;
  if (oldDom && oldDom instanceof Element && newVNode.props) {
    const inputType = oldDom.tagName.toLowerCase() === 'input' ? oldDom.getAttribute('type') : undefined;
    const isCustomElement = oldDom.tagName.includes('-');
    for (const [k, v] of Object.entries(newVNode.props)) {
      if (inputType === 'radio' && k === 'value') continue;
      if (inputType === 'checkbox' && k === 'value') {
        oldDom.setAttribute('value', v as string);
        continue;
      }
      oldDom.setAttribute(k, v as string);
    }
    if (isCustomElement) {
      for (const [k, v] of Object.entries(newVNode.props)) {
        oldDom.setAttribute(k, v as string);
      }
    }
    for (const k of Array.from(oldDom.attributes).map(a => a.name)) {
      if (!(k in newVNode.props)) {
        if (inputType === 'radio' && k === 'value') continue;
        if (inputType === 'checkbox' && k === 'value') continue;
        oldDom.removeAttribute(k);
      }
    }
  }

  // Patch text node: always update nodeValue for text nodes
  if (newVNode.type === '#text') {
    if (oldDom && oldDom.nodeType === Node.TEXT_NODE) {
      if ((oldDom as Text).nodeValue !== newVNode.props.nodeValue) {
        (oldDom as Text).nodeValue = newVNode.props.nodeValue;
      }
      newVNode.dom = oldDom;
    } else {
      const newTextNode = document.createTextNode(newVNode.props.nodeValue ?? '');
      if (oldDom && parent.contains(oldDom) && oldDom.parentNode === parent) {
        safeReplaceChild(parent, newTextNode, oldDom);
      } else {
        parent.appendChild(newTextNode);
      }
      newVNode.dom = newTextNode;
    }
    return;
  }

  // Strict keyed reconciliation for children
  if (oldDom instanceof Element) {
    // Build key maps for fast lookup
    const oldKeyMap = new Map<string, VNode>();
    oldChildren.forEach(child => child.key && oldKeyMap.set(child.key, child));
    const newKeySet = new Set(newChildren.map(child => child.key));

    // Patch or insert new children in order
    let domOrder: Node[] = [];
    for (let i = 0; i < newChildren.length; i++) {
      const newChild = newChildren[i];
      const oldChild = newChild.key ? oldKeyMap.get(newChild.key!) : oldChildren[i];
      let newDom: Node | undefined;
      // Always replace controlled form elements if key or type changes
      const isControlled = newChild.type === 'input' || newChild.type === 'select' || newChild.type === 'textarea';
      if (oldChild && oldChild.dom && (!isControlled || (oldChild.type === newChild.type && oldChild.key === newChild.key))) {
        patchVNode(oldDom, oldChild, newChild);
        newDom = oldChild.dom as Node;
      } else {
        const mounted = mountVNode(newChild);
        newDom = mounted instanceof Node ? mounted : undefined;
        if (newDom) {
          // Prevent inserting a parent into its own child (HierarchyRequestError)
          if ((newDom instanceof Element || newDom instanceof Node) && newDom.contains(oldDom)) {
            // Debug output for parent-child cycle detection
            console.error('[VDOM] Attempted to insert a parent into its own child:', {
              parentTag: (oldDom as Element).tagName,
              childTag: (newDom as Element).tagName,
              parentUid: (oldDom as Element).getAttribute?.('data-uid'),
              childUid: (newDom as Element).getAttribute?.('data-uid'),
              parent: oldDom,
              child: newDom
            });
            throw new Error('VDOM patch error: Attempted to insert a parent into its own child');
          }
          oldDom.insertBefore(newDom, oldDom.childNodes[i] || null);
        }
      }
      newChild.dom = newDom as Element | Text | undefined;
      if (newDom) domOrder.push(newDom);
    }

    // Remove all old children not present in new children (by key)
    oldChildren.forEach(child => {
      if (!newKeySet.has(child.key) && child.dom && oldDom.contains(child.dom)) {
        oldDom.removeChild(child.dom);
      }
    });

    // Remove any extra DOM nodes beyond newChildren length
    while (oldDom.childNodes.length > newChildren.length) {
      oldDom.removeChild(oldDom.lastChild!);
    }

    // Ensure DOM order matches newChildren
    for (let i = 0; i < domOrder.length; i++) {
      if (oldDom.childNodes[i] !== domOrder[i]) {
        // Prevent inserting a parent into its own child (HierarchyRequestError)
        if ((domOrder[i] instanceof Element || domOrder[i] instanceof Node) && domOrder[i].contains(oldDom)) {
          throw new Error('VDOM patch error: Attempted to insert a parent into its own child');
        }
        oldDom.insertBefore(domOrder[i], oldDom.childNodes[i] || null);
      }
    }

    newVNode.dom = oldDom;

    // Final orphan node sweep: remove any child nodes not present in newChildren keys
    const newKeys = new Set(newChildren.map(c => c.key));
    Array.from(oldDom.childNodes).forEach((node, idx) => {
      const key = (node as Element).getAttribute?.('data-uid');
      // Remove if key is not present, or if index exceeds newChildren length
      if ((key && !newKeys.has(key)) || idx >= newChildren.length) {
        oldDom.removeChild(node);
      }
    });
  }
}