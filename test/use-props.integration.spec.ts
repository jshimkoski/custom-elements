import { describe, it, expect, beforeEach } from 'vitest';

// Importing the component file registers the custom element
import '../src/components/test-props';

describe('ce-test-props component (integration)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('defines the custom element', () => {
    expect(customElements.get('ce-test-props')).toBeDefined();
  });

  it('renders default prop into shadow DOM', async () => {
    const comp = document.createElement('ce-test-props') as HTMLElement;
    document.body.appendChild(comp);
    // Allow microtasks to run (render)
    await Promise.resolve();

    // Query the rendered content
    const span = comp.shadowRoot?.querySelector('.value') as HTMLElement | null;
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe('default');
  });
});
