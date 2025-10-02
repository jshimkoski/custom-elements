import { describe, it, expect, beforeEach } from 'vitest';

// Import the runtime helpers to register components and create reactive refs
import { component, html, ref, useProps, useEmit } from '../src/lib/index';

describe('parent-child toggle with :model', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('mounts and unmounts child based on parent boolean ref via :model', async () => {
    // Define child component that renders a button and emits a 'toggle' event
    component('test-child', () => {
      const props = useProps({ modelValue: false });
      const emit = useEmit();
      return html`<div class="child">${props.modelValue ? 'ON' : ''}<button class="child-toggle" @click="${() => emit('update:model-value', !props.modelValue)}">Child Toggle</button></div>`;
    });

    // Define parent component which has a boolean ref and listens for child's toggle event
    component('test-parent', () => {
      const isVisible = ref(true);
      // expose props/defaults if component author wants to use them
      useProps({});

      return html`
        <div>
          <div class="status">${isVisible.value ? 'ON' : 'OFF'}</div>
          ${isVisible.value ? html`<test-child :model="${isVisible}" />` : ''}
        </div>
      `;
    });

    // Create the parent element and append
    const parent = document.createElement('test-parent') as HTMLElement;
    document.body.appendChild(parent);

    // Allow render to complete
    await new Promise((r) => setTimeout(r, 10));

    // Child element is present initially (parent renders it)
    const childBefore = parent.shadowRoot?.querySelector('test-child') as HTMLElement | null;
    expect(childBefore).not.toBeNull();
    // Initially the child should show 'ON' because parent starts visible=true
    const beforeText = childBefore!.shadowRoot?.textContent || '';
    expect(beforeText.includes('ON')).toBe(true);
    // Parent status should reflect ON (we start with visible=true)
    const statusBefore = parent.shadowRoot?.querySelector('.status') as HTMLElement | null;
    expect(statusBefore?.textContent).toBe('ON');

    // Click the child's internal button to emit toggle -> parent toggles isVisible to false
    const childBtn = childBefore!.shadowRoot?.querySelector('.child-toggle') as HTMLElement | null;
    expect(childBtn).not.toBeNull();
    childBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 50));
    // After the child's toggle, the parent should become OFF and child removed
    const childAfter = parent.shadowRoot?.querySelector('test-child') as HTMLElement | null;
    expect(childAfter).toBeNull();
    const statusAfter = parent.shadowRoot?.querySelector('.status') as HTMLElement | null;
    expect(statusAfter?.textContent).toBe('OFF');
  });
});
