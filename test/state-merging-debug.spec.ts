import { describe, it, beforeEach } from 'vitest';
import { ref } from '../src/lib/runtime/reactive';

describe('State merging debug', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should test different ways of merging state', () => {
    const test = ref('hello');
    const test2 = ref(42);

    const stateObj = { test, test2 };

    console.log('Original state object:', stateObj);
    console.log('test.value before merging:', test.value);
    console.log('test2.value before merging:', test2.value);

    // Test spread operator
    try {
      const spread = { ...stateObj };
      console.log('Spread result:', spread);
      console.log('spread.test.value:', spread.test.value);
    } catch (e) {
      console.log('Error with spread:', e);
    }

    // Test Object.assign
    try {
      const assigned = Object.assign({}, stateObj);
      console.log('Object.assign result:', assigned);
      console.log('assigned.test.value:', assigned.test.value);
    } catch (e) {
      console.log('Error with Object.assign:', e);
    }

    // Test direct reference
    try {
      const direct = stateObj;
      console.log('Direct reference:', direct);
      console.log('direct.test.value:', direct.test.value);
    } catch (e) {
      console.log('Error with direct reference:', e);
    }
  });
});
