import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initRouter } from '../src/lib/router';
import { component } from '../src/lib/runtime/component';
import { html } from '../src/lib/runtime/template-compiler';
import { useProps } from '../src/lib/runtime/hooks';

/**
 * Tests that router-view forwards route params to the rendered page component
 * so they are accessible via useProps.
 *
 * Before the fix, router-view emitted:
 *   { tag: comp, props: {}, children: [] }
 * After the fix it emits:
 *   { tag: comp, props: { attrs: { ...params } }, children: [] }
 *
 * The renderer may apply values via property assignment or setAttribute
 * depending on whether the element exposes that property. Either way,
 * useProps reads from the host property first and falls back to the
 * attribute, so we verify behaviour through rendered output rather than
 * testing internal storage (getAttribute vs property).
 */

// Register test page components once (custom elements can only be defined once).
component('page-rv-slug', () => {
  const props = useProps({ slug: '' });
  return html`<span class="slug-out">${props.slug}</span>`;
});

component('page-rv-post-comment', () => {
  const props = useProps({ postId: '', commentId: '' });
  return html`
    <span class="post-id">${props.postId}</span>
    <span class="comment-id">${props.commentId}</span>
  `;
});

component('page-rv-all', () => {
  const props = useProps({ all: '' });
  return html`<span class="all-out">${props.all}</span>`;
});

component('page-rv-about', () => {
  return html`<span class="about-out">about</span>`;
});

component('page-rv-item', () => {
  const props = useProps({ id: '' });
  return html`<span class="item-id">${props.id}</span>`;
});

/** Mount a router-view, wait for render, and return it. */
async function mountView(ms = 30): Promise<HTMLElement> {
  const view = document.createElement('router-view');
  document.body.appendChild(view);
  await new Promise((r) => setTimeout(r, ms));
  return view;
}

describe('router-view passes route params as props', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    try {
      window.history.replaceState({}, '', '/');
    } catch {
      /* ignore */
    }
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('passes a single dynamic param (:slug) to the rendered page component', async () => {
    const routes = [
      { path: '/', component: 'page-rv-index' },
      { path: '/blog/:slug', component: 'page-rv-slug' },
    ] as any;

    const router = initRouter({ routes, base: '' });
    // Navigate before mounting so the view renders at the target path directly.
    await router.replace('/blog/hello-world');
    const view = await mountView();

    const pageEl = view.shadowRoot?.querySelector('page-rv-slug') as HTMLElement | null;
    expect(pageEl, 'page-rv-slug should be in router-view shadow root').toBeTruthy();

    // The component reads slug via useProps and renders it into the span.
    const slugOut = pageEl!.shadowRoot?.querySelector('.slug-out');
    expect(slugOut?.textContent).toBe('hello-world');
  });

  it('passes multiple dynamic params on nested routes', async () => {
    const routes = [
      { path: '/posts/:postId/comments/:commentId', component: 'page-rv-post-comment' },
    ] as any;

    const router = initRouter({ routes, base: '' });
    await router.replace('/posts/42/comments/7');
    const view = await mountView();

    const pageEl = view.shadowRoot?.querySelector('page-rv-post-comment') as HTMLElement | null;
    expect(pageEl, 'page-rv-post-comment should be in router-view shadow root').toBeTruthy();

    expect(pageEl!.shadowRoot?.querySelector('.post-id')?.textContent).toBe('42');
    expect(pageEl!.shadowRoot?.querySelector('.comment-id')?.textContent).toBe('7');
  });

  it('passes the splat value for a catch-all route (:all*)', async () => {
    const routes = [
      { path: '/', component: 'page-rv-index' },
      { path: '/:all*', component: 'page-rv-all' },
    ] as any;

    const router = initRouter({ routes, base: '' });
    await router.replace('/not/a/real/page');
    const view = await mountView();

    const pageEl = view.shadowRoot?.querySelector('page-rv-all') as HTMLElement | null;
    expect(pageEl, 'page-rv-all should be in router-view shadow root').toBeTruthy();

    const allOut = pageEl!.shadowRoot?.querySelector('.all-out');
    expect(allOut?.textContent).toBe('not/a/real/page');
  });

  it('passes no params for a static (param-free) route', async () => {
    const routes = [
      { path: '/about', component: 'page-rv-about' },
    ] as any;

    const router = initRouter({ routes, base: '' });
    await router.replace('/about');
    const view = await mountView();

    const pageEl = view.shadowRoot?.querySelector('page-rv-about') as HTMLElement | null;
    expect(pageEl, 'page-rv-about should be in router-view shadow root').toBeTruthy();

    // Static routes have no params — the about page renders its own content correctly.
    const aboutOut = pageEl!.shadowRoot?.querySelector('.about-out');
    expect(aboutOut?.textContent).toBe('about');
  });

  it('shows correct params when mounted at different dynamic segment values', async () => {
    // Verifies that router-view correctly forwards params for any route value,
    // not just the first one encountered.  Live subscription-based re-renders
    // are an integration concern; this unit test confirms the VNode attrs fix
    // works for multiple distinct values by mounting fresh views for each.
    const routes = [
      { path: '/items/:id', component: 'page-rv-item' },
    ] as any;

    const router = initRouter({ routes, base: '' });

    // Mount at /items/1
    await router.replace('/items/1');
    const view1 = await mountView();
    const pageEl1 = view1.shadowRoot?.querySelector('page-rv-item') as HTMLElement | null;
    expect(pageEl1, 'page-rv-item should render for /items/1').toBeTruthy();
    expect(pageEl1!.shadowRoot?.querySelector('.item-id')?.textContent).toBe('1');
    document.body.removeChild(view1);

    // Mount a fresh view at /items/99 — params must reflect the new value.
    await router.replace('/items/99');
    const view2 = await mountView();
    const pageEl2 = view2.shadowRoot?.querySelector('page-rv-item') as HTMLElement | null;
    expect(pageEl2, 'page-rv-item should render for /items/99').toBeTruthy();
    expect(pageEl2!.shadowRoot?.querySelector('.item-id')?.textContent).toBe('99');
  });
});
