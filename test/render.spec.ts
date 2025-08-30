import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderComponent, renderOutput } from '../src/lib/runtime/render';
import type { VNode, ComponentConfig, ComponentContext, Refs } from '../src/lib/runtime/types';

vi.mock('../src/lib/runtime/vdom', () => ({
  vdomRenderer: vi.fn()
}));
import { vdomRenderer } from '../src/lib/runtime/vdom';

describe('renderComponent', () => {
  let shadowRoot: ShadowRoot;
  let setHtmlString: (html: string) => void;
  let setLoading: (val: boolean) => void;
  let setError: (err: Error | null) => void;
  let applyStyle: (html: string) => void;
  let refs: Refs['refs'];
  let context: ComponentContext<any, any, any, any>;

  beforeEach(() => {
    const host = document.createElement('div');
    shadowRoot = host.attachShadow({ mode: 'open' });
    setHtmlString = vi.fn();
    setLoading = vi.fn();
    setError = vi.fn();
    applyStyle = vi.fn();
    refs = {};
    context = { isLoading: false, hasError: false, error: null } as any;
    (vdomRenderer as any).mockClear();
  });

  it('renders normal output', () => {
    const vnode: VNode = { tag: 'div', children: 'Hello' };
    const cfg: ComponentConfig<any, any, any, any> = {
      render: vi.fn().mockReturnValue(vnode)
    } as any;
    renderComponent(shadowRoot, cfg, context, refs, setHtmlString, setLoading, setError, applyStyle);
    expect(vdomRenderer).toHaveBeenCalledWith(shadowRoot, [vnode], context, refs);
    expect(setHtmlString).toHaveBeenCalledWith(shadowRoot.innerHTML);
    expect(applyStyle).toHaveBeenCalledWith(shadowRoot.innerHTML);
  });

  it('renders loading template if isLoading', () => {
    context.isLoading = true;
    const loadingVNode: VNode = { tag: 'span', children: 'Loading...' };
    const cfg: ComponentConfig<any, any, any, any> = {
      loadingTemplate: vi.fn().mockReturnValue(loadingVNode),
      render: vi.fn()
    } as any;
    renderComponent(shadowRoot, cfg, context, refs, setHtmlString, setLoading, setError, applyStyle);
    expect(vdomRenderer).toHaveBeenCalledWith(shadowRoot, [loadingVNode], context, refs);
    expect(setHtmlString).toHaveBeenCalledWith(shadowRoot.innerHTML);
  });

  it('renders error template if hasError', () => {
    context.hasError = true;
    context.error = new Error('fail');
    const errorVNode: VNode = { tag: 'span', children: 'Error!' };
    const cfg: ComponentConfig<any, any, any, any> = {
      errorTemplate: vi.fn().mockReturnValue(errorVNode),
      render: vi.fn()
    } as any;
    renderComponent(shadowRoot, cfg, context, refs, setHtmlString, setLoading, setError, applyStyle);
    expect(vdomRenderer).toHaveBeenCalledWith(shadowRoot, [errorVNode], context, refs);
    expect(setHtmlString).toHaveBeenCalledWith(shadowRoot.innerHTML);
  });

  it('handles async render', async () => {
    const vnode: VNode = { tag: 'div', children: 'Async' };
    const cfg: ComponentConfig<any, any, any, any> = {
      render: vi.fn().mockReturnValue(Promise.resolve(vnode))
    } as any;
    await renderComponent(shadowRoot, cfg, context, refs, setHtmlString, setLoading, setError, applyStyle);
    // Loading state set
    expect(setLoading).toHaveBeenCalledWith(true);
  });

  it('handles async render error', async () => {
    const cfg: ComponentConfig<any, any, any, any> = {
      render: vi.fn().mockReturnValue(Promise.reject(new Error('Async fail'))),
      errorTemplate: vi.fn().mockReturnValue({ tag: 'span', children: 'Error!' })
    } as any;
    renderComponent(shadowRoot, cfg, context, refs, setHtmlString, setLoading, setError, applyStyle);
    // Wait for all microtasks to finish
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(setLoading).toHaveBeenCalledWith(false);
    expect(setError).toHaveBeenCalled();
  });

  it('returns early if shadowRoot is null', () => {
    const cfg: ComponentConfig<any, any, any, any> = {
      render: vi.fn()
    } as any;
    renderComponent(null, cfg, context, refs, setHtmlString, setLoading, setError, applyStyle);
    expect(vdomRenderer).not.toHaveBeenCalled();
  });
});

describe('renderOutput', () => {
  let shadowRoot: ShadowRoot;
  let setHtmlString: (html: string) => void;
  let refs: Refs['refs'];
  let context: ComponentContext<any, any, any, any>;

  beforeEach(() => {
    const host = document.createElement('div');
    shadowRoot = host.attachShadow({ mode: 'open' });
    setHtmlString = vi.fn();
    refs = {};
    context = {} as any;
    (vdomRenderer as any).mockClear();
  });

  it('calls vdomRenderer and setHtmlString', () => {
    const vnode: VNode = { tag: 'div', children: 'Test' };
    renderOutput(shadowRoot, vnode, context, refs, setHtmlString);
    expect(vdomRenderer).toHaveBeenCalledWith(shadowRoot, [vnode], context, refs);
    expect(setHtmlString).toHaveBeenCalledWith(shadowRoot.innerHTML);
  });

  it('returns early if shadowRoot is null', () => {
    const vnode: VNode = { tag: 'div', children: 'Test' };
    renderOutput(null, vnode, context, refs, setHtmlString);
    expect(vdomRenderer).not.toHaveBeenCalled();
    expect(setHtmlString).not.toHaveBeenCalled();
  });
});
