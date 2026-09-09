import { describe, it, expect, beforeEach } from 'vitest';
import { component, html, useProps } from '../src/lib';

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

  it('uses declared defaults for props that collide with inherited DOM properties', async () => {
    component('test-native-role-prop-default', () => {
      const props = useProps({ role: 'list' });
      return html`<span>${props.role}</span>`;
    });

    const element = document.createElement('test-native-role-prop-default');
    document.body.append(element);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.shadowRoot?.querySelector('span')?.textContent).toBe('list');
    expect((element as HTMLElement & { role: string }).role).toBe('list');
  });
});
