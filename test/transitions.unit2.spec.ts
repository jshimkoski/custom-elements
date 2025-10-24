import { describe, it, expect } from 'vitest';
import {
  Transition,
  TransitionGroup,
  createTransitionPreset,
  getTransitionStyleSheet,
} from '../src/lib/transitions';

describe('transitions module - API surface', () => {
  it('applies preset and allows overrides for Transition', () => {
    const vnode = Transition(
      { preset: 'fade', show: true, enterFrom: 'custom-enter' },
      { tag: 'div', props: {}, children: [] } as any,
    );
    const meta = (vnode as any)._transition;
    expect(meta).toBeDefined();
    expect(meta.classes.enterFrom).toBe('custom-enter');
  });

  it('flattens anchor children for TransitionGroup and serializes style object', () => {
    const anchorChild = {
      tag: '#anchor',
      key: 'a1',
      children: [{ tag: 'div', key: 'inner' }],
      props: {},
    } as any;
    const group = TransitionGroup(
      { preset: 'fade', tag: 'ul', style: { color: 'red' } },
      [anchorChild],
    );
    // children should be flattened and carry _anchorKey in props
    expect(Array.isArray(group.children)).toBe(true);
    const first = group.children[0] as any;
    expect(first.props._anchorKey).toBe('a1');
    // style serialized
    expect((group.props.attrs.style as string).includes('color: red')).toBe(
      true,
    );
  });

  it('createTransitionPreset returns a copy', () => {
    const p = createTransitionPreset({ enterFrom: 'x' });
    expect(p.enterFrom).toBe('x');
    // mutating original argument should not change returned
    const src: any = { enterFrom: 'y' };
    const cp = createTransitionPreset(src);
    src.enterFrom = 'z';
    expect(cp.enterFrom).toBe('y');
  });

  it('getTransitionStyleSheet returns a CSSStyleSheet and caches result', () => {
    const sheet1 = getTransitionStyleSheet();
    expect(sheet1).toBeInstanceOf(CSSStyleSheet);
    const sheet2 = getTransitionStyleSheet();
    expect(sheet1).toBe(sheet2);
  });
});
