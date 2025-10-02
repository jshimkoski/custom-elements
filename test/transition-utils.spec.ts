/**
 * Tests for transition-utils.ts
 * Comprehensive coverage for all transition utility functions
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { performEnterTransition, performLeaveTransition, cancelTransition } from "../src/lib/runtime/transition-utils";

describe("transition-utils.ts", () => {
  let element: HTMLElement;
  let mockTransitionMeta: any;

  beforeEach(() => {
    element = document.createElement("div");
    document.body.appendChild(element);
    
    // Reset default mock transition meta
    mockTransitionMeta = {
      classes: {
        enterFrom: "opacity-0",
        enterActive: "transition-opacity duration-300",
        enterTo: "opacity-100",
        leaveFrom: "opacity-100",
        leaveActive: "transition-opacity duration-300",
        leaveTo: "opacity-0",
      },
      css: true,
      duration: 300,
      hooks: {},
    };
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  describe("performEnterTransition", () => {
    it("should apply enter-from classes initially", async () => {
      const promise = performEnterTransition(element, mockTransitionMeta);
      
      // Give it a frame to apply initial classes
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should have enter-active classes applied
      expect(element.classList.contains("transition-opacity")).toBe(true);
      
      await promise;
    });

    it("should apply enter-to classes after transition", async () => {
      await performEnterTransition(element, mockTransitionMeta);
      
      // After transition completes, enter-to classes should be applied
      expect(element.classList.contains("opacity-100")).toBe(true);
    });

    it("should remove enter-active classes after transition", async () => {
      await performEnterTransition(element, mockTransitionMeta);
      
      // enter-active classes should be removed
      expect(element.classList.contains("transition-opacity")).toBe(false);
      expect(element.classList.contains("duration-300")).toBe(false);
    });

    it("should call onBeforeEnter hook", async () => {
      const onBeforeEnter = vi.fn();
      mockTransitionMeta.hooks = { onBeforeEnter };
      
      await performEnterTransition(element, mockTransitionMeta);
      
      expect(onBeforeEnter).toHaveBeenCalledWith(element);
    });

    it("should call onEnter hook with done callback", async () => {
      const onEnter = vi.fn((el, done) => {
        done();
      });
      mockTransitionMeta.hooks = { onEnter };
      
      await performEnterTransition(element, mockTransitionMeta);
      
      expect(onEnter).toHaveBeenCalled();
    });

    it("should call onAfterEnter hook", async () => {
      const onAfterEnter = vi.fn();
      mockTransitionMeta.hooks = { onAfterEnter };
      
      await performEnterTransition(element, mockTransitionMeta);
      
      expect(onAfterEnter).toHaveBeenCalledWith(element);
    });

    it("should handle JS-only transition with onEnter hook", async () => {
      const onEnter = vi.fn((el, done) => {
        setTimeout(done, 50);
      });
      mockTransitionMeta = {
        css: false,
        hooks: { onEnter },
      };
      
      await performEnterTransition(element, mockTransitionMeta);
      
      expect(onEnter).toHaveBeenCalledWith(element, expect.any(Function));
    });

    it("should handle JS-only transition without onEnter hook", async () => {
      mockTransitionMeta = {
        css: false,
        hooks: {},
      };
      
      await performEnterTransition(element, mockTransitionMeta);
      
      // Should complete without error
      expect(element).toBeDefined();
    });

    it("should handle duration as object with enter property", async () => {
      mockTransitionMeta.duration = { enter: 200, leave: 300 };
      
      await performEnterTransition(element, mockTransitionMeta);
      
      // Should complete successfully
      expect(element.classList.contains("opacity-100")).toBe(true);
    });

    it("should handle empty class strings", async () => {
      mockTransitionMeta.classes = {
        enterFrom: "",
        enterActive: "",
        enterTo: "",
      };
      
      await performEnterTransition(element, mockTransitionMeta);
      
      // Should complete without error
      expect(element).toBeDefined();
    });

    it("should handle multiple space-separated classes", async () => {
      mockTransitionMeta.classes = {
        enterFrom: "opacity-0 scale-95",
        enterActive: "transition-all duration-300 ease-out",
        enterTo: "opacity-100 scale-100",
      };
      
      await performEnterTransition(element, mockTransitionMeta);
      
      expect(element.classList.contains("opacity-100")).toBe(true);
      expect(element.classList.contains("scale-100")).toBe(true);
    });

    it("should catch and log errors from onBeforeEnter hook", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const onBeforeEnter = vi.fn(() => {
        throw new Error("Hook error");
      });
      mockTransitionMeta.hooks = { onBeforeEnter };
      
      await performEnterTransition(element, mockTransitionMeta);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Transition onBeforeEnter error:",
        expect.any(Error)
      );
    });

    it("should catch and log errors from onEnter hook", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const onEnter = vi.fn((el, done) => {
        // Call done even though we throw, otherwise transition waits forever
        done();
        throw new Error("Hook error");
      });
      mockTransitionMeta.hooks = { onEnter };
      
      await performEnterTransition(element, mockTransitionMeta);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Transition onEnter error:",
        expect.any(Error)
      );
    });

    it("should catch and log errors from onAfterEnter hook", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const onAfterEnter = vi.fn(() => {
        throw new Error("Hook error");
      });
      mockTransitionMeta.hooks = { onAfterEnter };
      
      await performEnterTransition(element, mockTransitionMeta);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Transition onAfterEnter error:",
        expect.any(Error)
      );
    });

    it("should use inline styles for transform and opacity", async () => {
      // Mock getComputedStyle to return transform and opacity values
      const mockComputedStyle = {
        transform: "translateX(-100%)",
        opacity: "0",
        transitionDuration: "300ms",
        transitionDelay: "0s",
      };
      vi.spyOn(window, "getComputedStyle").mockReturnValue(mockComputedStyle as any);
      
      const promise = performEnterTransition(element, mockTransitionMeta);
      
      // Allow time for inline styles to be applied
      await new Promise(resolve => setTimeout(resolve, 50));
      
      await promise;
      
      // After transition, inline styles should be cleared
      expect(element.style.transform).toBe("");
      expect(element.style.opacity).toBe("");
    });

    it("should handle elements with no transform", async () => {
      const mockComputedStyle = {
        transform: "none",
        opacity: "1",
        transitionDuration: "300ms",
        transitionDelay: "0s",
      };
      vi.spyOn(window, "getComputedStyle").mockReturnValue(mockComputedStyle as any);
      
      await performEnterTransition(element, mockTransitionMeta);
      
      // Should complete without error
      expect(element.classList.contains("opacity-100")).toBe(true);
    });

    it("should wait for transitionend event", async () => {
      const mockComputedStyle = {
        transform: "none",
        opacity: "1",
        transitionDuration: "100ms",
        transitionDelay: "0s",
      };
      vi.spyOn(window, "getComputedStyle").mockReturnValue(mockComputedStyle as any);
      
      const promise = performEnterTransition(element, mockTransitionMeta);
      
      // Dispatch transitionend event after a short delay
      setTimeout(() => {
        element.dispatchEvent(new Event("transitionend"));
      }, 50);
      
      await promise;
      
      // Should complete after transitionend
      expect(element.classList.contains("opacity-100")).toBe(true);
    });

    it("should handle transitioncancel event", async () => {
      const mockComputedStyle = {
        transform: "none",
        opacity: "1",
        transitionDuration: "100ms",
        transitionDelay: "0s",
      };
      vi.spyOn(window, "getComputedStyle").mockReturnValue(mockComputedStyle as any);
      
      const promise = performEnterTransition(element, mockTransitionMeta);
      
      // Dispatch transitioncancel event
      setTimeout(() => {
        element.dispatchEvent(new Event("transitioncancel"));
      }, 50);
      
      await promise;
      
      // Should complete after transitioncancel
      expect(element.classList.contains("opacity-100")).toBe(true);
    });
  });

  describe("performLeaveTransition", () => {
    beforeEach(() => {
      // Add some initial classes to element
      element.classList.add("opacity-100");
    });

    it("should apply leave-from classes initially", async () => {
      const promise = performLeaveTransition(element, mockTransitionMeta);
      
      // Give it a frame to apply initial classes
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should have leave-active classes applied
      expect(element.classList.contains("transition-opacity")).toBe(true);
      
      await promise;
    });

    it("should apply leave-to classes during transition", async () => {
      const promise = performLeaveTransition(element, mockTransitionMeta);
      
      // Give it time to apply leave-to classes
      await new Promise(resolve => setTimeout(resolve, 50));
      
      await promise;
      
      // After completion, all leave classes should be removed
      expect(element.classList.contains("opacity-0")).toBe(false);
    });

    it("should remove all transition classes after completion", async () => {
      await performLeaveTransition(element, mockTransitionMeta);
      
      // All leave classes should be removed
      expect(element.classList.contains("opacity-0")).toBe(false);
      expect(element.classList.contains("transition-opacity")).toBe(false);
      expect(element.classList.contains("opacity-100")).toBe(false);
    });

    it("should call onBeforeLeave hook", async () => {
      const onBeforeLeave = vi.fn();
      mockTransitionMeta.hooks = { onBeforeLeave };
      
      await performLeaveTransition(element, mockTransitionMeta);
      
      expect(onBeforeLeave).toHaveBeenCalledWith(element);
    });

    it("should call onLeave hook with done callback", async () => {
      const onLeave = vi.fn((el, done) => {
        done();
      });
      mockTransitionMeta.hooks = { onLeave };
      
      await performLeaveTransition(element, mockTransitionMeta);
      
      expect(onLeave).toHaveBeenCalled();
    });

    it("should call onAfterLeave hook", async () => {
      const onAfterLeave = vi.fn();
      mockTransitionMeta.hooks = { onAfterLeave };
      
      await performLeaveTransition(element, mockTransitionMeta);
      
      expect(onAfterLeave).toHaveBeenCalledWith(element);
    });

    it("should handle JS-only transition with onLeave hook", async () => {
      const onLeave = vi.fn((el, done) => {
        setTimeout(done, 50);
      });
      mockTransitionMeta = {
        css: false,
        hooks: { onLeave },
      };
      
      await performLeaveTransition(element, mockTransitionMeta);
      
      expect(onLeave).toHaveBeenCalledWith(element, expect.any(Function));
    });

    it("should handle JS-only transition without onLeave hook", async () => {
      mockTransitionMeta = {
        css: false,
        hooks: {},
      };
      
      await performLeaveTransition(element, mockTransitionMeta);
      
      // Should complete without error
      expect(element).toBeDefined();
    });

    it("should handle duration as object with leave property", async () => {
      mockTransitionMeta.duration = { enter: 200, leave: 150 };
      
      await performLeaveTransition(element, mockTransitionMeta);
      
      // Should complete successfully and remove all classes
      expect(element.classList.contains("opacity-0")).toBe(false);
    });

    it("should catch and log errors from onBeforeLeave hook", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const onBeforeLeave = vi.fn(() => {
        throw new Error("Hook error");
      });
      mockTransitionMeta.hooks = { onBeforeLeave };
      
      await performLeaveTransition(element, mockTransitionMeta);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Transition onBeforeLeave error:",
        expect.any(Error)
      );
    });

    it("should catch and log errors from onLeave hook", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const onLeave = vi.fn((el, done) => {
        // Call done even though we throw, otherwise transition waits forever
        done();
        throw new Error("Hook error");
      });
      mockTransitionMeta.hooks = { onLeave };
      
      await performLeaveTransition(element, mockTransitionMeta);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Transition onLeave error:",
        expect.any(Error)
      );
    });

    it("should catch and log errors from onAfterLeave hook", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const onAfterLeave = vi.fn(() => {
        throw new Error("Hook error");
      });
      mockTransitionMeta.hooks = { onAfterLeave };
      
      await performLeaveTransition(element, mockTransitionMeta);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Transition onAfterLeave error:",
        expect.any(Error)
      );
    });

    it("should handle multiple space-separated classes", async () => {
      mockTransitionMeta.classes = {
        leaveFrom: "opacity-100 scale-100",
        leaveActive: "transition-all duration-300 ease-in",
        leaveTo: "opacity-0 scale-95",
      };
      
      await performLeaveTransition(element, mockTransitionMeta);
      
      // All classes should be removed after transition
      expect(element.classList.contains("opacity-0")).toBe(false);
      expect(element.classList.contains("scale-95")).toBe(false);
    });

    it("should wait for transitionend event", async () => {
      const mockComputedStyle = {
        transform: "none",
        opacity: "1",
        transitionDuration: "100ms",
        transitionDelay: "0s",
      };
      vi.spyOn(window, "getComputedStyle").mockReturnValue(mockComputedStyle as any);
      
      const promise = performLeaveTransition(element, mockTransitionMeta);
      
      // Dispatch transitionend event after a short delay
      setTimeout(() => {
        element.dispatchEvent(new Event("transitionend"));
      }, 50);
      
      await promise;
      
      // Should complete after transitionend
      expect(element.classList.contains("opacity-0")).toBe(false);
    });

    it("should handle zero duration transitions", async () => {
      mockTransitionMeta.duration = 0;
      const mockComputedStyle = {
        transform: "none",
        opacity: "1",
        transitionDuration: "0s",
        transitionDelay: "0s",
      };
      vi.spyOn(window, "getComputedStyle").mockReturnValue(mockComputedStyle as any);
      
      await performLeaveTransition(element, mockTransitionMeta);
      
      // Should complete immediately
      expect(element.classList.contains("opacity-0")).toBe(false);
    });
  });

  describe("cancelTransition", () => {
    it("should remove all enter transition classes", () => {
      element.classList.add("opacity-0", "transition-opacity", "opacity-100");
      
      cancelTransition(element, true, mockTransitionMeta);
      
      expect(element.classList.contains("opacity-0")).toBe(false);
      expect(element.classList.contains("transition-opacity")).toBe(false);
      expect(element.classList.contains("opacity-100")).toBe(false);
    });

    it("should remove all leave transition classes", () => {
      element.classList.add("opacity-100", "transition-opacity", "opacity-0");
      
      cancelTransition(element, false, mockTransitionMeta);
      
      expect(element.classList.contains("opacity-100")).toBe(false);
      expect(element.classList.contains("transition-opacity")).toBe(false);
      expect(element.classList.contains("opacity-0")).toBe(false);
    });

    it("should call onEnterCancelled hook", () => {
      const onEnterCancelled = vi.fn();
      mockTransitionMeta.hooks = { onEnterCancelled };
      
      cancelTransition(element, true, mockTransitionMeta);
      
      expect(onEnterCancelled).toHaveBeenCalledWith(element);
    });

    it("should call onLeaveCancelled hook", () => {
      const onLeaveCancelled = vi.fn();
      mockTransitionMeta.hooks = { onLeaveCancelled };
      
      cancelTransition(element, false, mockTransitionMeta);
      
      expect(onLeaveCancelled).toHaveBeenCalledWith(element);
    });

    it("should catch and log errors from onEnterCancelled hook", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const onEnterCancelled = vi.fn(() => {
        throw new Error("Hook error");
      });
      mockTransitionMeta.hooks = { onEnterCancelled };
      
      cancelTransition(element, true, mockTransitionMeta);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Transition onEnterCancelled error:",
        expect.any(Error)
      );
    });

    it("should catch and log errors from onLeaveCancelled hook", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const onLeaveCancelled = vi.fn(() => {
        throw new Error("Hook error");
      });
      mockTransitionMeta.hooks = { onLeaveCancelled };
      
      cancelTransition(element, false, mockTransitionMeta);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Transition onLeaveCancelled error:",
        expect.any(Error)
      );
    });

    it("should handle empty class strings", () => {
      mockTransitionMeta.classes = {
        enterFrom: "",
        enterActive: "",
        enterTo: "",
      };
      
      cancelTransition(element, true, mockTransitionMeta);
      
      // Should complete without error
      expect(element).toBeDefined();
    });

    it("should handle multiple space-separated classes", () => {
      mockTransitionMeta.classes = {
        enterFrom: "opacity-0 scale-95",
        enterActive: "transition-all duration-300",
        enterTo: "opacity-100 scale-100",
      };
      element.classList.add("opacity-0", "scale-95", "transition-all", "duration-300", "opacity-100", "scale-100");
      
      cancelTransition(element, true, mockTransitionMeta);
      
      expect(element.classList.contains("opacity-0")).toBe(false);
      expect(element.classList.contains("scale-95")).toBe(false);
      expect(element.classList.contains("transition-all")).toBe(false);
      expect(element.classList.contains("opacity-100")).toBe(false);
      expect(element.classList.contains("scale-100")).toBe(false);
    });
  });

  describe("Edge cases and performance", () => {
    it("should handle rapidly cancelled transitions", async () => {
      const promise = performEnterTransition(element, mockTransitionMeta);
      
      // Cancel immediately
      cancelTransition(element, true, mockTransitionMeta);
      
      await promise;
      
      // Should complete without error
      expect(element).toBeDefined();
    });

    it("should handle transition on disconnected element", async () => {
      const disconnectedElement = document.createElement("div");
      
      await performEnterTransition(disconnectedElement, mockTransitionMeta);
      
      // Should complete without error
      expect(disconnectedElement).toBeDefined();
    });

    it("should handle very long transition durations", async () => {
      mockTransitionMeta.duration = 10000; // 10 seconds
      
      const promise = performEnterTransition(element, mockTransitionMeta);
      
      // Dispatch transitionend early
      setTimeout(() => {
        element.dispatchEvent(new Event("transitionend"));
      }, 100);
      
      await promise;
      
      // Should complete after event, not after full duration
      expect(element.classList.contains("opacity-100")).toBe(true);
    });

    it("should handle transition with delay", async () => {
      const mockComputedStyle = {
        transform: "none",
        opacity: "1",
        transitionDuration: "100ms",
        transitionDelay: "50ms",
      };
      vi.spyOn(window, "getComputedStyle").mockReturnValue(mockComputedStyle as any);
      
      await performEnterTransition(element, mockTransitionMeta);
      
      // Should calculate total duration including delay
      expect(element.classList.contains("opacity-100")).toBe(true);
    });

    it("should not add duplicate classes", async () => {
      // Pre-add some classes
      element.classList.add("opacity-100");
      
      await performEnterTransition(element, mockTransitionMeta);
      
      // Should not have duplicate classes
      const opacityClasses = Array.from(element.classList).filter(c => c === "opacity-100");
      expect(opacityClasses.length).toBe(1);
    });

    it("should handle classes with special characters", async () => {
      mockTransitionMeta.classes = {
        enterFrom: "opacity-0 translate-x-[-100%]",
        enterActive: "transition-all duration-300",
        enterTo: "opacity-100 translate-x-[0%]",
      };
      
      await performEnterTransition(element, mockTransitionMeta);
      
      // Should handle bracket notation in class names
      expect(element.classList.contains("opacity-100")).toBe(true);
    });
  });

  describe("Internal helper functions (via exports)", () => {
    it("should handle transition with ms duration", async () => {
      const mockComputedStyle = {
        transform: "none",
        opacity: "1",
        transitionDuration: "300ms",
        transitionDelay: "0ms",
      };
      vi.spyOn(window, "getComputedStyle").mockReturnValue(mockComputedStyle as any);
      
      await performEnterTransition(element, mockTransitionMeta);
      
      expect(element.classList.contains("opacity-100")).toBe(true);
    });

    it("should handle transition with seconds duration", async () => {
      const mockComputedStyle = {
        transform: "none",
        opacity: "1",
        transitionDuration: "0.3s",
        transitionDelay: "0s",
      };
      vi.spyOn(window, "getComputedStyle").mockReturnValue(mockComputedStyle as any);
      
      await performEnterTransition(element, mockTransitionMeta);
      
      expect(element.classList.contains("opacity-100")).toBe(true);
    });

    it("should filter out falsy classes", async () => {
      mockTransitionMeta.classes = {
        enterFrom: "opacity-0  ", // Extra spaces
        enterActive: "  transition-opacity  duration-300  ",
        enterTo: "  opacity-100",
      };
      
      await performEnterTransition(element, mockTransitionMeta);
      
      // Should handle whitespace correctly
      expect(element.classList.contains("opacity-100")).toBe(true);
    });
  });
});
