// ============================================================================
// PERFORMANCE OPTIMIZATIONS
// ============================================================================

// Efficient string template cache
export const htmlParseCache = new Map<string, DocumentFragment>();

// ============================================================================
// OPTIMIZED DOM MORPHING
// ============================================================================

export class TemplateParser {
  /**
   * Basic input sanitization: only escape double quotes for attribute context, do not filter or remove any content
   */
  /**
   * No-op for template HTML; escaping is handled contextually in template helpers and compiler.
   */
  static sanitizeHTML(html: string): string {
    return html;
  }

  static parseTemplate(html: string): DocumentFragment {
    const sanitized = TemplateParser.sanitizeHTML(html);
    const fragment = document.createDocumentFragment();
    // Simple parser: split by tags, handle input/textarea specially
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sanitized;
    Array.from(tempDiv.childNodes).forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'INPUT') {
        // Create input via createElement
        const input = document.createElement('input');
        Array.from((node as Element).attributes).forEach(attr => {
          if (attr.name !== 'value') {
            input.setAttribute(attr.name, attr.value);
          }
        });
        // Always set value property directly from state (ignore value attribute)
        input.value = (node as Element).getAttribute('value') || '';
        fragment.appendChild(input);
      } else if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'TEXTAREA') {
        // Create textarea via createElement
        const textarea = document.createElement('textarea');
        Array.from((node as Element).attributes).forEach(attr => {
          if (attr.name !== 'value') {
            textarea.setAttribute(attr.name, attr.value);
          }
        });
        // Always set value property directly from state (ignore value attribute)
        textarea.value = (node as Element).getAttribute('value') || '';
        textarea.textContent = (node as Element).textContent ?? '';
        fragment.appendChild(textarea);
      } else {
        fragment.appendChild(node.cloneNode(true));
      }
    });
    htmlParseCache.set(sanitized, fragment.cloneNode(true) as DocumentFragment);
    return fragment;
  }
}

export class DOMDiffer {
  static morph(oldElement: Element, newHTML: string): void {
    // For controlled input/textarea, render node only once, then update value/attributes directly
    const isControlledInput = ['INPUT', 'TEXTAREA'].includes(oldElement.tagName);
    if (isControlledInput) {
      // Only update value and attributes, never replace node
      const valueMatch = newHTML.match(/value=["']([^"']*)["']/);
      const newValue = valueMatch ? valueMatch[1] : '';
      if ((oldElement as any).value !== newValue) {
        (oldElement as any).value = newValue;
      }
      // Optionally update attributes (skip children)
      // Never replace or re-render node
      return;
    }
    // Normal diffing for all other elements
    const newFragment = TemplateParser.parseTemplate(newHTML);
    const newElement = newFragment.firstElementChild;
    if (!newElement) {
      oldElement.innerHTML = '';
      return;
    }
    this.morphElement(oldElement, newElement);
  }

