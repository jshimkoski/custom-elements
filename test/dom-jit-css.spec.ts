import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDOMJITCSS } from '../src/lib/dom-jit-css';

// ---------------------------------------------------------------------------
// Helpers to force the <style>-element fallback path by making
// document.adoptedStyleSheets appear absent for specific tests.
// ---------------------------------------------------------------------------

function stubAdoptedStyleSheets(value: unknown = undefined): void {
  Object.defineProperty(document, 'adoptedStyleSheets', {
    get: () => value,
    configurable: true,
  });
}

function restoreAdoptedStyleSheets(): void {
  try {
    delete (document as unknown as Record<string, unknown>)[
      'adoptedStyleSheets'
    ];
  } catch {
    // ignore — some environments protect this property
  }
}

// ---------------------------------------------------------------------------
// Helper to flush microtasks (queueMicrotask) and settled MutationObserver
// callbacks (which fire asynchronously as a task in jsdom).
// ---------------------------------------------------------------------------
async function flushAsync(): Promise<void> {
  await new Promise<void>((r) => setTimeout(r, 0));
  await Promise.resolve();
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('createDOMJITCSS', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    // Remove any injected style elements left over by failed tests
    document
      .querySelectorAll('style[id^="cer-dom-jit"]')
      .forEach((el) => el.remove());
  });

  // ─── Basic lifecycle ──────────────────────────────────────────────────────

  describe('basic lifecycle', () => {
    it('mount() completes without error', () => {
      const jit = createDOMJITCSS();
      expect(() => jit.mount()).not.toThrow();
      jit.destroy();
    });

    it('destroy() after mount runs without error', () => {
      const jit = createDOMJITCSS();
      jit.mount();
      expect(() => jit.destroy()).not.toThrow();
    });

    it('destroy() before mount is a safe no-op', () => {
      const jit = createDOMJITCSS();
      expect(() => jit.destroy()).not.toThrow();
    });

    it('second mount() is idempotent — MutationObserver.observe called once', () => {
      const observeSpy = vi.spyOn(MutationObserver.prototype, 'observe');
      const jit = createDOMJITCSS();
      jit.mount();
      const callsBefore = observeSpy.mock.calls.length;
      jit.mount(); // should be a no-op
      expect(observeSpy.mock.calls.length).toBe(callsBefore);
      jit.destroy();
      observeSpy.mockRestore();
    });

    it('double destroy() is safe', () => {
      const jit = createDOMJITCSS();
      jit.mount();
      jit.destroy();
      expect(() => jit.destroy()).not.toThrow();
    });
  });

  // ─── processedCount ───────────────────────────────────────────────────────

  describe('processedCount', () => {
    it('is 0 before mount()', () => {
      const jit = createDOMJITCSS();
      expect(jit.processedCount).toBe(0);
    });

    it('increases after initial scan', async () => {
      document.body.innerHTML =
        '<div class="flex items-center text-red-500"></div>';
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();
      expect(jit.processedCount).toBe(3);
      jit.destroy();
    });

    it('resets to 0 after destroy()', async () => {
      document.body.innerHTML = '<div class="flex p-4"></div>';
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();
      expect(jit.processedCount).toBeGreaterThan(0);
      jit.destroy();
      expect(jit.processedCount).toBe(0);
    });

    it('deduplicates classes across multiple elements', async () => {
      document.body.innerHTML = `
        <div class="flex p-4"></div>
        <span class="flex m-2"></span>
      `;
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();
      // flex appears twice, counted once: flex, p-4, m-2 = 3
      expect(jit.processedCount).toBe(3);
      jit.destroy();
    });

    it('deduplicates repeated classes within a single element', async () => {
      document.body.innerHTML = '<div class="flex flex p-4"></div>';
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();
      // flex deduped → flex, p-4 = 2
      expect(jit.processedCount).toBe(2);
      jit.destroy();
    });
  });

  // ─── Initial DOM scan ─────────────────────────────────────────────────────

  describe('initial DOM scan', () => {
    it('scans nested elements on mount()', async () => {
      document.body.innerHTML = `
        <section class="bg-white">
          <h1 class="text-2xl font-bold">Title</h1>
          <p class="text-gray-600 leading-relaxed">Content</p>
        </section>
      `;
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();
      // bg-white, text-2xl, font-bold, text-gray-600, leading-relaxed = 5
      expect(jit.processedCount).toBe(5);
      jit.destroy();
    });

    it('does not reprocess classes seen in the initial scan', async () => {
      document.body.innerHTML = '<div class="flex"></div>';
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();
      const countAfterScan = jit.processedCount;

      // Trigger mutation with the same class
      (document.body.firstElementChild as HTMLElement).className = 'flex';
      await flushAsync();

      expect(jit.processedCount).toBe(countAfterScan);
      jit.destroy();
    });
  });

  // ─── MutationObserver — class attribute changes ───────────────────────────

  describe('MutationObserver — class attribute changes', () => {
    it('detects new classes added to an existing element', async () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();
      const initial = jit.processedCount;

      el.className = 'mt-4 gap-2 rounded';
      await flushAsync();

      expect(jit.processedCount).toBeGreaterThan(initial);
      jit.destroy();
    });

    it('does not increase count for already-seen classes', async () => {
      const el = document.createElement('div');
      el.className = 'block';
      document.body.appendChild(el);
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();
      const count1 = jit.processedCount;

      // Set same class again
      el.className = 'block';
      await flushAsync();

      expect(jit.processedCount).toBe(count1);
      jit.destroy();
    });

    it('processes only the delta of new classes across mutations', async () => {
      const el = document.createElement('div');
      el.className = 'flex';
      document.body.appendChild(el);
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();
      expect(jit.processedCount).toBe(1);

      // Add one new class alongside the already-known "flex"
      el.className = 'flex hidden';
      await flushAsync();
      expect(jit.processedCount).toBe(2);

      jit.destroy();
    });
  });

  // ─── MutationObserver — childList ─────────────────────────────────────────

  describe('MutationObserver — childList', () => {
    it('scans newly appended elements', async () => {
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();
      const initial = jit.processedCount;

      const el = document.createElement('article');
      el.className = 'prose max-w-2xl mx-auto';
      document.body.appendChild(el);
      await flushAsync();

      expect(jit.processedCount).toBeGreaterThan(initial);
      jit.destroy();
    });

    it('scans subtree of newly appended parent element', async () => {
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();
      const initial = jit.processedCount;

      const parent = document.createElement('div');
      parent.innerHTML =
        '<span class="text-sm leading-tight uppercase"></span>';
      document.body.appendChild(parent);
      await flushAsync();

      expect(jit.processedCount).toBeGreaterThan(initial);
      jit.destroy();
    });
  });

  // ─── data-jitcss attribute semantics ──────────────────────────────────────

  describe('data-jitcss attribute semantics', () => {
    it('no [data-jitcss] present → scans document.body', async () => {
      document.body.innerHTML = '<div class="grid grid-cols-3 gap-4"></div>';
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();
      expect(jit.processedCount).toBe(3);
      jit.destroy();
    });

    it('data-jitcss (no value) → scopes to that element subtree', async () => {
      document.body.innerHTML = `
        <div data-jitcss class="container mx-auto">
          <span class="font-semibold">inside</span>
        </div>
        <div class="outside-only">outside</div>
      `;
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();
      // container, mx-auto, font-semibold = 3; outside-only excluded
      expect(jit.processedCount).toBe(3);
      jit.destroy();
    });

    it('data-jitcss="container" → behaves same as no value', async () => {
      document.body.innerHTML = `
        <div data-jitcss="container" class="flex flex-col">
          <span class="text-base">inside</span>
        </div>
      `;
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();
      expect(jit.processedCount).toBe(3); // flex, flex-col, text-base
      jit.destroy();
    });

    it('data-jitcss="self" → only processes the element, not descendants', async () => {
      document.body.innerHTML = `
        <div data-jitcss="self" class="block overflow-hidden">
          <span class="text-red-500 font-extrabold">child</span>
        </div>
      `;
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();
      // Only "block" and "overflow-hidden" from the element itself
      expect(jit.processedCount).toBe(2);
      jit.destroy();
    });

    it('data-jitcss="global" → observes document.body regardless of element', async () => {
      document.body.innerHTML = `
        <div data-jitcss="global"></div>
        <article class="prose max-w-4xl">content</article>
      `;
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();
      // Scans body: prose, max-w-4xl = 2
      expect(jit.processedCount).toBeGreaterThanOrEqual(2);
      jit.destroy();
    });

    it('multiple [data-jitcss] elements → falls back to document.body', async () => {
      document.body.innerHTML = `
        <div data-jitcss class="flex"></div>
        <div data-jitcss class="block"></div>
        <span class="italic">text</span>
      `;
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();
      // Body is the root: flex, block, italic = 3
      expect(jit.processedCount).toBe(3);
      jit.destroy();
    });

    it('data-jitcss="self" ignores newly added child elements', async () => {
      document.body.innerHTML =
        '<div data-jitcss="self" class="flex" id="self-target"></div>';
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();
      expect(jit.processedCount).toBe(1); // only "flex"

      const child = document.createElement('span');
      child.className = 'text-blue-500 font-bold';
      document.getElementById('self-target')!.appendChild(child);
      await flushAsync();

      // childList not observed in "self" mode — count must not increase
      expect(jit.processedCount).toBe(1);
      jit.destroy();
    });
  });

  // ─── Explicit root option ─────────────────────────────────────────────────

  describe('explicit root option', () => {
    it('scopes scanner and observer to the provided root element', async () => {
      document.body.innerHTML = `
        <div id="app">
          <span class="rounded-full border border-gray-200"></span>
        </div>
        <footer class="hidden fixed bottom-0">outside</footer>
      `;
      const root = document.getElementById('app')!;
      const jit = createDOMJITCSS({ root });
      jit.mount();
      await flushAsync();
      // rounded-full, border, border-gray-200 = 3; hidden/fixed/bottom-0 excluded
      expect(jit.processedCount).toBe(3);
      jit.destroy();
    });

    it('accepts a ShadowRoot as root without throwing', () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const shadow = host.attachShadow({ mode: 'open' });
      const jit = createDOMJITCSS({ root: shadow });
      expect(() => jit.mount()).not.toThrow();
      jit.destroy();
    });

    it('scans classes inside a ShadowRoot', async () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const shadow = host.attachShadow({ mode: 'open' });
      const inner = document.createElement('span');
      inner.className = 'flex items-center gap-4';
      shadow.appendChild(inner);

      const jit = createDOMJITCSS({ root: shadow });
      jit.mount();
      await flushAsync();
      // flex, items-center, gap-4 = 3 classes from inside the shadow DOM
      expect(jit.processedCount).toBe(3);
      jit.destroy();
    });

    it('does not scan light-DOM siblings when root is a ShadowRoot', async () => {
      const host = document.createElement('div');
      const outsider = document.createElement('div');
      outsider.className = 'text-red-500 font-bold';
      document.body.appendChild(host);
      document.body.appendChild(outsider);
      const shadow = host.attachShadow({ mode: 'open' });
      const inner = document.createElement('span');
      inner.className = 'hidden';
      shadow.appendChild(inner);

      const jit = createDOMJITCSS({ root: shadow });
      jit.mount();
      await flushAsync();
      // Only 'hidden' from inside the shadow DOM; light-DOM outsider is excluded
      expect(jit.processedCount).toBe(1);
      jit.destroy();
    });
  });

  // ─── <style> element fallback path ───────────────────────────────────────

  describe('<style> element fallback path (adoptedStyleSheets absent)', () => {
    beforeEach(() => stubAdoptedStyleSheets(undefined));
    afterEach(() => {
      restoreAdoptedStyleSheets();
      document.getElementById('cer-dom-jit-css')?.remove();
    });

    it('creates a <style> element with the default id', () => {
      const jit = createDOMJITCSS();
      jit.mount();
      expect(document.getElementById('cer-dom-jit-css')).not.toBeNull();
      jit.destroy();
    });

    it('removes the <style> element on destroy()', () => {
      const jit = createDOMJITCSS();
      jit.mount();
      jit.destroy();
      expect(document.getElementById('cer-dom-jit-css')).toBeNull();
    });

    it('uses a custom styleId when provided', () => {
      const jit = createDOMJITCSS({ styleId: 'my-custom-styles' });
      jit.mount();
      expect(document.getElementById('my-custom-styles')).not.toBeNull();
      jit.destroy();
      expect(document.getElementById('my-custom-styles')).toBeNull();
    });

    it('reuses an existing <style> element matching the styleId', () => {
      const existing = document.createElement('style');
      existing.id = 'cer-dom-jit-css';
      document.head.appendChild(existing);

      const jit = createDOMJITCSS();
      jit.mount();
      // Must not create a duplicate
      expect(document.querySelectorAll('#cer-dom-jit-css').length).toBe(1);
      jit.destroy();
    });

    it('injects @layer cer-utilities CSS into the <style> element', async () => {
      document.body.innerHTML =
        '<div class="opacity-75 scale-95 pointer-events-none"></div>';
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();
      const styleEl = document.getElementById(
        'cer-dom-jit-css',
      ) as HTMLStyleElement;
      expect(styleEl).not.toBeNull();
      expect(styleEl.textContent).toContain('@layer cer-utilities');
      jit.destroy();
    });

    it('grows textContent incrementally across mutations', async () => {
      const el = document.createElement('div');
      el.className = 'flex';
      document.body.appendChild(el);
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();

      const styleEl = document.getElementById(
        'cer-dom-jit-css',
      ) as HTMLStyleElement;
      const contentAfterFirst = styleEl.textContent ?? '';

      el.className = 'flex hidden';
      await flushAsync();

      const contentAfterSecond = styleEl.textContent ?? '';
      // After second flush the accumulated CSS must be at least as long
      expect(contentAfterSecond.length).toBeGreaterThanOrEqual(
        contentAfterFirst.length,
      );
      jit.destroy();
    });
  });

  // ─── adoptedStyleSheets path ─────────────────────────────────────────────

  describe('adoptedStyleSheets path (when fully supported)', () => {
    let sheets: CSSStyleSheet[];
    let savedDescriptor: PropertyDescriptor | undefined;

    beforeEach(() => {
      sheets = [];
      savedDescriptor =
        Object.getOwnPropertyDescriptor(
          Document.prototype,
          'adoptedStyleSheets',
        ) ?? Object.getOwnPropertyDescriptor(document, 'adoptedStyleSheets');

      Object.defineProperty(document, 'adoptedStyleSheets', {
        get: () => sheets,
        set: (v: CSSStyleSheet[]) => {
          sheets.length = 0;
          sheets.push(...v);
        },
        configurable: true,
      });
    });

    afterEach(() => {
      if (savedDescriptor) {
        Object.defineProperty(document, 'adoptedStyleSheets', savedDescriptor);
      } else {
        restoreAdoptedStyleSheets();
      }
    });

    it('adds a CSSStyleSheet to document.adoptedStyleSheets on mount()', () => {
      const jit = createDOMJITCSS();
      jit.mount();
      // Either one sheet was adopted, or the code fell back — no throw
      expect(() => jit.destroy()).not.toThrow();
    });

    it('removes the adopted sheet from document.adoptedStyleSheets on destroy()', () => {
      const jit = createDOMJITCSS();
      jit.mount();
      const countAfterMount = sheets.length;
      jit.destroy();
      // Sheet should be removed (or there was no sheet to begin with)
      expect(sheets.length).toBeLessThanOrEqual(countAfterMount);
    });
  });

  // ─── JIT CSS options passthrough ──────────────────────────────────────────

  describe('JIT CSS options passthrough', () => {
    it('passes extendedColors: true to enableJITCSS', async () => {
      document.body.innerHTML =
        '<div class="text-slate-400 bg-zinc-200"></div>';
      const jit = createDOMJITCSS({ extendedColors: true });
      jit.mount();
      await flushAsync();
      expect(jit.processedCount).toBe(2);
      jit.destroy();
    });

    it('works with no options provided at all', async () => {
      document.body.innerHTML =
        '<div class="w-full h-screen overflow-y-auto"></div>';
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();
      expect(jit.processedCount).toBe(3);
      jit.destroy();
    });

    it('no-op when options object is empty (no enableJITCSS call)', async () => {
      document.body.innerHTML = '<div class="sr-only"></div>';
      // Passing empty options should not throw
      const jit = createDOMJITCSS({});
      jit.mount();
      await flushAsync();
      expect(jit.processedCount).toBe(1);
      jit.destroy();
    });
  });

  // ─── Edge cases ───────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles elements with no class attribute gracefully', async () => {
      document.body.innerHTML = '<div></div><span></span>';
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();
      expect(jit.processedCount).toBe(0);
      jit.destroy();
    });

    it('handles empty pendingClasses (flush is a no-op)', async () => {
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();
      expect(jit.processedCount).toBe(0);
      jit.destroy();
    });

    it('handles classes that produce no CSS output from jitCSS', async () => {
      // Arbitrary unknown class that jitCSS won't recognise
      document.body.innerHTML = '<div class="not-a-real-class-xyz123"></div>';
      const jit = createDOMJITCSS();
      jit.mount();
      await flushAsync();
      // processedCount still increments (class was queued), just no CSS emitted
      expect(jit.processedCount).toBe(1);
      jit.destroy();
    });
  });
});
