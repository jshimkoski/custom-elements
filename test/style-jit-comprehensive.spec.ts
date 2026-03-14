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

describe('JIT CSS Comprehensive Tests', () => {
  describe('Core utility parsing', () => {
    it('should parse basic display utilities', () => {
      expect(utilityMap.block).toBe('display:block;');
      expect(utilityMap.flex).toBe('display:flex;');
      expect(utilityMap.grid).toBe('display:grid;');
      expect(utilityMap.hidden).toBe('display:none;');
    });

    it('should parse positioning utilities', () => {
      expect(utilityMap.absolute).toBe('position:absolute;');
      expect(utilityMap.relative).toBe('position:relative;');
      expect(utilityMap.fixed).toBe('position:fixed;');
      expect(utilityMap.sticky).toBe('position:sticky;');
    });

    it('should parse flex utilities', () => {
      expect(utilityMap['items-center']).toBe('align-items:center;');
      expect(utilityMap['justify-center']).toBe('justify-content:center;');
      expect(utilityMap['flex-col']).toBe('flex-direction:column;');
      expect(utilityMap['flex-wrap']).toBe('flex-wrap:wrap;');
    });

    it('should parse typography utilities', () => {
      expect(utilityMap['text-center']).toBe('text-align:center;');
      expect(utilityMap['font-bold']).toBe('font-weight:700;');
      expect(utilityMap.uppercase).toBe('text-transform:uppercase;');
      expect(utilityMap.truncate).toBe(
        'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
      );
    });

    it('should parse border utilities', () => {
      expect(utilityMap.border).toBe('border-width:1px;');
      expect(utilityMap['border-t']).toBe('border-top-width:1px;');
      expect(utilityMap['border-2']).toBe('border-width:2px;');
    });

    it('should parse shadow utilities', () => {
      expect(utilityMap['shadow-sm']).toContain('box-shadow:');
      expect(utilityMap['shadow-lg']).toContain('box-shadow:');
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

    it('should parse width/height utilities', () => {
      expect(parseSpacing('w-24')).toBe('width:calc(0.25rem * 24);');
      expect(parseSpacing('h-12')).toBe('height:calc(0.25rem * 12);');
      expect(parseSpacing('min-w-0')).toBe('min-width:calc(0.25rem * 0);');
    });

    it('should parse positioning utilities', () => {
      expect(parseSpacing('top-4')).toBe('top:calc(0.25rem * 4);');
      expect(parseSpacing('left-2')).toBe('left:calc(0.25rem * 2);');
      expect(parseSpacing('inset-4')).toBe('inset:calc(0.25rem * 4);');
    });

    it('should handle decimal values', () => {
      expect(parseSpacing('m-0.5')).toBe('margin:calc(0.25rem * 0.5);');
      expect(parseSpacing('p-1.5')).toBe('padding:calc(0.25rem * 1.5);');
    });

    it('should return null for invalid spacing', () => {
      expect(parseSpacing('invalid')).toBe(null);
      expect(parseSpacing('m-')).toBe(null);
      expect(parseSpacing('m-abc')).toBe(null);
    });
  });

  describe('Color utilities', () => {
    it('should parse background colors', () => {
      const result = parseColorClass('bg-primary-500');
      expect(result).toBe(
        'background-color:var(--cer-color-primary-500, #3b82f6);',
      );
    });

    it('should parse text colors', () => {
      const result = parseColorClass('text-error-600');
      expect(result).toBe('color:var(--cer-color-error-600, #dc2626);');
    });

    it('should parse border colors', () => {
      const result = parseColorClass('border-success-400');
      expect(result).toBe(
        'border-color:var(--cer-color-success-400, #4ade80);',
      );
    });

    it('should parse shadow colors', () => {
      const result = parseColorClass('shadow-neutral-500');
      expect(result).toBe(
        '--cer-shadow-color:var(--cer-color-neutral-500, #71717b);',
      );
    });

    it('should handle DEFAULT shade', () => {
      const result = parseColorClass('bg-white');
      expect(result).toBe('background-color:var(--cer-color-white, #ffffff);');
    });

    it('should return null for invalid colors', () => {
      expect(parseColorClass('bg-invalid-500')).toBe(null);
      expect(parseColorClass('invalid-blue-500')).toBe(null);
    });
  });

  describe('Opacity utilities', () => {
    it('should parse opacity values', () => {
      expect(parseOpacity('opacity-0')).toBe('opacity:0;');
      expect(parseOpacity('opacity-50')).toBe('opacity:0.5;');
      expect(parseOpacity('opacity-100')).toBe('opacity:1;');
    });

    it('should handle edge cases', () => {
      expect(parseOpacity('opacity-1')).toBe('opacity:0.01;');
      expect(parseOpacity('opacity-99')).toBe('opacity:0.99;');
    });

    it('should return null for invalid opacity', () => {
      expect(parseOpacity('opacity-101')).toBe(null);
      expect(parseOpacity('opacity-')).toBe(null);
      expect(parseOpacity('opacity-abc')).toBe(null);
    });
  });

  describe('Color with opacity', () => {
    it('should parse colors with opacity modifiers', () => {
      const result = parseColorWithOpacity('bg-primary-500/50');
      expect(result).toContain('rgb(59 130 246 / 0.5)');
    });

    it('should handle colors without opacity', () => {
      const result = parseColorWithOpacity('bg-primary-500');
      expect(result).toBe(
        'background-color:var(--cer-color-primary-500, #3b82f6);',
      );
    });

    it('should handle invalid opacity values', () => {
      const result = parseColorWithOpacity('bg-primary-500/150');
      expect(result).toBe(
        'background-color:var(--cer-color-primary-500, #3b82f6);',
      );
    });
  });

  describe('Arbitrary value parsing', () => {
    it('should parse property-value pairs', () => {
      expect(parseArbitrary('[color:red]')).toBe('color:red;');
      expect(parseArbitrary('[font-size:2rem]')).toBe('font-size:2rem;');
    });

    it('should parse property-arbitrary pairs', () => {
      expect(parseArbitrary('bg-[#ff0000]')).toBe('background-color:#ff0000;');
      expect(parseArbitrary('w-[200px]')).toBe('width:200px;');
      expect(parseArbitrary('p-[1rem_2rem]')).toBe('padding:1rem 2rem;');
    });

    it('should handle underscores as spaces', () => {
      expect(parseArbitrary('p-[1rem_2rem]')).toBe('padding:1rem 2rem;');
    });

    it('should handle transform utilities', () => {
      expect(parseArbitrary('rotate-[45deg]')).toBe('transform:rotate(45deg);');
    });

    it('should return null for invalid arbitrary values', () => {
      expect(parseArbitrary('invalid')).toBe(null);
      expect(parseArbitrary('[invalid')).toBe(null);
      expect(parseArbitrary('invalid]')).toBe(null);
    });
  });

  describe('Class extraction from HTML', () => {
    it('should extract classes from HTML', () => {
      const html = '<div class="flex items-center bg-blue-500">Content</div>';
      const classes = extractClassesFromHTML(html);
      expect(classes).toEqual(['flex', 'items-center', 'bg-blue-500']);
    });

    it('should handle multiple class attributes', () => {
      const html =
        '<div class="flex"><span class="text-red-500 font-bold">Text</span></div>';
      const classes = extractClassesFromHTML(html);
      expect(classes).toEqual(['flex', 'text-red-500', 'font-bold']);
    });

    it('should handle single and double quotes', () => {
      const html =
        '<div class="flex"><span class=\'text-red-500\'>Text</span></div>';
      const classes = extractClassesFromHTML(html);
      expect(classes).toEqual(['flex', 'text-red-500']);
    });

    it('should handle complex class names', () => {
      const html =
        '<div class="hover:bg-blue-500 sm:text-lg [color:red]">Content</div>';
      const classes = extractClassesFromHTML(html);
      expect(classes).toEqual([
        'hover:bg-blue-500',
        'sm:text-lg',
        '[color:red]',
      ]);
    });
  });

  describe('Class name escaping', () => {
    it('should escape special characters', () => {
      // CSS.escape() includes the dot prefix
      expect(escapeClassName('hover:bg-blue-500')).toBe('.hover\\:bg-blue-500');
      expect(escapeClassName('[color:red]')).toBe('.\\[color\\:red\\]');
      expect(escapeClassName('sm:text-lg')).toBe('.sm\\:text-lg');
    });
  });

  describe('Hex to RGB conversion', () => {
    it('should convert hex to RGB', () => {
      expect(hexToRgb('#ff0000')).toBe('255 0 0');
      expect(hexToRgb('#3b82f6')).toBe('59 130 246');
      expect(hexToRgb('3b82f6')).toBe('59 130 246');
    });

    it('should expand 3-digit shorthand hex (#09f → #0099ff)', () => {
      expect(hexToRgb('#fff')).toBe('255 255 255');
      expect(hexToRgb('#000')).toBe('0 0 0');
      expect(hexToRgb('#09f')).toBe('0 153 255');
    });
  });

  describe('Selector variants', () => {
    it('should apply hover variant', () => {
      const result = selectorVariants.hover('.test', 'color:red;');
      expect(result).toBe('.test:hover{color:red;}');
    });

    it('should apply focus variant', () => {
      const result = selectorVariants.focus('.test', 'outline:none;');
      expect(result).toBe('.test:focus{outline:none;}');
    });

    it('should apply after variant', () => {
      const result = selectorVariants.after('.test', 'content:"";');
      expect(result).toBe('.test::after{content:"";}');
    });

    it('should apply active variant', () => {
      const result = selectorVariants.active('.test', 'opacity:0.8;');
      expect(result).toBe('.test:active{opacity:0.8;}');
    });

    it('should apply disabled variant', () => {
      const result = selectorVariants.disabled('.test', 'opacity:0.5;');
      expect(result).toBe('.test:disabled{opacity:0.5;}');
    });

    it('should apply visited variant', () => {
      const result = selectorVariants.visited('.test', 'color:purple;');
      expect(result).toBe('.test:visited{color:purple;}');
    });

    it('should apply checked variant', () => {
      const result = selectorVariants.checked('.test', 'background:blue;');
      expect(result).toBe('.test:checked{background:blue;}');
    });

    it('should apply first variant', () => {
      const result = selectorVariants.first('.test', 'margin-top:0;');
      expect(result).toBe('.test:first-child{margin-top:0;}');
    });

    it('should apply last variant', () => {
      const result = selectorVariants.last('.test', 'margin-bottom:0;');
      expect(result).toBe('.test:last-child{margin-bottom:0;}');
    });

    it('should apply odd variant', () => {
      const result = selectorVariants.odd('.test', 'background:gray;');
      expect(result).toBe('.test:nth-child(odd){background:gray;}');
    });

    it('should apply even variant', () => {
      const result = selectorVariants.even('.test', 'background:white;');
      expect(result).toBe('.test:nth-child(even){background:white;}');
    });

    it('should apply focus-within variant', () => {
      const result = selectorVariants['focus-within']('.test', 'ring:2px;');
      expect(result).toBe('.test:focus-within{ring:2px;}');
    });

    it('should apply focus-visible variant', () => {
      const result = selectorVariants['focus-visible']('.test', 'outline:2px;');
      expect(result).toBe('.test:focus-visible{outline:2px;}');
    });

    it('should apply group variants', () => {
      const result = selectorVariants['group-hover']('.test', 'color:red;');
      expect(result).toBe('.group:hover .test{color:red;}');
    });

    it('should apply group-focus variant', () => {
      const result = selectorVariants['group-focus']('.test', 'color:blue;');
      expect(result).toBe('.group:focus .test{color:blue;}');
    });

    it('should apply group-active variant', () => {
      const result = selectorVariants['group-active']('.test', 'opacity:0.8;');
      expect(result).toBe('.group:active .test{opacity:0.8;}');
    });

    it('should apply group-disabled variant', () => {
      const result = selectorVariants['group-disabled'](
        '.test',
        'opacity:0.5;',
      );
      expect(result).toBe('.group:disabled .test{opacity:0.5;}');
    });

    it('should apply peer-hover variant', () => {
      const result = selectorVariants['peer-hover']('.test', 'color:red;');
      expect(result).toBe('.peer:hover ~ .test{color:red;}');
    });

    it('should apply peer-focus variant', () => {
      const result = selectorVariants['peer-focus']('.test', 'border:blue;');
      expect(result).toBe('.peer:focus ~ .test{border:blue;}');
    });

    it('should apply peer variants', () => {
      const result = selectorVariants['peer-checked'](
        '.test',
        'display:block;',
      );
      expect(result).toBe('.peer:checked ~ .test{display:block;}');
    });

    it('should apply peer-disabled variant', () => {
      const result = selectorVariants['peer-disabled']('.test', 'opacity:0.5;');
      expect(result).toBe('.peer:disabled ~ .test{opacity:0.5;}');
    });
  });

  describe('Media variants', () => {
    it('should have responsive breakpoints', () => {
      expect(mediaVariants.sm).toBe('(min-width:640px)');
      expect(mediaVariants.md).toBe('(min-width:768px)');
      expect(mediaVariants.lg).toBe('(min-width:1024px)');
      expect(mediaVariants.xl).toBe('(min-width:1280px)');
      expect(mediaVariants['2xl']).toBe('(min-width:1536px)');
    });

    it('should have dark mode support', () => {
      expect(mediaVariants.dark).toBe('(prefers-color-scheme: dark)');
    });
  });

  describe('JIT CSS generation', () => {
    beforeEach(() => {
      // Clear cache before each test
      jitCSS(''); // Reset cache
    });

    it('should generate CSS for basic utilities', () => {
      const html = '<div class="flex items-center">Content</div>';
      const css = jitCSS(html);
      expect(css).toContain('.flex{display:flex;}');
      expect(css).toContain('.items-center{align-items:center;}');
    });

    it('should generate CSS for spacing utilities', () => {
      const html = '<div class="p-4 m-2">Content</div>';
      const css = jitCSS(html);
      expect(css).toContain('.p-4{padding:calc(0.25rem * 4);}');
      expect(css).toContain('.m-2{margin:calc(0.25rem * 2);}');
    });

    it('should generate CSS for color utilities', () => {
      const html = '<div class="bg-primary-500 text-white">Content</div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '.bg-primary-500{background-color:var(--cer-color-primary-500, #3b82f6);}',
      );
      expect(css).toContain(
        '.text-white{color:var(--cer-color-white, #ffffff);}',
      );
    });

    it('should generate CSS for hover states', () => {
      const html = '<div class="hover:bg-primary-500">Content</div>';
      const css = jitCSS(html);
      expect(css).toContain(
        '.hover\\:bg-primary-500:hover{background-color:var(--cer-color-primary-500,',
      );
    });

    it('should generate CSS for responsive utilities', () => {
      const html = '<div class="sm:text-lg md:text-xl">Content</div>';
      const css = jitCSS(html);
      expect(css).toContain('@media (min-width:640px){.sm\\:text-lg{');
      expect(css).toContain('@media (min-width:768px){.md\\:text-xl{');
    });

    it('should generate CSS for dark mode', () => {
      const html = '<div class="dark:bg-neutral-800">Content</div>';
      const css = jitCSS(html);
      expect(css).toContain('@media (prefers-color-scheme: dark){');
    });

    it('should generate CSS for arbitrary values', () => {
      const html = '<div class="bg-[#ff0000] w-[200px]">Content</div>';
      const css = jitCSS(html);
      expect(css).toContain('.bg-\\[\\#ff0000\\]{background-color:#ff0000;}');
      expect(css).toContain('.w-\\[200px\\]{width:200px;}');
    });

    it('should handle complex combinations', () => {
      const html =
        '<div class="hover:bg-primary-500/80 sm:text-lg dark:text-white">Content</div>';
      const css = jitCSS(html);
      expect(css.length).toBeGreaterThan(0);
    });

    it('should cache results', () => {
      const html = '<div class="flex">Content</div>';
      const css1 = jitCSS(html);
      const css2 = jitCSS(html);
      expect(css1).toBe(css2);
    });

    it('should handle empty HTML', () => {
      const css = jitCSS('');
      expect(css).toBe('');
    });

    it('should ignore invalid classes', () => {
      const html = '<div class="invalid-class-name">Content</div>';
      const css = jitCSS(html);
      expect(css).toBe('');
    });
  });

  describe('Grid utilities', () => {
    it('should generate grid template utilities', () => {
      expect(utilityMap['grid-cols-12']).toBe(
        'grid-template-columns:repeat(12,minmax(0,1fr));',
      );
      expect(utilityMap['grid-rows-6']).toBe(
        'grid-template-rows:repeat(6,minmax(0,1fr));',
      );
    });

    it('should generate span utilities', () => {
      expect(utilityMap['col-span-2']).toBe('grid-column:span 2 / span 2;');
      expect(utilityMap['row-span-3']).toBe('grid-row:span 3 / span 3;');
    });

    it('should generate auto utilities', () => {
      expect(utilityMap['auto-cols-fr']).toBe('grid-auto-columns:1fr;');
      expect(utilityMap['auto-rows-min']).toBe('grid-auto-rows:min-content;');
    });
  });

  describe('Semantic size utilities', () => {
    it('should generate semantic width utilities', () => {
      expect(utilityMap['w-xs']).toBe('width:calc(0.25rem * 80);');
      expect(utilityMap['w-lg']).toBe('width:calc(0.25rem * 128);');
      expect(utilityMap['max-w-2xl']).toBe('max-width:calc(0.25rem * 168);');
    });
  });

  describe('Border and rounded utilities', () => {
    it('should generate border width utilities', () => {
      expect(utilityMap['border-0']).toBe('border-width:0px;');
      expect(utilityMap['border-4']).toBe('border-width:4px;');
      expect(utilityMap['border-t-2']).toBe('border-top-width:2px;');
    });

    it('should generate rounded utilities', () => {
      expect(utilityMap['rounded-sm']).toBe('border-radius:0.25rem;');
      expect(utilityMap['rounded-lg']).toBe('border-radius:0.5rem;');
      expect(utilityMap['rounded-full']).toBe('border-radius:9999px;');
    });
  });

  describe('Color system integrity', () => {
    it('should have all color variants defined', () => {
      const colorNames = [
        'neutral',
        'primary',
        'secondary',
        'success',
        'info',
        'warning',
        'error',
        'white',
        'black',
        'transparent',
        'current',
      ];
      colorNames.forEach((name) => {
        expect(colors[name]).toBeDefined();
      });
    });

    it('should have proper shade definitions', () => {
      const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
      shades.forEach((shade) => {
        expect(colors.primary[shade.toString()]).toBeDefined();
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle malformed HTML', () => {
      const html = '<div class="flex"incomplete>';
      const classes = extractClassesFromHTML(html);
      expect(classes).toEqual(['flex']);
    });

    it('should handle class names with special characters', () => {
      const html =
        '<div class="[mask-image:url(\'/icons/mask.svg\')]">Content</div>';
      const classes = extractClassesFromHTML(html);
      expect(classes).toEqual(["[mask-image:url('/icons/mask.svg')]"]);
    });

    it('should handle very long class lists', () => {
      const longClassList = Array.from(
        { length: 100 },
        (_, i) => `class-${i}`,
      ).join(' ');
      const html = `<div class="${longClassList}">Content</div>`;
      const classes = extractClassesFromHTML(html);
      expect(classes.length).toBe(100);
    });

    it('should handle nested quotes in arbitrary values', () => {
      const html = '<div class="[content:\'Hello_World\']">Content</div>';
      const classes = extractClassesFromHTML(html);
      expect(classes).toEqual(["[content:'Hello_World']"]);
    });
  });
});
