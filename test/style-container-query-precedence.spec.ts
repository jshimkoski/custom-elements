import { describe, it, expect } from 'vitest';
import { jitCSS } from '../src/lib/runtime/style';

describe('🎯 Container Query Precedence', () => {
  it('should order container queries from smallest to largest for proper CSS cascade', () => {
    // Test with multiple container queries in random order
    const html = `
      <div class="@lg:bg-info-500 @sm:bg-error-500 @xl:bg-warning-500 @md:bg-success-500">
        Container query test
      </div>
    `;

    const css = jitCSS(html);

    // Find the positions of each container query in the generated CSS
    const smIndex = css.indexOf('@container (min-width:24rem)');
    const mdIndex = css.indexOf('@container (min-width:28rem)');
    const lgIndex = css.indexOf('@container (min-width:32rem)');
    const xlIndex = css.indexOf('@container (min-width:36rem)');

    // All container queries should be present
    expect(smIndex, 'sm container query should be present').toBeGreaterThan(-1);
    expect(mdIndex, 'md container query should be present').toBeGreaterThan(-1);
    expect(lgIndex, 'lg container query should be present').toBeGreaterThan(-1);
    expect(xlIndex, 'xl container query should be present').toBeGreaterThan(-1);

    // Verify correct ordering: sm < md < lg < xl
    expect(smIndex).toBeLessThan(mdIndex);
    expect(mdIndex).toBeLessThan(lgIndex);
    expect(lgIndex).toBeLessThan(xlIndex);
  });

  it('should order all named container query breakpoints correctly', () => {
    const html = `
      <div class="@7xl:w-1 @xs:w-2 @5xl:w-3 @2xl:w-4 @md:w-5 @sm:w-6">
        All breakpoints
      </div>
    `;

    const css = jitCSS(html);

    // Extract all container query positions
    const positions = [
      {
        name: 'xs',
        query: '@container (min-width:20rem)',
        index: css.indexOf('@container (min-width:20rem)'),
      },
      {
        name: 'sm',
        query: '@container (min-width:24rem)',
        index: css.indexOf('@container (min-width:24rem)'),
      },
      {
        name: 'md',
        query: '@container (min-width:28rem)',
        index: css.indexOf('@container (min-width:28rem)'),
      },
      {
        name: '2xl',
        query: '@container (min-width:42rem)',
        index: css.indexOf('@container (min-width:42rem)'),
      },
      {
        name: '5xl',
        query: '@container (min-width:64rem)',
        index: css.indexOf('@container (min-width:64rem)'),
      },
      {
        name: '7xl',
        query: '@container (min-width:80rem)',
        index: css.indexOf('@container (min-width:80rem)'),
      },
    ];

    // All should be present
    positions.forEach(({ name, index }) => {
      expect(index, `${name} should be present`).toBeGreaterThan(-1);
    });

    // Verify they are in ascending order
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i - 1].index).toBeLessThan(positions[i].index);
    }
  });

  it('should order arbitrary container queries correctly', () => {
    const html = `
      <div class="@[500px]:flex @[300px]:block @[700px]:grid">
        Arbitrary container queries
      </div>
    `;

    const css = jitCSS(html);

    const pos300 = css.indexOf('@container (min-width:300px)');
    const pos500 = css.indexOf('@container (min-width:500px)');
    const pos700 = css.indexOf('@container (min-width:700px)');

    expect(pos300, '300px should be present').toBeGreaterThan(-1);
    expect(pos500, '500px should be present').toBeGreaterThan(-1);
    expect(pos700, '700px should be present').toBeGreaterThan(-1);

    // Verify correct ordering
    expect(pos300).toBeLessThan(pos500);
    expect(pos500).toBeLessThan(pos700);
  });

  it('should order arbitrary container queries with colors', () => {
    const html = `
      <div class="@[800px]:bg-success-500 @[200px]:bg-error-500 @[600px]:bg-info-500 @[400px]:bg-warning-500">
        Arbitrary queries with colors
      </div>
    `;

    const css = jitCSS(html);

    const pos200 = css.indexOf('@container (min-width:200px)');
    const pos400 = css.indexOf('@container (min-width:400px)');
    const pos600 = css.indexOf('@container (min-width:600px)');
    const pos800 = css.indexOf('@container (min-width:800px)');

    expect(pos200, '200px should be present').toBeGreaterThan(-1);
    expect(pos400, '400px should be present').toBeGreaterThan(-1);
    expect(pos600, '600px should be present').toBeGreaterThan(-1);
    expect(pos800, '800px should be present').toBeGreaterThan(-1);

    // Verify correct ordering: 200 < 400 < 600 < 800
    expect(pos200).toBeLessThan(pos400);
    expect(pos400).toBeLessThan(pos600);
    expect(pos600).toBeLessThan(pos800);
  });

  it('should order arbitrary container queries with spacing utilities', () => {
    const html = `
      <div class="@[1000px]:p-12 @[250px]:p-2 @[500px]:p-6 @[750px]:p-10">
        Arbitrary queries with spacing
      </div>
    `;

    const css = jitCSS(html);

    const pos250 = css.indexOf('@container (min-width:250px)');
    const pos500 = css.indexOf('@container (min-width:500px)');
    const pos750 = css.indexOf('@container (min-width:750px)');
    const pos1000 = css.indexOf('@container (min-width:1000px)');

    expect(pos250, '250px should be present').toBeGreaterThan(-1);
    expect(pos500, '500px should be present').toBeGreaterThan(-1);
    expect(pos750, '750px should be present').toBeGreaterThan(-1);
    expect(pos1000, '1000px should be present').toBeGreaterThan(-1);

    // Verify correct ordering: 250 < 500 < 750 < 1000
    expect(pos250).toBeLessThan(pos500);
    expect(pos500).toBeLessThan(pos750);
    expect(pos750).toBeLessThan(pos1000);
  });

  it('should order arbitrary container queries with typography', () => {
    const html = `
      <div class="@[900px]:text-4xl @[100px]:text-xs @[450px]:text-xl @[1200px]:text-6xl">
        Arbitrary queries with typography
      </div>
    `;

    const css = jitCSS(html);

    const pos100 = css.indexOf('@container (min-width:100px)');
    const pos450 = css.indexOf('@container (min-width:450px)');
    const pos900 = css.indexOf('@container (min-width:900px)');
    const pos1200 = css.indexOf('@container (min-width:1200px)');

    expect(pos100, '100px should be present').toBeGreaterThan(-1);
    expect(pos450, '450px should be present').toBeGreaterThan(-1);
    expect(pos900, '900px should be present').toBeGreaterThan(-1);
    expect(pos1200, '1200px should be present').toBeGreaterThan(-1);

    // Verify correct ordering: 100 < 450 < 900 < 1200
    expect(pos100).toBeLessThan(pos450);
    expect(pos450).toBeLessThan(pos900);
    expect(pos900).toBeLessThan(pos1200);
  });

  it('should order many arbitrary container queries correctly', () => {
    const html = `
      <div class="@[1500px]:w-64 @[150px]:w-4 @[350px]:w-12 @[850px]:w-32 @[550px]:w-20 @[1100px]:w-48">
        Many arbitrary queries
      </div>
    `;

    const css = jitCSS(html);

    const positions = [
      { size: '150px', index: css.indexOf('@container (min-width:150px)') },
      { size: '350px', index: css.indexOf('@container (min-width:350px)') },
      { size: '550px', index: css.indexOf('@container (min-width:550px)') },
      { size: '850px', index: css.indexOf('@container (min-width:850px)') },
      { size: '1100px', index: css.indexOf('@container (min-width:1100px)') },
      { size: '1500px', index: css.indexOf('@container (min-width:1500px)') },
    ];

    // All should be present
    positions.forEach(({ size, index }) => {
      expect(index, `${size} should be present`).toBeGreaterThan(-1);
    });

    // Verify they are in ascending order
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i - 1].index).toBeLessThan(positions[i].index);
    }
  });

  it('should order mixed named and arbitrary container queries correctly', () => {
    const html = `
      <div class="@lg:p-4 @[600px]:p-8 @sm:p-2 @[400px]:p-6">
        Mixed container queries
      </div>
    `;

    const css = jitCSS(html);

    // sm = 24rem = 384px, 400px, lg = 32rem = 512px, 600px
    const posSm = css.indexOf('@container (min-width:24rem)');
    const pos400 = css.indexOf('@container (min-width:400px)');
    const posLg = css.indexOf('@container (min-width:32rem)');
    const pos600 = css.indexOf('@container (min-width:600px)');

    expect(posSm).toBeGreaterThan(-1);
    expect(pos400).toBeGreaterThan(-1);
    expect(posLg).toBeGreaterThan(-1);
    expect(pos600).toBeGreaterThan(-1);

    // Verify correct ordering: sm (384px) < 400px < lg (512px) < 600px
    expect(posSm).toBeLessThan(pos400);
    expect(pos400).toBeLessThan(posLg);
    expect(posLg).toBeLessThan(pos600);
  });

  it('should sort arbitrary queries between semantic breakpoints', () => {
    // xs=320px, sm=384px, md=448px, lg=512px, xl=576px
    // Test: xs < [350px] < sm < [420px] < md < [500px] < lg < [550px] < xl
    const html = `
      <div class="@xl:w-10 @[350px]:w-3 @sm:w-5 @[420px]:w-6 @xs:w-2 @md:w-7 @[500px]:w-8 @lg:w-9 @[550px]:w-9">
        Complex interleaved queries
      </div>
    `;

    const css = jitCSS(html);

    const positions = [
      {
        name: 'xs (320px)',
        index: css.indexOf('@container (min-width:20rem)'),
      },
      { name: '[350px]', index: css.indexOf('@container (min-width:350px)') },
      {
        name: 'sm (384px)',
        index: css.indexOf('@container (min-width:24rem)'),
      },
      { name: '[420px]', index: css.indexOf('@container (min-width:420px)') },
      {
        name: 'md (448px)',
        index: css.indexOf('@container (min-width:28rem)'),
      },
      { name: '[500px]', index: css.indexOf('@container (min-width:500px)') },
      {
        name: 'lg (512px)',
        index: css.indexOf('@container (min-width:32rem)'),
      },
      { name: '[550px]', index: css.indexOf('@container (min-width:550px)') },
      {
        name: 'xl (576px)',
        index: css.indexOf('@container (min-width:36rem)'),
      },
    ];

    // All should be present
    positions.forEach(({ name, index }) => {
      expect(index, `${name} should be present`).toBeGreaterThan(-1);
    });

    // Verify they are in ascending order
    for (let i = 1; i < positions.length; i++) {
      expect(
        positions[i - 1].index,
        `${positions[i - 1].name} should come before ${positions[i].name}`,
      ).toBeLessThan(positions[i].index);
    }
  });

  it('should sort arbitrary queries with colors alongside semantic breakpoints', () => {
    // Test with color utilities: xs < [330px] < sm < [450px] < md < [580px] < xl
    const html = `
      <div class="@[580px]:bg-warning-500 @sm:bg-error-500 @[330px]:bg-primary-500 @xl:bg-success-500 @[450px]:bg-info-500 @xs:text-base @md:text-xl">
        Mixed colors and breakpoints
      </div>
    `;

    const css = jitCSS(html);

    // xs=320px, [330px], sm=384px, [450px], md=448px, [580px], xl=576px
    // Note: md(448px) < xl(576px) < [580px] due to pixel conversion
    const positions = [
      {
        name: 'xs (320px)',
        index: css.indexOf('@container (min-width:20rem)'),
      },
      { name: '[330px]', index: css.indexOf('@container (min-width:330px)') },
      {
        name: 'sm (384px)',
        index: css.indexOf('@container (min-width:24rem)'),
      },
      {
        name: 'md (448px)',
        index: css.indexOf('@container (min-width:28rem)'),
      },
      { name: '[450px]', index: css.indexOf('@container (min-width:450px)') },
      {
        name: 'xl (576px)',
        index: css.indexOf('@container (min-width:36rem)'),
      },
      { name: '[580px]', index: css.indexOf('@container (min-width:580px)') },
    ];

    // All should be present
    positions.forEach(({ name, index }) => {
      expect(index, `${name} should be present`).toBeGreaterThan(-1);
    });

    // Verify ascending order
    for (let i = 1; i < positions.length; i++) {
      expect(
        positions[i - 1].index,
        `${positions[i - 1].name} < ${positions[i].name}`,
      ).toBeLessThan(positions[i].index);
    }
  });

  it('should handle arbitrary queries that align exactly with semantic breakpoints', () => {
    // Test edge case: [384px] = sm (24rem = 384px)
    const html = `
      <div class="@[384px]:p-4 @sm:p-4 @[320px]:p-2 @xs:p-2">
        Exact alignment test
      </div>
    `;

    const css = jitCSS(html);

    const posXs = css.indexOf('@container (min-width:20rem)');
    const pos320 = css.indexOf('@container (min-width:320px)');
    const posSm = css.indexOf('@container (min-width:24rem)');
    const pos384 = css.indexOf('@container (min-width:384px)');

    expect(posXs, 'xs should be present').toBeGreaterThan(-1);
    expect(pos320, '320px should be present').toBeGreaterThan(-1);
    expect(posSm, 'sm should be present').toBeGreaterThan(-1);
    expect(pos384, '384px should be present').toBeGreaterThan(-1);

    // xs (320px) and [320px] are equivalent, sm (384px) and [384px] are equivalent
    // Both should appear in order, with [320px] < [384px]
    expect(pos320).toBeLessThan(pos384);
  });

  it('should sort many mixed arbitrary and semantic queries', () => {
    // Test comprehensive mix: 10+ queries
    const html = `
      <div class="@7xl:w-20 @[1100px]:w-18 @3xl:w-14 @[650px]:w-12 @xl:w-10 @[480px]:w-8 @sm:w-6 @[340px]:w-4 @xs:w-2">
        Many mixed queries
      </div>
    `;

    const css = jitCSS(html);

    // xs=320px, [340px], sm=384px, [480px], xl=576px, [650px], 3xl=768px, [1100px], 7xl=1280px
    const positions = [
      {
        name: 'xs (320px)',
        size: 320,
        index: css.indexOf('@container (min-width:20rem)'),
      },
      {
        name: '[340px]',
        size: 340,
        index: css.indexOf('@container (min-width:340px)'),
      },
      {
        name: 'sm (384px)',
        size: 384,
        index: css.indexOf('@container (min-width:24rem)'),
      },
      {
        name: '[480px]',
        size: 480,
        index: css.indexOf('@container (min-width:480px)'),
      },
      {
        name: 'xl (576px)',
        size: 576,
        index: css.indexOf('@container (min-width:36rem)'),
      },
      {
        name: '[650px]',
        size: 650,
        index: css.indexOf('@container (min-width:650px)'),
      },
      {
        name: '3xl (768px)',
        size: 768,
        index: css.indexOf('@container (min-width:48rem)'),
      },
      {
        name: '[1100px]',
        size: 1100,
        index: css.indexOf('@container (min-width:1100px)'),
      },
      {
        name: '7xl (1280px)',
        size: 1280,
        index: css.indexOf('@container (min-width:80rem)'),
      },
    ];

    // All should be present
    positions.forEach(({ name, index }) => {
      expect(index, `${name} should be present`).toBeGreaterThan(-1);
    });

    // Verify strict ascending order
    for (let i = 1; i < positions.length; i++) {
      expect(
        positions[i - 1].index,
        `${positions[i - 1].name} (${positions[i - 1].size}px) < ${positions[i].name} (${positions[i].size}px)`,
      ).toBeLessThan(positions[i].index);
    }
  });

  it('should sort arbitrary queries with rem units correctly against semantic queries', () => {
    // Test that arbitrary pixel queries are compared correctly to semantic rem-based queries
    // sm = 24rem = 384px, md = 28rem = 448px
    const html = `
      <div class="@[400px]:flex @sm:block @[460px]:grid @md:inline-flex">
        Pixel vs rem comparison
      </div>
    `;

    const css = jitCSS(html);

    // Expected order: sm(384px) < [400px] < md(448px) < [460px]
    const posSm = css.indexOf('@container (min-width:24rem)');
    const pos400 = css.indexOf('@container (min-width:400px)');
    const posMd = css.indexOf('@container (min-width:28rem)');
    const pos460 = css.indexOf('@container (min-width:460px)');

    expect(posSm, 'sm should be present').toBeGreaterThan(-1);
    expect(pos400, '400px should be present').toBeGreaterThan(-1);
    expect(posMd, 'md should be present').toBeGreaterThan(-1);
    expect(pos460, '460px should be present').toBeGreaterThan(-1);

    // Verify order
    expect(posSm).toBeLessThan(pos400);
    expect(pos400).toBeLessThan(posMd);
    expect(posMd).toBeLessThan(pos460);
  });

  it('should maintain correct precedence when same property is used with different breakpoints', () => {
    // In this case, @lg should override @sm when container is large enough
    const html = `
      <div class="@sm:bg-primary-500 @lg:bg-info-500">
        Override test
      </div>
    `;

    const css = jitCSS(html);

    const smIndex = css.indexOf('@container (min-width:24rem)');
    const lgIndex = css.indexOf('@container (min-width:32rem)');

    expect(smIndex, 'sm should be present').toBeGreaterThan(-1);
    expect(lgIndex, 'lg should be present').toBeGreaterThan(-1);

    // @lg must come after @sm in the CSS for proper cascade
    expect(smIndex).toBeLessThan(lgIndex);
  });

  it('should place dark-only rules after all responsive rules regardless of class order', () => {
    // If dark: ends up in the same bucket as sm:/md: the relative position of
    // these two media-query rules depends on which class was written first in
    // the HTML — non-deterministic behaviour. The fix assigns dark-only to a
    // dedicated bucket that is always flushed after the responsive bucket.

    // dark: listed first in the class attribute
    const htmlDarkFirst = `<div class="dark:text-white sm:text-lg md:text-xl">test</div>`;
    // dark: listed last in the class attribute
    const htmlDarkLast = `<div class="sm:text-lg md:text-xl dark:text-white">test</div>`;

    const cssDarkFirst = jitCSS(htmlDarkFirst);
    const cssDarkLast = jitCSS(htmlDarkLast);

    // Both orderings must produce identical CSS (deterministic output)
    expect(cssDarkFirst).toBe(cssDarkLast);

    // dark: rule must come AFTER sm: and md: rules so dark-mode overrides win
    const darkIdx = cssDarkFirst.indexOf('@media (prefers-color-scheme: dark)');
    const smIdx = cssDarkFirst.indexOf('@media (min-width:640px)');
    const mdIdx = cssDarkFirst.indexOf('@media (min-width:768px)');

    expect(darkIdx).toBeGreaterThan(-1);
    expect(smIdx).toBeGreaterThan(-1);
    expect(mdIdx).toBeGreaterThan(-1);

    expect(smIdx).toBeLessThan(darkIdx);
    expect(mdIdx).toBeLessThan(darkIdx);
  });

  it('should also order responsive media queries correctly', () => {
    const html = `
      <div class="xl:bg-warning-500 sm:bg-error-500 lg:bg-info-500 md:bg-success-500">
        Responsive media queries
      </div>
    `;

    const css = jitCSS(html);

    const smIndex = css.indexOf('@media (min-width:640px)');
    const mdIndex = css.indexOf('@media (min-width:768px)');
    const lgIndex = css.indexOf('@media (min-width:1024px)');
    const xlIndex = css.indexOf('@media (min-width:1280px)');

    expect(smIndex, 'sm media query should be present').toBeGreaterThan(-1);
    expect(mdIndex, 'md media query should be present').toBeGreaterThan(-1);
    expect(lgIndex, 'lg media query should be present').toBeGreaterThan(-1);
    expect(xlIndex, 'xl media query should be present').toBeGreaterThan(-1);

    // Verify correct ordering
    expect(smIndex).toBeLessThan(mdIndex);
    expect(mdIndex).toBeLessThan(lgIndex);
    expect(lgIndex).toBeLessThan(xlIndex);
  });

  it('should order dark mode with container queries correctly', () => {
    const html = `
      <div class="dark:@lg:bg-primary-500 dark:@sm:bg-error-500">
        Dark mode with container queries
      </div>
    `;

    const css = jitCSS(html);

    // Both should have dark mode and container queries
    // Dark mode + container queries use format: @media (prefers-color-scheme: dark)@container (min-width:...)
    const darkSmIndex = css.indexOf(
      '@media (prefers-color-scheme: dark)@container (min-width:24rem)',
    );
    const darkLgIndex = css.indexOf(
      '@media (prefers-color-scheme: dark)@container (min-width:32rem)',
    );

    expect(darkSmIndex, 'dark @sm should be present').toBeGreaterThan(-1);
    expect(darkLgIndex, 'dark @lg should be present').toBeGreaterThan(-1);

    // Verify @lg comes after @sm
    expect(darkSmIndex).toBeLessThan(darkLgIndex);
  });
});
