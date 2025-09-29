import { describe, it, expect, beforeEach } from 'vitest';
import {
  setCurrentComponentContext,
  clearCurrentComponentContext,
  useProps,
} from '../src/lib/runtime/hooks';

describe('useProps', () => {
  beforeEach(() => {
    // Ensure no lingering context
    clearCurrentComponentContext();
  });

  it('throws when called outside render', () => {
    expect(() => useProps({ foo: 'bar' })).toThrow(/must be called during component render/);
  });

  it('returns an object with default values when context has no values', () => {
    const ctx: any = {};
    setCurrentComponentContext(ctx);

    const props = useProps({ modelValue: false, label: 'hello' });

    expect(props).toHaveProperty('modelValue');
    expect(props.modelValue).toBe(false);
    expect(props.label).toBe('hello');

    clearCurrentComponentContext();
  });

  it('prefers context value over default when present', () => {
    const ctx: any = { modelValue: true };
    setCurrentComponentContext(ctx);

    const props = useProps({ modelValue: false, label: 'hello' });

    expect(props.modelValue).toBe(true);
    expect(props.label).toBe('hello');

    clearCurrentComponentContext();
  });

  it('updates getters when context values change during same render', () => {
    const ctx: any = {};
    setCurrentComponentContext(ctx);

    const props = useProps({ modelValue: false });
    expect(props.modelValue).toBe(false);

    // simulate the render-time context being populated later
    ctx.modelValue = true;
    expect(props.modelValue).toBe(true);

    clearCurrentComponentContext();
  });

  it('multiple calls merge defaults into _hookCallbacks.props', () => {
    const ctx: any = {};
    setCurrentComponentContext(ctx);

    const propsA = useProps({ a: 1 });
    const propsB = useProps({ b: 2 });

    // Hook callbacks should have merged defaults
    expect(ctx._hookCallbacks).toBeDefined();
    expect(ctx._hookCallbacks.props).toEqual({ a: 1, b: 2 });

    // Returned props should reflect each respective default
    expect(propsA.a).toBe(1);
    expect(propsB.b).toBe(2);

    clearCurrentComponentContext();
  });
});
