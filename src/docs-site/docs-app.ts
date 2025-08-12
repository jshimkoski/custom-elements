import { component, css } from '../lib/runtime.ts';

interface DocsAppState { current: string; [key: string]: any; }


component('docs-app', {
  debug: true,
  state: { current: 'overview' } as DocsAppState,
  template(state) {
    return `
      <docs-nav data-on-select="handleNav"></docs-nav>
  <docs-content section="${state.current}" key="${state.current}"></docs-content>
    `;
  },
  handleNav(e: CustomEvent<string>, state: DocsAppState) {
    state.current = e.detail;
    if (typeof this.render === 'function') this.render();
  },
  style: css`
    :host { display: block; font-family: system-ui, sans-serif; background: #f9f9f9; min-height: 100vh; }
    docs-nav { margin-bottom: 2rem; }
    docs-content { display: block; max-width: 800px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); padding: 2rem; }
  `
});
