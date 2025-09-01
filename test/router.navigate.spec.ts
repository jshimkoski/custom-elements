import { describe, it, expect, vi } from 'vitest';
import * as componentModule from '../src/lib/runtime/component';
import { initRouter } from '../src/lib/router';

describe('router.navigate', () => {
  it('router-link navigate handles disabled, external, replace and push', async () => {
    const spy = vi.spyOn(componentModule, 'component');
    const router = initRouter({ routes: [{ path: '/', component: 'home' }, { path: '/to', component: 'to' }] });

    // Find router-link registration
    const call = (componentModule.component as any).mock.calls.find(([name]: any) => name === 'router-link');
    expect(call).toBeDefined();
    const config = call[1];

    // Prepare contexts
    const ctxDisabled: any = { disabled: true, external: false, tag: 'a', replace: false, to: '/to' };
    const eDisabled = { preventDefault: vi.fn() } as any;
    // Call navigate - should preventDefault and return early
    config.navigate(eDisabled as any, ctxDisabled);
    expect(eDisabled.preventDefault).toHaveBeenCalled();

    // External link on anchor should not prevent navigation or call push/replace
    const ctxExternal: any = { disabled: false, external: true, tag: 'a', replace: false, to: '/to' };
    const eExternal = { preventDefault: vi.fn() } as any;
    config.navigate(eExternal as any, ctxExternal);
    expect(eExternal.preventDefault).not.toHaveBeenCalled();

    // Replace should call router.replace
    const ctxReplace: any = { disabled: false, external: false, tag: 'a', replace: true, to: '/to' };
    const eReplace = { preventDefault: vi.fn() } as any;
    // Spy on router.replace
  const rSpy = vi.spyOn(router as any, 'replace').mockImplementation(async () => {});
    config.navigate(eReplace as any, ctxReplace);
    expect(eReplace.preventDefault).toHaveBeenCalled();
    expect(rSpy).toHaveBeenCalledWith('/to');

    // Push should call router.push
    const ctxPush: any = { disabled: false, external: false, tag: 'a', replace: false, to: '/to' };
    const ePush = { preventDefault: vi.fn() } as any;
  const pSpy = vi.spyOn(router as any, 'push').mockImplementation(async () => {});
    config.navigate(ePush as any, ctxPush);
    expect(ePush.preventDefault).toHaveBeenCalled();
    expect(pSpy).toHaveBeenCalledWith('/to');

    rSpy.mockRestore();
    pSpy.mockRestore();
    spy.mockRestore();
  });
});
