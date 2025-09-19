# 🔒 Secure Expression Evaluator

This document summarizes the supported grammar, security model, and limitations of the project's `SecureExpressionEvaluator` used inside templates and runtime expression bindings.

## Supported grammar
- Numeric literals (integers)
- String literals with single or double quotes
- Booleans: `true`, `false` and `null`
- Arrays: `[a, b, 1, "x"]`
- Unary operators: `!` and unary `-`
- Arithmetic: `+ - * / %`
- Comparisons: `> < >= <= == != === !==`
- Logical operators: `&&` and `||`
- Ternary: `cond ? thenExpr : elseExpr`
- Parentheses for grouping

The evaluator supports references to values in the provided context either as `ctx.some.path` or plain identifiers/nested paths such as `user.name` or `a`. When an identifier cannot be resolved to a value in the context, evaluation returns `undefined`.

## Security model
- No use of `eval` or `Function` constructors.
- Expressions are tokenized and evaluated by a small, restricted parser implementing a safe grammar.
- A set of known dangerous patterns (e.g. `constructor`, `prototype`, `__proto__`, `process`, `window`, `document`, `eval`, `Function`) are pre-blocked. If a pattern is detected the expression is rejected and returns `undefined`.
- The evaluator caches parsed evaluators (LRU bounded) for performance; dangerous expressions are cached as blocked entries.

## Limitations & gotchas
- The evaluator is intentionally conservative. Complex JavaScript features such as function calls, property accessors with side effects, class syntax, and assignment expressions are not supported.
- Very large expressions (length > 1000) are rejected.
- String literals are preserved during substitution so that identifiers inside strings are not interpreted as variable references.
- When using plain identifiers (e.g. `a`), they are resolved against the top-level context object. If missing, evaluation returns `undefined` rather than attempting partial evaluation.
- This evaluator is intended for small template expressions. For complex logic prefer moving code into component methods or computed properties and reference those from templates.

## Examples
- Working: `ctx.count > 0 ? "yes" : "no"` with `{ count: 1 }` -> `"yes"`
- Working: `user.age >= 18 ? "ok" : "no"` with `{ user: { age: 21 } }` -> `"ok"`
- Blocked: `this.constructor.constructor("return process")()` -> `undefined`

## Testing
Unit tests live under `test/secure-expression-evaluator*.spec.ts` and exercise typical edge cases (unknown identifiers, arrays, ternary expressions, string safety, and blocking dangerous patterns).
