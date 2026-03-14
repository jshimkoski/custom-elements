import { describe, it, expect, vi } from 'vitest';
import * as style from '../src/lib/runtime/style';
import * as transitions from '../src/lib/transitions';
import * as vdom from '../src/lib/runtime/vdom';
import { renderComponent, applyStyle } from '../src/lib/runtime/render';
import { enableJITCSS, _resetJITCSS } from '../src/lib/runtime/style';

describe('render module - applyStyle and renderComponent', () => {
  it('applyStyle sets reset and transition sheets when no jitCss and no computed', () => {
    const root = document.createElement('div').attachShadow({ mode: 'open' });
    const ctx: any = {};
    const setStyleSheet = vi.fn();
    // stub jitCSS to return empty
    vi.spyOn(style, 'jitCSS').mockReturnValue('');
    // stub base and transition sheets
    const base = new CSSStyleSheet();
    const trans = new CSSStyleSheet();
    vi.spyOn(style, 'getBaseResetSheet').mockReturnValue(base);
    vi.spyOn(transitions, 'getTransitionStyleSheet').mockReturnValue(trans);

    applyStyle(root, ctx, '', null, setStyleSheet);
    expect(setStyleSheet).toHaveBeenCalledWith(null);
    expect(root.adoptedStyleSheets.length).toBe(2);
  });

  it('applyStyle generates and sets a new sheet when jitCss present', () => {
    const root = document.createElement('div').attachShadow({ mode: 'open' });
    const ctx: any = { _computedStyle: undefined };
    const setStyleSheet = vi.fn();
    // Enable JIT CSS for this shadow root so applyStyle will invoke jitCSS
    enableJITCSS();
    // stub jitCSS to return some css
    vi.spyOn(style, 'jitCSS').mockReturnValue('.x{}');
    const base = new CSSStyleSheet();
    const trans = new CSSStyleSheet();
    vi.spyOn(style, 'getBaseResetSheet').mockReturnValue(base);
    vi.spyOn(transitions, 'getTransitionStyleSheet').mockReturnValue(trans);

    applyStyle(root, ctx, '<div class="x"></div>', null, setStyleSheet);
    // should set a sheet (third stylesheet)
    expect(setStyleSheet).toHaveBeenCalled();
    expect(root.adoptedStyleSheets.length).toBe(3);
    _resetJITCSS();
  });

  it('renderComponent handles promise-returning render functions', async () => {
    const shadow = document.createElement('div').attachShadow({ mode: 'open' });
    const cfg: any = {
      render: () => Promise.resolve({ tag: 'div', props: {}, children: [] }),
    };
    const context: any = {};
    const refs: any = {};
    const setHtmlString = vi.fn();
    const setLoading = vi.fn();
    const setError = vi.fn();
    const applyStyleFn = vi.fn();

    // stub vdomRenderer to avoid heavy operations
    vi.spyOn(vdom, 'vdomRenderer').mockImplementation(() => undefined as any);

    renderComponent(
      shadow,
      cfg,
      context,
      refs,
      setHtmlString,
      setLoading,
      setError,
      applyStyleFn,
    );
    // promise microtask must be awaited
    await Promise.resolve();
    expect(setLoading).toHaveBeenCalled();
    expect(setError).toHaveBeenCalledWith(null);
  });
});
