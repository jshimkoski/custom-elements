import { describe, it, expect } from 'vitest';
import { component, html, ref, flushDOMUpdates } from '../src/lib/index';

describe('class directive performance', () => {
  it('should handle rapid toggles efficiently', async () => {
    let renderCount = 0;

    component('perf-test-class', () => {
      const active = ref(false);
      renderCount++;

      (window as any).__toggleActive = () => {
        active.value = !active.value;
      };

      return html`
        <div
          class="base-class another-class"
          :class=${{ active: active.value, inactive: !active.value }}
        ></div>
      `;
    });

    document.body.innerHTML = '<perf-test-class></perf-test-class>';
    await new Promise((r) => setTimeout(r, 20));

    const initialRenderCount = renderCount;
    const startTime = performance.now();

    // Perform fewer toggles to avoid throttling warnings in test environment
    for (let i = 0; i < 100; i++) {
      (window as any).__toggleActive();
      // Flush DOM updates synchronously in test environment
      flushDOMUpdates();
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    const rendersPerformed = renderCount - initialRenderCount;

    console.log(`Performance test results:`);
    console.log(`- Total time: ${duration.toFixed(2)}ms`);
    console.log(`- Renders: ${rendersPerformed}`);
    console.log(
      `- Avg per render: ${(duration / rendersPerformed).toFixed(3)}ms`,
    );

    // Should complete in a reasonable time (less than 2 seconds for 100 toggles)
    expect(duration).toBeLessThan(2000);
    // Should not render excessively (allow some batching)
    expect(rendersPerformed).toBeLessThan(200);

    // Clean up
    document.body.innerHTML = '';
  });

  it('should handle elements with many attrs efficiently', async () => {
    let renderCount = 0;

    component('perf-test-many-attrs', () => {
      const active = ref(false);
      renderCount++;

      (window as any).__toggleManyAttrs = () => {
        active.value = !active.value;
      };

      // Element with many static attributes
      return html`
        <div
          data-id="test"
          data-name="example"
          data-value="foo"
          data-type="component"
          data-index="0"
          data-key="abc123"
          data-ref="myRef"
          data-state="ready"
          aria-label="Test element"
          aria-hidden="false"
          role="button"
          tabindex="0"
          class="base one two three four five"
          :class=${{ active: active.value }}
        ></div>
      `;
    });

    document.body.innerHTML = '<perf-test-many-attrs></perf-test-many-attrs>';
    await new Promise((r) => setTimeout(r, 20));

    const initialRenderCount = renderCount;
    const startTime = performance.now();

    // Perform fewer toggles to avoid throttling
    for (let i = 0; i < 50; i++) {
      (window as any).__toggleManyAttrs();
      flushDOMUpdates();
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    const rendersPerformed = renderCount - initialRenderCount;

    console.log(`Many attrs performance:`);
    console.log(`- Total time: ${duration.toFixed(2)}ms`);
    console.log(`- Renders: ${rendersPerformed}`);
    console.log(
      `- Avg per render: ${(duration / rendersPerformed).toFixed(3)}ms`,
    );

    // Should complete reasonably even with many attrs
    expect(duration).toBeLessThan(2000);

    // Clean up
    document.body.innerHTML = '';
  });
});
