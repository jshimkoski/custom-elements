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
    
    // Handle simple property access when the entire expression is a single ctx.path
    if (/^ctx\.[a-zA-Z0-9_\.]+$/.test(expression.trim())) {
      const propertyPath = expression.trim().slice(4);
      return (context: any) => getNestedValue(context, propertyPath);
    }
    
    // If expression references `ctx` or contains operators/array/ternary
    // route it to the internal parser/evaluator which performs proper
    // token validation and evaluation. This is safer than over-restrictive
    // pre-validation and fixes cases like ternary, boolean logic, and arrays.
    if (expression.includes('ctx') || /[+\-*/%<>=&|?:\[\]]/.test(expression)) {
      return this.createSimpleEvaluator(expression);
    }

    // Fallback to property lookup for plain property paths that don't
    // include ctx or operators (e.g. "a.b").
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
        
        // Try to evaluate using the internal parser/evaluator which performs strict token validation.
        try {
          return this.evaluateBasicExpression(processedExpression);
        } catch (err) {
          return undefined;
        }
      } catch (error) {
        return undefined;
      }
    };
  }

  /**
   * Evaluate a very small, safe expression grammar without using eval/Function.
   * Supports: numbers, string literals, true/false, null, arrays, unary !,
   * arithmetic (+ - * / %), comparisons, logical && and ||, parentheses, and ternary `a ? b : c`.
   */
  private static evaluateBasicExpression(expr: string): any {
    const tokens = this.tokenize(expr);
    let pos = 0;

    function peek(): any {
      return tokens[pos];
    }
    function consume(expected?: string): any {
      const t = tokens[pos++];
      if (expected && !t) {
        throw new Error(`Unexpected token EOF, expected ${expected}`);
      }
      if (expected && t) {
        // Allow matching by token type (e.g. 'OP', 'NUMBER') or by exact token value (e.g. '?', ':')
        if (t.type !== expected && t.value !== expected) {
          throw new Error(`Unexpected token ${t.type}/${t.value}, expected ${expected}`);
        }
      }
      return t;
    }

    // Grammar (precedence):
    // expression := ternary
    // ternary := logical_or ( '?' expression ':' expression )?
    // logical_or := logical_and ( '||' logical_and )*
    // logical_and := equality ( '&&' equality )*
    // equality := comparison ( ('==' | '!=' | '===' | '!==') comparison )*
    // comparison := additive ( ('>' | '<' | '>=' | '<=') additive )*
    // additive := multiplicative ( ('+'|'-') multiplicative )*
    // multiplicative := unary ( ('*'|'/'|'%') unary )*
    // unary := ('!' | '-') unary | primary
    // primary := number | string | true | false | null | array | '(' expression ')'

    function parseExpression(): any {
      return parseTernary();
    }

    function parseTernary(): any {
      let cond = parseLogicalOr();
      if (peek() && peek().value === '?') {
        consume('?');
        const thenExpr = parseExpression();
        consume(':');
        const elseExpr = parseExpression();
        return cond ? thenExpr : elseExpr;
      }
      return cond;
    }

    function parseLogicalOr(): any {
      let left = parseLogicalAnd();
      while (peek() && peek().value === '||') {
        consume('OP');
        const right = parseLogicalAnd();
        left = left || right;
      }
      return left;
    }

    function parseLogicalAnd(): any {
      let left = parseEquality();
      while (peek() && peek().value === '&&') {
        consume('OP');
        const right = parseEquality();
        left = left && right;
      }
      return left;
    }

    function parseEquality(): any {
      let left = parseComparison();
      while (peek() && ['==','!=','===','!=='].includes(peek().value)) {
        const op = consume('OP').value;
        const right = parseComparison();
        switch (op) {
          case '==': left = left == right; break;
          case '!=': left = left != right; break;
          case '===': left = left === right; break;
          case '!==': left = left !== right; break;
        }
      }
      return left;
    }

    function parseComparison(): any {
      let left = parseAdditive();
      while (peek() && ['>','<','>=','<='].includes(peek().value)) {
        const op = consume('OP').value;
        const right = parseAdditive();
        switch (op) {
          case '>': left = left > right; break;
          case '<': left = left < right; break;
          case '>=': left = left >= right; break;
          case '<=': left = left <= right; break;
        }
      }
      return left;
    }

    function parseAdditive(): any {
      let left = parseMultiplicative();
      while (peek() && (peek().value === '+' || peek().value === '-')) {
        const op = consume('OP').value;
        const right = parseMultiplicative();
        left = op === '+' ? left + right : left - right;
      }
      return left;
    }

    function parseMultiplicative(): any {
      let left = parseUnary();
      while (peek() && (peek().value === '*' || peek().value === '/' || peek().value === '%')) {
        const op = consume('OP').value;
        const right = parseUnary();
        switch (op) {
          case '*': left = left * right; break;
          case '/': left = left / right; break;
          case '%': left = left % right; break;
        }
      }
      return left;
    }

    function parseUnary(): any {
      if (peek() && peek().value === '!') {
        consume('OP');
        return !parseUnary();
      }
      if (peek() && peek().value === '-') {
        consume('OP');
        return -parseUnary();
      }
      return parsePrimary();
    }

    function parsePrimary(): any {
      const t = peek();
      if (!t) return undefined;
      if (t.type === 'NUMBER') {
        consume('NUMBER');
        return Number(t.value);
      }
      if (t.type === 'STRING') {
        consume('STRING');
        // strip quotes
        return t.value.slice(1, -1);
      }
      if (t.type === 'IDENT') {
        consume('IDENT');
        if (t.value === 'true') return true;
        if (t.value === 'false') return false;
        if (t.value === 'null') return null;
        // fallback: try parse as JSON-ish literal or undefined
        return undefined;
      }
      if (t.value === '[') {
        consume('PUNC');
        const arr: any[] = [];
        while (peek() && peek().value !== ']') {
          arr.push(parseExpression());
          if (peek() && peek().value === ',') consume('PUNC');
        }
        consume('PUNC'); // ]
        return arr;
      }
      if (t.value === '(') {
        consume('PUNC');
        const v = parseExpression();
        consume('PUNC'); // )
        return v;
      }
      // Unknown primary
      throw new Error('Unexpected token in expression');
    }

    const result = parseExpression();
    return result;
  }

  private static tokenize(input: string): Array<{ type: string; value: string }> {
    const tokens: Array<{ type: string; value: string }> = [];
    const re = /\s*(=>|===|!==|==|!=|>=|<=|\|\||&&|[()?:,\[\]]|\+|-|\*|\/|%|>|<|!|\d+\.?\d*|"[^"]*"|'[^']*'|[a-zA-Z_][a-zA-Z0-9_]*|\S)\s*/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(input)) !== null) {
      const raw = m[1];
      if (!raw) continue;
      if (/^\d/.test(raw)) tokens.push({ type: 'NUMBER', value: raw });
      else if (/^"/.test(raw) || /^'/.test(raw)) tokens.push({ type: 'STRING', value: raw });
      else if (/^[a-zA-Z_]/.test(raw)) tokens.push({ type: 'IDENT', value: raw });
      else if (/^[()?:,\[\]]$/.test(raw)) tokens.push({ type: 'PUNC', value: raw });
      else tokens.push({ type: 'OP', value: raw });
    }
    return tokens;
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