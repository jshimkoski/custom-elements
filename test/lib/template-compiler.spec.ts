import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';
import { compileTemplate, renderCompiledTemplate, updateCompiledTemplate } from '../../src/lib/template-compiler';
import {
  analyzeTemplate,
  clearTemplateCache,
  getPerformanceMetrics,
  getCacheStats
} from '../../src/lib/template-compiler';

// Minimal state and API mocks
const state = { name: 'Alice', count: 1 };
const api = { state, emit: () => {}, onGlobal: () => () => {}, offGlobal: () => {}, emitGlobal: () => {} };

describe('template-compiler', () => {
  it('applies property updates to element and sets property/attribute', () => {
    const compiled = compileTemplate('<input value="{{name}}">');
    const fragment = renderCompiledTemplate(compiled, { name: 'Bob' }, api);
    const input = fragment.firstChild as HTMLInputElement;
    expect(input.value).toBe('Bob');
    expect(input.getAttribute('value')).toBe('Bob');
  });

  it('applies class updates to element and sets className/attribute', () => {
    const compiled = compileTemplate('<div class="{{name}}">Test</div>');
    const fragment = renderCompiledTemplate(compiled, { name: 'active' }, api);
    const div = fragment.firstChild as HTMLElement;
    expect(div.className).toBe('active');
    expect(div.getAttribute('class')).toBe('active');
  });

  it('handles missing target node gracefully (no throw)', () => {
    // Simulate update with invalid path
    const compiled = compileTemplate('<div>{{name}}</div>');
    const mutable = { ...compiled, dynamics: [ { ...compiled.dynamics[0], path: [999] } ] };
    expect(() => renderCompiledTemplate(mutable, { name: 'Alice' }, api)).not.toThrow();
  });

  it('handles error in applyUpdate gracefully (no throw)', () => {
    // Simulate update with invalid type to trigger error
    const compiled = compileTemplate('<div>{{name}}</div>');
    const mutable = { ...compiled, dynamics: [ { ...compiled.dynamics[0], type: 'invalid' as any } ] };
    expect(() => renderCompiledTemplate(mutable, { name: 'Alice' }, api)).not.toThrow();
  });

  it('applies style updates to element and sets style attribute', () => {
    const compiled = compileTemplate('<div style="color:{{name}}">Test</div>');
    const fragment = renderCompiledTemplate(compiled, { name: 'red' }, api);
    const div = fragment.firstChild as HTMLElement;
    expect(div.style.color).toBe('red');
    expect(div.getAttribute('style')).toContain('color:red');
  });

  it('handles null style value and sets style attribute to empty', () => {
    const compiled = compileTemplate('<div style="color:{{name}}">Test</div>');
    const fragment = renderCompiledTemplate(compiled, { name: null }, api);
    const div = fragment.firstChild as HTMLElement;
    expect(div.style.color).toBe('');
    expect(div.getAttribute('style')).toContain('color:');
  });

  it('analyzes static template and recommends static string', () => {
    const result = analyzeTemplate('<div>Static</div>');
    expect(result.recommendations).toContain('Consider using a static string instead of a template');
  });

  it('analyzes complex template and recommends breaking into smaller components', () => {
    const template = '<div>' + Array(12).fill('{{x}}').join('') + '</div>';
    const result = analyzeTemplate(template);
    expect(result.recommendations).toContain('Consider breaking this template into smaller components');
  });

  it('analyzes template with missing fragment and recommends static string', () => {
    // Simulate fallback by passing invalid template with a dynamic
    const result = analyzeTemplate('<div>{{x}');
    expect(result.recommendations).toContain('Consider using a static string instead of a template');
  });
  it('compiles a simple template string', () => {
    const compiled = compileTemplate('<div>Hello</div>');
    expect(compiled).toHaveProperty('id');
    expect(typeof compiled.render).toBe('function');
  });


  it('analyzes template complexity and recommendations', () => {
    const { staticParts, dynamicParts, complexity, recommendations } = analyzeTemplate('<div>{{name}}</div>');
    expect(staticParts).toBeGreaterThan(0);
    expect(dynamicParts).toBe(1);
    expect(['low', 'medium', 'high']).toContain(complexity);
    expect(Array.isArray(recommendations)).toBe(true);
  });

  it('clears template cache and performance metrics', () => {
    clearTemplateCache();
    expect(getCacheStats().size).toBe(0);
    expect(getPerformanceMetrics().size).toBe(0);
  });

  it('returns cache stats after compiling templates', () => {
    clearTemplateCache();
    compileTemplate('<div>One</div>');
    compileTemplate('<div>Two</div>');
    const stats = getCacheStats();
    expect(stats.size).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(stats.entries)).toBe(true);
  });

  it('returns performance metrics after compiling templates', () => {
    clearTemplateCache();
    compileTemplate('<div>Perf</div>', { development: true });
    const metrics = getPerformanceMetrics();
    expect(metrics.size).toBeGreaterThanOrEqual(1);
    for (const value of metrics.values()) {
      expect(value).toHaveProperty('compilationTime');
      expect(value).toHaveProperty('renderTime');
      expect(value).toHaveProperty('updateTime');
      expect(value).toHaveProperty('cacheHits');
      expect(value).toHaveProperty('cacheMisses');
    }
  });

  it('creates a fallback template on error', () => {
    // Simulate error by passing invalid template and forcing development mode
    const compiled = compileTemplate('<div>{{', { development: true });
    expect(compiled.statics[0]).toBe('<div>{{');
    expect(compiled.hasDynamics).toBe(false);
    expect(typeof compiled.render).toBe('function');
  });

  it('removes attribute when value is null (sets to empty string)', () => {
    const compiled = compileTemplate('<div title="{{name}}">Test</div>');
    const fragment = renderCompiledTemplate(compiled, { name: null }, api);
    const div = fragment.firstChild as Element;
    expect(div.getAttribute('title')).toBeNull();
  });

  it('triggers error handling and development warning in applyUpdate', () => {
    // Patch globalThis isDevelopment to true and spy on console.warn
    const originalIsDev = (globalThis as any).isDevelopment;
    (globalThis as any).isDevelopment = true;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Simulate update with invalid type to trigger error
    const compiled = compileTemplate('<div>{{name}}</div>');
    const mutable = { ...compiled, dynamics: [ { ...compiled.dynamics[0], type: 'invalid' as any } ] };
    expect(() => renderCompiledTemplate(mutable, { name: 'Alice' }, api)).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
    (globalThis as any).isDevelopment = originalIsDev;
  });

  it('creates a fallback template for complex invalid input', () => {
    const compiled = compileTemplate('<div>{{{');
    expect(compiled.statics[0]).toBe('<div>{{{');
    expect(compiled.hasDynamics).toBe(false);
    expect(typeof compiled.render).toBe('function');
  });

  it('renders compiled template to DocumentFragment', () => {
    const compiled = compileTemplate('<span>{{name}}</span>');
    const fragment = renderCompiledTemplate(compiled, state, api);
    expect(fragment).toBeInstanceOf(DocumentFragment);
    expect(fragment.textContent).toContain('Alice');
  });

  it('updates compiled template with new state (note: fragment is not reactive)', () => {
    const compiled = compileTemplate('<span>{{count}}</span>');
    let fragment = renderCompiledTemplate(compiled, state, api);
    expect(fragment.textContent).toContain('1');
    state.count = 2;
    fragment = renderCompiledTemplate(compiled, state, api);
    expect(fragment.textContent).toContain('2');
  });

  it('handles empty template string', () => {
    const compiled = compileTemplate('');
    const fragment = renderCompiledTemplate(compiled, state, api);
    expect(fragment.textContent).toBe('');
  });

  it('handles invalid template gracefully', () => {
    expect(() => compileTemplate('<div>{{')).not.toThrow();
  });

  it('supports multiple root elements', () => {
    const compiled = compileTemplate('<div>One</div><div>Two</div>');
    const fragment = renderCompiledTemplate(compiled, state, api);
    expect(fragment.childNodes.length).toBe(2);
  });

  it('supports attribute interpolation', () => {
  const compiled = compileTemplate('<div title="{{name}}">Test</div>');
  const fragment = renderCompiledTemplate(compiled, state, api);
  const div = fragment.firstChild as Element;
  expect(div.getAttribute('title')).toBe('Alice');
  });

  it('handles missing state keys as empty string', () => {
    const compiled = compileTemplate('<div>{{missing}}</div>');
    const fragment = renderCompiledTemplate(compiled, state, api);
    expect(fragment.textContent).toBe('');
  });

  it('handles deeply nested templates', () => {
    state.count = 1;
    const compiled = compileTemplate('<div><span>{{name}}</span><span>{{count}}</span></div>');
    const fragment = renderCompiledTemplate(compiled, state, api);
    expect(fragment.textContent).toContain('Alice');
    expect(fragment.textContent).toContain('1');
  });

  it('removes attribute when value is undefined', () => {
    const compiled = compileTemplate('<div title="{{name}}">Test</div>');
    const fragment = renderCompiledTemplate(compiled, { name: undefined }, api);
    const div = fragment.firstChild as Element;
    expect(div.getAttribute('title')).toBeNull();
  });

  it('removes class when value is null', () => {
    const compiled = compileTemplate('<div class="{{name}}">Test</div>');
    const fragment = renderCompiledTemplate(compiled, { name: null }, api);
    const div = fragment.firstChild as Element;
    expect(div.getAttribute('class')).toBe('');
    expect(div.className).toBe('');
  });

  it('removes style when value is undefined', () => {
    const compiled = compileTemplate('<div style="color:{{name}}">Test</div>');
    const fragment = renderCompiledTemplate(compiled, { name: undefined }, api);
    const div = fragment.firstChild as HTMLElement;
    expect(div.style.color).toBe('');
    expect(div.getAttribute('style')).toContain('color:');
  });

  it('handles boolean property update', () => {
    const compiled = compileTemplate('<input checked="{{isChecked}}">');
    const fragment = renderCompiledTemplate(compiled, { isChecked: true }, api);
    const input = fragment.firstChild as HTMLInputElement;
    expect(input.checked).toBe(true);
    expect(input.getAttribute('checked')).toBe('true');
  });

  it('handles multiple dynamics in one element', () => {
    const compiled = compileTemplate('<div class="{{name}}" style="color:{{color}}">Test</div>');
    const fragment = renderCompiledTemplate(compiled, { name: 'active', color: 'blue' }, api);
    const div = fragment.firstChild as HTMLElement;
    expect(div.className).toBe('active');
    expect(div.style.color).toBe('blue');
  });

  it('triggers fallback for invalid template with only open tag', () => {
    const compiled = compileTemplate('<div>{{');
    expect(compiled.statics[0]).toBe('<div>{{');
    expect(compiled.hasDynamics).toBe(false);
    expect(typeof compiled.render).toBe('function');
  });

  it('triggers fallback for template with no closing tag', () => {
    const compiled = compileTemplate('<div>{{name}');
    expect(compiled.statics[0]).toBe('<div>{{name}');
    expect(compiled.hasDynamics).toBe(false);
    expect(typeof compiled.render).toBe('function');
  });

  it('handles unknown update type in development mode (different type)', () => {
    const originalIsDev = (globalThis as any).isDevelopment;
    (globalThis as any).isDevelopment = true;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const compiled = compileTemplate('<div>{{name}}</div>');
    const mutable = { ...compiled, dynamics: [ { ...compiled.dynamics[0], type: 'unknown' as any } ] };
    expect(() => renderCompiledTemplate(mutable, { name: 'Alice' }, api)).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
    (globalThis as any).isDevelopment = originalIsDev;
  });

  it('handles dynamic update with missing node path', () => {
    const compiled = compileTemplate('<div>{{name}}</div>');
    const mutable = { ...compiled, dynamics: [ { ...compiled.dynamics[0], path: [999] } ] };
    expect(() => renderCompiledTemplate(mutable, { name: 'Alice' }, api)).not.toThrow();
  });
});
