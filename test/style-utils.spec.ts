import { describe, it, expect } from 'vitest';
import { minifyCSS, baseReset, jitCSS } from '../src/lib/style-utils';

// --- minifyCSS ---
describe('minifyCSS', () => {
  it('removes whitespace and comments', () => {
    const css = `/* comment */\n  body { color: red; }\n  /* another */`;
    expect(minifyCSS(css)).toBe('body{color:red}');
  });

  it('handles empty input', () => {
    expect(minifyCSS('')).toBe('');
  });
});

// --- baseReset ---
describe('baseReset', () => {
  it('contains :host and box-sizing', () => {
    expect(baseReset).toContain(':host');
    expect(baseReset).toContain('box-sizing');
  });
});

// --- jitCSS ---
describe('jitCSS', () => {
  it('generates CSS for utility classes', () => {
    const html = '<div class="p-4 text-xl font-bold"></div>';
    const css = jitCSS(html);
    expect(css).toContain('.p-4');
    expect(css).toContain('padding:calc(var(--spacing, 0.25rem) * 4);');
    expect(css).toContain('.text-xl');
    expect(css).toContain('font-size:1.25rem;');
  });

  it('supports variants', () => {
    const html = '<button class="hover:bg-blue-500 focus:ring-2"></button>';
    const css = jitCSS(html);
    expect(css).toContain('.hover\\:bg-blue-500:hover');
    expect(css).toContain('.focus\\:ring-2:focus');
  });

  it('supports responsive variants', () => {
    const html = '<div class="md:p-2 lg:p-4"></div>';
    const css = jitCSS(html);
    expect(css).toContain('@media (min-width:768px)');
    expect(css).toContain('.md\\:p-2');
    expect(css).toContain('@media (min-width:1024px)');
    expect(css).toContain('.lg\\:p-4');
  });

  it('supports arbitrary values', () => {
    const html = '<div class="z-[22] shadow-[0_2px_8px_rgba(0,0,0,0.15)]"></div>';
    const css = jitCSS(html);
    expect(css).toBe('.z-\\[22\\]{z-index:22;}.shadow-\\[0_2px_8px_rgba\\(0\\,0\\,0\\,0\\.15\\)\\]{box-shadow:0 2px 8px rgba(0,0,0,0.15);}');
  });

  it('supports duration and delay with ms', () => {
    const html = '<div class="duration-[500ms] delay-[300ms]"></div>';
    const css = jitCSS(html);
    expect(css).toContain('transition-duration:500ms;');
    expect(css).toContain('transition-delay:300ms;');
  });

  it('supports min-w and font-weight arbitrary values', () => {
    const html = '<div class="min-w-[320px] font-weight-[700]"></div>';
    const css = jitCSS(html);
    expect(css).toContain('min-width:320px;');
    expect(css).toContain('font-weight:700;');
  });

  it('ignores unsupported classes', () => {
    const html = '<div class="foo-bar"></div>';
    const css = jitCSS(html);
    expect(css).not.toContain('.foo-bar');
  });

  it('handles empty html', () => {
    expect(jitCSS('')).toBe('');
  });
});
