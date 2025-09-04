import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { component } from '../src/lib/runtime/component';

describe('reserved keys warning', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('warns when state uses reserved keys', () => {
    component('test-reserved-state', {
      state: {
        error: '',
      },
      render: (ctx) => '' as any,
    } as any);

    expect(warnSpy).toHaveBeenCalled();
    const calledWith = (warnSpy.mock as any).calls[0][0] as string;
    expect(calledWith).toMatch(/Reserved runtime context keys used/);
  });

  it('warns when props uses reserved keys', () => {
    component('test-reserved-props', {
      props: {
        refs: { type: String as any },
      } as any,
      render: (ctx) => '' as any,
    } as any);

    expect(warnSpy).toHaveBeenCalled();
  });

  it('warns when computed uses reserved keys', () => {
    component('test-reserved-computed', {
      computed: {
        emit: (ctx: any) => '',
      } as any,
      render: (ctx) => '' as any,
    } as any);

    expect(warnSpy).toHaveBeenCalled();
  });
});
