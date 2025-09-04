import type { ComponentConfig, ComponentContext } from '../src/lib/runtime/types';

interface SwitchProps { label?: string; checked?: boolean }

type SwitchMethods = {
  onChange: (e: Event, ctx: ComponentContext<{}, {}, SwitchProps, SwitchMethods>) => void;
};

// This file is a compile-time check only. If the types are broken,
// the project's `tsc` run (invoked by `npm run build`) will fail.

const cfg: ComponentConfig<{}, {}, SwitchProps, SwitchMethods> = {
  props: { label: { type: String, default: '' }, checked: { type: Boolean, default: false } },
  render: (ctx) => null as any,
  onChange: (e, ctx) => {
    // Should be typed: ctx.checked is boolean | undefined
    const _b: boolean | undefined = ctx.checked;
  }
};

export default cfg;
