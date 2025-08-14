/**
 * Minimal controlled input binding helper for data-model attributes.
 * Handles checkboxes, radios, text, and modifiers (trim, number).
 * @param el - Input/select/textarea element
 * @param stateObj - State object to bind
 * @param keyWithModifiers - Key and optional modifiers (e.g. 'name|trim|number')
 */
export function useDataModel<T extends Record<string, unknown>>(el: Element, stateObj: T, keyWithModifiers: string) {
  const [rawKey, ...modifiers] = keyWithModifiers.split('|').map(s => s.trim());
  if (!rawKey || rawKey === '__proto__' || rawKey === 'constructor' || rawKey === 'prototype') return;
  // Helper to set nested state (dot notation)
  function setNestedState(obj: any, path: string, value: unknown) {
    const keys = path.split('.');
    let target = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in target)) target[keys[i]] = {};
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;
  }
  const updateState = (e: Event) => {
    let value: unknown;
    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      value = el.value;
      const trueValue = el.getAttribute('data-true-value');
      const falseValue = el.getAttribute('data-false-value');
      let arr = Array.isArray(stateObj[rawKey]) ? (stateObj[rawKey] as unknown[]) : undefined;
      if (arr) {
        if (el.checked) {
          if (!arr.includes(value)) arr.push(value);
        } else {
          const idx = arr.indexOf(value);
          if (idx !== -1) arr.splice(idx, 1);
        }
        setNestedState(stateObj, rawKey, [...arr]);
      } else {
        if (trueValue !== null || falseValue !== null) {
          if (el.checked) {
            setNestedState(stateObj, rawKey, trueValue);
          } else {
            setNestedState(stateObj, rawKey, falseValue !== null ? falseValue : false);
          }
        } else {
          setNestedState(stateObj, rawKey, el.checked);
        }
      }
    } else if (el instanceof HTMLInputElement && el.type === 'radio') {
      value = el.value;
      setNestedState(stateObj, rawKey, value);
      const radios = (el.form || el.closest('form') || el.getRootNode()) instanceof Element
        ? ((el.form || el.closest('form') || el.getRootNode()) as Element).querySelectorAll(`input[type="radio"][name="${el.name}"][data-model="${keyWithModifiers}"]`)
        : [];
      radios.forEach((radio: Element) => {
        (radio as HTMLInputElement).checked = (radio as HTMLInputElement).value === String(value);
      });
    } else {
      // Always read value from event target for input events
      // Always read value from the input element itself for robustness
      value = (el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
      if (el instanceof HTMLInputElement && el.type === 'number') {
        value = Number(value);
      }
      if (modifiers.includes('trim') && typeof value === 'string') {
        value = value.trim();
      }
      if (modifiers.includes('number')) {
        value = Number(value);
      }
      setNestedState(stateObj, rawKey, value);
    }
    if ('_vnode' in el && typeof (el as any)._vnode === 'object' && (el as any)._vnode?.props) {
      (el as any)._vnode.props.value = value;
    }
    if (e.type === 'input') {
      (el as { _isDirty?: boolean })._isDirty = true;
    }
    if (e.type === 'keydown' && (e as KeyboardEvent).key === 'Enter') {
      (el as { _isDirty?: boolean })._isDirty = false;
      if (el instanceof HTMLElement && el.isConnected) {
        let parent = el.parentElement;
        while (parent && !(parent instanceof HTMLElement && parent.shadowRoot)) {
          parent = parent.parentElement;
        }
        if (parent && typeof parent === 'object' && parent !== null && 'render' in parent && typeof (parent as any).render === 'function') {
          (parent as HTMLElement & { render: () => void }).render();
        }
      }
    }
    if (e.type === 'blur') {
      (el as { _isDirty?: boolean })._isDirty = false;
    }
  };
  el.addEventListener('input', updateState);
  el.addEventListener('change', updateState);
  el.addEventListener('keydown', updateState);
  el.addEventListener('blur', updateState);
}