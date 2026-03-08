# 🎨 Colors

> Extended Tailwind-compatible color palette — opt-in subpath

## 📖 Overview

The `/css/colors` subpath exports `extendedColors`, a full Tailwind-compatible color palette with 21 named color scales. Each scale contains shades from `50` (lightest) to `950` (darkest).

This module is opt-in so importing it only adds weight to bundles that actually use it.

## 🚀 Importing

```ts
import { extendedColors } from '@jasonshimmy/custom-elements-runtime/css/colors';
import type { ColorScale } from '@jasonshimmy/custom-elements-runtime/css/colors';
```

## 📦 API

### `extendedColors`

Type: `Record<string, ColorScale>`

A map from color name to a `ColorScale` (shades `50` through `950` as string hex values). Color names match Tailwind CSS v3/v4 conventions.

**Available color names:**

`slate`, `gray`, `zinc`, `stone`, `red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`

### `ColorScale`

Type: `Record<string, string>`

A shade map where keys are shade numbers as strings (`'50'`, `'100'`, `'200'`, …, `'900'`, `'950'`) and values are hex color strings.

## 🧩 Usage Examples

### Look up a color at runtime

```ts
import { extendedColors } from '@jasonshimmy/custom-elements-runtime/css/colors';

const blue500 = extendedColors.blue['500']; // '#3b82f6'
const red700 = extendedColors.red['700']; // '#b91c1c'
```

### Use with `useStyle` for dynamic theming

```ts
import {
  component,
  html,
  useProps,
  useStyle,
  css,
} from '@jasonshimmy/custom-elements-runtime';
import { extendedColors } from '@jasonshimmy/custom-elements-runtime/css/colors';

component('themed-badge', () => {
  const props = useProps({ color: 'blue', shade: '500' });

  useStyle(() => {
    const bg = extendedColors[props.color]?.[props.shade] ?? '#000';
    return css`
      :host {
        background-color: ${bg};
        color: #fff;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
      }
    `;
  });

  return html`<span><slot></slot></span>`;
});
```

### Build a palette utility

```ts
import { extendedColors } from '@jasonshimmy/custom-elements-runtime/css/colors';
import type { ColorScale } from '@jasonshimmy/custom-elements-runtime/css/colors';

function getShades(name: string): ColorScale | undefined {
  return extendedColors[name];
}

function getHex(name: string, shade: number): string | undefined {
  return extendedColors[name]?.[String(shade)];
}

getHex('emerald', 500); // '#10b981'
getHex('violet', 950); // '#2e1065'
```

## 💡 Tips

- Each shade key is a **string**, not a number — use `extendedColors.blue['500']`, not `extendedColors.blue[500]`.
- This module does **not** include Tailwind's special `inherit`, `current`, `transparent`, `black`, or `white` values which are not numeric scales.
- Colors follow the Tailwind CSS v3 palette. If you need neutral-style grays, `slate`, `gray`, `zinc`, `stone` cover the full range of cool/warm neutrals.
- All hex values are lowercase (`#rrggbb` format).

## 📚 See Also

- [JIT CSS](./jit-css.md)
- [Space Utilities](./space-utilities.md)
