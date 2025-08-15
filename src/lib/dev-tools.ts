// Performance utilities
export const DevPerformance = {
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
  // Logging utilities
  log(...args: unknown[]) {
    console.log('[DEV]', ...args);
  },

  warn(...args: unknown[]) {
    console.warn('[DEV]', ...args);
  },

  error(...args: unknown[]) {
    console.error('[DEV]', ...args);
  },

  debug(...args: unknown[]) {
    console.debug('[DEV]', ...args);
  },

  group(...args: unknown[]) {
    console.group('[DEV]', ...args);
  },


  groupEnd() {
    console.groupEnd();
  },

};

// Development utilities
export const DevTools = {
  // Component lifecycle timing
  startTiming(_componentName: string): () => number {
    let nowFn: (() => number) | undefined;
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      nowFn = () => performance.now();
    } else if (typeof Date.now === 'function') {
      nowFn = () => Date.now();
    } else {
      nowFn = () => NaN;
    }
    const start = nowFn();
    return () => nowFn() - start;
  },
  // Component inspection
  inspectComponent(element: HTMLElement): any {
    return {
      tagName: element.tagName.toLowerCase(),
      state: (element as any).state ?? {},
      shadowRoot: element.shadowRoot,
      attributes: Array.from(element.attributes),
      computedStyle: getComputedStyle(element)
    };
  },

  // State change tracking
  trackStateChanges(element: HTMLElement, callback: (changes: any) => void): () => void {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (typeof callback === 'function') {
        callback(customEvent.detail);
      }
    };
    element.addEventListener('component-state-change', handler);
    return () => element.removeEventListener('component-state-change', handler);
  },

  // Logging utilities
  log(...args: unknown[]) {
    console.log('[DEV]', ...args);
  },

  warn(...args: unknown[]) {
    console.warn('[DEV]', ...args);
  },

  error(...args: unknown[]) {
    console.error('[DEV]', ...args);
  },

  debug(...args: unknown[]) {
    console.debug('[DEV]', ...args);
  },

  group(...args: unknown[]) {
    if (args.length === 0) {
      console.group('[DEV]', undefined);
    } else {
      console.group('[DEV]', ...args);
    }
  },

  groupEnd() {
    console.groupEnd();
  }
};
