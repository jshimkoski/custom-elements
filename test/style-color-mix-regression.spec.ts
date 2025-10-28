import { expect, test } from 'vitest';
import { jitCSS } from '../src/lib/runtime/style';

// Regression test for color opacity when using CSS variable palette values
// Ensures we emit an rgb(...) fallback inside the container-wrapped rule and a
// separate container-wrapped color-mix(...) override so var(...) values keep
// the requested alpha when the custom property is defined.

test('container queries with color opacity modifiers emit fallback + color-mix split', () => {
  const html =
    '<div class="@md:bg-primary-500/50 @lg:text-error-500/75"></div>';
  const css = jitCSS(html);

  // Expect container-wrapped rgb fallback for the md bg class
  expect(css).toContain(
    '@container (min-width:28rem){.\\@md\\:bg-primary-500\\/50{background-color:var(--cer-color-primary-500, rgb(59 130 246 / 0.5));}}',
  );

  // Expect a separate container-wrapped rule that uses color-mix to apply alpha to the var(...) at runtime
  expect(css).toContain('color-mix(in srgb, var(--cer-color-primary-500');
});
