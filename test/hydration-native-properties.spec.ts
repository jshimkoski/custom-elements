import { expect, it } from 'vitest';
import { patchProps } from '../src/lib/runtime/vdom-patch';
it('retains reflected image attributes when SSR attrs become native properties', () => {
  const image = document.createElement('img'); image.src = '/first.webp'; image.alt = 'First slide';
  patchProps(image, { attrs: { src: '/first.webp', alt: 'First slide' } }, { props: { src: '/second.webp', alt: 'Second slide' } });
  expect(image.getAttribute('src')).toBe('/second.webp'); expect(image.getAttribute('alt')).toBe('Second slide');
});
it('maps native constraint names to their actual DOM property names in client rendering', () => {
  const input = document.createElement('input');
  patchProps(input, {}, { props: { readonly: true, maxlength: 20, minlength: 3 } });
  expect(input.readOnly).toBe(true); expect(input.maxLength).toBe(20); expect(input.minLength).toBe(3);
});
