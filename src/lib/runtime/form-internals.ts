import { useHost, useOnConnected } from './hooks';

const internalsByHost = new WeakMap<HTMLElement, ElementInternals>();
const callbacksByHost = new WeakMap<HTMLElement, FormCallbacks>();
export interface FormCallbacks {
  reset?: () => void;
  disabled?: (disabled: boolean) => void;
  restore?: (state: string | File | FormData | null, mode: 'restore' | 'autocomplete') => void;
}

/** Call inside a component declared with formAssociated: true. Null during SSR/discovery. */
export function useFormInternals(callbacks: FormCallbacks = {}): ElementInternals | null {
  const host = useHost();
  let internals = host ? internalsByHost.get(host) : null;
  if (host && !internals && typeof host.attachInternals === 'function') {
    internals = host.attachInternals();
    internalsByHost.set(host, internals);
  }
  if (host) callbacksByHost.set(host, callbacks);
  useOnConnected(() => {
    if (!host) return;
    const reset = () => callbacksByHost.get(host)?.reset?.();
    const disabled = (event: Event) => callbacksByHost.get(host)?.disabled?.((event as CustomEvent<boolean>).detail);
    const restore = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      callbacksByHost.get(host)?.restore?.(detail.state, detail.mode);
    };
    host.addEventListener('cer:form-reset', reset);
    host.addEventListener('cer:form-disabled', disabled);
    host.addEventListener('cer:form-restore', restore);
    return () => {
      host.removeEventListener('cer:form-reset', reset);
      host.removeEventListener('cer:form-disabled', disabled);
      host.removeEventListener('cer:form-restore', restore);
    };
  });
  return internals ?? null;
}
