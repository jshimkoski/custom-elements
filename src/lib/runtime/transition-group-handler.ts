import type { VNode, VDomRefs } from './types';
import { getNodeKey, setNodeKey } from './node-metadata';
import {
  performEnterTransition,
  performLeaveTransition,
} from './transition-utils';
import { devError } from './logger';

/**
 * Handle TransitionGroup keyed diffing and FLIP animations.
 * This function is intentionally passed `createElement` and `patch`
 * to avoid circular imports with the main vdom renderer.
 */
export function handleTransitionGroup(params: {
  parent: HTMLElement;
  oldNodesCache: Node[];
  oldVNodes: VNode[];
  newChildren: VNode[];
  context?: Record<string, unknown>;
  refs?: VDomRefs;
  transitionGroup: {
    moveClass?: string;
    appear?: boolean;
    [key: string]: unknown;
  };
  createElement: (v: VNode, c?: Record<string, unknown>, r?: VDomRefs) => Node;
  patch: (
    n: Node,
    o: VNode | string | null,
    nn: VNode | string | null,
    c?: Record<string, unknown>,
    r?: VDomRefs,
  ) => Node;
}): boolean {
  const {
    parent,
    oldNodesCache,
    oldVNodes,
    newChildren,
    context,
    refs,
    transitionGroup,
    createElement,
    patch,
  } = params;

  const stripKeyPrefix = (key: unknown): string | undefined => {
    if (typeof key === 'string') {
      return key.startsWith('each-') ? key.substring(5) : key;
    }
    return undefined;
  };

  const flattenedNew: VNode[] = [];
  const flattenedOldVNodes: VNode[] = [];

  for (const child of newChildren) {
    if (child && child.tag === '#anchor') {
      const anchorChildren = Array.isArray(child.children)
        ? child.children
        : [];
      for (const anchorChild of anchorChildren) {
        const actualKey = stripKeyPrefix(
          anchorChild.key || child.key || 'unknown',
        );
        flattenedNew.push({ ...anchorChild, key: actualKey });
      }
    } else if (child) {
      flattenedNew.push({ ...child, key: stripKeyPrefix(child.key) });
    }
  }

  for (const oldVNode of oldVNodes) {
    if (oldVNode && oldVNode.tag === '#anchor') {
      const anchorChildren = Array.isArray(oldVNode.children)
        ? oldVNode.children
        : [];
      for (const anchorChild of anchorChildren) {
        const actualKey = stripKeyPrefix(
          anchorChild.key || oldVNode.key || 'unknown',
        );
        flattenedOldVNodes.push({ ...anchorChild, key: actualKey });
      }
    } else if (oldVNode) {
      flattenedOldVNodes.push({
        ...oldVNode,
        key: stripKeyPrefix(oldVNode.key),
      });
    }
  }

  const hasKeys =
    flattenedNew.some((c) => c && c.key != null) ||
    flattenedOldVNodes.some((c) => c && c.key != null);

  if (!hasKeys) return false;

  const oldVNodeByKeyFlat = new Map<string | number, VNode>();
  const oldNodeByKeyFlat = new Map<string | number, Node>();

  for (const v of flattenedOldVNodes) {
    if (v && v.key != null) {
      const key = String(v.key);
      oldVNodeByKeyFlat.set(key, v);
    }
  }

  for (let i = 0; i < oldNodesCache.length; i++) {
    const node = oldNodesCache[i];
    let nodeKey = getNodeKey(node);
    nodeKey = stripKeyPrefix(nodeKey);
    if (
      nodeKey != null &&
      node instanceof Element &&
      node.nodeType === Node.ELEMENT_NODE
    ) {
      let baseKey =
        typeof nodeKey === 'string' && nodeKey.includes(':')
          ? nodeKey.substring(0, nodeKey.lastIndexOf(':'))
          : nodeKey;
      baseKey = String(baseKey);
      oldNodeByKeyFlat.set(baseKey, node);
    }
  }

  const usedFlat = new Set<Node>();

  const positionsBefore = new Map<Node, DOMRect>();
  const hadPreviousContent = oldNodesCache.length > 0;

  if (transitionGroup.moveClass && hadPreviousContent) {
    for (let i = 0; i < oldNodesCache.length; i++) {
      const node = oldNodesCache[i];
      if (node instanceof HTMLElement && node.parentElement) {
        const rect = node.getBoundingClientRect();
        positionsBefore.set(node, rect);
      }
    }
  }

  const nodesToProcess: Array<{
    node: Node;
    key: string;
    newVNode: VNode;
    oldVNode?: VNode;
    isNew: boolean;
  }> = [];

  for (const newVNode of flattenedNew) {
    let key: string | number | null | undefined = newVNode.key;
    if (key == null) continue;
    key = String(key);
    const oldVNode = oldVNodeByKeyFlat.get(key);
    let node = oldNodeByKeyFlat.get(key);

    if (node && oldVNode) {
      const patched = patch(node, oldVNode, newVNode, context);
      usedFlat.add(node);
      const keyStr = String(key);
      setNodeKey(patched, keyStr);
      nodesToProcess.push({
        node: patched,
        key,
        newVNode,
        oldVNode,
        isNew: false,
      });
    } else {
      node = createElement(newVNode, context, refs);
      setNodeKey(node, String(key));
      parent.appendChild(node);
      const shouldAnimate =
        hadPreviousContent || transitionGroup.appear === true;
      if (node instanceof HTMLElement && shouldAnimate) {
        performEnterTransition(node, transitionGroup).catch((err) =>
          devError('Enter transition error:', err),
        );
      }
      nodesToProcess.push({ node, key, newVNode, isNew: true });
    }
  }

  const leaveTransitions: Promise<void>[] = [];

  for (let i = 0; i < oldNodesCache.length; i++) {
    const node = oldNodesCache[i];
    const nodeKey = getNodeKey(node);
    const isUsed = usedFlat.has(node);
    if (!isUsed && nodeKey != null && node instanceof HTMLElement) {
      const leavePromise = performLeaveTransition(node, transitionGroup)
        .then(() => {
          if (parent.contains(node)) parent.removeChild(node);
        })
        .catch((err) => {
          devError('Leave transition error:', err);
          if (parent.contains(node)) parent.removeChild(node);
        });
      leaveTransitions.push(leavePromise);
    }
  }

  if (leaveTransitions.length === 0) {
    let currentPosition: Node | null = parent.firstChild;
    for (const { node } of nodesToProcess) {
      if (node !== currentPosition) {
        parent.insertBefore(node, currentPosition);
      }
      currentPosition = node.nextSibling;
    }

    if (transitionGroup.moveClass && positionsBefore.size > 0) {
      const elementsToAnimate: Array<{
        node: HTMLElement;
        deltaX: number;
        deltaY: number;
        moveClasses: string[];
      }> = [];
      for (const { node, isNew } of nodesToProcess) {
        if (!isNew && node instanceof HTMLElement) {
          const oldPos = positionsBefore.get(node);
          if (oldPos) {
            const newPos = node.getBoundingClientRect();
            const deltaX = oldPos.left - newPos.left;
            const deltaY = oldPos.top - newPos.top;
            if (deltaX !== 0 || deltaY !== 0) {
              const moveClasses = transitionGroup.moveClass
                .split(/\s+/)
                .filter((c: string) => c);
              elementsToAnimate.push({ node, deltaX, deltaY, moveClasses });
            }
          }
        }
      }

      if (elementsToAnimate.length > 0) {
        for (const { node, deltaX, deltaY } of elementsToAnimate) {
          node.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
          node.style.transitionProperty = 'none';
        }

        void parent.offsetHeight;

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            for (const { node, moveClasses } of elementsToAnimate) {
              for (const cls of moveClasses) node.classList.add(cls);
            }
            requestAnimationFrame(() => {
              const moveClassStr = transitionGroup.moveClass || '';
              const durationMatch = moveClassStr.match(/duration-(\d+)/);
              const duration = durationMatch
                ? `${durationMatch[1]}ms`
                : '300ms';
              const easingMatch = moveClassStr.match(
                /ease-(out|in|in-out|linear)/,
              );
              const easing = easingMatch
                ? `ease-${easingMatch[1]}`
                : 'ease-out';
              for (const { node } of elementsToAnimate) {
                node.style.transition = `transform ${duration} ${easing}`;
              }
              requestAnimationFrame(() => {
                for (const { node, moveClasses } of elementsToAnimate) {
                  node.style.removeProperty('transform');
                  const cleanup = () => {
                    for (const cls of moveClasses) node.classList.remove(cls);
                    node.style.removeProperty('transition');
                    node.removeEventListener('transitionend', cleanup);
                    node.removeEventListener('transitioncancel', cleanup);
                  };
                  node.addEventListener('transitionend', cleanup, {
                    once: true,
                  });
                  node.addEventListener('transitioncancel', cleanup, {
                    once: true,
                  });
                }
              });
            });
          });
        });
      }
    }
  }

  return true;
}
