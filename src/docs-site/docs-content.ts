/// <reference path="./sections.d.ts" />
import { component, css } from '../lib/runtime.ts';
import { sections } from './sections.ts';

component('docs-content', {
  state: { section: 'overview' },
  template(state) {
    // Only use state.section, do not rely on 'this'
    const section = state.section || 'overview';
    return `<div class=\"docs-section\">${sections[section] || '<p>Section not found.</p>'}</div>`;
  },
  style: css`
    .docs-section { font-size: 1.1rem; line-height: 1.7; }
  `
});
