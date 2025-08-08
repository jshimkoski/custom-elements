// Performance utilities
export const Performance = {
  // Measure component render time
  measureRender<T>(name: string, fn: () => T): T {
    if (typeof performance !== 'undefined' && performance.mark) {
      const startMark = `${name}-start`;
      const endMark = `${name}-end`;
      const measureName = `${name}-render`;
      
      performance.mark(startMark);
      const result = fn();
      performance.mark(endMark);
      performance.measure(measureName, startMark, endMark);
      
      return result;
    }
    return fn();
  },

  // Memory usage monitoring
  getMemoryInfo(): any {
    return (performance as any)?.memory || null;
  },

  // Component lifecycle timing
  startTiming(_componentName: string): () => number {
    const start = performance.now();
    return () => performance.now() - start;
  }
};

// Development utilities
export const DevTools = {
  // Component inspection
  inspectComponent(element: HTMLElement): any {
    return {
      tagName: element.tagName.toLowerCase(),
      state: (element as any).state,
      shadowRoot: element.shadowRoot,
      attributes: Array.from(element.attributes),
      computedStyle: getComputedStyle(element)
    };
  },

  // State change tracking
  trackStateChanges(element: HTMLElement, callback: (changes: any) => void): () => void {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      callback(customEvent.detail);
    };
    element.addEventListener('component-state-change', handler);
    return () => element.removeEventListener('component-state-change', handler);
  }
};
