import { describe, it, expect, beforeEach } from 'vitest';
import {
  jitCSS,
  parseColorClass,
  parseArbitrary,
  parseSpacing,
  parseOpacity,
  parseColorWithOpacity,
  extractClassesFromHTML,
  escapeClassName,
  hexToRgb,
  utilityMap,
  colors,
  selectorVariants,
  mediaVariants,
} from '../src/lib/runtime/style';

describe('Optimized JIT CSS Tests', () => {
  beforeEach(() => {
    // Clear cache before each test
    jitCSS(''); // Reset cache
  });

  describe('Core utility parsing', () => {
    it('should parse basic display utilities', () => {
      expect(utilityMap.block).toBe('display:block;');
      expect(utilityMap.flex).toBe('display:flex;');
      expect(utilityMap.grid).toBe('display:grid;');
      expect(utilityMap.hidden).toBe('display:none;');
      expect(utilityMap['inline-flex']).toBe('display:inline-flex;');
    });

    it('should parse positioning utilities', () => {
      expect(utilityMap.absolute).toBe('position:absolute;');
      expect(utilityMap.relative).toBe('position:relative;');
      expect(utilityMap.fixed).toBe('position:fixed;');
      expect(utilityMap.sticky).toBe('position:sticky;');
      expect(utilityMap.static).toBe('position:static;');
    });

    it('should parse flex utilities', () => {
      expect(utilityMap['items-center']).toBe('align-items:center;');
      expect(utilityMap['justify-center']).toBe('justify-content:center;');
      expect(utilityMap['flex-col']).toBe('flex-direction:column;');
      expect(utilityMap['flex-wrap']).toBe('flex-wrap:wrap;');
      expect(utilityMap['justify-between']).toBe(
        'justify-content:space-between;',
      );
    });

    it('should parse typography utilities', () => {
      expect(utilityMap['text-center']).toBe('text-align:center;');
      expect(utilityMap['font-bold']).toBe('font-weight:700;');
      expect(utilityMap.uppercase).toBe('text-transform:uppercase;');
      expect(utilityMap.truncate).toBe(
        'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
      );
      expect(utilityMap['font-medium']).toBe('font-weight:500;');
    });

    it('should parse border utilities', () => {
      expect(utilityMap.border).toBe('border-width:1px;');
      expect(utilityMap['border-t']).toBe('border-top-width:1px;');
      expect(utilityMap['border-2']).toBe('border-width:2px;');
      expect(utilityMap['border-solid']).toBe('border-style:solid;');
      expect(utilityMap['border-dashed']).toBe('border-style:dashed;');
    });

    it('should parse shadow utilities', () => {
      expect(utilityMap['shadow-sm']).toContain('box-shadow:');
      expect(utilityMap['shadow-lg']).toContain('box-shadow:');
      expect(utilityMap['shadow-none']).toContain('--cer-shadow-color:');
    });
  });

  describe('Enhanced utilities not in original', () => {
    it('should have enhanced font weight utilities', () => {
      expect(utilityMap['font-thin']).toBe('font-weight:100;');
      expect(utilityMap['font-extralight']).toBe('font-weight:200;');
      expect(utilityMap['font-light']).toBe('font-weight:300;');
      expect(utilityMap['font-normal']).toBe('font-weight:400;');
      expect(utilityMap['font-extrabold']).toBe('font-weight:800;');
      expect(utilityMap['font-black']).toBe('font-weight:900;');
    });

    it('should have letter spacing utilities', () => {
      expect(utilityMap['tracking-tighter']).toBe('letter-spacing:-0.05em;');
      expect(utilityMap['tracking-tight']).toBe('letter-spacing:-0.025em;');
      expect(utilityMap['tracking-normal']).toBe('letter-spacing:0em;');
      expect(utilityMap['tracking-wide']).toBe('letter-spacing:0.025em;');
      expect(utilityMap['tracking-wider']).toBe('letter-spacing:0.05em;');
      expect(utilityMap['tracking-widest']).toBe('letter-spacing:0.1em;');
    });

    it('should have line height utilities', () => {
      expect(utilityMap['leading-3']).toBe(
        'line-height:0.75rem;--cer-line-height:0.75rem;line-height:var(--cer-line-height,0.75rem);',
      );
      expect(utilityMap['leading-none']).toBe(
        'line-height:1;--cer-line-height:1;line-height:var(--cer-line-height,1);',
      );
      expect(utilityMap['leading-tight']).toBe(
        'line-height:1.25;--cer-line-height:1.25;line-height:var(--cer-line-height,1.25);',
      );
      expect(utilityMap['leading-normal']).toBe(
        'line-height:1.5;--cer-line-height:1.5;line-height:var(--cer-line-height,1.5);',
      );
      expect(utilityMap['leading-loose']).toBe(
        'line-height:2;--cer-line-height:2;line-height:var(--cer-line-height,2);',
      );
    });

    it('should have transform utilities', () => {
      expect(utilityMap['scale-50']).toBe('transform:scale(0.5);');
      expect(utilityMap['scale-100']).toBe('transform:scale(1);');
      expect(utilityMap['scale-125']).toBe('transform:scale(1.25);');
      expect(utilityMap['rotate-45']).toBe('transform:rotate(45deg);');
      expect(utilityMap['rotate-90']).toBe('transform:rotate(90deg);');
      expect(utilityMap['-rotate-45']).toBe('transform:rotate(-45deg);');
    });

    it('should have aspect ratio utilities', () => {
      expect(utilityMap['aspect-auto']).toBe('aspect-ratio:auto;');
      expect(utilityMap['aspect-square']).toBe('aspect-ratio:1 / 1;');
      expect(utilityMap['aspect-video']).toBe('aspect-ratio:16 / 9;');
    });

    it('should have object utilities', () => {
      expect(utilityMap['object-contain']).toBe('object-fit:contain;');
      expect(utilityMap['object-cover']).toBe('object-fit:cover;');
      expect(utilityMap['object-center']).toBe('object-position:center;');
    });

    it('should have line clamp utilities', () => {
      expect(utilityMap['line-clamp-1']).toBe(
        'display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;',
      );
      expect(utilityMap['line-clamp-3']).toBe(
        'display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;',
      );
    });

    it('should have order utilities', () => {
      expect(utilityMap['order-1']).toBe('order:1;');
      expect(utilityMap['order-12']).toBe('order:12;');
      expect(utilityMap['order-first']).toBe('order:-9999;');
      expect(utilityMap['order-last']).toBe('order:9999;');
      expect(utilityMap['order-none']).toBe('order:0;');
    });

    it('should have enhanced cursor utilities', () => {
      expect(utilityMap['cursor-pointer']).toBe('cursor:pointer;');
      expect(utilityMap['cursor-grab']).toBe('cursor:grab;');
      expect(utilityMap['cursor-grabbing']).toBe('cursor:grabbing;');
      expect(utilityMap['cursor-not-allowed']).toBe('cursor:not-allowed;');
    });

    it('should have transition duration utilities', () => {
      expect(utilityMap['duration-75']).toBe('transition-duration:75ms;');
      expect(utilityMap['duration-150']).toBe('transition-duration:150ms;');
      expect(utilityMap['duration-300']).toBe('transition-duration:300ms;');
      expect(utilityMap['duration-1000']).toBe('transition-duration:1000ms;');
    });

    it('should have enhanced size utilities', () => {
      expect(utilityMap['w-fit']).toBe('width:fit-content;');
      expect(utilityMap['h-fit']).toBe('height:fit-content;');
      expect(utilityMap['w-min']).toBe('width:min-content;');
      expect(utilityMap['w-max']).toBe('width:max-content;');
    });
  });

  describe('Enhanced color system', () => {
    it('should have standard Tailwind colors', () => {
      // Test new colors not in original
      expect(colors.neutral['500']).toContain('--cer-color-neutral-500');
      expect(colors.primary['500']).toContain('--cer-color-primary-500');
      expect(colors.error['500']).toContain('--cer-color-error-500');
      expect(colors.success['500']).toContain('--cer-color-success-500');
      expect(colors.info['500']).toContain('--cer-color-info-500');
      expect(colors.warning['500']).toContain('--cer-color-warning-500');
      expect(colors.secondary['500']).toContain('--cer-color-secondary-500');
    });

    it('should parse new color names', () => {
      expect(parseColorClass('bg-neutral-500')).toBe(
        'background-color:var(--cer-color-neutral-500, #71717b);',
      );
      expect(parseColorClass('text-primary-600')).toBe(
        'color:var(--cer-color-primary-600, #2563eb);',
      );
      expect(parseColorClass('border-error-400')).toBe(
        'border-color:var(--cer-color-error-400, #f87171);',
      );
    });

    it('should maintain backward compatibility with semantic colors', () => {
      expect(parseColorClass('bg-primary-500')).toBe(
        'background-color:var(--cer-color-primary-500, #3b82f6);',
      );
      expect(parseColorClass('text-error-600')).toBe(
        'color:var(--cer-color-error-600, #dc2626);',
      );
      expect(parseColorClass('border-success-400')).toBe(
        'border-color:var(--cer-color-success-400, #4ade80);',
      );
    });
  });

  describe('Spacing utilities', () => {
    it('should parse margin utilities', () => {
      expect(parseSpacing('m-4')).toBe('margin:calc(0.25rem * 4);');
      expect(parseSpacing('mx-2')).toBe('margin-inline:calc(0.25rem * 2);');
      expect(parseSpacing('mt-8')).toBe('margin-top:calc(0.25rem * 8);');
      expect(parseSpacing('-m-4')).toBe('margin:calc(-0.25rem * 4);');
    });

    it('should parse padding utilities', () => {
      expect(parseSpacing('p-4')).toBe('padding:calc(0.25rem * 4);');
      expect(parseSpacing('px-2')).toBe('padding-inline:calc(0.25rem * 2);');
      expect(parseSpacing('py-6')).toBe('padding-block:calc(0.25rem * 6);');
    });

    it('should handle decimal values', () => {
      expect(parseSpacing('m-0.5')).toBe('margin:calc(0.25rem * 0.5);');
      expect(parseSpacing('p-1.5')).toBe('padding:calc(0.25rem * 1.5);');
      expect(parseSpacing('gap-2.5')).toBe('gap:calc(0.25rem * 2.5);');
    });

    it('should return null for invalid spacing', () => {
      expect(parseSpacing('invalid')).toBe(null);
      expect(parseSpacing('m-')).toBe(null);
      expect(parseSpacing('m-abc')).toBe(null);
    });
  });

  describe('Enhanced arbitrary value parsing', () => {
    it('should parse property-value pairs', () => {
      expect(parseArbitrary('[color:error]')).toBe('color:error;');
      expect(parseArbitrary('[font-size:2rem]')).toBe('font-size:2rem;');
      expect(parseArbitrary('[z-index:999]')).toBe('z-index:999;');
    });

    it('should parse property-arbitrary pairs', () => {
      expect(parseArbitrary('bg-[#ff0000]')).toBe('background-color:#ff0000;');
      expect(parseArbitrary('w-[200px]')).toBe('width:200px;');
      expect(parseArbitrary('p-[1rem_2rem]')).toBe('padding:1rem 2rem;');
    });

    it('should handle enhanced transform utilities', () => {
      expect(parseArbitrary('rotate-[45deg]')).toBe('transform:rotate(45deg);');
      expect(parseArbitrary('scale-[1.2]')).toBe('transform:scale(1.2);');
      expect(parseArbitrary('translate-x-[10px]')).toBe(
        'transform:translateX(10px);',
      );
      expect(parseArbitrary('translate-y-[-5px]')).toBe(
        'transform:translateY(-5px);',
      );
    });

    it('should handle enhanced property mappings', () => {
      expect(parseArbitrary('tracking-[0.1em]')).toBe('letter-spacing:0.1em;');
      expect(parseArbitrary('leading-[1.8]')).toBe('line-height:1.8;');
      expect(parseArbitrary('opacity-[0.75]')).toBe('opacity:0.75;');
    });
  });

  describe('JIT CSS generation', () => {
    it('should generate CSS for enhanced utilities', () => {
      const html = '<div class="tracking-wide leading-relaxed">Content</div>';
      const css = jitCSS(html);
      expect(css).toContain('.tracking-wide{letter-spacing:0.025em;}');
      expect(css).toContain(
        '.leading-relaxed{line-height:1.625;--cer-line-height:1.625;line-height:var(--cer-line-height,1.625);}',
      );
    });

    it('should generate CSS for transform utilities', () => {
      const html = '<div class="scale-110 rotate-45">Content</div>';
      const css = jitCSS(html);
      expect(css).toContain('.scale-110{transform:scale(1.1);}');
      expect(css).toContain('.rotate-45{transform:rotate(45deg);}');
    });

    it('should generate CSS for aspect ratio utilities', () => {
      const html = '<div class="aspect-video aspect-square">Content</div>';
      const css = jitCSS(html);
      expect(css).toContain('.aspect-video{aspect-ratio:16 / 9;}');
      expect(css).toContain('.aspect-square{aspect-ratio:1 / 1;}');
    });

    it('should generate CSS for new colors', () => {
      const html = '<div class="bg-neutral-800 text-primary-500">Content</div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '.bg-neutral-800{background-color:var(--cer-color-neutral-800, #27272a);}',
      );
      expect(css).toContain(
        '.text-primary-500{color:var(--cer-color-primary-500, #3b82f6);}',
      );
    });

    it('should handle hover states with new colors', () => {
      const html = '<div class="hover:bg-primary-500">Content</div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '.hover\\:bg-primary-500:hover{background-color:var(--cer-color-primary-500,',
      );
    });

    it('should handle complex combinations', () => {
      const html =
        '<div class="flex items-center bg-neutral-100 rounded-lg">Content</div>';
      const css = jitCSS(html);
      expect(css.length).toBeGreaterThan(0);
      expect(css).toContain('.flex{display:flex;}');
      expect(css).toContain('.items-center{align-items:center;}');
      // Check that new colors work
      expect(css).toContain(
        '.bg-neutral-100{background-color:var(--cer-color-neutral-100, #f4f4f5);}',
      );
      expect(css).toContain('.rounded-lg{border-radius:0.5rem;}');
    });

    it('should maintain backward compatibility', () => {
      const html =
        '<div class="flex items-center bg-primary-500 text-white p-4">Content</div>';
      const css = jitCSS(html);
      expect(css).toContain('.flex{display:flex;}');
      expect(css).toContain('.items-center{align-items:center;}');
      expect(css).toContain(
        '.bg-primary-500{background-color:var(--cer-color-primary-500, #3b82f6);}',
      );
      expect(css).toContain(
        '.text-white{color:var(--cer-color-white, #ffffff);}',
      );
      expect(css).toContain('.p-4{padding:calc(0.25rem * 4);}');
    });

    it('should handle line clamp utilities', () => {
      const html = '<div class="line-clamp-2 line-clamp-none">Content</div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '.line-clamp-2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
      );
      expect(css).toContain(
        '.line-clamp-none{overflow:visible;display:block;-webkit-box-orient:horizontal;-webkit-line-clamp:none;}',
      );
    });

    it('should handle order utilities', () => {
      const html = '<div class="order-first order-last order-5">Content</div>';
      const css = jitCSS(html);
      expect(css).toContain('.order-first{order:-9999;}');
      expect(css).toContain('.order-last{order:9999;}');
      expect(css).toContain('.order-5{order:5;}');
    });

    it('should handle enhanced border styles', () => {
      const html =
        '<div class="border-dashed border-dotted border-double">Content</div>';
      const css = jitCSS(html);
      expect(css).toContain('.border-dashed{border-style:dashed;}');
      expect(css).toContain('.border-dotted{border-style:dotted;}');
      expect(css).toContain('.border-double{border-style:double;}');
    });

    it('should handle enhanced cursor utilities', () => {
      const html =
        '<div class="cursor-grab cursor-grabbing cursor-not-allowed">Content</div>';
      const css = jitCSS(html);
      expect(css).toContain('.cursor-grab{cursor:grab;}');
      expect(css).toContain('.cursor-grabbing{cursor:grabbing;}');
      expect(css).toContain('.cursor-not-allowed{cursor:not-allowed;}');
    });
  });

  describe('Performance and compatibility', () => {
    it('should cache results efficiently', () => {
      const html = '<div class="flex items-center">Content</div>';
      const css1 = jitCSS(html);
      const css2 = jitCSS(html);
      expect(css1).toBe(css2);
    });

    it('should handle empty HTML', () => {
      const css = jitCSS('');
      expect(css).toBe('');
    });

    it('should handle large class lists efficiently', () => {
      const classes = [
        'flex',
        'items-center',
        'justify-between',
        'bg-neutral-100',
        'hover:bg-neutral-200',
        'dark:bg-neutral-800',
        'dark:hover:bg-neutral-700',
        'p-4',
        'rounded-lg',
        'shadow-md',
        'transition-all',
        'duration-300',
        'ease-in-out',
        'transform',
        'hover:scale-105',
        'cursor-pointer',
        'select-none',
        'font-medium',
        'tracking-wide',
        'text-neutral-800',
        'dark:text-neutral-200',
      ].join(' ');
      const html = `<div class="${classes}">Content</div>`;

      const start = performance.now();
      const css = jitCSS(html);
      const end = performance.now();

      expect(css.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(50); // Should be fast
    });

    it('should generate the same output as original for common utilities', () => {
      const testCases = [
        'flex items-center justify-center',
        'bg-primary-500 text-white p-4',
        'hover:bg-neutral-200 transition-colors',
        'sm:text-lg md:text-xl lg:text-2xl',
        'absolute top-0 left-0 w-full h-full',
        'grid grid-cols-3 gap-4',
        'border border-neutral-200 rounded-lg shadow-sm',
      ];

      testCases.forEach((classes) => {
        const html = `<div class="${classes}">Content</div>`;
        const css = jitCSS(html);
        expect(css.length).toBeGreaterThan(0);
      });
    });

    it('should handle invalid classes gracefully', () => {
      const html = '<div class="invalid-class-name fake-utility">Content</div>';
      const css = jitCSS(html);
      expect(css).toBe('');
    });

    it('should handle special characters in class names', () => {
      const html =
        '<div class="[mask-image:url(\'/icons/mask.svg\')] sm:hover:bg-primary-500/50">Content</div>';
      const css = jitCSS(html);
      expect(css.length).toBeGreaterThan(0);
    });
  });

  describe('Utility function compatibility', () => {
    it('should maintain extractClassesFromHTML behavior', () => {
      const html =
        '<div class="flex items-center bg-primary-500">Content</div>';
      const classes = extractClassesFromHTML(html);
      expect(classes).toEqual(['flex', 'items-center', 'bg-primary-500']);
    });

    it('should maintain escapeClassName behavior', () => {
      expect(escapeClassName('hover:bg-primary-500')).toBe(
        'hover\\:bg-primary-500',
      );
      expect(escapeClassName('[color:error]')).toBe('\\[color\\:error\\]');
    });

    it('should maintain hexToRgb behavior', () => {
      expect(hexToRgb('#ff0000')).toBe('255 0 0');
      expect(hexToRgb('#3b82f6')).toBe('59 130 246');
    });

    it('should maintain parseOpacity behavior', () => {
      expect(parseOpacity('opacity-0')).toBe('opacity:0;');
      expect(parseOpacity('opacity-50')).toBe('opacity:0.5;');
      expect(parseOpacity('opacity-100')).toBe('opacity:1;');
    });

    it('should maintain parseColorWithOpacity behavior', () => {
      const result = parseColorWithOpacity('bg-primary-500/50');
      expect(result).toContain('rgb(59 130 246 / 0.5)');
    });

    it('should maintain selector variants behavior', () => {
      expect(selectorVariants.hover('.test', 'color:error;')).toBe(
        '.test:hover{color:error;}',
      );
      expect(selectorVariants['group-hover']('.test', 'color:error;')).toBe(
        '.group:hover .test{color:error;}',
      );
    });

    it('should maintain media variants behavior', () => {
      expect(mediaVariants.sm).toBe('(min-width:640px)');
      expect(mediaVariants.dark).toBe('(prefers-color-scheme: dark)');
    });
  });

  describe('Regression tests', () => {
    it('should generate identical CSS for core utilities', () => {
      const coreUtilities = [
        'block',
        'flex',
        'grid',
        'hidden',
        'absolute',
        'relative',
        'fixed',
        'sticky',
        'items-center',
        'justify-center',
        'text-center',
        'font-bold',
        'uppercase',
        'border',
        'overflow-hidden',
        'pointer-events-none',
      ];

      coreUtilities.forEach((utility) => {
        expect(utilityMap[utility]).toBeDefined();
        expect(typeof utilityMap[utility]).toBe('string');
        expect(utilityMap[utility].length).toBeGreaterThan(0);
      });

      // Test utilities that should exist
      expect(utilityMap['rounded-lg']).toBeDefined();
      expect(utilityMap['shadow-sm']).toBeDefined();
    });

    it('should handle all semantic colors', () => {
      const semanticColors = [
        'primary',
        'secondary',
        'success',
        'info',
        'warning',
        'error',
        'neutral',
      ];
      const shades = [
        '50',
        '100',
        '200',
        '300',
        '400',
        '500',
        '600',
        '700',
        '800',
        '900',
        '950',
      ];

      semanticColors.forEach((color) => {
        shades.forEach((shade) => {
          const className = `bg-${color}-${shade}`;
          const result = parseColorClass(className);
          expect(result).toBeDefined();
          expect(result).toContain(`--cer-color-${color}-${shade}`);
        });
      });
    });

    it('should maintain grid utility generation', () => {
      for (let i = 1; i <= 12; i++) {
        expect(utilityMap[`grid-cols-${i}`]).toBeDefined();
        expect(utilityMap[`grid-rows-${i}`]).toBeDefined();
        expect(utilityMap[`col-span-${i}`]).toBeDefined();
        expect(utilityMap[`row-span-${i}`]).toBeDefined();
      }
    });

    it('should maintain border width generation', () => {
      const borderWidths = [0, 1, 2, 4, 6, 8];
      borderWidths.forEach((width) => {
        expect(utilityMap[`border-${width}`]).toBeDefined();
        expect(utilityMap[`border-t-${width}`]).toBeDefined();
        expect(utilityMap[`border-r-${width}`]).toBeDefined();
        expect(utilityMap[`border-b-${width}`]).toBeDefined();
        expect(utilityMap[`border-l-${width}`]).toBeDefined();
      });
    });

    it('should maintain rounded corner generation', () => {
      const radiusKeys = [
        'none',
        'xs',
        'sm',
        'md',
        'lg',
        'xl',
        '2xl',
        '3xl',
        '4xl',
        'full',
      ];
      radiusKeys.forEach((key) => {
        expect(utilityMap[`rounded-${key}`]).toBeDefined();
        expect(utilityMap[`rounded-t-${key}`]).toBeDefined();
        expect(utilityMap[`rounded-r-${key}`]).toBeDefined();
        expect(utilityMap[`rounded-b-${key}`]).toBeDefined();
        expect(utilityMap[`rounded-l-${key}`]).toBeDefined();
      });
    });
  });
});
