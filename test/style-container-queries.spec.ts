import {
  jitCSS,
  utilityMap,
  containerVariants,
  containerOrder,
  minifyCSS,
} from '../src/lib/runtime/style';
import { describe, it, expect } from 'vitest';

describe('🔧 Container Queries', () => {
  describe('📦 @container utility', () => {
    it('should generate @container utility', () => {
      expect(utilityMap['@container']).toBe('container-type:inline-size;');
    });

    it('should apply @container class', () => {
      const html = '<div class="@container"></div>';
      const css = jitCSS(html);
      expect(css).toContain('.\\@container{container-type:inline-size;}');
    });
  });

  describe('📏 Container Variants', () => {
    it('should have correct container variant breakpoints', () => {
      expect(containerVariants).toEqual({
        xs: '(min-width:20rem)',
        sm: '(min-width:24rem)',
        md: '(min-width:28rem)',
        lg: '(min-width:32rem)',
        xl: '(min-width:36rem)',
        '2xl': '(min-width:42rem)',
        '3xl': '(min-width:48rem)',
        '4xl': '(min-width:56rem)',
        '5xl': '(min-width:64rem)',
        '6xl': '(min-width:72rem)',
        '7xl': '(min-width:80rem)',
      });
    });

    it('should have correct container order', () => {
      expect(containerOrder).toEqual([
        'xs',
        'sm',
        'md',
        'lg',
        'xl',
        '2xl',
        '3xl',
        '4xl',
        '5xl',
        '6xl',
        '7xl',
      ]);
    });
  });

  describe('🎯 Basic Container Query Classes', () => {
    it('should generate CSS for container query variants', () => {
      const html = '<div class="@md:text-lg"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '@container (min-width:28rem){.\\@md\\:text-lg{font-size:1.125rem;line-height:var(--cer-line-height,1.75);}}',
      );
    });

    it('should generate CSS for multiple container sizes', () => {
      const html =
        '<div class="@sm:text-base @lg:text-xl @2xl:text-2xl"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '@container (min-width:24rem){.\\@sm\\:text-base{font-size:1rem;line-height:var(--cer-line-height,1.5);}}',
      );
      expect(css).toContain(
        '@container (min-width:32rem){.\\@lg\\:text-xl{font-size:1.25rem;line-height:var(--cer-line-height,1.75);}}',
      );
      expect(css).toContain(
        '@container (min-width:42rem){.\\@2xl\\:text-2xl{font-size:1.5rem;line-height:var(--cer-line-height,2);}}',
      );
    });

    it('should handle container queries with spacing utilities', () => {
      const html = '<div class="@md:p-4 @lg:p-8"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '@container (min-width:28rem){.\\@md\\:p-4{padding:calc(0.25rem * 4);}}',
      );
      expect(css).toContain(
        '@container (min-width:32rem){.\\@lg\\:p-8{padding:calc(0.25rem * 8);}}',
      );
    });

    it('should handle container queries with flexbox utilities', () => {
      const html =
        '<div class="@sm:flex @md:items-center @lg:justify-between"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '@container (min-width:24rem){.\\@sm\\:flex{display:flex;}}',
      );
      expect(css).toContain(
        '@container (min-width:28rem){.\\@md\\:items-center{align-items:center;}}',
      );
      expect(css).toContain(
        '@container (min-width:32rem){.\\@lg\\:justify-between{justify-content:space-between;}}',
      );
    });

    it('should handle container queries with grid utilities', () => {
      const html =
        '<div class="@md:grid @lg:grid-cols-2 @xl:grid-cols-3"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '@container (min-width:28rem){.\\@md\\:grid{display:grid;}}',
      );
      expect(css).toContain(
        '@container (min-width:32rem){.\\@lg\\:grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr));}}',
      );
      expect(css).toContain(
        '@container (min-width:36rem){.\\@xl\\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr));}}',
      );
    });
  });

  describe('🎨 Container Queries with Colors', () => {
    it('should handle container queries with background colors', () => {
      const html = '<div class="@sm:bg-primary-500 @md:bg-success-600"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '@container (min-width:24rem){.\\@sm\\:bg-primary-500{background-color:var(--cer-color-primary-500, #3b82f6);}}',
      );
      expect(css).toContain(
        '@container (min-width:28rem){.\\@md\\:bg-success-600{background-color:var(--cer-color-success-600, #16a34a);}}',
      );
    });

    it('should handle container queries with text colors', () => {
      const html =
        '<div class="@lg:text-error-500 @xl:text-warning-400"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '@container (min-width:32rem){.\\@lg\\:text-error-500{color:var(--cer-color-error-500, #ef4444);}}',
      );
      expect(css).toContain(
        '@container (min-width:36rem){.\\@xl\\:text-warning-400{color:var(--cer-color-warning-400, #fbbf24);}}',
      );
    });

    it('should handle container queries with color opacity modifiers', () => {
      const html =
        '<div class="@md:bg-primary-500/50 @lg:text-error-500/75"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '@container (min-width:28rem){.\\@md\\:bg-primary-500\\/50{background-color:var(--cer-color-primary-500, rgb(59 130 246 / 0.5));}}',
      );
      expect(css).toContain(
        '@container (min-width:32rem){.\\@lg\\:text-error-500\\/75{color:var(--cer-color-error-500, rgb(239 68 68 / 0.75));}}',
      );
    });
  });

  describe('📐 Arbitrary Container Queries', () => {
    it('should handle arbitrary container query values', () => {
      const html = '<div class="@[300px]:text-lg @[500px]:text-xl"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '@container (min-width:300px){.\\@\\[300px\\]\\:text-lg{font-size:1.125rem;line-height:var(--cer-line-height,1.75);}}',
      );
      expect(css).toContain(
        '@container (min-width:500px){.\\@\\[500px\\]\\:text-xl{font-size:1.25rem;line-height:var(--cer-line-height,1.75);}}',
      );
    });

    it('should handle arbitrary container queries with rem values', () => {
      const html = '<div class="@[25rem]:flex @[40rem]:grid"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '@container (min-width:25rem){.\\@\\[25rem\\]\\:flex{display:flex;}}',
      );
      expect(css).toContain(
        '@container (min-width:40rem){.\\@\\[40rem\\]\\:grid{display:grid;}}',
      );
    });

    it('should handle arbitrary container queries with arbitrary values', () => {
      const html =
        '<div class="@[350px]:bg-[#ff0000] @[450px]:text-[20px]"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '@container (min-width:350px){.\\@\\[350px\\]\\:bg-\\[\\#ff0000\\]{background-color:#ff0000;}}',
      );
      expect(css).toContain(
        '@container (min-width:450px){.\\@\\[450px\\]\\:text-\\[20px\\]{font-size:20px;}}',
      );
    });
  });

  describe('🌙 Container Queries with Dark Mode', () => {
    it('should combine container queries with dark mode', () => {
      const html =
        '<div class="dark:@md:text-white dark:@lg:bg-neutral-800"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '@media (prefers-color-scheme: dark)@container (min-width:28rem){.dark\\:\\@md\\:text-white{color:var(--cer-color-white, #ffffff);}}',
      );
      expect(css).toContain(
        '@media (prefers-color-scheme: dark)@container (min-width:32rem){.dark\\:\\@lg\\:bg-neutral-800{background-color:var(--cer-color-neutral-800, #27272a);}}',
      );
    });

    it('should handle dark mode first then container query', () => {
      const html = '<div class="@md:dark:text-primary-400"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '@media (prefers-color-scheme: dark)@container (min-width:28rem){.\\@md\\:dark\\:text-primary-400{color:var(--cer-color-primary-400, #60a5fa);}}',
      );
    });
  });

  describe('📱 Container Queries with Responsive Breakpoints', () => {
    it('should combine container queries with media queries', () => {
      const html = '<div class="md:@lg:text-xl lg:@xl:text-2xl"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        // eslint-disable-next-line no-useless-escape
        '@media (min-width:768px)@container (min-width:32rem){.md\\:\\\@lg\\:text-xl{font-size:1.25rem;line-height:var(--cer-line-height,1.75);}}',
      );
      expect(css).toContain(
        // eslint-disable-next-line no-useless-escape
        '@media (min-width:1024px)@container (min-width:36rem){.lg\\:\\\@xl\\:text-2xl{font-size:1.5rem;line-height:var(--cer-line-height,2);}}',
      );
    });

    it('should handle dark mode with responsive and container queries', () => {
      const html =
        '<div class="dark:md:@lg:bg-neutral-900 dark:lg:@xl:text-neutral-100"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '@media (prefers-color-scheme: dark) and (min-width:768px)@container (min-width:32rem){.dark\\:md\\:\\@lg\\:bg-neutral-900{background-color:var(--cer-color-neutral-900, #18181b);}}',
      );
      expect(css).toContain(
        '@media (prefers-color-scheme: dark) and (min-width:1024px)@container (min-width:36rem){.dark\\:lg\\:\\@xl\\:text-neutral-100{color:var(--cer-color-neutral-100, #f4f4f5);}}',
      );
    });
  });

  describe('🎭 Container Queries with Pseudo-classes', () => {
    it('should handle container queries with hover states', () => {
      const html =
        '<div class="@md:hover:bg-primary-500 @lg:hover:text-white"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '@container (min-width:28rem){.\\@md\\:hover\\:bg-primary-500:hover{background-color:var(--cer-color-primary-500, #3b82f6);}}',
      );
      expect(css).toContain(
        '@container (min-width:32rem){.\\@lg\\:hover\\:text-white:hover{color:var(--cer-color-white, #ffffff);}}',
      );
    });

    it('should handle container queries with focus states', () => {
      const html =
        '<div class="@sm:focus:border-2 @md:focus:border-primary-500"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '@container (min-width:24rem){.\\@sm\\:focus\\:border-2:focus{border-width:2px;}}',
      );
    });

    it('should handle container queries with multiple pseudo-classes', () => {
      const html = '<div class="@lg:hover:focus:bg-success-500"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '@container (min-width:32rem){.\\@lg\\:hover\\:focus\\:bg-success-500:hover:focus{background-color:var(--cer-color-success-500, #22c55e);}}',
      );
    });
  });

  describe('🧩 Container Queries with Complex Utilities', () => {
    it('should handle container queries with transform utilities', () => {
      const TC =
        'translateX(var(--cer-translate-x)) translateY(var(--cer-translate-y)) rotate(var(--cer-rotate)) skewX(var(--cer-skew-x)) skewY(var(--cer-skew-y)) scaleX(var(--cer-scale-x)) scaleY(var(--cer-scale-y))';
      const html = '<div class="@md:scale-110 @lg:rotate-45"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        `@container (min-width:28rem){.\\@md\\:scale-110{--cer-scale-x:1.1;--cer-scale-y:1.1;transform:${TC};}}`,
      );
      expect(css).toContain(
        `@container (min-width:32rem){.\\@lg\\:rotate-45{--cer-rotate:45deg;transform:${TC};}}`,
      );
    });

    it('should handle container queries with transition utilities', () => {
      const html =
        '<div class="@sm:transition @md:duration-300 @lg:ease-in-out"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '@container (min-width:24rem){.\\@sm\\:transition{transition-property:all;transition-duration:150ms;transition-timing-function:ease-in-out;}}',
      );
      expect(css).toContain(
        '@container (min-width:28rem){.\\@md\\:duration-300{transition-duration:300ms;}}',
      );
      expect(css).toContain(
        '@container (min-width:32rem){.\\@lg\\:ease-in-out{transition-timing-function:ease-in-out;}}',
      );
    });

    it('should handle container queries with shadow utilities', () => {
      const html =
        '<div class="@md:shadow-md @lg:shadow-xl @xl:shadow-2xl"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '@container (min-width:28rem){.\\@md\\:shadow-md{--cer-shadow-color:rgb(0 0 0 / 0.1);box-shadow:0 4px 6px -1px var(--cer-shadow-color, rgb(0 0 0 / 0.1)),0 2px 4px -2px var(--cer-shadow-color, rgb(0 0 0 / 0.1));}}',
      );
      expect(css).toContain(
        '@container (min-width:32rem){.\\@lg\\:shadow-xl{--cer-shadow-color:rgb(0 0 0 / 0.1);box-shadow:0 20px 25px -5px var(--cer-shadow-color, rgb(0 0 0 / 0.1)),0 8px 10px -6px var(--cer-shadow-color, rgb(0 0 0 / 0.1));}}',
      );
    });
  });

  describe('💡 Important Modifier with Container Queries', () => {
    it('should handle important modifier with container queries', () => {
      const html = '<div class="@md:!text-xl @lg:bg-primary-500!"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '@container (min-width:28rem){.\\@md\\:\\!text-xl{font-size:1.25rem !important;line-height:var(--cer-line-height,1.75) !important;}}',
      );
      expect(css).toContain(
        '@container (min-width:32rem){.\\@lg\\:bg-primary-500\\!{background-color:var(--cer-color-primary-500, #3b82f6) !important;}}',
      );
    });
  });

  describe('🚫 Invalid Container Query Classes', () => {
    it('should not generate CSS for invalid container query classes', () => {
      const html = '<div class="@invalid:text-lg @unknown-size:bg-red"></div>';
      const css = jitCSS(html);
      expect(css).not.toContain('@container');
    });

    it('should not generate CSS for malformed arbitrary container queries', () => {
      const html = '<div class="@[invalid]:text-lg @[:bg-red"></div>';
      const css = jitCSS(html);
      expect(css).toBe('');
    });
  });

  describe('🔄 Container Query Edge Cases', () => {
    it('should handle empty container query classes', () => {
      const html = '<div class="@sm: @md:"></div>';
      const css = jitCSS(html);
      expect(css).toBe('');
    });

    it('should handle mixed valid and invalid container classes', () => {
      const html =
        '<div class="@md:text-lg @invalid:bg-red @lg:text-xl"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '@container (min-width:28rem){.\\@md\\:text-lg{font-size:1.125rem;line-height:var(--cer-line-height,1.75);}}',
      );
      expect(css).toContain(
        '@container (min-width:32rem){.\\@lg\\:text-xl{font-size:1.25rem;line-height:var(--cer-line-height,1.75);}}',
      );
      expect(css).not.toContain('@invalid');
    });

    it('should handle container queries with various arbitrary units', () => {
      const html =
        '<div class="@[16rem]:text-sm @[400px]:text-base @[25em]:text-lg"></div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '@container (min-width:16rem){.\\@\\[16rem\\]\\:text-sm{font-size:0.875rem;line-height:var(--cer-line-height,1.25);}}',
      );
      expect(css).toContain(
        '@container (min-width:400px){.\\@\\[400px\\]\\:text-base{font-size:1rem;line-height:var(--cer-line-height,1.5);}}',
      );
      expect(css).toContain(
        '@container (min-width:25em){.\\@\\[25em\\]\\:text-lg{font-size:1.125rem;line-height:var(--cer-line-height,1.75);}}',
      );
    });
  });

  describe('🏗️ Real World Container Query Examples', () => {
    it('should handle card component with container queries', () => {
      const html = `
        <div class="@container">
          <div class="@sm:flex @sm:items-center @sm:space-x-4">
            <img class="@sm:w-24 @sm:h-24 @lg:w-32 @lg:h-32" />
            <div class="@sm:flex-1">
              <h3 class="@md:text-xl @lg:text-2xl font-bold">Title</h3>
              <p class="@lg:text-gray-600">Description</p>
            </div>
          </div>
        </div>
      `;
      const css = jitCSS(html);

      // Check that all container queries are generated
      expect(css).toContain('@container');
      expect(css).toContain('.\\@container{container-type:inline-size;}');
      expect(css).toContain('@container (min-width:24rem)');
      expect(css).toContain('@container (min-width:28rem)');
      expect(css).toContain('@container (min-width:32rem)');
    });

    it('should handle sidebar layout with container queries', () => {
      const html = `
        <div class="@container">
          <nav class="@lg:w-64 @xl:w-80 @lg:fixed @lg:h-full">
            <ul class="@md:space-y-2 @lg:space-y-4">
              <li class="@sm:p-2 @md:p-3 @lg:p-4">Link</li>
            </ul>
          </nav>
          <main class="@lg:ml-64 @xl:ml-80 @md:p-6 @lg:p-8">
            <h1 class="@md:text-2xl @lg:text-3xl @xl:text-4xl">Content</h1>
          </main>
        </div>
      `;
      const css = jitCSS(html);

      expect(css).toContain('.\\@container{container-type:inline-size;}');
      expect(css).toContain('@container (min-width:24rem)');
      expect(css).toContain('@container (min-width:28rem)');
      expect(css).toContain('@container (min-width:32rem)');
      expect(css).toContain('@container (min-width:36rem)');
    });

    it('should handle responsive grid with container queries', () => {
      const html = `
        <div class="@container grid @sm:grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4 gap-4">
          <div class="@sm:p-4 @md:p-6 bg-white @md:shadow-md @lg:shadow-lg rounded-lg">
            <h3 class="@sm:text-lg @md:text-xl font-semibold">Item</h3>
            <p class="@md:text-gray-600 @md:mt-2">Description</p>
          </div>
        </div>
      `;
      const css = jitCSS(html);

      expect(css).toContain('grid-template-columns:repeat(1,minmax(0,1fr))');
      expect(css).toContain('grid-template-columns:repeat(2,minmax(0,1fr))');
      expect(css).toContain('grid-template-columns:repeat(3,minmax(0,1fr))');
      expect(css).toContain('grid-template-columns:repeat(4,minmax(0,1fr))');
    });
  });

  describe('🔧 Container Query Performance', () => {
    it('should generate efficient CSS for multiple container queries', () => {
      const html = Array.from(
        { length: 50 },
        (_, i) =>
          `<div class="@md:text-${i % 5 === 0 ? 'lg' : 'base'} @lg:p-${(i % 3) + 2}"></div>`,
      ).join('');

      const start = performance.now();
      const css = jitCSS(html);
      const end = performance.now();

      expect(end - start).toBeLessThan(50); // Should complete in less than 50ms
      expect(css.length).toBeGreaterThan(0);
      expect(css).toContain('@container');
    });

    it('should handle many different container breakpoints efficiently', () => {
      const breakpoints = [
        'xs',
        'sm',
        'md',
        'lg',
        'xl',
        '2xl',
        '3xl',
        '4xl',
        '5xl',
        '6xl',
        '7xl',
      ];
      const html = breakpoints
        .map(
          (bp) =>
            `<div class="@${bp}:text-lg @${bp}:p-4 @${bp}:bg-primary-500"></div>`,
        )
        .join('');

      const css = jitCSS(html);

      // Should generate rules for all breakpoints
      breakpoints.forEach((bp) => {
        expect(css).toContain(`@container ${containerVariants[bp]}`);
      });
    });
  });

  describe('✨ Container Query CSS Output Quality', () => {
    it('should generate clean, minified CSS for container queries', () => {
      const html = '<div class="@md:text-lg @lg:bg-primary-500 @xl:p-4"></div>';
      const css = jitCSS(html);
      const minified = minifyCSS(css);

      // Should be properly minified (no unnecessary spaces, but @container queries have spaces)
      expect(minified).not.toMatch(/\s{2,}/);
      expect(minified.length).toBeGreaterThan(0);
    });

    it('should generate valid CSS selector escaping for container queries', () => {
      const html = '<div class="@[25rem]:bg-[#ff0000] @md:text-[20px]"></div>';
      const css = jitCSS(html);

      // Check that special characters are properly escaped
      expect(css).toContain('\\@\\[25rem\\]\\:bg-\\[\\#ff0000\\]');
      expect(css).toContain('\\@md\\:text-\\[20px\\]');
    });
  });
});
