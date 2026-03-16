/**
 * Integration tests for SSR + Router.
 *
 * Covers:
 *  - matchRouteSSR: basic path matching, dynamic params, wildcard, no match
 *  - useRouter({ initialUrl }): SSR mode initialization, route state
 *  - initRouter({ initialUrl }): pre-compiles routes, exposes active router
 *  - SSR rendering with per-request route selection via matchRouteSSR
 *  - createSSRHandler + matchRouteSSR: correct component rendered per URL
 *  - 404 pattern: route: null when no route matches
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  matchRouteSSR,
  useRouter,
  initRouter,
  activeRouterProxy,
} from '../src/lib/router';
import { renderToStringWithJITCSSDSD } from '../src/lib/ssr';
import {
  createSSRHandler,
  type MinimalRequest,
  type MinimalResponse,
} from '../src/lib/ssr-middleware';
import { registry } from '../src/lib/runtime/component/registry';
import type { Route } from '../src/lib/router';

// ---------------------------------------------------------------------------
// Minimal mock response helper
// ---------------------------------------------------------------------------

function makeRes() {
  const headers: Record<string, string> = {};
  const written: string[] = [];
  let ended = '';

  const res: MinimalResponse = {
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
    write(chunk) {
      written.push(chunk);
    },
    end(data) {
      ended = data ?? '';
    },
  };

  return {
    res,
    headers,
    written,
    get body() {
      return written.join('') + ended;
    },
  };
}

function makeReq(url = '/'): MinimalRequest {
  return { url, method: 'GET', headers: {} };
}

// ---------------------------------------------------------------------------
// matchRouteSSR
// ---------------------------------------------------------------------------

describe('matchRouteSSR()', () => {
  const routes: Route[] = [
    { path: '/', component: 'home-page' },
    { path: '/about', component: 'about-page' },
    { path: '/blog/:slug', component: 'blog-post' },
    { path: '/users/:id/posts/:postId', component: 'user-post' },
  ] as Route[];

  it('matches the root path', () => {
    const { route, params } = matchRouteSSR(routes, '/');
    expect(route?.component).toBe('home-page');
    expect(params).toEqual({});
  });

  it('matches a static path', () => {
    const { route } = matchRouteSSR(routes, '/about');
    expect(route?.component).toBe('about-page');
  });

  it('extracts a single dynamic param', () => {
    const { route, params } = matchRouteSSR(routes, '/blog/hello-world');
    expect(route?.component).toBe('blog-post');
    expect(params).toEqual({ slug: 'hello-world' });
  });

  it('extracts multiple dynamic params', () => {
    const { route, params } = matchRouteSSR(routes, '/users/42/posts/7');
    expect(route?.component).toBe('user-post');
    expect(params).toEqual({ id: '42', postId: '7' });
  });

  it('returns route: null for no match', () => {
    const { route, params } = matchRouteSSR(routes, '/not-found');
    expect(route).toBeNull();
    expect(params).toEqual({});
  });

  it('tolerates a trailing slash', () => {
    const { route } = matchRouteSSR(routes, '/about/');
    expect(route?.component).toBe('about-page');
  });

  it('matches first route when multiple could apply', () => {
    const overlapping: Route[] = [
      { path: '/a', component: 'first' },
      { path: '/a', component: 'second' },
    ] as Route[];
    const { route } = matchRouteSSR(overlapping, '/a');
    expect(route?.component).toBe('first');
  });

  it('wildcard catch-all route matches any path', () => {
    const withWildcard: Route[] = [
      { path: '/home', component: 'home-page' },
      { path: '*', component: 'not-found-page' },
    ] as Route[];
    const { route } = matchRouteSSR(withWildcard, '/anything/here');
    expect(route?.component).toBe('not-found-page');
  });

  it('URL-decodes path params', () => {
    const { params } = matchRouteSSR(routes, '/blog/hello%20world');
    expect(params.slug).toBe('hello world');
  });

  it('strips query string before matching', () => {
    const { route } = matchRouteSSR(routes, '/about?ref=email&page=2');
    expect(route?.component).toBe('about-page');
  });

  it('strips URL fragment before matching', () => {
    const { route } = matchRouteSSR(routes, '/about#section');
    expect(route?.component).toBe('about-page');
  });

  it('strips both query string and fragment', () => {
    const { route, params } = matchRouteSSR(routes, '/blog/hello?ref=email#comments');
    expect(route?.component).toBe('blog-post');
    expect(params.slug).toBe('hello');
  });

  it('callers can pass req.url directly (query string does not break matching)', () => {
    // Simulates passing Node.js req.url which includes query string
    const { route } = matchRouteSSR(routes, '/?utm_source=newsletter');
    expect(route?.component).toBe('home-page');
  });
});

// ---------------------------------------------------------------------------
// useRouter — SSR mode (initialUrl)
// ---------------------------------------------------------------------------

describe('useRouter() with initialUrl', () => {
  it('sets the initial route path from the URL', () => {
    const routes = [
      { path: '/', component: 'home-page' },
      { path: '/about', component: 'about-page' },
    ] as Route[];

    const router = useRouter({ routes, initialUrl: '/about' });
    expect(router.getCurrent().path).toBe('/about');
  });

  it('extracts query params from initialUrl', () => {
    const routes = [{ path: '/', component: 'home-page' }] as Route[];
    const router = useRouter({ routes, initialUrl: '/?ref=email&page=2' });
    expect(router.getCurrent().query).toEqual({ ref: 'email', page: '2' });
  });

  it('sets path to / when initialUrl is a bare origin', () => {
    const routes = [{ path: '/', component: 'home-page' }] as Route[];
    const router = useRouter({ routes, initialUrl: 'http://localhost/' });
    expect(router.getCurrent().path).toBe('/');
  });

  it('push() updates route state in SSR mode', async () => {
    const routes = [
      { path: '/', component: 'home-page' },
      { path: '/contact', component: 'contact-page' },
    ] as Route[];

    const router = useRouter({ routes, initialUrl: '/' });
    await router.push('/contact');
    expect(router.getCurrent().path).toBe('/contact');
  });

  it('push() rejects for unknown paths in SSR mode', async () => {
    const routes = [{ path: '/', component: 'home-page' }] as Route[];
    const router = useRouter({ routes, initialUrl: '/' });
    // Pushing to an unmatched route surfaces an error in SSR mode
    await expect(router.push('/nonexistent')).rejects.toThrow();
  });

  it('back() is a no-op in SSR mode (does not throw)', () => {
    const routes = [{ path: '/', component: 'home-page' }] as Route[];
    const router = useRouter({ routes, initialUrl: '/' });
    expect(() => router.back()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// useRouter — base path in SSR
// ---------------------------------------------------------------------------

describe('useRouter() with base path in SSR', () => {
  it('strips base prefix from initialUrl path', () => {
    const routes = [
      { path: '/', component: 'home-page' },
      { path: '/about', component: 'about-page' },
    ] as Route[];

    const router = useRouter({ routes, base: '/app', initialUrl: '/app/about' });
    expect(router.getCurrent().path).toBe('/about');
  });

  it('matches root when initialUrl equals base', () => {
    const routes = [{ path: '/', component: 'home-page' }] as Route[];
    const router = useRouter({ routes, base: '/app', initialUrl: '/app' });
    expect(router.getCurrent().path).toBe('/');
  });
});

// ---------------------------------------------------------------------------
// useRouter — route guards in SSR
// ---------------------------------------------------------------------------

describe('useRouter() route guards in SSR', () => {
  it('beforeEnter guard fires during SSR push()', async () => {
    let guardCalled = false;
    const routes = [
      { path: '/', component: 'home-page' },
      {
        path: '/protected',
        component: 'protected-page',
        beforeEnter: async () => {
          guardCalled = true;
          return true; // allow
        },
      },
    ] as Route[];

    const router = useRouter({ routes, initialUrl: '/' });
    await router.push('/protected');
    expect(guardCalled).toBe(true);
    expect(router.getCurrent().path).toBe('/protected');
  });

  it('beforeEnter guard can redirect in SSR mode', async () => {
    const routes = [
      { path: '/', component: 'home-page' },
      { path: '/login', component: 'login-page' },
      {
        path: '/protected',
        component: 'protected-page',
        beforeEnter: async () => '/login', // redirect
      },
    ] as Route[];

    const router = useRouter({ routes, initialUrl: '/' });
    await router.push('/protected');
    // Guard redirected to /login
    expect(router.getCurrent().path).toBe('/login');
  });

  it('beforeEnter guard blocking navigation (returns false) in SSR', async () => {
    const routes = [
      { path: '/', component: 'home-page' },
      {
        path: '/blocked',
        component: 'blocked-page',
        beforeEnter: async () => false, // block
      },
    ] as Route[];

    const router = useRouter({ routes, initialUrl: '/' });
    await router.push('/blocked');
    // Navigation blocked — stays on /
    expect(router.getCurrent().path).toBe('/');
  });
});

// ---------------------------------------------------------------------------
// initRouter — active router proxy
// ---------------------------------------------------------------------------

describe('initRouter() with initialUrl', () => {
  it('exposes the current route via activeRouterProxy', async () => {
    const routes = [
      { path: '/', component: 'home-page' },
      { path: '/about', component: 'about-page' },
    ] as Route[];

    initRouter({ routes, initialUrl: '/about' });
    expect(activeRouterProxy.getCurrent().path).toBe('/about');
  });

  it('pre-compiles routes (getState returns correct state)', async () => {
    const routes = [
      { path: '/products/:id', component: 'product-page' },
    ] as Route[];

    initRouter({ routes, initialUrl: '/products/99' });
    const state = activeRouterProxy.getCurrent();
    expect(state.path).toBe('/products/99');
    expect(state.params.id).toBe('99');
  });
});

// ---------------------------------------------------------------------------
// SSR rendering + route selection
// ---------------------------------------------------------------------------

describe('SSR rendering with matchRouteSSR', () => {
  const HOME_TAG = 'ssr-router-home';
  const ABOUT_TAG = 'ssr-router-about';
  const BLOG_TAG = 'ssr-router-blog';

  const routes: Route[] = [
    { path: '/', component: HOME_TAG },
    { path: '/about', component: ABOUT_TAG },
    { path: '/blog/:slug', component: BLOG_TAG },
  ] as Route[];

  beforeEach(() => {
    registry.set(HOME_TAG, {
      props: {},
      render: () =>
        ({ tag: 'main', props: { attrs: { id: 'home' } }, children: ['Home'] }) as never,
    });
    registry.set(ABOUT_TAG, {
      props: {},
      render: () =>
        ({ tag: 'main', props: { attrs: { id: 'about' } }, children: ['About'] }) as never,
    });
    registry.set(BLOG_TAG, {
      props: { slug: '' },
      render: (props: { slug?: string }) =>
        ({
          tag: 'main',
          props: { attrs: { id: 'blog', 'data-slug': props.slug ?? '' } },
          children: [`Post: ${props.slug ?? ''}`],
        }) as never,
    });
  });

  it('renders the home component for /', () => {
    const { route, params } = matchRouteSSR(routes, '/');
    expect(route).not.toBeNull();
    const vnode = {
      tag: route!.component as string,
      props: { attrs: params, isCustomElement: true },
      children: [],
    };
    // Use DSD mode so shadow DOM content is serialized in the HTML output
    const { html } = renderToStringWithJITCSSDSD(vnode as never);
    expect(html).toContain(HOME_TAG);
    expect(html).toContain('id="home"');
  });

  it('renders the about component for /about', () => {
    const { route } = matchRouteSSR(routes, '/about');
    const vnode = {
      tag: route!.component as string,
      props: { attrs: {}, isCustomElement: true },
      children: [],
    };
    const { html } = renderToStringWithJITCSSDSD(vnode as never);
    expect(html).toContain(ABOUT_TAG);
    expect(html).toContain('id="about"');
  });

  it('passes dynamic params to the rendered component', () => {
    const { route, params } = matchRouteSSR(routes, '/blog/my-first-post');
    const vnode = {
      tag: route!.component as string,
      props: { attrs: params, isCustomElement: true },
      children: [],
    };
    const { html } = renderToStringWithJITCSSDSD(vnode as never);
    expect(html).toContain('my-first-post');
  });

  it('returns route: null for an unregistered path', () => {
    const { route } = matchRouteSSR(routes, '/does-not-exist');
    expect(route).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createSSRHandler + matchRouteSSR
// ---------------------------------------------------------------------------

describe('createSSRHandler() + matchRouteSSR', () => {
  const HOME_TAG = 'mw-router-home';
  const BLOG_TAG = 'mw-router-blog';

  const routes: Route[] = [
    { path: '/', component: HOME_TAG },
    { path: '/blog/:slug', component: BLOG_TAG },
  ] as Route[];

  beforeEach(() => {
    registry.set(HOME_TAG, {
      props: {},
      render: () =>
        ({ tag: 'section', props: { attrs: { id: 'mw-home' } }, children: [] }) as never,
    });
    registry.set(BLOG_TAG, {
      props: { slug: '' },
      render: (props: { slug?: string }) =>
        ({
          tag: 'section',
          props: { attrs: { id: 'mw-blog', 'data-slug': props.slug ?? '' } },
          children: [],
        }) as never,
    });
  });

  it('renders the correct component for the root path', async () => {
    const handler = createSSRHandler(
      (req) => {
        const { route, params } = matchRouteSSR(routes, req.url ?? '/');
        if (!route) return { tag: 'div', props: {}, children: ['404'] } as never;
        return {
          tag: route.component as string,
          props: { attrs: params, isCustomElement: true },
          children: [],
        } as never;
      },
      // dsd: true so shadow DOM content (id="mw-home") is serialized in the output
      { render: { dsd: true }, document: false },
    );

    const mock = makeRes();
    await handler(makeReq('/'), mock.res);
    expect(mock.body).toContain(HOME_TAG);
    expect(mock.body).toContain('id="mw-home"');
  });

  it('renders the blog component with params for /blog/:slug', async () => {
    const handler = createSSRHandler(
      (req) => {
        const { route, params } = matchRouteSSR(routes, req.url ?? '/');
        if (!route) return { tag: 'div', props: {}, children: ['404'] } as never;
        return {
          tag: route.component as string,
          props: { attrs: params, isCustomElement: true },
          children: [],
        } as never;
      },
      { render: { dsd: true }, document: false },
    );

    const mock = makeRes();
    await handler(makeReq('/blog/ssr-rocks'), mock.res);
    expect(mock.body).toContain(BLOG_TAG);
    expect(mock.body).toContain('ssr-rocks');
  });

  it('renders a fallback for an unmatched path', async () => {
    const handler = createSSRHandler(
      (req) => {
        const { route, params } = matchRouteSSR(routes, req.url ?? '/');
        if (!route)
          return {
            tag: 'div',
            props: { attrs: { id: 'not-found' } },
            children: ['404'],
          } as never;
        return {
          tag: route.component as string,
          props: { attrs: params, isCustomElement: true },
          children: [],
        } as never;
      },
      { render: { dsd: true }, document: false },
    );

    const mock = makeRes();
    await handler(makeReq('/unknown-page'), mock.res);
    expect(mock.body).toContain('id="not-found"');
    expect(mock.body).toContain('404');
  });

  it('wraps the response in a document shell by default', async () => {
    const handler = createSSRHandler(
      (req) => {
        const { route } = matchRouteSSR(routes, req.url ?? '/');
        if (!route) return { tag: 'div', props: {}, children: [] } as never;
        return {
          tag: route.component as string,
          props: { attrs: {}, isCustomElement: true },
          children: [],
        } as never;
      },
    );

    const mock = makeRes();
    await handler(makeReq('/'), mock.res);
    expect(mock.body).toContain('<!DOCTYPE html>');
    expect(mock.body).toContain('</html>');
  });
});
