/**
 * Secure expression evaluator to replace unsafe Function() constructor
 * Provides AST-based validation and caching for performance
 */

import { devWarn } from './logger';
import { getNestedValue } from './helpers';

interface ExpressionCache {
  evaluator: (context: Record<string, unknown>) => unknown;
  isSecure: boolean;
}

type TokenType = 'NUMBER' | 'STRING' | 'IDENT' | 'PUNC' | 'OP';
type Token = { type: TokenType; value: string };

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
    /XMLHttpRequest/i,
  ];

  static evaluate(
    expression: string,
    context: Record<string, unknown>,
  ): unknown {
    // Check cache first
    const cached = this.cache.get(expression);
    if (cached) {
      if (!cached.isSecure) {
        devWarn('Blocked cached dangerous expression:', expression);
        return undefined;
      }
      // Move accessed entry to the end of the Map to implement LRU behavior
      // (Map preserves insertion order; deleting and re-setting moves it to the end).
      try {
        this.cache.delete(expression);
        this.cache.set(expression, cached);
      } catch {
        // ignore any cache mutations errors and continue
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
    return this.dangerousPatterns.some((pattern) => pattern.test(expression));
  }

  private static createSafeEvaluator(
    expression: string,
  ): (context: Record<string, unknown>) => unknown {
    // Handle object literals like "{ active: ctx.isActive, disabled: ctx.isDisabled }"
    const trimmedExpr = expression.trim();
    if (trimmedExpr.startsWith('{') && trimmedExpr.endsWith('}')) {
      return this.createObjectEvaluator(expression);
    }

    // Handle simple property access when the entire expression is a single ctx.path
    if (/^ctx\.[a-zA-Z0-9_.]+$/.test(expression.trim())) {
      const propertyPath = expression.trim().slice(4);
      return (context: Record<string, unknown>) =>
        getNestedValue(context, propertyPath);
    }

    // If expression references `ctx` or contains operators/array/ternary
    // route it to the internal parser/evaluator which performs proper
    // token validation and evaluation. This is safer than over-restrictive
    // pre-validation and fixes cases like ternary, boolean logic, and arrays.
    if (expression.includes('ctx') || /[+\-*/%<>=&|?:[\]]/.test(expression)) {
      return this.createSimpleEvaluator(expression);
    }

    // Fallback to property lookup for plain property paths that don't
    // include ctx or operators (e.g. "a.b").
    return (context: Record<string, unknown>) =>
      getNestedValue(context, expression);
  }

  private static createObjectEvaluator(
    expression: string,
  ): (context: Record<string, unknown>) => Record<string, unknown> {
    // Parse object literal safely
    const objectContent = expression.trim().slice(1, -1); // Remove { }
    const properties = this.parseObjectProperties(objectContent);

    return (context: Record<string, unknown>) => {
      const result: Record<string, unknown> = {};

      for (const { key, value } of properties) {
        try {
          if (value.startsWith('ctx.')) {
            const propertyPath = value.slice(4);
            result[key] = getNestedValue(context, propertyPath);
          } else {
            // Try to evaluate as a simple expression
            result[key] = this.evaluateSimpleValue(value, context);
          }
        } catch {
          result[key] = undefined;
        }
      }

      return result;
    };
  }

  private static parseObjectProperties(
    content: string,
  ): Array<{ key: string; value: string }> {
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

  private static createSimpleEvaluator(
    expression: string,
  ): (context: Record<string, unknown>) => unknown {
    // For simple expressions, we'll use a basic substitution approach
    return (context: Record<string, unknown>) => {
      try {
        // Work on a copy we can mutate
        let processedExpression = expression;

        // First, replace all string literals with placeholders to avoid accidental identifier matches inside strings
        const stringLiterals: string[] = [];
        processedExpression = processedExpression.replace(
          /("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')/g,
          (m) => {
            const idx = stringLiterals.push(m) - 1;
            // Use numeric-only markers so identifier regex won't match them (they don't start with a letter)
            return `<<#${idx}#>>`;
          },
        );

        // Replace ctx.property references with placeholders to avoid creating new string/number
        // literals that the identifier scanner could accidentally pick up. Use processedExpression
        // (with string literals already removed) so we don't match ctx occurrences inside strings.
        const ctxMatches = processedExpression.match(/ctx\.[\w.]+/g) || [];
        for (const match of ctxMatches) {
          const propertyPath = match.slice(4); // Remove 'ctx.'
          const value = getNestedValue(context, propertyPath);
          if (value === undefined) return undefined; // unknown ctx property => undefined result
          const placeholderIndex =
            stringLiterals.push(JSON.stringify(value)) - 1;
          processedExpression = processedExpression.replace(
            new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            `<<#${placeholderIndex}#>>`,
          );
        }

        // Replace dotted plain identifiers (e.g. user.age) before single-token identifiers.
        // The earlier ident regex uses word boundaries which split dotted identifiers, so
        // we must handle full dotted sequences first.
        const dottedRegex =
          /\b[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)+\b/g;
        const dottedMatches = processedExpression.match(dottedRegex) || [];
        for (const match of dottedMatches) {
          // Skip ctx.* since those were handled above
          if (match.startsWith('ctx.')) continue;
          const value = getNestedValue(context, match);
          if (value === undefined) return undefined;
          const placeholderIndex =
            stringLiterals.push(JSON.stringify(value)) - 1;
          processedExpression = processedExpression.replace(
            new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            `<<#${placeholderIndex}#>>`,
          );
        }

        // Also support plain identifiers (root-level variables like `a`) when present.
        // Find identifiers (excluding keywords true/false/null) and replace them with values from context.
        // Note: dotted identifiers were handled above, so this regex intentionally excludes dots.
        const identRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
        let m: RegExpExecArray | null;
        const seen: Set<string> = new Set();
        while ((m = identRegex.exec(processedExpression)) !== null) {
          const ident = m[1];
          if (['true', 'false', 'null', 'undefined'].includes(ident)) continue;
          // skip numeric-like (though regex shouldn't match numbers)
          if (/^[0-9]+$/.test(ident)) continue;
          // skip 'ctx' itself
          if (ident === 'ctx') continue;
          // Avoid re-processing same identifier
          if (seen.has(ident)) continue;
          seen.add(ident);

          // If identifier contains '.' try nested lookup
          const value = getNestedValue(context, ident);
          if (value === undefined) return undefined; // unknown identifier => undefined
          // Use a placeholder for the substituted value so we don't introduce new identifiers inside
          // quotes that could be matched by the ident regex.
          const repl = JSON.stringify(value);
          const placeholderIndex = stringLiterals.push(repl) - 1;
          if (ident.includes('.')) {
            // dotted identifiers contain '.' which is non-word; do a plain replace
            processedExpression = processedExpression.replace(
              new RegExp(ident.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
              `<<#${placeholderIndex}#>>`,
            );
          } else {
            processedExpression = processedExpression.replace(
              new RegExp(
                '\\b' + ident.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b',
                'g',
              ),
              `<<#${placeholderIndex}#>>`,
            );
          }
        }

        // Restore string literals
        processedExpression = processedExpression.replace(
          /<<#(\d+)#>>/g,
          (_: string, idx: string) => stringLiterals[Number(idx)],
        );

        // Try to evaluate using the internal parser/evaluator which performs strict token validation.
        try {
          return this.evaluateBasicExpression(processedExpression);
        } catch {
          return undefined;
        }
      } catch {
        return undefined;
      }
    };
  }

  /**
   * Evaluate a very small, safe expression grammar without using eval/Function.
   * Supports: numbers, string literals, true/false, null, arrays, unary !,
   * arithmetic (+ - * / %), comparisons, logical && and ||, parentheses, and ternary `a ? b : c`.
   */
  private static evaluateBasicExpression(expr: string): unknown {
    const tokens = this.tokenize(expr);
    let pos = 0;

    function peek(): Token | undefined {
      return tokens[pos];
    }
    function consume(expected?: string): Token {
      const t = tokens[pos++];
      if (expected && !t) {
        throw new Error(`Unexpected token EOF, expected ${expected}`);
      }
      if (expected && t) {
        // Allow matching by token type (e.g. 'OP', 'NUMBER') or by exact token value (e.g. '?', ':')
        if (t.type !== expected && t.value !== expected) {
          throw new Error(
            `Unexpected token ${t.type}/${t.value}, expected ${expected}`,
          );
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

    function parseExpression(): unknown {
      return parseTernary();
    }

    // Helper coercions to avoid 'any' casts:
    function toNumber(v: unknown): number {
      if (typeof v === 'number') return v;
      if (v === null || v === undefined) return NaN;
      // boolean coerces to number in JS (true->1,false->0)
      if (typeof v === 'boolean') return v ? 1 : 0;
      const n = Number(v as string);
      return Number.isNaN(n) ? NaN : n;
    }

    function addValues(a: unknown, b: unknown): unknown {
      if (typeof a === 'string' || typeof b === 'string')
        return String(a) + String(b);
      return toNumber(a) + toNumber(b);
    }

    function subValues(a: unknown, b: unknown): number {
      return toNumber(a) - toNumber(b);
    }

    function mulValues(a: unknown, b: unknown): number {
      return toNumber(a) * toNumber(b);
    }

    function divValues(a: unknown, b: unknown): number {
      return toNumber(a) / toNumber(b);
    }

    function modValues(a: unknown, b: unknown): number {
      return toNumber(a) % toNumber(b);
    }

    function compareValues(op: string, a: unknown, b: unknown): boolean {
      if (typeof a === 'number' && typeof b === 'number') {
        switch (op) {
          case '>':
            return a > b;
          case '<':
            return a < b;
          case '>=':
            return a >= b;
          case '<=':
            return a <= b;
          default:
            return false;
        }
      }
      const sa = String(a);
      const sb = String(b);
      switch (op) {
        case '>':
          return sa > sb;
        case '<':
          return sa < sb;
        case '>=':
          return sa >= sb;
        case '<=':
          return sa <= sb;
        default:
          return false;
      }
    }

    function parseTernary(): unknown {
      const cond = parseLogicalOr();
      const p = peek();
      if (p && p.value === '?') {
        consume('?');
        const thenExpr = parseExpression();
        consume(':');
        const elseExpr = parseExpression();
        return cond ? thenExpr : elseExpr;
      }
      return cond;
    }

    function parseLogicalOr(): unknown {
      let left = parseLogicalAnd();
      while (true) {
        const p = peek();
        if (!p || p.value !== '||') break;
        consume('OP');
        const right = parseLogicalAnd();
        left = left || right;
      }
      return left;
    }

    function parseLogicalAnd(): unknown {
      let left = parseEquality();
      while (true) {
        const p = peek();
        if (!p || p.value !== '&&') break;
        consume('OP');
        const right = parseEquality();
        left = left && right;
      }
      return left;
    }

    function parseEquality(): unknown {
      let left = parseComparison();
      while (true) {
        const p = peek();
        if (!p || !['==', '!=', '===', '!=='].includes(p.value)) break;
        const op = consume('OP').value;
        const right = parseComparison();
        switch (op) {
          case '==':
            left = left == right;
            break;
          case '!=':
            left = left != right;
            break;
          case '===':
            left = left === right;
            break;
          case '!==':
            left = left !== right;
            break;
        }
      }
      return left;
    }

    function parseComparison(): unknown {
      let left = parseAdditive();
      while (true) {
        const p = peek();
        if (!p || !['>', '<', '>=', '<='].includes(p.value)) break;
        const op = consume('OP').value;
        const right = parseAdditive();
        switch (op) {
          case '>':
            left = compareValues('>', left, right);
            break;
          case '<':
            left = compareValues('<', left, right);
            break;
          case '>=':
            left = compareValues('>=', left, right);
            break;
          case '<=':
            left = compareValues('<=', left, right);
            break;
        }
      }
      return left;
    }

    function parseAdditive(): unknown {
      let left = parseMultiplicative();
      while (true) {
        const p = peek();
        if (!p || (p.value !== '+' && p.value !== '-')) break;
        const op = consume('OP').value;
        const right = parseMultiplicative();
        left = op === '+' ? addValues(left, right) : subValues(left, right);
      }
      return left;
    }

    function parseMultiplicative(): unknown {
      let left = parseUnary();
      while (true) {
        const p = peek();
        if (!p || (p.value !== '*' && p.value !== '/' && p.value !== '%'))
          break;
        const op = consume('OP').value;
        const right = parseUnary();
        switch (op) {
          case '*':
            left = mulValues(left, right);
            break;
          case '/':
            left = divValues(left, right);
            break;
          case '%':
            left = modValues(left, right);
            break;
        }
      }
      return left;
    }

    function parseUnary(): unknown {
      const p1 = peek();
      if (p1 && p1.value === '!') {
        consume('OP');
        return !parseUnary();
      }
      if (p1 && p1.value === '-') {
        consume('OP');
        const v = parseUnary();
        return subValues(0, v);
      }
      return parsePrimary();
    }

    function parsePrimary(): unknown {
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
        const arr: unknown[] = [];
        while (true) {
          const p = peek();
          if (!p || p.value === ']') break;
          arr.push(parseExpression());
          const p2 = peek();
          if (p2 && p2.value === ',') consume('PUNC');
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

  private static tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    // support escaped characters inside string literals (e.g. "\"" or '\\'')
    const re =
      /\s*(=>|===|!==|==|!=|>=|<=|\|\||&&|[()?:,[\]]|\+|-|\*|\/|%|>|<|!|\d+\.?\d*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[a-zA-Z_][a-zA-Z0-9_]*|\S)\s*/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(input)) !== null) {
      const raw = m[1];
      if (!raw) continue;
      if (/^\d/.test(raw)) tokens.push({ type: 'NUMBER', value: raw });
      else if (/^"/.test(raw) || /^'/.test(raw))
        tokens.push({ type: 'STRING', value: raw });
      else if (/^[a-zA-Z_]/.test(raw))
        tokens.push({ type: 'IDENT', value: raw });
      else if (/^[()?:,[\]]$/.test(raw))
        tokens.push({ type: 'PUNC', value: raw });
      else tokens.push({ type: 'OP', value: raw });
    }
    return tokens;
  }

  private static evaluateSimpleValue(
    value: string,
    context: Record<string, unknown>,
  ): unknown {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (!isNaN(Number(value))) return Number(value);
    if (value.startsWith('ctx.')) {
      const propertyPath = value.slice(4);
      return getNestedValue(context, propertyPath);
    }

    // Remove quotes for string literals
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
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
