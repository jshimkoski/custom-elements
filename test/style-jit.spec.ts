import { describe, it, expect } from 'vitest';
import {
  parseColorClass,
  parseArbitrary,
  parseSpacing,
} from '../src/lib/runtime/style';

describe('style runtime helpers', () => {
  it('parseColorClass sets --ce-shadow-color for shadow tokens', () => {
    const res = parseColorClass('shadow-primary-500');
    expect(res).toBe('--ce-shadow-color:var(--color-primary-500, #3b82f6);');
  });

  it('parseArbitrary returns padding for p-[2rem]', () => {
    const res = parseArbitrary('p-[2rem]');
    expect(res).toBe('padding:2rem;');
  });

  it('parseSpacing returns calc spacing for mt-2', () => {
    const res = parseSpacing('mt-2');
    expect(res).toBe('margin-top:calc(0.25rem * 2);');
  });
});
