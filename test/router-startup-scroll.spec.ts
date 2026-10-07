import { expect, it, vi } from 'vitest';
import { initRouter } from '../src/lib/router';
it('preserves scroll on deferred startup and resets it on subsequent navigation', async () => {
  const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const router = initRouter({ routes: [{ path: '/' }, { path: '/next-scroll-test' }] });
  await new Promise((done) => setTimeout(done, 0));
  expect(scroll).not.toHaveBeenCalled();
  await router.push('/next-scroll-test');
  expect(scroll).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
  scroll.mockRestore();
});
