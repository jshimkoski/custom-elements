import { describe, it, expect } from 'vitest';
import {
  utilityMap,
  mediaVariants,
  selectorVariants,
  parseColorClass,
  parseSpacing,
  jitCSS,
} from '../src/lib/runtime/style';

/** The composed transform string used by all CSS-variable transform utilities. */
const TRANSFORM_COMPOSE =
  'translateX(var(--cer-translate-x)) translateY(var(--cer-translate-y)) rotate(var(--cer-rotate)) skewX(var(--cer-skew-x)) skewY(var(--cer-skew-y)) scaleX(var(--cer-scale-x)) scaleY(var(--cer-scale-y))';

describe('JIT CSS — new utility gaps', () => {
  // ─── Gap #1 + #2: Transform composition via CSS variables ─────────────────

  describe('composable transforms (Gap #1 + #2)', () => {
    it('scale utilities use CSS variable composition', () => {
      expect(utilityMap['scale-50']).toBe(
        `--cer-scale-x:.5;--cer-scale-y:.5;transform:${TRANSFORM_COMPOSE};`,
      );
      expect(utilityMap['scale-100']).toBe(
        `--cer-scale-x:1;--cer-scale-y:1;transform:${TRANSFORM_COMPOSE};`,
      );
      expect(utilityMap['scale-110']).toBe(
        `--cer-scale-x:1.1;--cer-scale-y:1.1;transform:${TRANSFORM_COMPOSE};`,
      );
    });

    it('rotate utilities use CSS variable composition', () => {
      expect(utilityMap['rotate-45']).toBe(
        `--cer-rotate:45deg;transform:${TRANSFORM_COMPOSE};`,
      );
      expect(utilityMap['rotate-90']).toBe(
        `--cer-rotate:90deg;transform:${TRANSFORM_COMPOSE};`,
      );
      expect(utilityMap['-rotate-45']).toBe(
        `--cer-rotate:-45deg;transform:${TRANSFORM_COMPOSE};`,
      );
    });

    it('scale-x and scale-y utilities set individual axis variables', () => {
      expect(utilityMap['scale-x-50']).toBe(
        `--cer-scale-x:.5;transform:${TRANSFORM_COMPOSE};`,
      );
      expect(utilityMap['scale-y-150']).toBe(
        `--cer-scale-y:1.5;transform:${TRANSFORM_COMPOSE};`,
      );
    });

    it('translate-x utilities set --cer-translate-x and compose transform', () => {
      expect(utilityMap['translate-x-0']).toBe(
        `--cer-translate-x:0px;transform:${TRANSFORM_COMPOSE};`,
      );
      expect(utilityMap['translate-x-4']).toBe(
        `--cer-translate-x:1rem;transform:${TRANSFORM_COMPOSE};`,
      );
      expect(utilityMap['translate-x-1/2']).toBe(
        `--cer-translate-x:50%;transform:${TRANSFORM_COMPOSE};`,
      );
      expect(utilityMap['translate-x-full']).toBe(
        `--cer-translate-x:100%;transform:${TRANSFORM_COMPOSE};`,
      );
      expect(utilityMap['-translate-x-full']).toBe(
        `--cer-translate-x:-100%;transform:${TRANSFORM_COMPOSE};`,
      );
    });

    it('translate-y utilities set --cer-translate-y and compose transform', () => {
      expect(utilityMap['translate-y-0']).toBe(
        `--cer-translate-y:0px;transform:${TRANSFORM_COMPOSE};`,
      );
      expect(utilityMap['translate-y-4']).toBe(
        `--cer-translate-y:1rem;transform:${TRANSFORM_COMPOSE};`,
      );
      expect(utilityMap['-translate-y-full']).toBe(
        `--cer-translate-y:-100%;transform:${TRANSFORM_COMPOSE};`,
      );
    });

    it('skew-x utilities set --cer-skew-x and compose transform', () => {
      expect(utilityMap['skew-x-0']).toBe(
        `--cer-skew-x:0deg;transform:${TRANSFORM_COMPOSE};`,
      );
      expect(utilityMap['skew-x-6']).toBe(
        `--cer-skew-x:6deg;transform:${TRANSFORM_COMPOSE};`,
      );
      expect(utilityMap['-skew-x-12']).toBe(
        `--cer-skew-x:-12deg;transform:${TRANSFORM_COMPOSE};`,
      );
    });

    it('skew-y utilities set --cer-skew-y and compose transform', () => {
      expect(utilityMap['skew-y-3']).toBe(
        `--cer-skew-y:3deg;transform:${TRANSFORM_COMPOSE};`,
      );
      expect(utilityMap['-skew-y-6']).toBe(
        `--cer-skew-y:-6deg;transform:${TRANSFORM_COMPOSE};`,
      );
    });

    it('scale and rotate on same element compose via shared CSS variable chain', () => {
      // Both utilities reference the same composed transform string.
      // When both classes are applied, each sets its own CSS variable and the
      // shared `transform:` value references all variables — they compose without
      // overwriting each other.
      const scaleDecl = utilityMap['scale-50'];
      const rotateDecl = utilityMap['rotate-45'];
      expect(scaleDecl).toContain(TRANSFORM_COMPOSE);
      expect(rotateDecl).toContain(TRANSFORM_COMPOSE);
      // Both set different variables, not overlapping
      expect(scaleDecl).toContain('--cer-scale-x');
      expect(rotateDecl).toContain('--cer-rotate');
      // scale-50 assigns --cer-scale-* but never assigns --cer-rotate
      expect(scaleDecl).not.toMatch(/--cer-rotate:/);
      // rotate-45 assigns --cer-rotate but never assigns --cer-scale-* directly
      expect(rotateDecl).not.toMatch(/--cer-scale[xy]:/);
    });
  });

  // ─── Gap #3: Ring utilities ────────────────────────────────────────────────

  describe('ring utilities (Gap #3)', () => {
    it('ring uses default 3px ring with CSS variable ring color', () => {
      expect(utilityMap['ring']).toBe(
        `box-shadow:0 0 0 3px var(--cer-ring-color,rgb(59 130 246/0.5));`,
      );
    });

    it('ring-0 through ring-8 set explicit ring widths', () => {
      expect(utilityMap['ring-0']).toBe(
        `box-shadow:0 0 0 0px var(--cer-ring-color,rgb(59 130 246/0.5));`,
      );
      expect(utilityMap['ring-1']).toBe(
        `box-shadow:0 0 0 1px var(--cer-ring-color,rgb(59 130 246/0.5));`,
      );
      expect(utilityMap['ring-2']).toBe(
        `box-shadow:0 0 0 2px var(--cer-ring-color,rgb(59 130 246/0.5));`,
      );
      expect(utilityMap['ring-4']).toBe(
        `box-shadow:0 0 0 4px var(--cer-ring-color,rgb(59 130 246/0.5));`,
      );
      expect(utilityMap['ring-8']).toBe(
        `box-shadow:0 0 0 8px var(--cer-ring-color,rgb(59 130 246/0.5));`,
      );
    });

    it('ring-inset uses inset box-shadow', () => {
      expect(utilityMap['ring-inset']).toContain('inset');
    });

    it('ring-offset utilities include offset box-shadow', () => {
      expect(utilityMap['ring-offset-2']).toContain(
        '--cer-ring-offset-width:2px',
      );
    });

    it('ring color is set via --cer-ring-color CSS variable', () => {
      const ringDecl = utilityMap['ring'];
      expect(ringDecl).toContain('var(--cer-ring-color');
    });

    it('parseColorClass sets --cer-ring-color for ring color tokens', () => {
      const result = parseColorClass('ring-primary-500');
      expect(result).toBeTruthy();
      expect(result).toContain('--cer-ring-color');
    });
  });

  // ─── Gap #4: Filter and backdrop-filter utilities ─────────────────────────

  describe('filter utilities (Gap #4)', () => {
    it('blur utilities set --cer-blur and compose filter', () => {
      expect(utilityMap['blur']).toContain('--cer-blur:blur(8px)');
      expect(utilityMap['blur']).toContain('filter:');
      expect(utilityMap['blur-sm']).toContain('--cer-blur:blur(4px)');
      expect(utilityMap['blur-lg']).toContain('--cer-blur:blur(16px)');
      expect(utilityMap['blur-none']).toContain('--cer-blur:;');
    });

    it('brightness utilities set --cer-brightness and compose filter', () => {
      expect(utilityMap['brightness-50']).toContain(
        '--cer-brightness:brightness(.5)',
      );
      expect(utilityMap['brightness-200']).toContain(
        '--cer-brightness:brightness(2)',
      );
    });

    it('contrast utilities set --cer-contrast and compose filter', () => {
      expect(utilityMap['contrast-0']).toContain('--cer-contrast:contrast(0)');
      expect(utilityMap['contrast-150']).toContain(
        '--cer-contrast:contrast(1.5)',
      );
    });

    it('grayscale utility sets --cer-grayscale', () => {
      expect(utilityMap['grayscale']).toContain(
        '--cer-grayscale:grayscale(100%)',
      );
      expect(utilityMap['grayscale-0']).toContain(
        '--cer-grayscale:grayscale(0)',
      );
    });

    it('hue-rotate utilities set --cer-hue-rotate', () => {
      expect(utilityMap['hue-rotate-90']).toContain(
        '--cer-hue-rotate:hue-rotate(90deg)',
      );
      expect(utilityMap['-hue-rotate-90']).toContain(
        '--cer-hue-rotate:hue-rotate(-90deg)',
      );
    });

    it('invert utility sets --cer-invert', () => {
      expect(utilityMap['invert']).toContain('--cer-invert:invert(100%)');
      expect(utilityMap['invert-0']).toContain('--cer-invert:invert(0)');
    });

    it('saturate utilities set --cer-saturate', () => {
      expect(utilityMap['saturate-200']).toContain(
        '--cer-saturate:saturate(2)',
      );
    });

    it('sepia utility sets --cer-sepia', () => {
      expect(utilityMap['sepia']).toContain('--cer-sepia:sepia(100%)');
    });

    it('drop-shadow utilities set --cer-drop-shadow', () => {
      expect(utilityMap['drop-shadow']).toContain(
        '--cer-drop-shadow:drop-shadow',
      );
      expect(utilityMap['drop-shadow-none']).toContain('--cer-drop-shadow');
    });

    it('blur and grayscale compose via shared filter chain', () => {
      // Both reference the same filter composition string with CSS variables
      expect(utilityMap['blur']).toContain('filter:');
      expect(utilityMap['grayscale']).toContain('filter:');
      // blur assigns --cer-blur but never assigns --cer-grayscale (only references it in compose)
      expect(utilityMap['blur']).not.toMatch(/--cer-grayscale:/);
      // grayscale assigns --cer-grayscale but never assigns --cer-blur
      expect(utilityMap['grayscale']).not.toMatch(/--cer-blur:/);
    });
  });

  describe('backdrop-filter utilities (Gap #4)', () => {
    it('backdrop-blur utilities set --cer-backdrop-blur', () => {
      expect(utilityMap['backdrop-blur']).toContain(
        '--cer-backdrop-blur:blur(8px)',
      );
      expect(utilityMap['backdrop-blur-sm']).toContain(
        '--cer-backdrop-blur:blur(4px)',
      );
      expect(utilityMap['backdrop-blur-none']).toContain(
        '--cer-backdrop-blur:;',
      );
    });

    it('backdrop-blur includes -webkit-backdrop-filter', () => {
      expect(utilityMap['backdrop-blur']).toContain('-webkit-backdrop-filter');
    });
  });

  // ─── Gap #5: Fractional and numeric width/height scale ────────────────────

  describe('fractional and numeric w/h scale (Gap #5)', () => {
    // Fractional and numeric w/h are handled dynamically by parseSpacing
    // (not as static utilityMap entries), which is the correct architecture
    // since parseSpacing covers all spacing-prop fractions generically.
    it('fractional width utilities resolve via parseSpacing', () => {
      expect(parseSpacing('w-1/2')).toBe('width:50%;');
      expect(parseSpacing('w-1/3')).toContain('33.333');
      expect(parseSpacing('w-2/3')).toContain('66.666');
      expect(parseSpacing('w-1/4')).toBe('width:25%;');
      expect(parseSpacing('w-3/4')).toBe('width:75%;');
      expect(parseSpacing('w-11/12')).toContain('91.666');
    });

    it('fractional height utilities resolve via parseSpacing', () => {
      expect(parseSpacing('h-1/2')).toBe('height:50%;');
      expect(parseSpacing('h-3/4')).toBe('height:75%;');
    });

    it('numeric width utilities resolve via parseSpacing', () => {
      // parseSpacing produces calc(N * var(--cer-spacing)) for numeric values
      expect(parseSpacing('w-0')).toContain('width:');
      expect(parseSpacing('w-4')).toContain('width:');
      expect(parseSpacing('w-8')).toContain('width:');
      expect(parseSpacing('w-16')).toContain('width:');
    });

    it('fractional w/h work end-to-end via jitCSS', () => {
      const css = jitCSS('<div class="w-1/2 h-3/4"></div>');
      expect(css).toContain('width:50%');
      expect(css).toContain('height:75%');
    });
  });

  // ─── Gap #6: Background suite ─────────────────────────────────────────────

  describe('background utilities (Gap #6)', () => {
    it('bg-cover/contain/auto set background-size', () => {
      expect(utilityMap['bg-cover']).toBe('background-size:cover;');
      expect(utilityMap['bg-contain']).toBe('background-size:contain;');
      expect(utilityMap['bg-auto']).toBe('background-size:auto;');
    });

    it('bg-center/top/bottom/left/right set background-position', () => {
      expect(utilityMap['bg-center']).toBe('background-position:center;');
      expect(utilityMap['bg-top']).toBe('background-position:top;');
      expect(utilityMap['bg-bottom']).toBe('background-position:bottom;');
      expect(utilityMap['bg-left']).toBe('background-position:left;');
      expect(utilityMap['bg-right']).toBe('background-position:right;');
    });

    it('bg-no-repeat/repeat/repeat-x/repeat-y set background-repeat', () => {
      expect(utilityMap['bg-no-repeat']).toBe('background-repeat:no-repeat;');
      expect(utilityMap['bg-repeat']).toBe('background-repeat:repeat;');
      expect(utilityMap['bg-repeat-x']).toBe('background-repeat:repeat-x;');
      expect(utilityMap['bg-repeat-y']).toBe('background-repeat:repeat-y;');
    });

    it('bg-fixed/local/scroll set background-attachment', () => {
      expect(utilityMap['bg-fixed']).toBe('background-attachment:fixed;');
      expect(utilityMap['bg-local']).toBe('background-attachment:local;');
      expect(utilityMap['bg-scroll']).toBe('background-attachment:scroll;');
    });

    it('bg-clip-* utilities set background-clip', () => {
      expect(utilityMap['bg-clip-border']).toBe('background-clip:border-box;');
      expect(utilityMap['bg-clip-padding']).toBe(
        'background-clip:padding-box;',
      );
      expect(utilityMap['bg-clip-content']).toBe(
        'background-clip:content-box;',
      );
      expect(utilityMap['bg-clip-text']).toContain('background-clip:text');
      expect(utilityMap['bg-clip-text']).toContain(
        '-webkit-background-clip:text',
      );
    });
  });

  // ─── Gap #7: Transition delay ─────────────────────────────────────────────

  describe('transition delay utilities (Gap #7)', () => {
    it('delay-* utilities map to transition-delay', () => {
      expect(utilityMap['delay-0']).toBe('transition-delay:0ms;');
      expect(utilityMap['delay-75']).toBe('transition-delay:75ms;');
      expect(utilityMap['delay-100']).toBe('transition-delay:100ms;');
      expect(utilityMap['delay-150']).toBe('transition-delay:150ms;');
      expect(utilityMap['delay-200']).toBe('transition-delay:200ms;');
      expect(utilityMap['delay-300']).toBe('transition-delay:300ms;');
      expect(utilityMap['delay-500']).toBe('transition-delay:500ms;');
      expect(utilityMap['delay-700']).toBe('transition-delay:700ms;');
      expect(utilityMap['delay-1000']).toBe('transition-delay:1000ms;');
    });
  });

  // ─── Gap #8: Motion variants ──────────────────────────────────────────────

  describe('motion-reduce / motion-safe variants (Gap #8)', () => {
    it('mediaVariants contains motion-reduce and motion-safe', () => {
      expect(mediaVariants['motion-reduce']).toBe(
        '(prefers-reduced-motion: reduce)',
      );
      expect(mediaVariants['motion-safe']).toBe(
        '(prefers-reduced-motion: no-preference)',
      );
    });

    it('motion-reduce variant generates @media prefers-reduced-motion rule', () => {
      const css = jitCSS('<div class="motion-reduce:transition-none"></div>');
      expect(css).toContain('prefers-reduced-motion');
      expect(css).toContain('transition-property:none');
    });
  });

  // ─── Gap #9: RTL/LTR variants ─────────────────────────────────────────────

  describe('rtl / ltr selector variants (Gap #9)', () => {
    it('selectorVariants contains rtl and ltr', () => {
      expect(selectorVariants['rtl']).toBeDefined();
      expect(selectorVariants['ltr']).toBeDefined();
    });

    it('rtl variant generates [dir=rtl] selector', () => {
      const css = jitCSS('<div class="rtl:text-right"></div>');
      expect(css).toContain('[dir=rtl]');
    });

    it('ltr variant generates [dir=ltr] selector', () => {
      const css = jitCSS('<div class="ltr:text-left"></div>');
      expect(css).toContain('[dir=ltr]');
    });
  });

  // ─── Gap #10: Divide utilities ────────────────────────────────────────────

  describe('divide utilities (Gap #10)', () => {
    it('divide-x utilities set border-left-width', () => {
      expect(utilityMap['divide-x']).toBe('border-left-width:1px;');
      expect(utilityMap['divide-x-0']).toBe('border-left-width:0px;');
      expect(utilityMap['divide-x-2']).toBe('border-left-width:2px;');
      expect(utilityMap['divide-x-4']).toBe('border-left-width:4px;');
    });

    it('divide-y utilities set border-top-width', () => {
      expect(utilityMap['divide-y']).toBe('border-top-width:1px;');
      expect(utilityMap['divide-y-2']).toBe('border-top-width:2px;');
    });

    it('divide-solid/dashed/dotted set border-style', () => {
      expect(utilityMap['divide-solid']).toBe('border-style:solid;');
      expect(utilityMap['divide-dashed']).toBe('border-style:dashed;');
      expect(utilityMap['divide-none']).toBe('border-style:none;');
    });

    it('parseColorClass sets border-color for divide color tokens', () => {
      const result = parseColorClass('divide-primary-500');
      expect(result).toBeTruthy();
      expect(result).toContain('border-color');
    });
  });

  // ─── Gap #11: Text decoration style and thickness ─────────────────────────

  describe('text decoration style / thickness (Gap #11)', () => {
    it('decoration-* style utilities set text-decoration-style', () => {
      expect(utilityMap['decoration-solid']).toBe(
        'text-decoration-style:solid;',
      );
      expect(utilityMap['decoration-dashed']).toBe(
        'text-decoration-style:dashed;',
      );
      expect(utilityMap['decoration-dotted']).toBe(
        'text-decoration-style:dotted;',
      );
      expect(utilityMap['decoration-double']).toBe(
        'text-decoration-style:double;',
      );
      expect(utilityMap['decoration-wavy']).toBe('text-decoration-style:wavy;');
    });

    it('decoration-* thickness utilities set text-decoration-thickness', () => {
      expect(utilityMap['decoration-1']).toBe('text-decoration-thickness:1px;');
      expect(utilityMap['decoration-2']).toBe('text-decoration-thickness:2px;');
      expect(utilityMap['decoration-4']).toBe('text-decoration-thickness:4px;');
      expect(utilityMap['decoration-8']).toBe('text-decoration-thickness:8px;');
      expect(utilityMap['decoration-from-font']).toBe(
        'text-decoration-thickness:from-font;',
      );
      expect(utilityMap['decoration-auto']).toBe(
        'text-decoration-thickness:auto;',
      );
    });

    it('underline-offset utilities set text-underline-offset', () => {
      expect(utilityMap['underline-offset-1']).toBe(
        'text-underline-offset:1px;',
      );
      expect(utilityMap['underline-offset-4']).toBe(
        'text-underline-offset:4px;',
      );
      expect(utilityMap['underline-offset-auto']).toBe(
        'text-underline-offset:auto;',
      );
    });
  });

  // ─── Gap #12: List utilities ──────────────────────────────────────────────

  describe('list utilities (Gap #12)', () => {
    it('list-none / list-disc / list-decimal set list-style-type', () => {
      expect(utilityMap['list-none']).toBe('list-style-type:none;');
      expect(utilityMap['list-disc']).toBe('list-style-type:disc;');
      expect(utilityMap['list-decimal']).toBe('list-style-type:decimal;');
    });

    it('list-inside / list-outside set list-style-position', () => {
      expect(utilityMap['list-inside']).toBe('list-style-position:inside;');
      expect(utilityMap['list-outside']).toBe('list-style-position:outside;');
    });
  });

  // ─── Gap #13: Scroll utilities ────────────────────────────────────────────

  describe('scroll utilities (Gap #13)', () => {
    it('scroll-smooth and scroll-auto set scroll-behavior', () => {
      expect(utilityMap['scroll-smooth']).toBe('scroll-behavior:smooth;');
      expect(utilityMap['scroll-auto']).toBe('scroll-behavior:auto;');
    });

    it('snap-x/y/both set scroll-snap-type', () => {
      expect(utilityMap['snap-x']).toContain('scroll-snap-type:x');
      expect(utilityMap['snap-y']).toContain('scroll-snap-type:y');
      expect(utilityMap['snap-both']).toContain('scroll-snap-type:both');
      expect(utilityMap['snap-none']).toBe('scroll-snap-type:none;');
    });

    it('snap alignment utilities set scroll-snap-align', () => {
      expect(utilityMap['snap-start']).toBe('scroll-snap-align:start;');
      expect(utilityMap['snap-end']).toBe('scroll-snap-align:end;');
      expect(utilityMap['snap-center']).toBe('scroll-snap-align:center;');
      expect(utilityMap['snap-align-none']).toBe('scroll-snap-align:none;');
    });

    it('snap-mandatory and snap-proximity set strictness variable', () => {
      expect(utilityMap['snap-mandatory']).toContain(
        '--cer-scroll-snap-strictness:mandatory',
      );
      expect(utilityMap['snap-proximity']).toContain(
        '--cer-scroll-snap-strictness:proximity',
      );
    });
  });

  // ─── Gap #14: Z-auto and intermediate z-index ─────────────────────────────

  describe('z-index utilities (Gap #14)', () => {
    it('z-auto sets z-index:auto', () => {
      expect(utilityMap['z-auto']).toBe('z-index:auto;');
    });

    it('intermediate z-index values 1–9 are defined', () => {
      for (let i = 1; i <= 9; i++) {
        expect(utilityMap[`z-${i}`]).toBe(`z-index:${i};`);
      }
    });

    it('negative z-index utilities are defined', () => {
      expect(utilityMap['-z-10']).toBe('z-index:-10;');
      expect(utilityMap['-z-50']).toBe('z-index:-50;');
    });
  });

  // ─── Gap #15: Will-change utilities ───────────────────────────────────────

  describe('will-change utilities (Gap #15)', () => {
    it('will-change-* utilities set will-change', () => {
      expect(utilityMap['will-change-auto']).toBe('will-change:auto;');
      expect(utilityMap['will-change-scroll']).toBe(
        'will-change:scroll-position;',
      );
      expect(utilityMap['will-change-contents']).toBe('will-change:contents;');
      expect(utilityMap['will-change-transform']).toBe(
        'will-change:transform;',
      );
      expect(utilityMap['will-change-opacity']).toBe('will-change:opacity;');
    });
  });

  // ─── Gap #16: Touch-action utilities ──────────────────────────────────────

  describe('touch-action utilities (Gap #16)', () => {
    it('touch-* utilities set touch-action', () => {
      expect(utilityMap['touch-auto']).toBe('touch-action:auto;');
      expect(utilityMap['touch-none']).toBe('touch-action:none;');
      expect(utilityMap['touch-pan-x']).toBe('touch-action:pan-x;');
      expect(utilityMap['touch-pan-y']).toBe('touch-action:pan-y;');
      expect(utilityMap['touch-pinch-zoom']).toBe('touch-action:pinch-zoom;');
      expect(utilityMap['touch-manipulation']).toBe(
        'touch-action:manipulation;',
      );
    });
  });

  // ─── Gap #17: Print variant ───────────────────────────────────────────────

  describe('print variant (Gap #17)', () => {
    it('mediaVariants contains print', () => {
      expect(mediaVariants['print']).toBe('print');
    });

    it('print variant generates @media print rule', () => {
      const css = jitCSS('<div class="print:hidden"></div>');
      expect(css).toContain('@media print');
    });
  });

  // ─── Gap #18: Columns utilities ───────────────────────────────────────────

  describe('columns utilities (Gap #18)', () => {
    it('columns-1 through columns-12 set column count', () => {
      for (let i = 1; i <= 12; i++) {
        expect(utilityMap[`columns-${i}`]).toBe(`columns:${i};`);
      }
    });

    it('columns-auto sets columns:auto', () => {
      expect(utilityMap['columns-auto']).toBe('columns:auto;');
    });

    it('semantic column width utilities are defined', () => {
      expect(utilityMap['columns-sm']).toBeDefined();
      expect(utilityMap['columns-lg']).toBeDefined();
      expect(utilityMap['columns-xl']).toBeDefined();
    });
  });

  // ─── Gap #19: Extended color palette module ────────────────────────────────

  describe('extended color palette module (Gap #19)', () => {
    it('colors.ts exports extendedColors with full Tailwind-compatible palette', async () => {
      const { extendedColors } = await import('../src/lib/css/colors');
      // Verify the module exports a complete palette
      expect(extendedColors).toBeDefined();
      // Check a variety of common color families
      const families = [
        'slate',
        'gray',
        'zinc',
        'red',
        'orange',
        'amber',
        'yellow',
        'lime',
        'green',
        'emerald',
        'teal',
        'cyan',
        'sky',
        'blue',
        'indigo',
        'violet',
        'purple',
        'fuchsia',
        'pink',
        'rose',
      ];
      for (const family of families) {
        expect(
          extendedColors[family],
          `${family} should be defined`,
        ).toBeDefined();
        expect(
          extendedColors[family]['500'],
          `${family}-500 should be defined`,
        ).toBeTruthy();
      }
    });

    it('each color family has the expected shades', async () => {
      const { extendedColors } = await import('../src/lib/css/colors');
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
      for (const shade of shades) {
        expect(
          extendedColors['blue'][shade],
          `blue-${shade} should be defined`,
        ).toBeTruthy();
      }
    });

    it('exported ColorScale type allows indexing by string keys', async () => {
      const { extendedColors } = await import('../src/lib/css/colors');
      // TypeScript type test — if this compiles and runs, the types are correct
      const colorScale: Record<string, string> = extendedColors['slate'];
      expect(colorScale['500']).toBe('#64748b');
    });
  });

  // ─── JIT generation integration tests ────────────────────────────────────

  describe('JIT CSS generation integration', () => {
    it('generates CSS for new transform utilities', () => {
      const css = jitCSS(
        '<div class="translate-x-4 translate-y-2 rotate-45 scale-110">x</div>',
      );
      // All transforms use CSS variable composition
      expect(css).toContain('--cer-translate-x');
      expect(css).toContain('--cer-rotate');
      expect(css).toContain('--cer-scale-x');
    });

    it('generates CSS for ring utility', () => {
      const css = jitCSS('<button class="ring-2 focus:ring-4">button</button>');
      expect(css).toContain('box-shadow:0 0 0 2px');
      expect(css).toContain('box-shadow:0 0 0 4px');
    });

    it('generates CSS for bg-cover and bg-center', () => {
      const css = jitCSS('<div class="bg-cover bg-center">hero</div>');
      expect(css).toContain('background-size:cover');
      expect(css).toContain('background-position:center');
    });

    it('generates CSS for filter utilities', () => {
      const css = jitCSS('<img class="blur-sm grayscale">');
      expect(css).toContain('blur(4px)');
      expect(css).toContain('grayscale(100%)');
    });

    it('generates CSS for list utilities', () => {
      const css = jitCSS('<ul class="list-disc list-inside">x</ul>');
      expect(css).toContain('list-style-type:disc');
      expect(css).toContain('list-style-position:inside');
    });

    it('generates CSS for delay utilities', () => {
      const css = jitCSS('<div class="transition delay-300">x</div>');
      expect(css).toContain('transition-delay:300ms');
    });

    it('generates CSS for scroll snap utilities', () => {
      const css = jitCSS('<div class="snap-x snap-mandatory">scrollable</div>');
      expect(css).toContain('scroll-snap-type');
    });

    it('generates CSS for will-change and touch-action', () => {
      const css = jitCSS(
        '<div class="will-change-transform touch-pan-y">x</div>',
      );
      expect(css).toContain('will-change:transform');
      expect(css).toContain('touch-action:pan-y');
    });

    it('generates CSS for backdrop-blur', () => {
      const css = jitCSS('<div class="backdrop-blur-md">frosted</div>');
      expect(css).toContain('backdrop-filter');
      expect(css).toContain('blur(12px)');
    });
  });
});
