import { describe, it, expect } from 'vitest';
import { component } from '../../src/lib/runtime';

describe('component with empty state', () => {
  it('should render and function with no state provided', () => {
    document.body.innerHTML = '<empty-state-demo></empty-state-demo>';
    component('empty-state-demo', {
      template: () => '<div>No state here!</div>'
    });
    const el = document.querySelector('empty-state-demo');
    expect(el).toBeTruthy();
    expect(el?.shadowRoot?.innerHTML).toContain('No state here!');
  });

  it('should provide an empty state object to the template', () => {
    let receivedState: any = null;
    component('empty-state-check', {
      template: (state) => {
        receivedState = state;
        return '<span>Stateless</span>';
      }
    });
    document.body.innerHTML = '<empty-state-check></empty-state-check>';
    const el = document.querySelector('empty-state-check');
    expect(receivedState).toEqual({});
    expect(el?.shadowRoot?.innerHTML).toContain('Stateless');
  });
});
