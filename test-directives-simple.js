import { vBind, vShow, vClass, vStyle } from './dist/custom-elements-runtime.es.js';

console.log('Testing directives functionality...\n');

// Test vBind
console.log('=== vBind Tests ===');
const bindResult1 = vBind({ disabled: true, placeholder: 'Enter text', 'data-test': 'example' });
console.log('vBind with mixed attributes:', bindResult1);

const bindResult2 = vBind({ checked: false, hidden: true });
console.log('vBind with boolean attributes:', bindResult2);

// Test vShow
console.log('\n=== vShow Tests ===');
const showResult1 = vShow(true);
console.log('vShow(true):', showResult1);

const showResult2 = vShow(false);
console.log('vShow(false):', showResult2);

// Test vClass
console.log('\n=== vClass Tests ===');
const classResult1 = vClass('btn btn-primary');
console.log('vClass with string:', classResult1);

const classResult2 = vClass(['btn', 'btn-primary', 'active']);
console.log('vClass with array:', classResult2);

const classResult3 = vClass({ 'btn': true, 'btn-primary': true, 'disabled': false });
console.log('vClass with object:', classResult3);

const classResult4 = vClass(['btn', { 'active': true, 'disabled': false }]);
console.log('vClass with mixed array/object:', classResult4);

// Test vStyle
console.log('\n=== vStyle Tests ===');
const styleResult1 = vStyle('color: red; font-size: 16px;');
console.log('vStyle with string:', styleResult1);

const styleResult2 = vStyle({ color: 'blue', fontSize: 18, width: 200 });
console.log('vStyle with object:', styleResult2);

const styleResult3 = vStyle({ backgroundColor: 'lightgreen', marginTop: 10, display: 'block' });
console.log('vStyle with camelCase properties:', styleResult3);

const styleResult4 = vStyle({ width: null, height: undefined, color: '' });
console.log('vStyle with null/undefined values:', styleResult4);

console.log('\n=== All tests completed ===');
