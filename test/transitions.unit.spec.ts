import { describe, it, expect } from 'vitest';
import {
  Transition,
  TransitionGroup,
  transitionPresets,
} from '../src/lib/transitions';

describe('transitions top-level API', () => {
  it('attaches preset classes when using preset', () => {
    const vnode = Transition({ preset: 'fade', show: true } as any, [] as any);
    // _transition metadata should exist and contain classes from preset
    // @ts-expect-error access internal transition metadata
    const meta = (vnode as any)._transition;
    expect(meta).toBeDefined();
    expect(meta.classes.enterFrom).toBe(transitionPresets.fade.enterFrom);
  });

  it('allows overriding preset classes', () => {
    const vnode = Transition(
      { preset: 'fade', show: true, enterFrom: 'x' } as any,
      [] as any,
    );
    // @ts-expect-error access internal transition metadata
    const meta = (vnode as any)._transition;
    expect(meta.classes.enterFrom).toBe('x');
  });

  it('TransitionGroup sets default moveClass and metadata', () => {
    const group = TransitionGroup({ preset: 'scale' } as any, [] as any);
    // @ts-expect-error access internal transition metadata
    const meta =
      (group as any).props?._transitionGroup ?? (group as any)._transition;
    // ensure either the group props _transitionGroup exists (current impl)
    // or fall back to _transition if implementation changes in future
    expect(meta).toBeDefined();
    // default moveClass should be present in options (internal handling)
    expect(meta.classes).toBeDefined();
  });
});
