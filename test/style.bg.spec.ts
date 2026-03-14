import { describe, it, expect, beforeEach } from 'vitest';
import { jitCSS, jitCssCache } from '../src/lib/runtime/style';
import { minifyCSS } from '../src/lib/runtime/css-utils';

describe('style - utility class rendering', () => {
  beforeEach(() => {
    jitCssCache.clear();
  });

  it('renders bg-white text-black dark:bg-neutral-950 dark:text-white flex flex-col min-h-screen max-w-screen', () => {
    const classes =
      'bg-white text-black dark:bg-neutral-950 dark:text-white flex flex-col min-h-screen max-w-screen';
    const html = `<div class="${classes}"></div>`;
    const css = minifyCSS(jitCSS(html));

    // Colors
    expect(css).toContain('background-color:var(--cer-color-white,#ffffff)');
    expect(css).toContain('color:var(--cer-color-black,#000000)');

    // Dark variant should be wrapped in prefers-color-scheme media query and reference neutral-950
    expect(css).toContain('@media (prefers-color-scheme:dark)');
    expect(css).toContain('var(--cer-color-neutral-950,');

    // Flex utilities
    expect(css).toContain('display:flex');
    expect(css).toContain('flex-direction:column');

    // Screen sizing utilities
    expect(css).toContain('min-height:100dvh');
    expect(css).toContain('max-width:100dvw');
  });
});
