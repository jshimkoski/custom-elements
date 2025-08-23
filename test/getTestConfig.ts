import { vi } from 'vitest';

/**
 * Returns a standard test config for runtime component tests.
 */
export function getTestConfig() {
  return {
    render: (state: any) => `<div>Hello ${state.name}</div>`,
    state: { name: 'World' },
    style: 'div { color: blue; }',
    computed: {
      greeting: (state: any) => `Hello ${state.name}`,
    },
    onConnected: vi.fn(),
    onDisconnected: vi.fn(),
    onError: vi.fn(),
  };
}
