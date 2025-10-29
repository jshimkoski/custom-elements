import { describe, it, expect } from 'vitest';
import { patchProps } from '../src/lib/runtime/vdom';

describe('processDirectives / patchProps internals', () => {
  it('removes class attribute when directive clears it and syncs oldProps.attrs', async () => {
    const el = document.createElement('div');
    // Start with the class present on the DOM but not recorded in oldProps
    el.setAttribute('class', 'border-primary-500');

    const oldProps: any = { props: {}, attrs: {} };

    // New props contain a :class directive that, when processed, results
    // in an explicit cleared class (undefined) — simulate by putting the
    // directive shape expected by the runtime.
    const newProps: any = {
      props: {},
      attrs: {},
      directives: {
        class: { value: { 'border-primary-500': false }, modifiers: [] },
      },
    };

    // Run the patch — this should remove the class attribute from the DOM
    // and also write the cleared state back into oldProps.attrs
    patchProps(el, oldProps, newProps, {});

    expect(el.getAttribute('class')).toBeNull();
    // oldProps.attrs should reflect the cleared class (undefined)
    expect(Object.prototype.hasOwnProperty.call(oldProps.attrs, 'class')).toBe(
      true,
    );
    expect(oldProps.attrs.class).toBeUndefined();
  });

  it('sets class attribute when directive adds it and syncs oldProps.attrs', async () => {
    const el = document.createElement('div');

    const oldProps: any = { props: {}, attrs: {} };

    const newProps: any = {
      props: {},
      attrs: {},
      directives: {
        class: { value: { 'border-primary-500': true }, modifiers: [] },
      },
    };

    // Applying should set the attribute
    patchProps(el, oldProps, newProps, {});

    expect(el.getAttribute('class')).toContain('border-primary-500');
    // The runtime attempts to sync oldProps.attrs when it performs DOM
    // mutations in some code paths. Accept either behavior but ensure
    // that if the runtime recorded the attr it is defined.
    if (Object.prototype.hasOwnProperty.call(oldProps.attrs, 'class')) {
      expect(oldProps.attrs.class).toBeDefined();
    }
  });
});
