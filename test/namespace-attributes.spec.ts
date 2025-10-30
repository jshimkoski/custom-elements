import { describe, it, expect } from 'vitest';
import {
  setAttributeSmart,
  removeAttributeSmart,
  __TEST_ONLY_ATTR_NS_MAP,
} from '../src/lib/runtime/namespace-helpers';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = __TEST_ONLY_ATTR_NS_MAP.xlink;
const XML_NS = __TEST_ONLY_ATTR_NS_MAP.xml;

describe('namespace-helpers', () => {
  it('sets and removes xlink:href on SVG elements using the xlink namespace', () => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    const use = document.createElementNS(SVG_NS, 'use');
    svg.appendChild(use);

    setAttributeSmart(use, 'xlink:href', '#foo');

    // attribute should be present in the xlink namespace
    const nsVal = use.getAttributeNS(XLINK_NS, 'href');
    expect(nsVal).toBe('#foo');

    // remove it
    removeAttributeSmart(use, 'xlink:href');
    expect(use.getAttributeNS(XLINK_NS, 'href')).toBe(null);
  });

  it('sets and removes xml:lang using the xml namespace on any element', () => {
    const div = document.createElement('div');

    setAttributeSmart(div, 'xml:lang', 'en');
    expect(div.getAttributeNS(XML_NS, 'lang')).toBe('en');

    removeAttributeSmart(div, 'xml:lang');
    expect(div.getAttributeNS(XML_NS, 'lang')).toBe(null);
  });

  it('falls back to un-namespaced attributes for unknown prefixes', () => {
    const el = document.createElement('div');
    setAttributeSmart(el, 'foo:bar', 'baz');
    // should be set as a literal attribute
    expect(el.getAttribute('foo:bar')).toBe('baz');
    removeAttributeSmart(el, 'foo:bar');
    expect(el.getAttribute('foo:bar')).toBe(null);
  });
});
