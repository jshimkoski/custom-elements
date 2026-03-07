/**
 * keep-alive.ts
 *
 * Preserves component state when a component is removed from and later
 * re-inserted into the DOM. By default, custom elements lose all JavaScript
 * state when `disconnectedCallback` fires. `ce-keep-alive` intercepts
 * that lifecycle and keeps the child element alive in memory, re-attaching
 * it when a matching component is re-inserted.
 *
 * ## Usage
 *
 * Wrap any custom element with `<ce-keep-alive>`:
 * ```html
 * <ce-keep-alive>
 *   <my-counter></my-counter>
 * </ce-keep-alive>
 * ```
 *
 * Or register it programmatically:
 * ```ts
 * import { registerKeepAlive } from '@lib/keep-alive';
 * registerKeepAlive(); // registers <ce-keep-alive> globally
 * ```
 *
 * ## How it works
 *
 * `ce-keep-alive` uses a slotted layout. When a slotted child component is
 * about to leave the DOM (via a re-render of a parent), KeepAlive intercepts
 * `slotchange` events and preserves the detached child element in an internal
 * cache keyed by tag name. When the same tag re-appears in the slot, the
 * cached element is re-inserted, restoring all JavaScript state.
 *
 * ## Limitations
 *
 * - The first slot child per tag name is cached. Multiple children with the
 *   same tag use separate cache entries keyed by their `id` attribute.
 * - Only components registered with the same tag name are matched.
 * - Cache entries can be manually evicted with `clearCache()`.
 */

/** Cache key = tagName[:id] */
type CacheKey = string;

/**
 * Register the `<ce-keep-alive>` custom element.
 * Safe to call multiple times — subsequent calls are no-ops.
 *
 * @example
 * ```ts
 * import { registerKeepAlive } from '@lib/keep-alive';
 * registerKeepAlive();
 * ```
 */
export function registerKeepAlive(): void {
  if (
    typeof window === 'undefined' ||
    typeof customElements === 'undefined' ||
    customElements.get('ce-keep-alive')
  ) {
    return;
  }

  customElements.define('ce-keep-alive', createKeepAliveClass());
}

function createKeepAliveClass(): CustomElementConstructor {
  return class CeKeepAlive extends HTMLElement {
    /** Preserved component instances keyed by tag[:id]. */
    private _cache = new Map<CacheKey, Element>();
    private _slot: HTMLSlotElement | null = null;
    private _slotListener: (() => void) | null = null;

    connectedCallback(): void {
      if (!this.shadowRoot) {
        this.attachShadow({ mode: 'open' });
      }

      if (!this.shadowRoot!.querySelector('slot')) {
        this.shadowRoot!.innerHTML = '<slot></slot>';
      }

      this._slot = this.shadowRoot!.querySelector('slot');
      if (this._slot) {
        this._slotListener = () => this._handleSlotChange();
        this._slot.addEventListener('slotchange', this._slotListener);
        // Process current slotted content
        this._handleSlotChange();
      }
    }

    disconnectedCallback(): void {
      if (this._slot && this._slotListener) {
        this._slot.removeEventListener('slotchange', this._slotListener);
      }
      this._slotListener = null;
    }

    /**
     * Evict a cached element by its cache key (`tagName` or `tagName:id`).
     * The evicted element is disconnected and removed from the cache.
     */
    clearCache(key?: CacheKey): void {
      if (key) {
        this._cache.delete(key);
      } else {
        this._cache.clear();
      }
    }

    private _handleSlotChange(): void {
      if (!this._slot) return;

      const slottedElements = this._slot.assignedElements({ flatten: true });

      for (const child of slottedElements) {
        const cacheKey = this._buildCacheKey(child);

        if (!this._cache.has(cacheKey)) {
          // New element — cache it so we can restore it later
          this._cache.set(cacheKey, child);
        } else {
          const cached = this._cache.get(cacheKey)!;
          if (cached !== child) {
            // A different instance appeared for the same slot.
            // Replace it with the cached instance to restore state.
            try {
              child.parentNode?.replaceChild(cached, child);
            } catch {
              // If replacement fails, update the cache with the new element
              this._cache.set(cacheKey, child);
            }
          }
        }
      }
    }

    private _buildCacheKey(el: Element): CacheKey {
      const tag = el.tagName.toLowerCase();
      const id = el.getAttribute('id');
      return id ? `${tag}:${id}` : tag;
    }
  };
}
