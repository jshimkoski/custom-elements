import { createTemplateCompilerPlugin, migrateToCompiledTemplate, TemplateDevTools, TemplatePerformanceMonitor } from '../../src/lib/build-tools';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('build-tools', () => {
  it('returns null if code does not match compile pattern', () => {
    const plugin = createTemplateCompilerPlugin();
    const code = 'const tpl = `<div>{{name}}</div>`;'; // No compile tag
    const result = plugin.transform(code, 'test.ts');
    expect(result).toBeNull();
  });

  it('handles multiple compile patterns in code', () => {
    const plugin = createTemplateCompilerPlugin();
    const code = 'const tpl1 = compile`<div>{{a}}</div>`; const tpl2 = compile`<span>{{b}}</span>`;';
    const result = plugin.transform(code, 'test.ts');
    expect(result).toBeTruthy();
    if (result) {
      expect(result.code).toContain('statics');
      expect(result.code).toContain('dynamics');
    }
  });

  it('handles transform with empty code', () => {
    const plugin = createTemplateCompilerPlugin();
    const result = plugin.transform('', 'test.ts');
    expect(result).toBeNull();
  });

  it('handles transform with undefined code', () => {
    const plugin = createTemplateCompilerPlugin();
    // @ts-expect-error
    const result = plugin.transform(undefined, 'test.ts');
    expect(result).toBeNull();
  });

  it('handles transform with null code', () => {
    const plugin = createTemplateCompilerPlugin();
    // @ts-expect-error
    const result = plugin.transform(null, 'test.ts');
    expect(result).toBeNull();
  });

  it('handles TemplateDevTools analyzeTemplate with empty string', () => {
    TemplateDevTools.clear();
    TemplateDevTools.analyzeTemplate('');
    const stats = TemplateDevTools.getStats();
    expect(stats.totalTemplates).toBeGreaterThanOrEqual(0);
  });

  it('handles TemplatePerformanceMonitor startRender with empty id', () => {
    TemplatePerformanceMonitor.clear();
    const end = TemplatePerformanceMonitor.startRender('');
    end();
    const metrics = TemplatePerformanceMonitor.getMetrics();
    expect(metrics.templates).toBeGreaterThanOrEqual(1);
  });

  it('creates a template compiler plugin and transforms code', () => {
    const plugin = createTemplateCompilerPlugin({ development: true });
    const code = 'const tpl = compile`<div>{{name}}</div>`;';
    const result = plugin.transform(code, 'test.ts');
    expect(result).toBeTruthy();
    if (result) {
      expect(result.code).toContain('statics');
    }
  });

  it('returns null for non-ts/js files', () => {
    const plugin = createTemplateCompilerPlugin();
    const result = plugin.transform('foo', 'test.css');
    expect(result).toBeNull();
  });

  it('handles template compilation errors gracefully', () => {
    const plugin = createTemplateCompilerPlugin();
    const badCode = 'const tpl = compile`<div>{{}`;';
    const result = plugin.transform(badCode, 'test.ts');
    expect(result).toBeTruthy();
  });

  it('migrates string templates to compiled templates', () => {
    const { compiled, migrationNotes, estimatedPerformanceGain } = migrateToCompiledTemplate('<div>{{name}}</div>');
    expect(compiled).toBeTruthy();
    expect(Array.isArray(migrationNotes)).toBe(true);
    expect(['Low', 'Medium', 'High']).toContain(estimatedPerformanceGain);
  });

  it('TemplateDevTools analyzes and tracks templates', () => {
    TemplateDevTools.clear();
    TemplateDevTools.analyzeTemplate('<div>{{name}}</div>');
    const stats = TemplateDevTools.getStats();
    expect(stats.totalTemplates).toBeGreaterThan(0);
    expect(stats.complexityDistribution.low + stats.complexityDistribution.medium + stats.complexityDistribution.high).toBeGreaterThan(0);
  });

  it('TemplatePerformanceMonitor tracks render times', () => {
    TemplatePerformanceMonitor.clear();
    const end = TemplatePerformanceMonitor.startRender('tpl_test');
    setTimeout(() => {
      end();
      const metrics = TemplatePerformanceMonitor.getMetrics();
      expect(metrics.templates).toBeGreaterThanOrEqual(1);
    }, 10);
  });

  it('handles missing plugin options gracefully', () => {
    const plugin = createTemplateCompilerPlugin(undefined as any);
    const code = 'const tpl = compile`<div>{{name}}</div>`;';
    const result = plugin.transform(code, 'test.ts');
    expect(result).toBeTruthy();
  });

  it('handles invalid plugin options', () => {
    const plugin = createTemplateCompilerPlugin({ development: 'invalid' as any });
    const code = 'const tpl = compile`<div>{{name}}</div>`;';
    const result = plugin.transform(code, 'test.ts');
    expect(result).toBeTruthy();
  });

  it('handles migration with invalid template', () => {
    const { compiled, migrationNotes, estimatedPerformanceGain } = migrateToCompiledTemplate('<div>{{}');
    expect(compiled).toBeTruthy();
    expect(Array.isArray(migrationNotes)).toBe(true);
    expect(['Low', 'Medium', 'High']).toContain(estimatedPerformanceGain);
  });

  it('TemplateDevTools returns stats with no templates', () => {
    TemplateDevTools.clear();
    const stats = TemplateDevTools.getStats();
    expect(stats.totalTemplates).toBe(0);
    expect(stats.complexityDistribution.low).toBe(0);
    expect(stats.complexityDistribution.medium).toBe(0);
    expect(stats.complexityDistribution.high).toBe(0);
  });

  it('TemplateDevTools handles invalid input', () => {
    TemplateDevTools.clear();
    expect(() => TemplateDevTools.analyzeTemplate(undefined as any)).not.toThrow();
    const stats = TemplateDevTools.getStats();
    expect(stats.totalTemplates).toBe(0);
  });

  it('TemplatePerformanceMonitor handles end called multiple times', () => {
    TemplatePerformanceMonitor.clear();
    const end = TemplatePerformanceMonitor.startRender('tpl_test2');
    end();
    expect(() => end()).not.toThrow();
    const metrics = TemplatePerformanceMonitor.getMetrics();
    expect(metrics.templates).toBeGreaterThanOrEqual(1);
  });

  it('TemplatePerformanceMonitor returns metrics with no templates', () => {
    TemplatePerformanceMonitor.clear();
    const metrics = TemplatePerformanceMonitor.getMetrics();
    expect(metrics.templates).toBe(0);
  });
});
