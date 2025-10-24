import { describe, it, expect } from 'vitest';
import { html } from '../src/lib/index';
import { match } from '../src/lib/directives';

describe('match lazy factory', () => {
  it('does not evaluate factory for non-taken branch', () => {
    let called = false;

    const result = match()
      .when(false, () => {
        called = true;
        return html`<div>bad</div>`;
      })
      .when(true, html`<div>good</div>`)
      .done();

    expect(called).toBe(false);
    // ensure the result contains the expected anchor for branch 1
    expect(result.length).toBe(1);
  });

  it('evaluates factory for taken branch', () => {
    let called = false;

    const result = match()
      .when(true, () => {
        called = true;
        return html`<div>ok</div>`;
      })
      .when(false, html`<div>skip</div>`)
      .done();

    expect(called).toBe(true);
    expect(result.length).toBe(1);
  });
});
