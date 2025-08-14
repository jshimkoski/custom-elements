// ============================================================================
// VDOM
// ============================================================================

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
  // Get debug flag from parent custom element instance if available
  let debug = false;
  if (parent && parent instanceof Element && 'debug' in parent) {
    debug = (parent as Element & { debug?: boolean }).debug === true;
  }
  if (!parent || !(parent instanceof Element)) {
    if (debug) console.warn('[runtime] safeReplaceChild: parent is missing or not an Element', { parent, newChild, oldChild });
    return;
  }
  if (parent.contains(oldChild) && oldChild.parentNode === parent) {
    try {
      parent.replaceChild(newChild, oldChild);
    } catch (err) {
      if (debug) console.error('[runtime] safeReplaceChild: error replacing child', err, {
        parent,
        newChild,
        oldChild,
        parentHTML: (parent as Element).outerHTML,
        newChildHTML: (newChild as Element).outerHTML,
        oldChildHTML: (oldChild as Element).outerHTML
      });
    }
  } else {
    // Do NOT append newChild if oldChild is missing during patching
    if (debug) console.warn('[runtime] safeReplaceChild: attempted to replace missing child, skipping mutation', {
      parent,
      newChild,
      oldChild,
      parentChildren: Array.from(parent.childNodes).map(n => n.nodeName),
      parentHTML: (parent as Element).outerHTML,
      newChildHTML: (newChild as Element).outerHTML,
      oldChildHTML: (oldChild as Element).outerHTML
    });
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
  if ((window as any).DEBUG_VNODE_GEN) {
    console.log('[parseVNodeFromHTML] HTML:', html, 'Nodes:', nodes);
  }
  // If only one root node, return as before
  if (nodes.length === 1) {
    const vnode = createVNodeFromElement(nodes[0]);
    if ((window as any).DEBUG_VNODE_GEN) {
      console.log('[parseVNodeFromHTML] Single root VNode:', vnode);
    }
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
  if ((window as any).DEBUG_VNODE_GEN) {
    console.log('[parseVNodeFromHTML] Fragment VNode:', fragmentVNode);
  }
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
  // Debug log for VNode creation
  if ((window as any).DEBUG_VNODE_GEN) {
    console.log('[createVNodeFromElement] node:', node, 'parentPath:', parentPath, 'childIndex:', childIndex);
  }
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
      if ((window as any).DEBUG_FORM_VNODE) {
        console.log('[createVNodeFromElement] Controlled element:', {
          tagName,
          model,
          inputType,
          vnodeKey,
          props,
          valueAttr,
          checkedAttr,
          elem
        });
      }
    } else if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || elem.hasAttribute('contenteditable')) {
      vnodeKey = `${tagName}:${parentPath}:${childIndex}`;
      props['data-uid'] = vnodeKey;
      elem.setAttribute('data-uid', vnodeKey);
      if ((window as any).DEBUG_FORM_VNODE) {
        console.log('[createVNodeFromElement] Generic form element:', {
          tagName,
          vnodeKey,
          props,
          elem
        });
      }
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
    if ((window as any).DEBUG_FORM_VNODE) {
      console.log('[createVNodeFromElement] VNode created:', vnode);
    }
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
  // Debug: log input node identity and focus state before patching
  if ((window as any).DEBUG_FOCUS_TRACE && oldVNode.dom instanceof HTMLInputElement) {
    console.log('[patchVNode] BEFORE PATCH:', {
      key: oldVNode.key,
      value: oldVNode.dom.value,
      isFocused: document.activeElement === oldVNode.dom,
      selectionStart: oldVNode.dom.selectionStart,
      selectionEnd: oldVNode.dom.selectionEnd
    });
  }
  // Debug: log patchVNode for form elements
  if ((window as any).DEBUG_FORM_VNODE && (newVNode.type === 'input' || newVNode.type === 'select' || newVNode.type === 'textarea')) {
    console.log('[patchVNode] Controlled element:', {
      parent,
      oldVNode,
      newVNode,
      oldDom: oldVNode.dom,
      newDom: newVNode.dom
    });
  }
  // Debug log for patchVNode entry
  const debug = (parent as any)?.debug || (window as any).DEBUG_PATCH_VNODE;
  if (debug) {
    console.log('[patchVNode] Entry:', { parent, oldVNode, newVNode });
  }
  if (!oldVNode || !newVNode) return;

  // Focus/selection preservation for replaced input elements
  let restoreFocus: null | { selectionStart: number | null; selectionEnd: number | null; value: string; type: string; } = null;
  let hadFocus = false;
  if (oldVNode.dom instanceof HTMLInputElement && document.activeElement === oldVNode.dom) {
    restoreFocus = {
      selectionStart: oldVNode.dom.selectionStart,
      selectionEnd: oldVNode.dom.selectionEnd,
      value: oldVNode.dom.value,
      type: oldVNode.dom.type
    };
    hadFocus = true;
  }

  // Filter meaningful children
  function isMeaningfulVNode(v: VNode | undefined): v is VNode {
    return !!v && v.type !== '#whitespace' && !(v.type === '#text' && (!v.props?.nodeValue || /^\s*$/.test(v.props.nodeValue)));
  }
  const oldChildren: VNode[] = Array.isArray(oldVNode.children) ? oldVNode.children.filter(isMeaningfulVNode) : [];
  const newChildren: VNode[] = Array.isArray(newVNode.children) ? newVNode.children.filter(isMeaningfulVNode) : [];

  // Only replace node if type or key differ, NOT just because it's controlled
  const isControlled = newVNode.type === 'input' || newVNode.type === 'select' || newVNode.type === 'textarea';
  if (oldVNode.type !== newVNode.type || oldVNode.key !== newVNode.key) {
    if ((window as any).DEBUG_PATCH_VNODE) {
      console.warn('[patchVNode] REPLACING NODE:', {
        reason: 'type or key differ',
        oldType: oldVNode.type,
        newType: newVNode.type,
        oldKey: oldVNode.key,
        newKey: newVNode.key,
        isControlled
      });
    }
    const newDom = mountVNode(newVNode);
    if (newDom instanceof Node && oldVNode.dom instanceof Node && parent.contains(oldVNode.dom)) {
      safeReplaceChild(parent, newDom, oldVNode.dom);
      // Always sync value/checked for controlled elements
      if (isControlled && newDom instanceof HTMLElement && newVNode.props) {
        if ('value' in newVNode.props && 'value' in newDom) {
          (newDom as any).value = newVNode.props.value;
        }
        if ('checked' in newVNode.props && 'checked' in newDom) {
          (newDom as any).checked = newVNode.props.checked === true || newVNode.props.checked === 'true';
        }
      }
    } else if ((newDom as any) instanceof Node) {
      if (newDom) {
        parent.appendChild(newDom);
        newVNode.dom = newDom;
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
    if ((window as any).DEBUG_PATCH_VNODE) {
      console.log('[patchVNode] PATCHING CONTROLLED INPUT:', {
        oldVNode,
        newVNode,
        dom: oldVNode.dom
      });
    }
    // Patch value/checked/attributes in place, never replace node
    for (const [k, v] of Object.entries(newVNode.props)) {
      if (k === 'value' && 'value' in oldVNode.dom) {
        // Only patch value if not focused or dirty
        const inputEl = oldVNode.dom as HTMLInputElement;
        const isFocused = document.activeElement === inputEl;
        const isDirty = Boolean((inputEl as any)._isDirty);
        if (!isFocused && !isDirty && inputEl.value !== v) {
          inputEl.value = v as string;
        }
        inputEl.setAttribute('value', v as string);
        if ((window as any).DEBUG_FOCUS_TRACE) {
          console.log('[patchVNode] PATCH VALUE:', {
            key: oldVNode.key,
            value: inputEl.value,
            patchedValue: v,
            isFocused,
            isDirty
          });
        }
      } else if (k === 'checked' && 'checked' in oldVNode.dom) {
        (oldVNode.dom as any).checked = v === true || v === 'true';
        oldVNode.dom.setAttribute('checked', v ? 'true' : '');
      } else {
        oldVNode.dom.setAttribute(k, v as string);
      }
    }
    // Debug: log input node identity and focus state after patching
    if ((window as any).DEBUG_FOCUS_TRACE && oldVNode.dom instanceof HTMLInputElement) {
      console.log('[patchVNode] AFTER PATCH:', {
        key: oldVNode.key,
        value: oldVNode.dom.value,
        isFocused: document.activeElement === oldVNode.dom,
        selectionStart: oldVNode.dom.selectionStart,
        selectionEnd: oldVNode.dom.selectionEnd
      });
    }
    newVNode.dom = oldVNode.dom;
    // Patch children in place
    const oldChildren: VNode[] = Array.isArray(oldVNode.children) ? oldVNode.children : [];
    const newChildren: VNode[] = Array.isArray(newVNode.children) ? newVNode.children : [];
    for (let i = 0; i < Math.max(oldChildren.length, newChildren.length); i++) {
      if (oldChildren[i] && newChildren[i]) {
        patchVNode(oldVNode.dom, oldChildren[i], newChildren[i]);
      } else if (newChildren[i]) {
        const mounted = mountVNode(newChildren[i]);
        if (mounted) oldVNode.dom.appendChild(mounted);
        newChildren[i].dom = mounted as Element | Text | undefined;
      } else if (
        oldChildren[i] &&
        oldChildren[i].dom &&
        oldVNode.dom.contains(oldChildren[i].dom as Node)
      ) {
        oldVNode.dom.removeChild(oldChildren[i].dom as Node);
      }
    }
    return;
  }
  // For controlled elements, patch props and preserve node (React/Vue style)
  if (isControlled && oldVNode.dom instanceof HTMLElement && newVNode.props) {
    if ((window as any).DEBUG_PATCH_VNODE) {
      console.log('[patchVNode] PATCHING CONTROLLED INPUT:', {
        oldVNode,
        newVNode,
        dom: oldVNode.dom
      });
    }
    for (const [k, v] of Object.entries(newVNode.props)) {
      if (k === 'value' && 'value' in oldVNode.dom) {
        (oldVNode.dom as any).value = v;
        oldVNode.dom.setAttribute('value', v as string);
      } else if (k === 'checked' && 'checked' in oldVNode.dom) {
        (oldVNode.dom as any).checked = v === true || v === 'true';
        oldVNode.dom.setAttribute('checked', v ? 'true' : '');
      } else {
        oldVNode.dom.setAttribute(k, v as string);
      }
    }
    newVNode.dom = oldVNode.dom;
    // Do NOT restore focus/selection manually; let browser handle it
    // Continue to patch children below
  }
  // For controlled elements, patch props and preserve node
  if (isControlled && oldVNode.dom instanceof HTMLElement && newVNode.props) {
    if ((window as any).DEBUG_PATCH_VNODE) {
      console.log('[patchVNode] PATCHING CONTROLLED INPUT:', {
        oldVNode,
        newVNode,
        dom: oldVNode.dom
      });
    }
    for (const [k, v] of Object.entries(newVNode.props)) {
      if (k === 'value' && 'value' in oldVNode.dom) {
        (oldVNode.dom as any).value = v;
        oldVNode.dom.setAttribute('value', v as string);
      } else if (k === 'checked' && 'checked' in oldVNode.dom) {
        (oldVNode.dom as any).checked = v === true || v === 'true';
        oldVNode.dom.setAttribute('checked', v ? 'true' : '');
      } else {
        oldVNode.dom.setAttribute(k, v as string);
      }
    }
    newVNode.dom = oldVNode.dom;
    // Restore focus if needed
    if (
      restoreFocus &&
      oldVNode.dom &&
      oldVNode.dom instanceof HTMLInputElement &&
      oldVNode.dom.type === restoreFocus.type &&
      hadFocus
    ) {
      const inputEl = oldVNode.dom as HTMLInputElement;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          inputEl.focus();
          try {
            inputEl.selectionStart = restoreFocus.selectionStart;
            inputEl.selectionEnd = restoreFocus.selectionEnd;
          } catch {}
        });
      });
    }
    // Continue to patch children below
  }
  // For controlled elements, patch props and preserve node
  if (isControlled && oldVNode.dom instanceof HTMLElement && newVNode.props) {
    for (const [k, v] of Object.entries(newVNode.props)) {
      if (k === 'value' && 'value' in oldVNode.dom) {
        (oldVNode.dom as any).value = v;
        oldVNode.dom.setAttribute('value', v as string);
      } else if (k === 'checked' && 'checked' in oldVNode.dom) {
        (oldVNode.dom as any).checked = v === true || v === 'true';
        oldVNode.dom.setAttribute('checked', v ? 'true' : '');
      } else {
        oldVNode.dom.setAttribute(k, v as string);
      }
    }
    newVNode.dom = oldVNode.dom;
    // Restore focus if needed
    if (
      restoreFocus &&
      oldVNode.dom &&
      oldVNode.dom instanceof HTMLInputElement &&
      oldVNode.dom.type === restoreFocus.type &&
      hadFocus
    ) {
      const inputEl = oldVNode.dom as HTMLInputElement;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          inputEl.focus();
          try {
            inputEl.selectionStart = restoreFocus.selectionStart;
            inputEl.selectionEnd = restoreFocus.selectionEnd;
          } catch {}
        });
      });
    }
    // Continue to patch children below
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