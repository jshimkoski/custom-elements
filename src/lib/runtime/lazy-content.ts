import { ref } from './reactive';
import type { VNode } from './types';

/** Parent-level lazy content: call during every render; children mount on first open. */
export function useLazyContent(open: boolean, content: () => VNode | VNode[], retain = true): VNode | VNode[] {
  const mounted = ref(false);
  if (open) mounted.initSilent(true);
  return open || (retain && mounted.value) ? content() : [];
}
