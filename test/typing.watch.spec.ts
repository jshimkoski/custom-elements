import { describe, it, expect } from 'vitest';
import { component } from '../src/lib/runtime/component';
import { html } from '../src/lib/runtime/template-compiler';
import type { ComponentContext } from '../src/lib/runtime/types';

interface MyState { count: number }
interface MyProps { step?: number }

type MyMethods = {};

describe('typing: watch handlers receive typed context and values', () => {
  it('watch handler updates when state changes and ctx is available', () => {
    component<MyState, {}, MyProps, MyMethods>('test-watch-typed', {
      state: { count: 0 },
      props: { step: { type: Number, default: 1 } },
      watch: {
        // typed handler: newVal should be number, ctx is full ComponentContext
        count(newVal: number, oldVal: number, ctx: ComponentContext<MyState, {}, MyProps, MyMethods>) {
          // runtime: update a derived value on the context to prove ctx is accessible
          (ctx as any).lastChange = { from: oldVal, to: newVal };
        }
      },
      render: (ctx) => html`<div>${ctx.count}</div>`,
    });

    const el = document.createElement('test-watch-typed') as any;
    document.body.appendChild(el);

    // mutate state and trigger watchers via the public context
    el.context.count = 5;

    // after update the watch handler should have set lastChange
    expect((el.context as any).lastChange).toBeDefined();
    expect((el.context as any).lastChange.to).toBe(5);
  });
});
