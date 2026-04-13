/// <reference types="node" />

import { describe, it, expect, vi, afterEach } from 'vitest';

describe('runtime/logger', () => {
  const loggerPath = '../src/lib/runtime/logger';

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('only suppresses dev-only warnings and logs in production mode', async () => {
    // arrange: simulate production
    process.env = { ...(process.env || {}), NODE_ENV: 'production' };
    vi.resetModules();
    const logger = await import(loggerPath);
    const spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const spyError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    // act
    logger.devWarn('x');
    logger.devError('y');
    logger.devLog('z');

    // assert - production shouldn't log
    expect(spyWarn).not.toHaveBeenCalled();
    expect(spyError).toHaveBeenCalledWith('y');
    expect(spyLog).not.toHaveBeenCalled();
  });

  it('calls console methods in dev/test mode', async () => {
    process.env = { ...(process.env || {}), NODE_ENV: 'test' };
    vi.resetModules();
    const logger = await import(loggerPath);
    const spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const spyError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger.devWarn('w');
    logger.devError('e');
    logger.devLog('l');

    expect(spyWarn).toHaveBeenCalled();
    expect(spyError).toHaveBeenCalled();
    expect(spyLog).toHaveBeenCalled();
  });

  it('falls back to window detection when process is unavailable', async () => {
    // simulate environment without process; the test runner still provides
    // import.meta.env in test mode so dev logging remains enabled
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const realProcess = globalThis.process;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete globalThis.process;
    try {
      vi.resetModules();
      const logger = await import(loggerPath);
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      logger.devWarn('x');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    } finally {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      globalThis.process = realProcess;
    }
  });

  it('dedupes repeated warnings within a render warning scope', async () => {
    process.env = { ...(process.env || {}), NODE_ENV: 'test' };
    vi.resetModules();
    const logger = await import(loggerPath);
    const spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    logger.beginRenderWarningScope();
    try {
      logger.devWarn('same warning');
      logger.devWarn('same warning');
      logger.devWarn('different warning');
    } finally {
      logger.endRenderWarningScope();
    }

    expect(spyWarn).toHaveBeenCalledTimes(2);
    expect(spyWarn).toHaveBeenNthCalledWith(1, 'same warning');
    expect(spyWarn).toHaveBeenNthCalledWith(2, 'different warning');
  });

  it('dedupes repeated warn-once messages across separate calls', async () => {
    process.env = { ...(process.env || {}), NODE_ENV: 'test' };
    vi.resetModules();
    const logger = await import(loggerPath);
    const spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    logger.devWarnOnce('same warning');
    logger.devWarnOnce('same warning');
    logger.devWarnOnce('different warning');

    expect(spyWarn).toHaveBeenCalledTimes(2);
    expect(spyWarn).toHaveBeenNthCalledWith(1, 'same warning');
    expect(spyWarn).toHaveBeenNthCalledWith(2, 'different warning');
  });
});
