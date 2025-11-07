import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('runtime/logger (runtime toggle)', () => {
  const OLD_ENV = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
    process.env.NODE_ENV = OLD_ENV;
    // ensure no global leak
    const g = globalThis as unknown as Record<string, unknown>;
    delete g.__CE_RUNTIME_DEV__;
  });

  afterEach(() => {
    const g = globalThis as unknown as Record<string, unknown>;
    delete g.__CE_RUNTIME_DEV__;
    vi.restoreAllMocks();
    process.env.NODE_ENV = OLD_ENV;
  });

  it('honors global flag if set before import', async () => {
    process.env.NODE_ENV = 'production';
    const g = globalThis as unknown as Record<string, unknown>;
    g.__CE_RUNTIME_DEV__ = true;

    const logger = await import('../src/lib/runtime/logger');

    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger.devError('err');
    logger.devWarn('warn');
    logger.devLog('log');

    expect(err).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
  });

  it('allows toggling via exported setDevMode at runtime', async () => {
    process.env.NODE_ENV = 'production';
    const logger = await import('../src/lib/runtime/logger');

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    // initially production: nothing
    logger.devLog('first');
    expect(log).not.toHaveBeenCalled();

    // toggle on
    logger.setDevMode(true);
    logger.devLog('second');
    expect(log).toHaveBeenCalledWith('second');
  });
});
