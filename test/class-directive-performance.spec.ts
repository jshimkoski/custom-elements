import { describe, it, expect } from 'vitest';
import { component, html, ref } from '../src/lib/index';

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

    // Perform 1000 rapid toggles
    for (let i = 0; i < 1000; i++) {
      (window as any).__toggleActive();
      // Yield to allow render cycle
      await new Promise((r) => setTimeout(r, 0));
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

    // Should complete in a reasonable time (less than 5 seconds for 1000 toggles)
    expect(duration).toBeLessThan(5000);

    // Clean up
    document.body.innerHTML = '';
  });

  it('should handle elements with many attrs efficiently', async () => {
    component('perf-test-many-attrs', () => {
      const active = ref(false);

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

    const startTime = performance.now();

    // Perform 500 toggles with many attrs
    for (let i = 0; i < 500; i++) {
      (window as any).__toggleManyAttrs();
      await new Promise((r) => setTimeout(r, 0));
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`Many attrs performance:`);
    console.log(`- Total time: ${duration.toFixed(2)}ms`);
    console.log(`- Avg per render: ${(duration / 500).toFixed(3)}ms`);

    // Should complete reasonably even with many attrs
    expect(duration).toBeLessThan(5000);

    // Clean up
    document.body.innerHTML = '';
  });
});
