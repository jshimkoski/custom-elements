import { describe, it, expect, beforeEach } from 'vitest';
import {
  setCurrentComponentContext,
  clearCurrentComponentContext,
  useProps,
} from '../src/lib/runtime/hooks';
import { ref } from '../src/lib/runtime/reactive';

describe('useProps (unit)', () => {
  beforeEach(() => {
    clearCurrentComponentContext();
  });

  it('coerces string attributes to boolean when default is boolean', () => {
    const ctx: any = { flag: 'true' };
    setCurrentComponentContext(ctx);

    const props = useProps({ flag: false });
    expect(props.flag).toBe(true);

    clearCurrentComponentContext();
  });

  it('coerces numeric strings to numbers when default is number', () => {
    const ctx: any = { count: '42' };
    setCurrentComponentContext(ctx);

    const props = useProps({ count: 0 });
    expect(props.count).toBe(42);

    clearCurrentComponentContext();
  });

  it('unwraps reactive-like objects containing .value', () => {
    const reactiveLike: any = { value: 'initial' };
    const ctx: any = { v: reactiveLike };
    setCurrentComponentContext(ctx);

    const props = useProps({ v: 'fallback' as any });
    expect(props.v).toBe('initial');

    // mutate underlying reactive-like value and ensure proxy reflects change
    reactiveLike.value = 'updated';
    expect(props.v).toBe('updated');

    clearCurrentComponentContext();
  });

  it('prefers host ReactiveState and reflects live updates from host', () => {
    // Simulate renderer assigning a ReactiveState-like object onto the host
    const hostRef: any = { value: 'host-initial' };
    const ctx: any = { _host: { someProp: hostRef } };
    setCurrentComponentContext(ctx);

    const props = useProps({ someProp: 'fallback' });
    expect(props.someProp).toBe('host-initial');

    // Update the host-ref and ensure useProps sees the change
    hostRef.value = 'host-updated';
    expect(props.someProp).toBe('host-updated');

    clearCurrentComponentContext();
  });

  it('unwraps a real ReactiveState (ref) from context', () => {
    const r = ref('r-initial');
    const ctx: any = { v: r };
    setCurrentComponentContext(ctx);

    const props = useProps({ v: 'fallback' as any });
    expect(props.v).toBe('r-initial');

    // mutate the reactive ref and ensure props reflects it
    r.value = 'r-updated';
    expect(props.v).toBe('r-updated');

    clearCurrentComponentContext();
  });

  it('treats empty string attribute as false for boolean default false', () => {
    const ctx: any = { flag: '' };
    setCurrentComponentContext(ctx);

    const props = useProps({ flag: false });
    // With default false, empty string means "not set" so use default
    expect(props.flag).toBe(false);

    clearCurrentComponentContext();
  });

  it('treats empty string attribute as true for boolean default true', () => {
    const ctx: any = { flag: '' };
    setCurrentComponentContext(ctx);

    const props = useProps({ flag: true });
    // With default true, empty string means attribute presence = true
    expect(props.flag).toBe(true);

    clearCurrentComponentContext();
  });

  it('falls back to default when context value is null or undefined', () => {
    const ctx: any = { maybe: null, other: undefined };
    setCurrentComponentContext(ctx);

    const props = useProps({ maybe: 'def', other: 'def2' });
    expect(props.maybe).toBe('def');
    expect(props.other).toBe('def2');

    clearCurrentComponentContext();
  });
});
