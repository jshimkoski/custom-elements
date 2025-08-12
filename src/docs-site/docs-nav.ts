import type { ComponentAPI } from '../lib/runtime.ts';
import { component, compile, css } from '../lib/runtime.ts';

const navItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'features', label: 'Features' },
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'api-reference', label: 'API Reference' },
  { id: 'core-concepts', label: 'Core Concepts' },
  { id: 'advanced-use-cases', label: 'Advanced Use Cases' },
  { id: 'examples', label: 'Examples' },
  { id: 'ssr-guide', label: 'SSR Guide' },
  { id: 'framework-comparison', label: 'Framework Comparison' }
];

interface DocsNavState { selected: string; [key: string]: any; }


component('docs-nav', {
  state: { selected: 'overview' } as DocsNavState,
  template: compile`
    <nav>
      ${(state: DocsNavState) => navItems.map(item => `<button
        class="${state.selected === item.id ? 'active' : ''}"
        data-on-click="select"
        data-id="${item.id}">
        ${item.label}
      </button>`).join('')}
    </nav>
  `,
  select(e: MouseEvent, state: DocsNavState, api: ComponentAPI<DocsNavState>) {
    const target = e.target as HTMLElement;
    const id = target.getAttribute('data-id') || 'overview';
    state.selected = id;
    api.emit('select', id);
  },
  style: css`
    nav { display: flex; gap: 0.5rem; justify-content: center; }
    button { background: #fff; border: 1px solid #ddd; border-radius: 4px; padding: 0.5rem 1rem; cursor: pointer; font-size: 1rem; transition: background 0.2s; }
    button.active { background: #007bff; color: #fff; border-color: #007bff; }
    button:hover:not(.active) { background: #f0f0f0; }
  `
});
