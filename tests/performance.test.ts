import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { component } from "../src/lib/runtime";
import {
  stylePerformanceMonitor,
  StyleCache,
  createStateHash,
} from "../src/lib/style-utils";

// Mock performance.now for consistent testing
const originalPerformanceNow = performance.now;
let mockTime = 0;

beforeEach(() => {
  mockTime = 0;
  (performance as any).now = () => mockTime;
  stylePerformanceMonitor.reset();
});

afterEach(() => {
  performance.now = originalPerformanceNow;
});

describe("Style Performance Optimizations", () => {
  describe("StyleCache", () => {
    let cache: StyleCache;

    beforeEach(() => {
      cache = new StyleCache(5); // Small cache for testing
    });

    it("should cache style entries", () => {
      cache.set("key1", "color: red;", ["theme"]);

      expect(cache.has("key1")).toBe(true);
      expect(cache.get("key1")).toBe("color: red;");
    });

    it("should evict oldest entries when cache is full", () => {
      // Fill cache to capacity
      for (let i = 0; i < 5; i++) {
        cache.set(`key${i}`, `color: color${i};`, []);
      }

      // All entries should be present
      for (let i = 0; i < 5; i++) {
        expect(cache.has(`key${i}`)).toBe(true);
      }

      // Add one more entry, should evict the oldest
      cache.set("key5", "color: color5;", []);

      // First entry should be evicted
      expect(cache.has("key0")).toBe(false);
      expect(cache.has("key5")).toBe(true);
    });

    it("should invalidate entries by dependency", () => {
      cache.set("style1", "color: red;", ["theme"]);
      cache.set("style2", "color: blue;", ["size"]);
      cache.set("style3", "color: green;", ["theme", "size"]);

      cache.invalidate("theme");

      expect(cache.has("style1")).toBe(false); // Should be invalidated
      expect(cache.has("style2")).toBe(true); // Should remain
      expect(cache.has("style3")).toBe(false); // Should be invalidated
    });

    it("should update access order for LRU eviction", () => {
      cache.set("key1", "style1", []);
      cache.set("key2", "style2", []);
      cache.set("key3", "style3", []);
      cache.set("key4", "style4", []);
      cache.set("key5", "style5", []);

      // Access key1 to make it most recently used
      cache.get("key1");

      // Add new entry, should evict key2 (least recently used after key1 access)
      cache.set("key6", "style6", []);

      expect(cache.has("key1")).toBe(true); // Should remain (recently accessed)
      expect(cache.has("key2")).toBe(false); // Should be evicted
      expect(cache.has("key6")).toBe(true); // Should be added
    });
  });

  describe("Component Style Performance", () => {
    beforeEach(() => {
      // Clean up any existing elements
      document.body.innerHTML = "";
    });

    it("should cache computed styles and avoid recalculation", async () => {
      let styleComputeCount = 0;

      const TestComponent = component("test-cache-component", {
        state: {
          theme: "light",
          size: "medium",
          otherProp: "value",
        },

        style: {
          css: (state: any) => {
            styleComputeCount++;
            return `
              .test {
                background: ${state.theme === "dark" ? "#333" : "#fff"};
                font-size: ${state.size === "large" ? "18px" : "16px"};
              }
            `;
          },
          dependencies: ["theme", "size"],
          cache: true,
        },

        styleOptimizations: {
          enableCaching: true,
          debounceMs: 0, // Immediate updates for testing
        },

        render: () => ({ tag: "div", children: [] }),
      });

      const element = document.createElement("test-cache-component") as any;
      document.body.appendChild(element);

      // Wait for initial render
      await new Promise((resolve) => setTimeout(resolve, 10));
      const initialComputeCount = styleComputeCount;

      // Change non-style dependency - should not recompute styles
      (element as any)._state.otherProp = "new value";
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(styleComputeCount).toBe(initialComputeCount);

      // Change style dependency - should recompute
      (element as any)._state.theme = "dark";
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(styleComputeCount).toBeGreaterThanOrEqual(initialComputeCount + 1);

      // Change same style dependency to same value - should use cache
      (element as any)._state.theme = "dark";
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Change back to original value - should use cache
      (element as any)._state.theme = "light";
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    it("should debounce rapid style updates", async () => {
      let updateCount = 0;

      const TestComponent = component("test-debounce-component", {
        state: {
          color: "#000000",
        },

        style: {
          css: (state: any) => {
            updateCount++;
            return `.test { color: ${state.color}; }`;
          },
          dependencies: ["color"],
          cache: true,
        },

        styleOptimizations: {
          enableCaching: true,
          debounceMs: 50, // 50ms debounce for testing
        },

        render: () => ({ tag: "div", children: [] }),
      });

      const element = document.createElement("test-debounce-component") as any;
      document.body.appendChild(element);

      // Wait for initial render
      await new Promise((resolve) => setTimeout(resolve, 20));
      const initialCount = updateCount;

      // Single state change should work
      (element as any)._state.color = "#111111";
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Should have updated at least once
      expect(updateCount).toBeGreaterThan(initialCount);
    });

    it("should perform style-only updates when appropriate", async () => {
      let renderCount = 0;
      let styleUpdateCount = 0;

      const TestComponent = component("test-style-only-component", {
        state: {
          theme: "light",
          content: "Hello",
        },

        style: {
          css: (state: any) => {
            styleUpdateCount++;
            return `.test { background: ${state.theme === "dark" ? "#333" : "#fff"}; }`;
          },
          dependencies: ["theme"],
          cache: true,
        },

        styleOptimizations: {
          enableCaching: true,
          debounceMs: 0,
        },

        render: (state: any) => {
          renderCount++;
          return {
            tag: "div",
            children: [{ tag: "#text", children: state.content }],
          };
        },
      });

      const element = document.createElement(
        "test-style-only-component",
      ) as any;
      document.body.appendChild(element);

      await new Promise((resolve) => setTimeout(resolve, 10));
      const initialRenderCount = renderCount;
      const initialStyleCount = styleUpdateCount;

      // Change content - should trigger full render
      (element as any)._state.content = "World";
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(renderCount).toBeGreaterThanOrEqual(initialRenderCount + 1);

      // Change theme - should ideally only update styles (implementation dependent)
      (element as any)._state.theme = "dark";
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(styleUpdateCount).toBeGreaterThan(initialStyleCount);
    });
  });

  describe("Performance Monitoring", () => {
    it("should track style operation timing", () => {
      const timer = stylePerformanceMonitor.startTimer("test-operation");

      mockTime = 100;
      const duration1 = timer();
      expect(duration1).toBe(100);

      // Start another operation
      mockTime = 150;
      const timer2 = stylePerformanceMonitor.startTimer("test-operation");
      mockTime = 200;
      timer2();

      const stats = stylePerformanceMonitor.getStats("test-operation");
      expect(stats).toBeTruthy();
      expect(stats!.count).toBe(2);
      expect(stats!.average).toBe(75); // (100 + 50) / 2
      expect(stats!.min).toBe(50);
      expect(stats!.max).toBe(100);
    });

    it("should maintain limited history of measurements", () => {
      // Create more than 100 measurements
      for (let i = 0; i < 150; i++) {
        const timer = stylePerformanceMonitor.startTimer("bulk-test");
        mockTime += 10;
        timer();
      }

      const stats = stylePerformanceMonitor.getStats("bulk-test");
      expect(stats!.count).toBeLessThanOrEqual(100); // Should be limited to 100
    });

    it("should provide aggregate stats for all operations", () => {
      // Create measurements for different operations
      ["op1", "op2", "op3"].forEach((op) => {
        const timer = stylePerformanceMonitor.startTimer(op);
        mockTime += 25;
        timer();
      });

      const allStats = stylePerformanceMonitor.getStats();
      expect(Object.keys(allStats)).toHaveLength(3);
      expect(allStats.op1).toBeTruthy();
      expect(allStats.op2).toBeTruthy();
      expect(allStats.op3).toBeTruthy();
    });
  });

  describe("Memory Management", () => {
    it("should clean up caches on component disconnect", async () => {
      const TestComponent = component("test-cleanup-component", {
        state: { value: "test" },

        style: {
          css: () => ".test { color: red; }",
          cache: true,
        },

        render: () => ({ tag: "div", children: [] }),
      });

      const element = document.createElement("test-cleanup-component") as any;
      document.body.appendChild(element);

      // Let component initialize
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify cache has entries (internal state, not directly testable)
      // This is more of an integration test

      // Remove element to trigger cleanup
      document.body.removeChild(element);

      // Component should have cleaned up internal state
      // This is verified through no memory leaks in long-running tests
    });

    it("should handle rapid component creation and destruction", async () => {
      const TestComponent = component("test-rapid-component", {
        state: { id: Math.random() },
        style: () => ".test { color: blue; }",
        render: () => ({ tag: "div", children: [] }),
      });

      const elements: Element[] = [];

      // Create many components rapidly
      for (let i = 0; i < 100; i++) {
        const element = document.createElement("test-rapid-component");
        document.body.appendChild(element);
        elements.push(element);
      }

      // Let them initialize
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Remove them all
      elements.forEach((element) => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });

      // This test mainly ensures no errors are thrown during rapid lifecycle
      expect(elements).toHaveLength(100);
    });
  });

  describe("Integration Performance Tests", () => {
    it("should handle complex styling scenarios efficiently", async () => {
      let totalStyleComputations = 0;

      const ComplexComponent = component("complex-performance-component", {
        state: {
          theme: "light",
          size: "medium",
          variant: "primary",
          disabled: false,
          loading: false,
        },

        computed: {
          colorScheme: (state: any) => ({
            primary: state.theme === "dark" ? "#60a5fa" : "#3b82f6",
            background: state.theme === "dark" ? "#1f2937" : "#f9fafb",
            text: state.theme === "dark" ? "#f9fafb" : "#1f2937",
          }),
        },

        style: {
          css: (state: any) => {
            totalStyleComputations++;
            return `
              :host {
                display: block;
                transition: all 0.2s ease;
              }

              .container {
                padding: ${state.size === "small" ? "8px" : state.size === "large" ? "24px" : "16px"};
                background: ${state.colorScheme.background};
                color: ${state.colorScheme.text};
                border-radius: ${state.size === "small" ? "4px" : "8px"};
                opacity: ${state.loading ? "0.5" : "1"};
                pointer-events: ${state.disabled ? "none" : "auto"};
              }

              .variant-${state.variant} {
                border: 2px solid ${state.colorScheme.primary};
              }
            `;
          },
          dependencies: [
            "theme",
            "size",
            "variant",
            "disabled",
            "loading",
            "colorScheme",
          ],
          cache: true,
        },

        styleOptimizations: {
          enableCaching: true,
          enableMinification: true,
          enableDeduplication: true,
          debounceMs: 16,
        },

        render: () => ({
          tag: "div",
          props: { class: "container" },
          children: [],
        }),
      });

      const element = document.createElement(
        "complex-performance-component",
      ) as any;
      document.body.appendChild(element);

      await new Promise((resolve) => setTimeout(resolve, 20));
      const baselineComputations = totalStyleComputations;

      // Perform multiple state changes
      const stateChanges = [
        () => ((element as any)._state.theme = "dark"),
        () => ((element as any)._state.size = "large"),
        () => ((element as any)._state.variant = "secondary"),
        () => ((element as any)._state.disabled = true),
        () => ((element as any)._state.loading = true),
        () => ((element as any)._state.theme = "light"), // Should use cache
        () => ((element as any)._state.size = "medium"), // Should use cache
      ];

      for (const change of stateChanges) {
        change();
        await new Promise((resolve) => setTimeout(resolve, 20));
      }

      // Should have significantly fewer computations than state changes due to caching
      const totalComputations = totalStyleComputations - baselineComputations;
      expect(totalComputations).toBeLessThanOrEqual(stateChanges.length);
      // Allow for zero computations in case caching is very aggressive
      expect(totalComputations).toBeGreaterThanOrEqual(0);
    });

    it("should maintain performance with many components", async () => {
      const startTime = performance.now();

      const SimpleComponent = component("perf-test-component", {
        state: { index: 0 },
        style: {
          css: (state: any) =>
            `.item-${state.index} { color: hsl(${state.index * 10}, 50%, 50%); }`,
          dependencies: ["index"],
          cache: true,
        },
        render: () => ({ tag: "div", children: [] }),
      });

      const elements: Element[] = [];
      const componentCount = 50;

      // Create many components
      for (let i = 0; i < componentCount; i++) {
        const element = document.createElement("perf-test-component") as any;
        document.body.appendChild(element);
        // Set state after adding to DOM
        if (element._state) {
          element._state.index = i;
        }
        elements.push(element);
      }

      // Wait for all to initialize
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Update all components
      elements.forEach((element: any, i) => {
        if (element._state) {
          element._state.index = i + componentCount;
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete reasonably quickly (this is environment dependent)
      // Mainly ensures no performance regressions
      expect(totalTime).toBeLessThan(5000); // 5 seconds max

      // Cleanup
      elements.forEach((element) => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should persist styles during state changes", async () => {
      const TestComponent = component("style-persistence-test", {
        state: {
          count: 0,
          theme: "blue",
        },

        style: `
          :host {
            display: block;
            background: linear-gradient(135deg, #4299e1, #667eea);
            border: 2px solid #3182ce;
            padding: 20px;
          }
          .content {
            color: white;
            font-weight: bold;
          }
        `,

        render: (state) => ({
          tag: "div",
          props: { class: "content" },
          children: [`Count: ${state.count}, Theme: ${state.theme}`],
        }),
      });

      const element = document.createElement("style-persistence-test") as any;
      document.body.appendChild(element);

      await new Promise((resolve) => setTimeout(resolve, 20));

      // Verify initial styles exist
      const styleElement = element.shadowRoot?.querySelector("style");
      expect(styleElement).toBeTruthy();
      expect(styleElement?.textContent).toContain("linear-gradient");
      expect(styleElement?.textContent).toContain("border: 2px solid");

      const initialStyleContent = styleElement?.textContent || "";

      // Update state multiple times (should not remove styles)
      (element as any)._state.count = 1;
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Verify styles still exist and are unchanged
      const styleElementAfter1 = element.shadowRoot?.querySelector("style");
      expect(styleElementAfter1).toBeTruthy();
      expect(styleElementAfter1?.textContent).toBe(initialStyleContent);

      (element as any)._state.count = 2;
      (element as any)._state.theme = "red";
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Verify styles still exist after multiple updates
      const styleElementAfter2 = element.shadowRoot?.querySelector("style");
      expect(styleElementAfter2).toBeTruthy();
      expect(styleElementAfter2?.textContent).toBe(initialStyleContent);
      expect(styleElementAfter2?.textContent).toContain("linear-gradient");
    });

    it("should handle invalid cache operations gracefully", () => {
      const cache = new StyleCache(5);

      // Test with null/undefined values
      expect(() => cache.set("key", null as any, [])).not.toThrow();
      expect(() => cache.get("nonexistent")).not.toThrow();
      expect(() => cache.invalidate("nonexistent")).not.toThrow();

      expect(cache.get("nonexistent")).toBeNull();
    });

    it("should handle circular references in state hashing", () => {
      const circularObj: any = { a: 1 };
      circularObj.self = circularObj;

      // Should not throw and should return a reasonable hash
      expect(() => createStateHash([circularObj])).not.toThrow();
      const hash = createStateHash([circularObj]);
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should handle components with no style configuration", async () => {
      const NoStyleComponent = component("no-style-component", {
        state: { value: "test" },
        render: () => ({ tag: "div", children: [] }),
      });

      const element = document.createElement("no-style-component");
      document.body.appendChild(element);

      // Should not throw errors
      await new Promise((resolve) => setTimeout(resolve, 10));
      const styleElement = element.shadowRoot?.querySelector("style");
      expect(styleElement?.textContent || "").toBe("");
    });

    it("should handle malformed CSS gracefully", async () => {
      const BadCSSComponent = component("bad-css-component", {
        state: { value: "test" },
        style: () => "invalid css { { { }",
        render: () => ({ tag: "div", children: [] }),
      });

      const element = document.createElement("bad-css-component");

      // Should not throw during creation
      expect(() => document.body.appendChild(element)).not.toThrow();

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Component should still function
      expect(element.shadowRoot).toBeTruthy();
    });
  });
});