  private static morphElement(oldEl: Element, newEl: Element): void {
    // Robust controlled input/textarea diffing
    if (['INPUT', 'TEXTAREA'].includes(oldEl.tagName)) {
      const isFocused = document.activeElement === oldEl;
      let selectionStart = null;
      let selectionEnd = null;
      if (isFocused) {
        selectionStart = (oldEl as any).selectionStart;
        selectionEnd = (oldEl as any).selectionEnd;
      }
      // Always set value property from state
      const stateValue = (newEl as any).value ?? (newEl as any).props?.value ?? '';
      if ((oldEl as any).value !== stateValue) {
        (oldEl as any).value = stateValue;
      }
      // Restore cursor/selection if focused
      if (isFocused && selectionStart !== null && selectionEnd !== null) {
        const len = stateValue.length;
        (oldEl as any).setSelectionRange(
          Math.min(selectionStart, len),
          Math.min(selectionEnd, len)
        );
      }
      // Only update attributes, never replace/reparse node or update children/innerHTML
      this.morphAttributes(oldEl, newEl);
      return;
    }
    // Node identity and focus logic
    const oldKey = oldEl.getAttribute('key');
    const newKey = newEl.getAttribute('key');
    const oldClass = oldEl.getAttribute('class');
    const newClass = newEl.getAttribute('class');
    const isFocusable = (el: Element) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
    const isFocused = document.activeElement === oldEl;
    const identityMatches = oldEl.tagName === newEl.tagName && oldKey === newKey && oldClass === newClass;

    // For input/textarea, always set value from state, never replace node if identity matches
    if (isFocusable(oldEl) && isFocusable(newEl) && identityMatches) {
      // For controlled input/textarea, never replace or reparse node. Only update value property and attributes.
      if (oldEl.tagName === 'INPUT') {
        const input = oldEl as HTMLInputElement;
        const stateValue = (newEl as any).props?.value ?? '';
        const isFocused = document.activeElement === input;
        let selectionStart = null;
        let selectionEnd = null;
        if (isFocused) {
          selectionStart = input.selectionStart;
          selectionEnd = input.selectionEnd;
        }
        // Always set value property directly
        input.value = stateValue;
        if (input.hasAttribute('value')) input.removeAttribute('value');
        // Restore cursor position if focused
        if (isFocused && selectionStart !== null && selectionEnd !== null) {
          const len = stateValue.length;
          input.setSelectionRange(
            Math.min(selectionStart, len),
            Math.min(selectionEnd, len)
          );
        }
        this.morphAttributes(oldEl, newEl);
        // Never morph children for controlled input
        return;
      } else if (oldEl.tagName === 'TEXTAREA') {
        const textarea = oldEl as HTMLTextAreaElement;
        const stateValue = (newEl as any).props?.value ?? '';
        const isFocused = document.activeElement === textarea;
        let selectionStart = null;
        let selectionEnd = null;
        if (isFocused) {
          selectionStart = textarea.selectionStart;
          selectionEnd = textarea.selectionEnd;
        }
        // Always set value property directly
        textarea.value = stateValue;
        if (textarea.hasAttribute('value')) textarea.removeAttribute('value');
        // Restore cursor position if focused
        if (isFocused && selectionStart !== null && selectionEnd !== null) {
          const len = stateValue.length;
          textarea.setSelectionRange(
            Math.min(selectionStart, len),
            Math.min(selectionEnd, len)
          );
        }
        this.morphAttributes(oldEl, newEl);
        // Never morph children for controlled textarea
        return;
      }
    }

    // Only replace node if not focused or not focusable
    if (!isFocused && !identityMatches) {
      const parent = oldEl.parentNode;
      const newNode = newEl.cloneNode(true);
      if (parent) {
        parent.replaceChild(newNode, oldEl);
      }
      return;
    }
    // Special handling for <input> to preserve focus and cursor
    if (oldEl.tagName === 'INPUT' && newEl.tagName === 'INPUT') {
      const oldType = oldEl.getAttribute('type');
      const newType = newEl.getAttribute('type');
      // Only update value if type is the same
      if (oldType === newType) {
        const input = oldEl as HTMLInputElement;
        const oldValue = input.value;
        // Always use direct state value for controlled input
        const newValue = (newEl as any).props?.value ?? '';
        if (oldValue !== newValue) {
          const selectionStart = input.selectionStart;
          const selectionEnd = input.selectionEnd;
          input.value = newValue;
          if (input.hasAttribute('value')) input.removeAttribute('value');
          if (selectionStart !== null && selectionEnd !== null) {
            const len = newValue.length;
            input.setSelectionRange(
              Math.min(selectionStart, len),
              Math.min(selectionEnd, len)
            );
          }
        }
        this.morphAttributes(oldEl, newEl);
        this.morphChildren(oldEl, newEl);
        return;
      }
    }
    // Special handling for <textarea>
    if (oldEl.tagName === 'TEXTAREA' && newEl.tagName === 'TEXTAREA') {
      const textarea = oldEl as HTMLTextAreaElement;
      const oldValue = textarea.value;
      // Always use direct state value for controlled textarea
      const newValue = (newEl as any).props?.value ?? '';
      if (oldValue !== newValue) {
        const selectionStart = textarea.selectionStart;
        const selectionEnd = textarea.selectionEnd;
        textarea.value = newValue;
        if (selectionStart !== null && selectionEnd !== null) {
          const len = newValue.length;
          textarea.setSelectionRange(
            Math.min(selectionStart, len),
            Math.min(selectionEnd, len)
          );
        }
      }
      this.morphAttributes(oldEl, newEl);
      this.morphChildren(oldEl, newEl);
      return;
    }
    // Morph attributes efficiently
    this.morphAttributes(oldEl, newEl);
    // Morph children (includes text nodes)
    this.morphChildren(oldEl, newEl);
  }

