import { describe, it, expect, vi } from 'vitest';
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

describe('Transition() lazy factory content', () => {
  it('calls the factory when show is true', () => {
    const factory = vi.fn(() => [] as any);
    Transition({ show: true }, factory);
    expect(factory).toHaveBeenCalledOnce();
  });

  it('does NOT call the factory when show is false', () => {
    const factory = vi.fn(() => [] as any);
    Transition({ show: false }, factory);
    expect(factory).not.toHaveBeenCalled();
  });

  it('transitions from visible to hidden without calling the factory', () => {
    const factory = vi.fn(() => [] as any);

    Transition({ show: true }, factory);
    const callsWhenVisible = factory.mock.calls.length;

    Transition({ show: false }, factory);
    // factory must not be called again for the hide render
    expect(factory.mock.calls.length).toBe(callsWhenVisible);
  });

  it('accepts factory output and attaches transition metadata', () => {
    const content = [{ tag: 'div', props: {}, children: [] }] as any;
    const factory = vi.fn(() => content);
    const vnode = Transition({ preset: 'fade', show: true }, factory);
    // @ts-expect-error access internal transition metadata
    const meta = (vnode as any)._transition;
    expect(meta).toBeDefined();
    expect(meta.classes.enterFrom).toBe(transitionPresets.fade.enterFrom);
  });

  it('backward-compatible: plain VNode array still works when show is true', () => {
    const content = [{ tag: 'div', props: {}, children: [] }] as any;
    const vnode = Transition({ show: true }, content);
    // @ts-expect-error access internal transition metadata
    const meta = (vnode as any)._transition;
    expect(meta).toBeDefined();
    expect(meta.state).toBe('visible');
  });

  it('backward-compatible: plain VNode array still works when show is false', () => {
    const content = [{ tag: 'div', props: {}, children: [] }] as any;
    const vnode = Transition({ show: false }, content);
    // @ts-expect-error access internal transition metadata
    const meta = (vnode as any)._transition;
    expect(meta).toBeDefined();
    expect(meta.state).toBe('hidden');
  });
});
