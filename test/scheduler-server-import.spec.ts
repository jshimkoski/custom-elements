import { afterEach, describe, expect, it, vi } from 'vitest';

describe('scheduler server import', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('does not keep a server process alive with a cleanup timer', async () => {
    vi.useFakeTimers();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubGlobal('window', undefined);
    vi.resetModules();

    await import('../src/lib/runtime/scheduler');

    expect(vi.getTimerCount()).toBe(0);
  });
});
