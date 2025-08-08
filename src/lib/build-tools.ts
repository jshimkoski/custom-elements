/**
 * Build Tool Integration for Template Compilation
 * 
 * This file demonstrates how template compilation would integrate with build tools
 * like Vite, Webpack, or Rollup for optimal production performance.
 */

import { 
  compileTemplate, 
  analyzeTemplate, 
  clearTemplateCache,
  type CompiledTemplate,
  type TemplateCompilerOptions
} from '../lib/template-compiler.js';

// ============================================================================
// BUILD-TIME COMPILATION HELPERS
// ============================================================================

/**
 * Vite Plugin for Template Compilation
 * This would be a real Vite plugin in production
 */
export function createTemplateCompilerPlugin(options: TemplateCompilerOptions = {}) {
  return {
    name: 'custom-elements-template-compiler',
    
    transform(code: string, id: string) {
      // Only process TypeScript/JavaScript files
      if (!id.endsWith('.ts') && !id.endsWith('.js')) {
        return null;
      }
      
      // Look for template compilation patterns
      const compileRegex = /compile`([^`]+)`/g;
      let transformedCode = code;
      let hasTransformations = false;
      
      let match;
      while ((match = compileRegex.exec(code)) !== null) {
        const templateString = match[1];
        
        try {
          // Compile the template at build time
          const compiled = compileTemplate(templateString, {
            ...options,
            development: false,
            optimize: true
          });
          
          // Replace with optimized runtime code
          const optimizedCode = generateOptimizedTemplate(compiled);
          transformedCode = transformedCode.replace(match[0], optimizedCode);
          hasTransformations = true;
          
          // Log compilation stats in development
          if (options.development) {
            const analysis = analyzeTemplate(templateString);
            console.log(`[Template Compiler] Compiled template:`, {
              file: id,
              complexity: analysis.complexity,
              staticParts: analysis.staticParts,
              dynamicParts: analysis.dynamicParts
            });
          }
        } catch (error) {
          console.warn(`[Template Compiler] Failed to compile template in ${id}:`, error);
        }
      }
      
      return hasTransformations ? { code: transformedCode, map: null } : null;
    }
  };
}

/**
 * Generate optimized runtime code for a compiled template
 */
function generateOptimizedTemplate(compiled: CompiledTemplate): string {
  return `{
    id: "${compiled.id}",
    statics: ${JSON.stringify(compiled.statics)},
    dynamics: [${compiled.dynamics.map(d => `{
      path: ${JSON.stringify(d.path)},
      type: "${d.type}",
      target: ${d.target ? `"${d.target}"` : 'undefined'},
      getValue: ${d.getValue.toString()}
    }`).join(', ')}],
    fragment: null, // Will be created at runtime
    hasDynamics: ${compiled.hasDynamics}
  }`;
}

// ============================================================================
// DEVELOPMENT TOOLS
// ============================================================================

/**
 * Development-time template analyzer
 */
export class TemplateDevTools {
  private static readonly templates = new Map<string, {
    template: string;
    analysis: ReturnType<typeof analyzeTemplate>;
    compiled: CompiledTemplate;
    usageCount: number;
    lastUsed: number;
  }>();
  
  static analyzeTemplate(templateString: string): void {
    const existing = this.templates.get(templateString);
    
    if (existing) {
      existing.usageCount++;
      existing.lastUsed = Date.now();
      return;
    }
    
    const analysis = analyzeTemplate(templateString);
    const compiled = compileTemplate(templateString, { development: true });
    
    this.templates.set(templateString, {
      template: templateString,
      analysis,
      compiled,
      usageCount: 1,
      lastUsed: Date.now()
    });
    
    // Log analysis in development
    console.group(`[Template Analysis] ${compiled.id}`);
    console.log('Complexity:', analysis.complexity);
    console.log('Static parts:', analysis.staticParts);
    console.log('Dynamic parts:', analysis.dynamicParts);
    if (analysis.recommendations.length > 0) {
      console.log('Recommendations:', analysis.recommendations);
    }
    console.groupEnd();
  }
  
  static getStats() {
    const stats = {
      totalTemplates: this.templates.size,
      totalUsage: 0,
      complexityDistribution: { low: 0, medium: 0, high: 0 },
      recommendations: [] as string[]
    };
    
    for (const entry of this.templates.values()) {
      stats.totalUsage += entry.usageCount;
      stats.complexityDistribution[entry.analysis.complexity]++;
      stats.recommendations.push(...entry.analysis.recommendations);
    }
    
    return stats;
  }
  
  static clear(): void {
    this.templates.clear();
    clearTemplateCache();
  }
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Performance monitor for template rendering
 */
export class TemplatePerformanceMonitor {
  private static readonly metrics = new Map<string, {
    renderCount: number;
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
  }>();
  
  static startRender(templateId: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.recordRender(templateId, duration);
    };
  }
  
  private static recordRender(templateId: string, duration: number): void {
    const existing = this.metrics.get(templateId);
    
    if (existing) {
      existing.renderCount++;
      existing.totalTime += duration;
      existing.averageTime = existing.totalTime / existing.renderCount;
      existing.minTime = Math.min(existing.minTime, duration);
      existing.maxTime = Math.max(existing.maxTime, duration);
    } else {
      this.metrics.set(templateId, {
        renderCount: 1,
        totalTime: duration,
        averageTime: duration,
        minTime: duration,
        maxTime: duration
      });
    }
  }
  
  static getMetrics() {
    const summary = {
      templates: this.metrics.size,
      totalRenders: 0,
      averageRenderTime: 0,
      slowestTemplate: null as { id: string; time: number } | null,
      fastestTemplate: null as { id: string; time: number } | null
    };
    
    for (const [id, metrics] of this.metrics.entries()) {
      summary.totalRenders += metrics.renderCount;
      
      if (!summary.slowestTemplate || metrics.averageTime > summary.slowestTemplate.time) {
        summary.slowestTemplate = { id, time: metrics.averageTime };
      }
      
      if (!summary.fastestTemplate || metrics.averageTime < summary.fastestTemplate.time) {
        summary.fastestTemplate = { id, time: metrics.averageTime };
      }
    }
    
    if (summary.templates > 0) {
      const totalTime = Array.from(this.metrics.values())
        .reduce((sum, metrics) => sum + metrics.totalTime, 0);
      summary.averageRenderTime = totalTime / summary.totalRenders;
    }
    
    return summary;
  }
  
  static clear(): void {
    this.metrics.clear();
  }
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Helper to migrate from string templates to compiled templates
 */
export function migrateToCompiledTemplate(
  stringTemplate: string,
  options: TemplateCompilerOptions = {}
): {
  compiled: CompiledTemplate;
  migrationNotes: string[];
  estimatedPerformanceGain: string;
} {
  const analysis = analyzeTemplate(stringTemplate);
  const compiled = compileTemplate(stringTemplate, options);
  
  const migrationNotes: string[] = [];
  
  if (analysis.dynamicParts === 0) {
    migrationNotes.push('This is a static template - consider using a plain string instead');
  }
  
  if (analysis.complexity === 'high') {
    migrationNotes.push('Consider breaking this into smaller templates for better performance');
  }
  
  if (analysis.recommendations.length > 0) {
    migrationNotes.push(...analysis.recommendations);
  }
  
  let estimatedPerformanceGain = 'Low';
  if (analysis.dynamicParts > 5) {
    estimatedPerformanceGain = 'High';
  } else if (analysis.dynamicParts > 2) {
    estimatedPerformanceGain = 'Medium';
  }
  
  return {
    compiled,
    migrationNotes,
    estimatedPerformanceGain
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

// Classes are already exported above

// Make dev tools available globally in development
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  (window as any).__TEMPLATE_DEV_TOOLS__ = {
    TemplateDevTools,
    TemplatePerformanceMonitor,
    analyzeTemplate,
    migrateToCompiledTemplate
  };
}
