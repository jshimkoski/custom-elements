import { describe, it, expect } from 'vitest';
import * as index from './index';

describe('index.ts', () => {
  it('should export runtime types', () => {
    expect(index).toHaveProperty('component');
    expect(index).toHaveProperty('css');
    expect(index).toHaveProperty('html');
  });

  it('should export directives', () => {
    expect(index).toHaveProperty('when');
    expect(index).toHaveProperty('each');
    expect(index).toHaveProperty('match');
  });

  it('should export event bus', () => {
    expect(index).toHaveProperty('emit');
    expect(index).toHaveProperty('on');
  });

  it('should export store', () => {
    expect(index).toHaveProperty('createStore');
  });

  it('should export router', () => {
    expect(index).toHaveProperty('resolveRouteComponent');
  });

  it('should not throw when importing all exports', () => {
    expect(() => { void index; }).not.toThrow();
  });
});
