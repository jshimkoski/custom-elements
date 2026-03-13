import type { VNode } from './runtime/types';

// ── Per-render directive scope tracking ─────────────────────────────────────
//
// A FLAT counter (index++) breaks when a when() factory itself contains more
// when() calls: those inner calls consume counter slots, causing SUBSEQUENT
// SIBLING when() calls to get a different index depending on whether the factory
// ran. For example:
//
//   when(A, () => { when(B); when(C); })  // ← factory may or may not run
//   when(D)                               // ← index shifts when factory runs
//
// The fix: each when() call claims its own slot (stable regardless of whether
// the factory runs), then ENTERS a new child scope for the factory. Inner
// when() calls consume indices in that child scope, never bleeding into the
// sibling counter of the outer scope.
//
// Key format:  root sibling 0 → "when-block-0"
//              child of "when-block-0" at pos 1 → "when-block-0.1"
//              grandchild → "when-block-0.1.0"  etc.

/** Current scope's parent prefix (empty string = root scope). */
let _scopeParent = '';
/** Next sibling index inside the current scope. */
let _scopeIndex = 0;
/** Stack of [parentPrefix, siblingIndex] for nested scopes. */
const _scopeStack: Array<readonly [string, number]> = [];

/**
 * Reset all scope state at the start of each component render pass.
 * Called automatically by the component renderer — not needed in user code.
 * @internal
 */
export function resetWhenCounter(): void {
  _scopeParent = '';
  _scopeIndex = 0;
  _scopeStack.length = 0;
}

/**
 * Claim the next directive call index within the current scope.
 * Used by directive-enhancements.ts for non-when() directives (switchOnLength,
 * switchOnPromise, etc.) that need a stable unique number per call site.
 * @internal
 */
export function nextDirectiveIndex(): number {
  return _scopeIndex++;
}

/** Claim the next slot in the current scope and return its anchor key. */
function claimKey(explicitKey?: string): string {
  const idx = _scopeIndex++;
  if (explicitKey !== undefined) return explicitKey;
  return _scopeParent ? `${_scopeParent}.${idx}` : `when-block-${idx}`;
}

/** Push a new child scope keyed under `anchorKey`. */
function enterScope(anchorKey: string): void {
  _scopeStack.push([_scopeParent, _scopeIndex] as const);
  _scopeParent = anchorKey;
  _scopeIndex = 0;
}

/** Pop back to the parent scope. */
function exitScope(): void {
  const top = _scopeStack[_scopeStack.length - 1];
  if (top) {
    _scopeStack.length--;
    [_scopeParent, _scopeIndex] = top;
  }
}

/* --- When --- */
export function when(
  cond: boolean,
  children: VNode | VNode[],
  key?: string,
): VNode;
export function when(
  cond: boolean,
  factory: () => VNode | VNode[],
  key?: string,
): VNode;
export function when(
  cond: boolean,
  childrenOrFactory: VNode | VNode[] | (() => VNode | VNode[]),
  key?: string,
): VNode {
  // Claim this call's position BEFORE potentially entering a child scope.
  // This guarantees sibling when() calls always get the same index regardless
  // of whether a factory executes and how many when() calls it contains.
  const anchorKey = claimKey(key);

  if (typeof childrenOrFactory !== 'function') {
    return anchorBlock(cond ? childrenOrFactory : [], anchorKey);
  }

  if (!cond) {
    return anchorBlock([], anchorKey);
  }

  // Run the factory in a child scope so its inner when() calls don't
  // affect the sibling counter of the outer scope.
  enterScope(anchorKey);
  const children = childrenOrFactory();
  exitScope();
  return anchorBlock(children, anchorKey);
}

/* --- Each --- */
export function each<
  T extends string | number | boolean | { id?: string | number; key?: string },
>(list: T[], render: (item: T, index: number) => VNode | VNode[]): VNode[] {
  return list.map((item, i) => {
    // For primitives, use value as key; for objects, prefer key/id
    const itemKey =
      typeof item === 'object'
        ? ((item as Record<string, unknown>)?.key ??
          (item as Record<string, unknown>)?.id ??
          `idx-${i}`)
        : String(item);
    return anchorBlock(render(item, i), `each-${itemKey}`);
  });
}

/* --- match --- */
type Branch = [
  condition: unknown,
  content: VNode | VNode[] | (() => VNode | VNode[]),
];

export function match() {
  const branches: Branch[] = [];
  return {
    when(cond: unknown, content: VNode | VNode[] | (() => VNode | VNode[])) {
      branches.push([cond, content]);
      return this;
    },
    otherwise(content: VNode | VNode[]) {
      branches.push([true, content]);
      return this;
    },
    done() {
      const matchKey = `match-${claimKey()}`;
      for (let idx = 0; idx < branches.length; idx++) {
        const [cond, content] = branches[idx];
        if (cond) {
          const branchKey = `${matchKey}-branch-${idx}`;
          if (typeof content === 'function') {
            enterScope(branchKey);
            const payload = (content as () => VNode | VNode[])();
            exitScope();
            return [anchorBlock(payload, branchKey)];
          }
          return [anchorBlock(content, branchKey)];
        }
      }
      return [anchorBlock([], `${matchKey}-empty`)];
    },
  };
}

/**
 * Create a stable anchor block with consistent boundaries.
 * Always has start/end boundaries.
 */
export function anchorBlock(
  children: VNode | VNode[] | null | undefined,
  anchorKey: string,
): VNode {
  // Normalize children to array, filtering out only null/undefined values.
  // Preserve meaningful falsy values such as 0, false, and empty string.
  const childArray = !children
    ? []
    : Array.isArray(children)
      ? children.filter((c) => c !== null && c !== undefined)
      : [children].filter((c) => c !== null && c !== undefined);

  return {
    tag: '#anchor',
    key: anchorKey,
    children: childArray,
  };
}
