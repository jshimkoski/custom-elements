import { describe, it, expect } from 'vitest';
import * as index from '../src/lib/index';

describe('index.ts', () => {
  it('should export runtime types', () => {
    expect(index).toHaveProperty('component');
    expect(index).toHaveProperty('css');
    expect(index).toHaveProperty('html');
  });

  it('should not throw when importing all exports', () => {
    expect(() => {
      void index;
    }).not.toThrow();
  });
});
