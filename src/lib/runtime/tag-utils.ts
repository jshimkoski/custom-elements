import { toKebab } from './helpers';

/**
 * Resolves a component() tag argument to the actual registered tag name.
 * Single source of truth used by both factory.ts (runtime) and
 * vite-plugin.ts (build time) so the two can never drift apart.
 *
 * Rules:
 *   camelCase → kebab-case   (myButton  → my-button)
 *   no hyphen  → cer- prefix (app       → cer-app)
 *   has hyphen → unchanged   (ks-badge  → ks-badge)
 */
export function resolveTagName(name: string): string {
  const kebab = toKebab(name);
  return kebab.includes('-') ? kebab : `cer-${kebab}`;
}
