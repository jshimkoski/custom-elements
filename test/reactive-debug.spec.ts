import { describe, it, expect } from 'vitest';
import { ref } from '../src/lib/runtime/reactive';

describe('Reactive State Debug', () => {
  it('should work when accessing reactive state directly', () => {
    const test = ref('hello');

    console.log('Created reactive state:', test);
    console.log('test._value:', (test as any)._value);
    console.log('test.dependents:', (test as any).dependents);

    try {
      const value = test.value;
      console.log('Accessed test.value:', value);
      expect(value).toBe('hello');
    } catch (e) {
      console.log('Error accessing test.value:', e);
      throw e;
    }
  });
});
