import type { ComponentAPI, ComponentState } from './runtime';

// ============================================================================
// SSR TYPES & INTERFACES
// ============================================================================

export interface SSRComponentConfig<T extends ComponentState = ComponentState> {
  readonly tag: string;
  readonly template: (state: T, api: ComponentAPI<T>) => string;
  /**
   * State object can include computed properties as getter functions that accept state as a parameter.
   */
  readonly state: T;
  readonly style?: string | ((state: T) => string);
  readonly attrs?: Record<string, string>;
}

export interface SSRRenderOptions {
  /** Include component styles in the output */
  includeStyles?: boolean;
  /** Pretty print the HTML output */
  prettyPrint?: boolean;
  /** Custom attribute sanitization function */
  sanitizeAttributes?: (attrs: Record<string, string>) => Record<string, string>;
}

export interface SSRContext {
  /** Track rendered components for hydration */
  components: Map<string, SSRComponentConfig>;
  /** Global styles collected during SSR */
  styles: Set<string>;
}

// Environment detection for treeshaking
const isServer = typeof window === 'undefined' || typeof document === 'undefined';

// ============================================================================
// SSR IMPLEMENTATION (Treeshakable)
// ============================================================================

/**
 * Create a minimal API for SSR that doesn't rely on DOM
 */
export function createSSRAPI<T extends ComponentState>(state: T): ComponentAPI<T> {
  return {
    state,
    emit: () => {}, // No-op on server
    onGlobal: () => () => {},
    offGlobal: () => {},
    emitGlobal: () => {},
  };
}

/**
 * Render a component to HTML string on the server
 * This function is treeshakable - only included when imported
 */
export function renderToString<T extends ComponentState>(
  config: SSRComponentConfig<T>,
  options: SSRRenderOptions = {}
): string {
  if (!isServer) {
    console.warn('renderToString should only be used on the server');
  }

  try {
    // Use state directly (getters will be available)
    const state = config.state;

    // Create API and render template
    const api = createSSRAPI(state);
    const innerHTML = config.template(state, api);
    
    // Generate component styles if needed
    let styleContent = '';
    if (options.includeStyles && config.style) {
      const css = typeof config.style === 'function' 
        ? config.style(state) 
        : config.style;
      styleContent = `<style>${css}</style>`;
    }

    // Sanitize attributes
    const attrs = options.sanitizeAttributes 
      ? options.sanitizeAttributes(config.attrs || {})
      : config.attrs || {};

    // Build attribute string
    const attrString = Object.entries(attrs)
      .map(([key, value]) => `${escapeAttribute(key)}="${escapeAttribute(value)}"`)
      .join(' ');

    // Construct final HTML
    const openTag = attrString 
      ? `<${config.tag} ${attrString}>` 
      : `<${config.tag}>`;
    
    const html = `${openTag}${styleContent}${innerHTML}</${config.tag}>`;

    return options.prettyPrint ? formatHTML(html) : html;
    
  } catch (error) {
    console.error(`[SSR] Error rendering ${config.tag}:`, error);
    return `<${config.tag}><div style="color: red;">SSR Error: ${escapeHTML(String(error))}</div></${config.tag}>`;
  }
}

/**
 * Render multiple components to HTML with shared context
 */
export function renderComponentsToString(
  components: SSRComponentConfig<any>[],
  options: SSRRenderOptions = {}
): { html: string; styles: string; context: SSRContext } {
  const context: SSRContext = {
    components: new Map(),
    styles: new Set(),
  };

  const htmlParts: string[] = [];
  
  components.forEach(config => {
    // Track component for hydration
    context.components.set(config.tag, config);
    
    // Collect styles
    if (config.style) {
      const css = typeof config.style === 'function' 
        ? config.style(config.state) 
        : config.style;
      context.styles.add(css);
    }
    
    // Render component
    const html = renderToString(config, { ...options, includeStyles: false });
    htmlParts.push(html);
  });

  const styles = Array.from(context.styles).join('\n');
  const html = htmlParts.join('\n');

  return { html, styles, context };
}

/**
 * Generate hydration script for client-side takeover
 */
export function generateHydrationScript(context: SSRContext): string {
  const componentConfigs = Array.from(context.components.entries()).map(([tag, config]) => ({
    tag,
    state: config.state,
  }));

  return `
<script type="module">
  // Hydration data from SSR
  window.__SSR_CONTEXT__ = ${JSON.stringify({ components: componentConfigs })};
  
  // Auto-hydrate when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrate);
  } else {
    hydrate();
  }
  
  function hydrate() {
    const context = window.__SSR_CONTEXT__;
    if (!context?.components) return;
    
    context.components.forEach(({ tag, state }) => {
      const elements = document.querySelectorAll(tag);
      elements.forEach(el => {
        // Mark as hydrated to prevent re-initialization
        if (!el.hasAttribute('data-hydrated')) {
          el.setAttribute('data-hydrated', 'true');
          // Restore state if component supports it
          if (el._hydrateWithState) {
            el._hydrateWithState(state);
          }
        }
      });
    });
    
    // Clean up
    delete window.__SSR_CONTEXT__;
  }
</script>`.trim();
}

// ============================================================================
// SSR UTILITIES
// ============================================================================

export const escapeHTML = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const escapeAttribute = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export const formatHTML = (html: string): string => {
  // Simple HTML formatting for development
  return html
    .replace(/></g, '>\n<')
    .split('\n')
    .map(line => {
      const depth = (line.match(/^<[^\/]/g) || []).length - (line.match(/<\//g) || []).length;
      return '  '.repeat(Math.max(0, depth)) + line.trim();
    })
    .join('\n');
}
