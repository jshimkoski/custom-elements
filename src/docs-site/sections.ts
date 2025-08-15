// Import or define HTML strings for each section. Replace with actual content or import from markdown-to-html conversion.
/**
 * Sections HTML content for docs-site
 */
export const sections: Record<string, string> = {
  overview: `<h1>Custom Elements Runtime</h1><p>Ultra-lightweight, type-safe runtime for fast, reactive, and maintainable web components.</p>`,
  features: `<h2>Features</h2><ul><li>Reactive State</li><li>Functional Templates</li><li>Refs</li><li>Computed Properties</li><li>Automatic Event Binding</li><li>Controlled Input Sync</li><li>SSR & Hydration</li><li>Error Boundaries</li><li>Global State & Event Bus</li><li>Focus Preservation</li><li>Smart DOM Batching</li><li>Strict TypeScript</li><li>Tree-shakable & Modular</li><li>Functional API</li><li>Debug Mode</li></ul>`,
  'getting-started': `<h2>Getting Started</h2><ol><li>Clone this repository</li><li>Run the examples: <code>npm run dev</code></li><li>Create your first component</li><li>Build something awesome!</li></ol>`,
  'api-reference': `<h2>API Reference</h2><p>See <a href="docs/api-reference.md">API Reference</a> for full details.</p>`,
  'core-concepts': `<h2>Core Concepts</h2><ul><li>Reactive State</li><li>Functional Templates</li><li>Refs System</li><li>Computed Properties</li><li>Automatic Event Binding</li></ul>`,
  'advanced-use-cases': `<h2>Advanced Use Cases</h2><ul><li>Computed Properties</li><li>Refs</li><li>Lifecycle Hooks</li><li>Error Boundaries</li><li>Async Templates</li><li>Plugin System</li></ul>`,
  examples: `<h2>Examples</h2><p>See <a href="docs/examples.md">Examples</a> for code samples.</p>`,
  'ssr-guide': `<h2>SSR Guide</h2><p>See <a href="docs/ssr.md">SSR Guide</a> for server-side rendering details.</p>`,
  'framework-comparison': `<h2>Framework Comparison</h2><p>See <a href="docs/framework-comparison.md">Framework Comparison</a> for details.</p>`
};
