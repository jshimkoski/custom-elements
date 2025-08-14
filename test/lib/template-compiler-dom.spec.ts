import { describe, it, expect, beforeEach } from 'vitest';
import { compileTemplate, renderCompiledTemplate, updateCompiledTemplate } from '../../src/lib/template-compiler';

const state = { name: 'Alice', count: 1 };
const api = { state, emit: () => {}, onGlobal: () => () => {}, offGlobal: () => {}, emitGlobal: () => {} };

describe('template-compiler DOM updates', () => {
  beforeEach(() => {
    state.name = 'Alice';
    state.count = 1;
  });

  it('updates text nodes using TreeWalker', () => {
    const compiled = compileTemplate('<div>Count: {{count}}</div>');
    const fragment = renderCompiledTemplate(compiled, state, api);
    const div = fragment.firstChild as Element;
    expect(div.textContent).toBe('Count: 1');
    state.count = 2;
    updateCompiledTemplate(compiled, div, state, api, { ...state, count: 1 });
    expect(div.textContent).toBe('Count: 2');
  });

  it('updates attribute values', () => {
    const compiled = compileTemplate('<div title="{{name}}">Test</div>');
    const fragment = renderCompiledTemplate(compiled, state, api);
    const div = fragment.firstChild as Element;
    expect(div.getAttribute('title')).toBe('Alice');
    state.name = 'Bob';
    updateCompiledTemplate(compiled, div, state, api, { ...state, name: 'Alice' });
    expect(div.getAttribute('title')).toBe('Bob');
  });

  it('removes attribute if value is null', () => {
    const compiled = compileTemplate('<div title="{{name}}">Test</div>');
    const fragment = renderCompiledTemplate(compiled, state, api);
    const div = fragment.firstChild as Element;
    state.name = null as any;
    updateCompiledTemplate(compiled, div, state, api, { ...state, name: 'Bob' });
    expect(div.getAttribute('title')).toBe(null);
  });

  it('updates property values', () => {
    const compiled = compileTemplate('<input value="{{name}}" />');
    const fragment = renderCompiledTemplate(compiled, state, api);
    const input = fragment.firstChild as HTMLInputElement;
    expect(input.value).toBe('Alice');
    state.name = 'Carol';
    updateCompiledTemplate(compiled, input, state, api, { ...state, name: 'Alice' });
    expect(input.value).toBe('Carol');
  });

  it('toggles class names', () => {
    const compiled = compileTemplate('<div class="{{name}}">Test</div>');
    const fragment = renderCompiledTemplate(compiled, state, api);
    const div = fragment.firstChild as Element;
    expect(div.getAttribute('class')).toBe('Alice');
    state.name = '';
    updateCompiledTemplate(compiled, div, state, api, { ...state, name: 'Alice' });
    expect(div.getAttribute('class')).toBe('');
  });

  it('updates style properties', () => {
    const compiled = compileTemplate('<div style="color:{{name}}">Test</div>');
    if (compiled.statics && compiled.statics.length > 0) {
      console.debug('[Test] prevStatic for style dynamic:', compiled.statics[0]);
    }
    console.debug('[Test] Compiled dynamics:', compiled.dynamics.map(d => ({ type: d.type, target: d.target })));
    const fragment = renderCompiledTemplate(compiled, state, api);
    const div = fragment.firstChild as HTMLElement;
    console.debug('[Test] Initial state:', state);
    console.debug('[Test] Initial style:', div.getAttribute('style'));
    expect(div.getAttribute('style')).toBe('color:Alice');
    state.name = 'red';
    console.debug('[Test] Updated state:', state);
    updateCompiledTemplate(compiled, div, state, api, { ...state, name: 'Alice' });
    console.debug('[Test] Updated style:', div.getAttribute('style'));
    expect(div.getAttribute('style')).toBe('color:red');
  });
});