  private static morphAttributes(oldEl: Element, newEl: Element): void {
    const oldAttrs = oldEl.getAttributeNames();
    const newAttrs = newEl.getAttributeNames();
    // Remove old attributes not in new element (including data-refs-processed)
    for (const attr of oldAttrs) {
      // Only allow valid attribute names, never use user input as attribute name
      if (!/^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/.test(attr)) continue;
      if (!newAttrs.includes(attr)) {
        if (this.isFormElement(oldEl) && this.isValueAttribute(attr)) {
          this.updateFormValue(oldEl as HTMLInputElement | HTMLTextAreaElement, attr, null);
        }
        oldEl.removeAttribute(attr);
      }
    }
    // Set new/changed attributes
    for (const attr of newAttrs) {
      // Only allow valid attribute names, never use user input as attribute name
      if (!/^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/.test(attr)) continue;
      const newValue = newEl.getAttribute(attr);
      const oldValue = oldEl.getAttribute(attr);
      // For input/textarea/select, set value via property, not attribute
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(oldEl.tagName) && attr === 'value') {
        if ((oldEl as any).value !== newValue) {
          (oldEl as any).value = newValue ?? '';
        }
        continue;
      }
      if (this.isFormElement(oldEl) && this.isValueAttribute(attr)) {
        this.updateFormValue(oldEl as HTMLInputElement | HTMLTextAreaElement, attr, newValue);
      } else if (oldValue !== newValue) {
        oldEl.setAttribute(attr, newValue || '');
      }
    }
  }

  private static morphChildren(oldEl: Element, newEl: Element): void {
    const oldChildren = Array.from(oldEl.childNodes);
    const newChildren = Array.from(newEl.childNodes);
    // Try key-based morphing first for elements with keys
    if (this.hasKeyedElements(oldChildren) || this.hasKeyedElements(newChildren)) {
      this.morphNodesByKey(oldEl, oldChildren, newChildren);
    } else {
      this.morphNodesByPosition(oldEl, oldChildren, newChildren);
    }
  }

  private static hasKeyedElements(nodes: Node[]): boolean {
    return nodes.some(node => 
      node.nodeType === Node.ELEMENT_NODE && 
      (node as Element).hasAttribute('key')
    );
  }

  private static morphNodesByKey(parent: Element, oldNodes: Node[], newNodes: Node[]): void {
    // Create maps for keyed elements
    const oldKeyedElements = new Map<string, Element>();
    const newKeyedElements = new Map<string, Element>();
    const oldNonKeyedNodes: Node[] = [];
    const newNonKeyedNodes: Node[] = [];

    // Categorize old nodes
    oldNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const key = element.getAttribute('key');
        if (key) {
          oldKeyedElements.set(key, element);
        } else {
          oldNonKeyedNodes.push(node);
        }
      } else {
        oldNonKeyedNodes.push(node);
      }
    });

    // Categorize new nodes
    newNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const key = element.getAttribute('key');
        if (key) {
          newKeyedElements.set(key, element);
        } else {
          newNonKeyedNodes.push(node);
        }
      } else {
        newNonKeyedNodes.push(node);
      }
    });

    // Remove old keyed elements that don't exist in new
    oldKeyedElements.forEach((element, key) => {
      if (!newKeyedElements.has(key)) {
        parent.removeChild(element);
      }
    });

    // Process nodes in order from new template
    let currentNode = parent.firstChild;
    
    newNodes.forEach(newNode => {
      if (newNode.nodeType === Node.ELEMENT_NODE) {
        const newElement = newNode as Element;
        const key = newElement.getAttribute('key');
        
        if (key) {
          // Handle keyed element
          const oldElement = oldKeyedElements.get(key);
          if (oldElement) {
            // Move existing element to correct position if needed
            if (currentNode !== oldElement) {
              parent.insertBefore(oldElement, currentNode);
            }
            // Morph the element
            this.morphElement(oldElement, newElement);
            currentNode = oldElement.nextSibling;
          } else {
            // Add new keyed element
            const cloned = newElement.cloneNode(true);
            parent.insertBefore(cloned, currentNode);
            currentNode = cloned.nextSibling;
          }
        } else {
          // Handle non-keyed element
          if (currentNode?.nodeType === Node.ELEMENT_NODE) {
            this.morphElement(currentNode as Element, newElement);
            currentNode = currentNode.nextSibling;
          } else {
            const cloned = newElement.cloneNode(true);
            parent.insertBefore(cloned, currentNode);
            currentNode = cloned.nextSibling;
          }
        }
      } else {
        // Handle text nodes and other node types
        if (currentNode?.nodeType === newNode.nodeType) {
          if (currentNode.nodeType === Node.TEXT_NODE && 
              currentNode.textContent !== newNode.textContent) {
            currentNode.textContent = newNode.textContent;
          }
          currentNode = currentNode.nextSibling;
        } else {
          const cloned = newNode.cloneNode(true);
          parent.insertBefore(cloned, currentNode);
          currentNode = cloned.nextSibling;
        }
      }
    });

    // Remove any remaining old nodes
    while (currentNode) {
      const next = currentNode.nextSibling;
      parent.removeChild(currentNode);
      currentNode = next;
    }
  }

  private static morphNodesByPosition(parent: Element, oldNodes: Node[], newNodes: Node[]): void {
    const maxLength = Math.max(oldNodes.length, newNodes.length);

    for (let i = 0; i < maxLength; i++) {
      const oldNode = oldNodes[i];
      const newNode = newNodes[i];

      if (!oldNode && newNode) {
        // Add new node
        parent.appendChild(newNode.cloneNode(true));
      } else if (oldNode && !newNode) {
        // Remove old node
        parent.removeChild(oldNode);
      } else if (oldNode && newNode) {
        // Morph existing node
        if (oldNode.nodeType !== newNode.nodeType) {
          // Different node types, replace
          parent.replaceChild(newNode.cloneNode(true), oldNode);
        } else if (oldNode.nodeType === Node.TEXT_NODE) {
          // Text node - update content
          if (oldNode.textContent !== newNode.textContent) {
            oldNode.textContent = newNode.textContent;
          }
        } else if (oldNode.nodeType === Node.ELEMENT_NODE) {
          // Element node - recurse
          this.morphElement(oldNode as Element, newNode as Element);
        }
      }
    }
  }

  private static isFormElement(el: Element): boolean {
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
  }

  private static isValueAttribute(attr: string): boolean {
    return attr === 'value' || attr === 'checked' || attr === 'selected';
  }

  private static updateFormValue(el: HTMLInputElement | HTMLTextAreaElement, attr: string, value: string | null): void {
    switch (attr) {
      case 'value':
        const newValue = value || '';
        const currentValue = el.value;
        
        // Only update if the values are actually different
        if (currentValue !== newValue) {
          const isFocused = el === document.activeElement;
          
          if (!isFocused) {
            // Element not focused - always safe to update
            el.value = newValue;
          } else {
            // Element is focused - only update for significant programmatic changes
            const lengthDiff = Math.abs(currentValue.length - newValue.length);
            const isClearing = newValue.length === 0;
            const isLargeChange = lengthDiff > 20;
            const isCompletelyDifferent = newValue.length > 50 && !currentValue.toLowerCase().includes(newValue.toLowerCase().substring(0, 30));
            
            if (isClearing || isLargeChange || isCompletelyDifferent) {
              el.value = newValue;
              // Preserve cursor position for large changes
              if (!isClearing && el === document.activeElement) {
                const cursorPos = Math.min(newValue.length, (el as any).selectionStart || newValue.length);
                setTimeout(() => {
                  if (el === document.activeElement) {
                    (el as any).setSelectionRange(cursorPos, cursorPos);
                  }
                }, 0);
              }
            }
          }
        }
        break;
        
      case 'checked':
        const newChecked = value !== null;
        (el as HTMLInputElement).checked = newChecked;
        break;
        
      case 'selected':
        (el as any).selected = value !== null;
        break;
    }
  }
}
