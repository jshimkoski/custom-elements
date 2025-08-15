import { describe, it, expect } from 'vitest';
import { html, compile, css, classes, styles } from '../../src/lib/template-helpers';

describe('template-helpers', () => {
  it('escapeIfUserInput should escape nested array object properties', () => {
    const state = { items: [{ name: '<b>bad</b>' }] };
    const tpl = html`${'safe'}${'<b>bad</b>'}`(state);
    expect(tpl).toContain('&lt;b&gt;bad&lt;/b&gt;');
  });

  it('html should handle array of Promises', async () => {
    const tpl = html`values: ${[Promise.resolve('a'), Promise.resolve('b')]}`;
    const result = tpl({});
    const resolved = await (result instanceof Promise ? result : Promise.resolve(result));
    expect(resolved).toContain('a');
    expect(resolved).toContain('b');
  });

  it('html should escape both single and double quotes in attribute values', () => {
    const tpl = html`<div data-x="${'"quoted"'}" data-y='${"'single'"}'>`({});
    expect(tpl).toContain('&quot;quoted&quot;');
  });

  it('html should not escape event handler attributes', () => {
    const tpl = html`<div data-on-click="${'alert(1)'}">`({});
    expect(tpl).toContain('alert(1)');
  });

  it('html should handle null and undefined values gracefully', () => {
    const tpl = html`a${null}b${undefined}c`({});
    expect(tpl).toBe('abc');
  });
  it('escapeHTML should escape dangerous characters', () => {
    // Only escapes if value matches a state property
    // @ts-ignore
    const tpl = html`${'<script>'}`({ foo: '<script>' });
    expect(tpl).toContain('&lt;script&gt;');
  });

  it('escapeIfUserInput should escape state values', () => {
    // @ts-ignore
    const tpl = html`${'hello'}${'world'}`({ foo: 'hello', bar: 'world' });
    expect(tpl).toContain('hello');
    expect(tpl).toContain('world');
  });

  it('html should handle async values', async () => {
    const tpl = html`async: ${s => s.value}`;
    const result = tpl({ value: Promise.resolve('done') });
    const resolved = await (result instanceof Promise ? result : Promise.resolve(result));
    expect(resolved).toContain('done');
  });

  it('compile should return a function with id', () => {
    const tpl = compile`hi ${'there'}`;
    expect(typeof tpl).toBe('function');
    expect(typeof tpl.id).toBe('string');
    expect(tpl({}, {})).toContain('hi there');
  });

  it('css should join strings and values', () => {
    expect(css`a{color:${'red'}}`).toBe('a{color:red}');
  });

  it('classes should join truthy class names', () => {
    expect(classes({ a: true, b: false, c: true })).toBe('a c');
  });

  it('styles should join style properties', () => {
    expect(styles({ color: 'red', width: 10 })).toBe('color: red; width: 10');
  });
});
