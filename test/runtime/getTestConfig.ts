import { vi } from 'vitest';

/**
 * Returns a standard test config for runtime component tests.
 */
export function getTestConfig() {
  return {
    template: (state: any) => `<div>Hello ${state.name}</div>`,
    state: { name: 'World' },
    style: 'div { color: blue; }',
    computed: {
      greeting: (state: any) => `Hello ${state.name}`,
    },
    refs: {
      testRef: vi.fn(),
    },
    onMounted: vi.fn(),
    onUnmounted: vi.fn(),
    onError: vi.fn(),
    debug: true,
    reflect: [] as string[],
  };
}
