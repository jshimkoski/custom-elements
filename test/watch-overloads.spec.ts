import { expectTypeOf, test } from 'vitest';
import { ref, watch } from '../src/lib/runtime/reactive';

test('watch with ReactiveState (ref) infers types correctly', () => {
  const r = ref('hello');

  // This callback's parameter types are checked at compile-time via expectTypeOf
  watch(r, (newVal, oldVal) => {
    expectTypeOf(newVal).toEqualTypeOf<string>();
    expectTypeOf(oldVal).toEqualTypeOf<string | undefined>();
  });
});

test('watch with getter function infers types correctly', () => {
  const r = ref(42);

  // When using a getter, the inferred type should follow the getter return
  watch(
    () => r.value,
    (newVal, oldVal) => {
      expectTypeOf(newVal).toEqualTypeOf<number>();
      expectTypeOf(oldVal).toEqualTypeOf<number | undefined>();
    },
  );
});
