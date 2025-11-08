import { describe, it, expect, beforeEach } from 'vitest';
import { initRouter } from '../src/lib/router';

describe('router base prefix behavior', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('strips leading base only and not occurrences inside the path', async () => {
    const routes = [
      { path: '/', component: 'home' },
      { path: '/docs', component: 'docs' },
      { path: '/docs/app-help', component: 'help' },
    ] as any;

    const router = initRouter({
      routes,
      base: '/app',
      initialUrl: 'http://localhost/app/docs',
    });

    // Leading base stripped -> path should be '/docs'
    expect(router.getCurrent().path).toBe('/docs');

    // Now navigate to a path that contains 'app' but not as prefix
    await router.push('/docs/app-help');
    expect(router.getCurrent().path).toBe('/docs/app-help');

    // Navigate to a path that starts with base explicitly; it should strip
    await router.push('/app/docs');
    expect(router.getCurrent().path).toBe('/docs');
  });
});
