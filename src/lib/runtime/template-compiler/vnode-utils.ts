import type { VNode } from '../types';

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
