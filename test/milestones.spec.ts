import { describe, it, expect } from 'vitest';
import { minifyCSS, jitCSS } from '../src/lib/runtime/style';

describe('milestones component JIT CSS', () => {
  it('generates gradient CSS for milestones markup', () => {
    const html = `
      <div class="text-sm bg-linear-to-r from-primary-500 via-secondary-400 to-success-500">
        <h3 class="text-neutral-300">Milestone</h3>
        <div id="milestone" class="log">Survive rounds to earn titles:</div>
        <div class="text-neutral-300">Cat Food: 3 • Little Dweeb: 5 • Official Dweeb: 7 • Ultra Mega Uber Giga-Dweeb: 10+</div>
      </div>
    `;

    const css = minifyCSS(jitCSS(html));

    // Core gradient utilities should be generated
    expect(css).toContain('.bg-linear-to-r');

    // Ensure at least the gradient rule and stops variable are generated
    expect(css).toContain('--cer-gradient-stops');

    // The color stop classes must be present with their variable assignments
    // from-primary-500 => --cer-gradient-from:var(--cer-color-primary-500,#3b82f6)
    expect(css).toContain('.from-primary-500');
    expect(css).toContain('--cer-gradient-from');
    expect(css).toContain('var(--cer-color-primary-500');
    expect(css).toContain('#3b82f6');

    // via-secondary-400 should insert the mid-stop including the palette var
    expect(css).toContain('.via-secondary-400');
    expect(css).toContain('var(--cer-color-secondary-400');
    expect(css).toContain('#818cf8');

    // to-success-500 should define the --cer-gradient-to value
    expect(css).toContain('.to-success-500');
    expect(css).toContain('var(--cer-color-success-500');
    // success-500 palette value is #22c55e
    expect(css).toContain('#22c55e');

    // Should include a linear-gradient/background-image rule for the gradient
    expect(
      css.includes('linear-gradient') ||
        css.includes('background-image') ||
        css.includes('background:'),
    ).toBe(true);
  });
});
