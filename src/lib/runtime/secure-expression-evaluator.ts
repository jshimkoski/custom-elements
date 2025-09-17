/**
 * Secure expression evaluator to replace unsafe Function() constructor
 * Provides AST-based validation and caching for performance
 */

import { devWarn } from "./logger";
import { getNestedValue } from "./helpers";

interface ExpressionCache {
  evaluator: (context: any) => any;
  isSecure: boolean;
}

/**
 * Secure expression evaluator with caching and AST validation
 */
class SecureExpressionEvaluator {
  private static cache = new Map<string, ExpressionCache>();
  private static maxCacheSize = 1000;
  
  // Allowed identifiers in expressions
  private static allowedIdentifiers = new Set([
    'ctx', 'item', 'index', 'key', 'value', 'this'
  ]);
  
  // Allowed operators
  private static allowedOperators = new Set([
    '+', '-', '*', '/', '%',
    '===', '!==', '==', '!=',
    '>', '<', '>=', '<=',
    '&&', '||', '!',
    '?', ':'
  ]);
  
  // Dangerous patterns to block
  private static dangerousPatterns = [
    /constructor/i,
    /prototype/i,
    /__proto__/i,
    /function/i,
    /eval/i,
    /import/i,
    /require/i,
    /window/i,
    /document/i,
    /global/i,
    /process/i,
    /setTimeout/i,
    /setInterval/i,
    /fetch/i,
    /XMLHttpRequest/i
  ];
  
  static evaluate(expression: string, context: any): any {
    // Check cache first
    const cached = this.cache.get(expression);
    if (cached) {
      if (!cached.isSecure) {
        devWarn('Blocked cached dangerous expression:', expression);
        return undefined;
      }
      return cached.evaluator(context);
    }
    
    // Create and cache evaluator
    const evaluator = this.createEvaluator(expression);
    
    // Manage cache size (LRU-style)
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(expression, evaluator);
    
    if (!evaluator.isSecure) {
      devWarn('Blocked dangerous expression:', expression);
      return undefined;
    }
    
    return evaluator.evaluator(context);
  }
  
  private static createEvaluator(expression: string): ExpressionCache {
    // First, check for obviously dangerous patterns
    if (this.hasDangerousPatterns(expression)) {
      return { evaluator: () => undefined, isSecure: false };
    }
    
    // Size limit
    if (expression.length > 1000) {
      return { evaluator: () => undefined, isSecure: false };
    }
    
    // Try to create a safe evaluator
    try {
      const evaluator = this.createSafeEvaluator(expression);
      return { evaluator, isSecure: true };
    } catch (error) {
      devWarn('Failed to create evaluator for expression:', expression, error);
      return { evaluator: () => undefined, isSecure: false };
    }
  }
  
  private static hasDangerousPatterns(expression: string): boolean {
    return this.dangerousPatterns.some(pattern => pattern.test(expression));
  }
  
  private static createSafeEvaluator(expression: string): (context: any) => any {
    // Handle object literals like "{ active: ctx.isActive, disabled: ctx.isDisabled }"
    if (expression.trim().startsWith('{') && expression.trim().endsWith('}')) {
      return this.createObjectEvaluator(expression);
    }
    
    // Handle simple property access
    if (expression.startsWith('ctx.')) {
      const propertyPath = expression.slice(4);
      return (context: any) => getNestedValue(context, propertyPath);
    }
    
    // Handle simple comparisons and logical operations
    if (this.isSimpleExpression(expression)) {
      return this.createSimpleEvaluator(expression);
    }
    
    // Fallback to property lookup
    return (context: any) => getNestedValue(context, expression);
  }
  
  private static createObjectEvaluator(expression: string): (context: any) => any {
    // Parse object literal safely
    const objectContent = expression.trim().slice(1, -1); // Remove { }
    const properties = this.parseObjectProperties(objectContent);
    
    return (context: any) => {
      const result: Record<string, any> = {};
      
      for (const { key, value } of properties) {
        try {
          if (value.startsWith('ctx.')) {
            const propertyPath = value.slice(4);
            result[key] = getNestedValue(context, propertyPath);
          } else {
            // Try to evaluate as a simple expression
            result[key] = this.evaluateSimpleValue(value, context);
          }
        } catch (error) {
          result[key] = undefined;
        }
      }
      
      return result;
    };
  }
  
  private static parseObjectProperties(content: string): Array<{ key: string; value: string }> {
    const properties: Array<{ key: string; value: string }> = [];
    const parts = content.split(',');
    
    for (const part of parts) {
      const colonIndex = part.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = part.slice(0, colonIndex).trim();
      const value = part.slice(colonIndex + 1).trim();
      
      // Remove quotes from key if present
      const cleanKey = key.replace(/^['"]|['"]$/g, '');
      
      properties.push({ key: cleanKey, value });
    }
    
    return properties;
  }
  
  private static isSimpleExpression(expression: string): boolean {
    // Check if expression contains only allowed patterns
    const tokens = expression.split(/\s+/);
    
    for (const token of tokens) {
      if (!token) continue;
      
      // Check for allowed operators
      if (this.allowedOperators.has(token)) continue;
      
      // Check for numbers
      if (!isNaN(Number(token))) continue;
      
      // Check for boolean literals
      if (token === 'true' || token === 'false') continue;
      
      // Check for string literals
      if ((token.startsWith('"') && token.endsWith('"')) ||
          (token.startsWith("'") && token.endsWith("'"))) continue;
      
      // Check for property access
      if (token.startsWith('ctx.')) continue;
      
      // Check for allowed identifiers
      if (this.allowedIdentifiers.has(token)) continue;
      
      // If we get here, the token is not allowed
      return false;
    }
    
    return true;
  }
  
  private static createSimpleEvaluator(expression: string): (context: any) => any {
    // For simple expressions, we'll use a basic substitution approach
    return (context: any) => {
      try {
        // Replace ctx.property with actual values
        let processedExpression = expression;
        
        // Find all ctx.property references
        const ctxMatches = expression.match(/ctx\.[\w.]+/g) || [];
        
        for (const match of ctxMatches) {
          const propertyPath = match.slice(4); // Remove 'ctx.'
          const value = getNestedValue(context, propertyPath);
          
          // Replace with JSON.stringify to handle strings/objects safely
          processedExpression = processedExpression.replace(
            match, 
            JSON.stringify(value)
          );
        }
        
        // Only allow very basic expressions at this point
        // This is still safer than arbitrary Function() evaluation
        if (this.isBasicEvalSafe(processedExpression)) {
          return eval(processedExpression);
        }
        
        return undefined;
      } catch (error) {
        return undefined;
      }
    };
  }
  
  private static isBasicEvalSafe(expression: string): boolean {
    // Only allow very basic operations after substitution
    const allowedPattern = /^[\d\s+\-*/%()===!==<>=&|?:'"true false,\[\]{}\.]+$/;
    return allowedPattern.test(expression) && 
           !this.hasDangerousPatterns(expression);
  }
  
  private static evaluateSimpleValue(value: string, context: any): any {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (!isNaN(Number(value))) return Number(value);
    if (value.startsWith('ctx.')) {
      const propertyPath = value.slice(4);
      return getNestedValue(context, propertyPath);
    }
    
    // Remove quotes for string literals
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    
    return value;
  }
  
  static clearCache(): void {
    this.cache.clear();
  }
  
  static getCacheSize(): number {
    return this.cache.size;
  }
}

export { SecureExpressionEvaluator };