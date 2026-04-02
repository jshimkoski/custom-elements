/**
 * Regression tests for the production-mode lifecycle hook bug.
 *
 * Root cause: in production the scheduler is async (queueMicrotask), so
 * _requestRender() in connectedCallback deferred the render to a later
 * microtask *after* handleConnected had already fired.  handleConnected
 * invoked useOnConnected callbacks that closed over ReactiveState objects
 * from a *previous* render.  After a disconnect → cleanup() → reconnect
 * cycle, cleanup() deletes those stateStorage entries, the old state
 * objects have no dependents, so subsequent ref mutations never triggered
 * re-renders even though the console logs showed the value had changed.
 *
 * Fix: connectedCallback now calls _render() directly (synchronous) so
 * handleConnected always sees fresh callbacks that close over the current
 * reactive state, regardless of scheduler mode.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  component,
  html,
  ref,
  computed,
  useProps,
  useOnConnected,
  useOnDisconnected,
} from '../src/lib';
import { updateScheduler } from '../src/lib/runtime/scheduler';

let container: HTMLElement;
let origTestEnv: unknown;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);

  // Simulate production async scheduler so the bug is reproducible.
  origTestEnv = (updateScheduler as unknown as Record<string, unknown>).testEnv;
  (updateScheduler as unknown as Record<string, unknown>).testEnv = {
    isTest: false,
    isVitest: false,
    isCypress: false,
  };
});

afterEach(() => {
  // Restore synchronous scheduler for other tests.
  (updateScheduler as unknown as Record<string, unknown>).testEnv = origTestEnv;
  document.body.removeChild(container);
});

// Flush all pending microtask-based scheduler updates.
async function flushScheduler(): Promise<void> {
  // Several levels of queueMicrotask are chained when the async scheduler
  // is active, so we need multiple await-roundtrips to drain them all.
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}

describe('useOnConnected / useOnDisconnected — production async scheduler', () => {
  it('reactive ref updated in scroll handler triggers re-render on first connection', async () => {
    const tag = 'test-prod-lifecycle-first';
    component(tag, () => {
      const props = useProps({
        variant: 'small' as 'small' | 'medium' | 'large',
      });
      const collapsed = ref(false);
      const isCollapsible = computed(
        () => props.variant === 'medium' || props.variant === 'large',
      );

      const onScroll = () => {
        collapsed.value = isCollapsible.value && (window.scrollY ?? 0) > 0;
      };

      useOnConnected(() => {
        onScroll();
        window.addEventListener('scroll', onScroll);
      });
      useOnDisconnected(() => {
        window.removeEventListener('scroll', onScroll);
      });

      return html`
        <header
          :class="${{ collapsed: collapsed.value, [props.variant]: true }}"
        >
          ${props.variant}
        </header>
      `;
    });

    container.innerHTML = `<${tag} variant="large"></${tag}>`;
    await flushScheduler();

    const host = container.querySelector(tag) as HTMLElement;
    const header = host.shadowRoot?.querySelector('header') as HTMLElement;

    expect(header.classList.contains('collapsed')).toBe(false);

    // Simulate scroll
    try {
      Object.defineProperty(window, 'scrollY', {
        value: 100,
        writable: true,
        configurable: true,
      });
    } catch {
      // ignore if scrollY is not configurable in this environment
    }

    window.dispatchEvent(new Event('scroll'));
    await flushScheduler();

    // Without the fix, collapsed would still be false in production mode.
    expect(header.classList.contains('collapsed')).toBe(true);

    // Clean up scrollY
    try {
      Object.defineProperty(window, 'scrollY', {
        value: 0,
        writable: true,
        configurable: true,
      });
    } catch {
      /* ignore */
    }
  });

  it('reactive ref updated in scroll handler triggers re-render after disconnect + reconnect', async () => {
    const tag = 'test-prod-lifecycle-reconnect';
    component(tag, () => {
      const props = useProps({
        variant: 'small' as 'small' | 'medium' | 'large',
      });
      const collapsed = ref(false);
      const isCollapsible = computed(
        () => props.variant === 'medium' || props.variant === 'large',
      );

      const onScroll = () => {
        collapsed.value = isCollapsible.value && (window.scrollY ?? 0) > 0;
      };

      useOnConnected(() => {
        onScroll();
        window.addEventListener('scroll', onScroll);
      });
      useOnDisconnected(() => {
        window.removeEventListener('scroll', onScroll);
      });

      return html`
        <header
          :class="${{ collapsed: collapsed.value, [props.variant]: true }}"
        >
          ${props.variant}
        </header>
      `;
    });

    container.innerHTML = `<${tag} variant="large"></${tag}>`;
    await flushScheduler();

    const host = container.querySelector(tag) as HTMLElement;

    // First: verify it works before disconnect.
    try {
      Object.defineProperty(window, 'scrollY', {
        value: 100,
        writable: true,
        configurable: true,
      });
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event('scroll'));
    await flushScheduler();

    const headerBefore = host.shadowRoot?.querySelector(
      'header',
    ) as HTMLElement;
    expect(headerBefore.classList.contains('collapsed')).toBe(true);

    // Reset scroll and uncollapse.
    try {
      Object.defineProperty(window, 'scrollY', {
        value: 0,
        writable: true,
        configurable: true,
      });
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event('scroll'));
    await flushScheduler();
    expect(headerBefore.classList.contains('collapsed')).toBe(false);

    // Disconnect the element.
    container.removeChild(host);
    await flushScheduler();

    // Reconnect.
    container.appendChild(host);
    await flushScheduler();

    const headerAfter = host.shadowRoot?.querySelector('header') as HTMLElement;
    expect(headerAfter.classList.contains('collapsed')).toBe(false);

    // Scroll again after reconnect — this is the critical production regression.
    try {
      Object.defineProperty(window, 'scrollY', {
        value: 200,
        writable: true,
        configurable: true,
      });
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event('scroll'));
    await flushScheduler();

    // Without the fix this fails: old onScroll closure closes over a stale
    // ReactiveState with no dependents after cleanup(), so the re-render is
    // never triggered even though collapsed.value changes.
    expect(headerAfter.classList.contains('collapsed')).toBe(true);

    // Cleanup.
    try {
      Object.defineProperty(window, 'scrollY', {
        value: 0,
        writable: true,
        configurable: true,
      });
    } catch {
      /* ignore */
    }
    window.removeEventListener('scroll', () => {});
  });
});
