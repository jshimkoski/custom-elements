import { describe, it, expect, vi } from 'vitest';

describe('runtime/logger', () => {
  const loggerPath = '../src/lib/runtime/logger';

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('does not call console methods in production mode', async () => {
    // arrange: simulate production
    (process as any).env = { ...(process.env || {}), NODE_ENV: 'production' };
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
    expect(spyError).not.toHaveBeenCalled();
    expect(spyLog).not.toHaveBeenCalled();
  });

  it('calls console methods in dev/test mode', async () => {
    (process as any).env = { ...(process.env || {}), NODE_ENV: 'test' };
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
    // simulate environment without process and with a window
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
});
