import { html } from './src/lib/template-compiler-v2.js';
import { vFor } from './src/lib/directives-v2.js';

// Test that html() can return fragments
console.log('=== Testing Fragment Support ===');

// Test 1: Simple fragment with mixed content
const fragment1 = html`
  Hello ${' World'}!
  <span>This is a span</span>
  More text here
`;

console.log('Fragment 1 (mixed content):', fragment1);
console.log('Is array?', Array.isArray(fragment1));

// Test 2: Fragment from vFor
const items = ['apple', 'banana', 'cherry'];

const vForResult = vFor(items, (item) => html`
  ${item}:
  <input type="checkbox" value="${item}" />
  <br>
`);

console.log('\nvFor Result:', vForResult);
console.log('First item children:', vForResult[0]);
console.log('First item children array:', vForResult[0].children);

// Test 3: More complex fragment
const complexFragment = vFor(items, (item, index) => html`
  <span class="label">${index + 1}.</span>
  <strong>${item}</strong>
  <span class="sep"> | </span>
`);

console.log('\nComplex Fragment:', complexFragment);

// Test 4: Single element (should not be array)
const singleElement = html`<div>Single element</div>`;
console.log('\nSingle Element:', singleElement);
console.log('Is array?', Array.isArray(singleElement));

// Test 5: Test anchor block structure
console.log('\n=== Anchor Block Analysis ===');
vForResult.forEach((anchor, i) => {
  console.log(`Anchor ${i}:`, {
    tag: anchor.tag,
    key: anchor.key,
    childrenCount: Array.isArray(anchor.children) ? anchor.children.length : 'not array',
    children: anchor.children
  });
});

console.log('\n=== Test Complete ===');
