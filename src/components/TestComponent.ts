import { quickComponent } from '../lib/runtime.js';

// Simple test component to debug event binding
const TestComponent = quickComponent(
  { count: 0 },
  `
    <div>
      <p>Count: {{count}}</p>
      <button @click="count++">Test Click</button>
    </div>
  `
);

// Export component for direct use
(window as any).TestComponent = TestComponent;

console.log('TestComponent created and exported to window');

// Add extra debugging when component is instantiated
const originalConnectedCallback = (TestComponent.prototype as any).connectedCallback;
(TestComponent.prototype as any).connectedCallback = function() {
  console.log('🚀 TestComponent connected to DOM');
  const result = originalConnectedCallback?.call(this);
  
  // Log the actual rendered HTML
  setTimeout(() => {
    console.log('📄 Rendered HTML:', (this as any).shadowRoot?.innerHTML);
    console.log('🔍 Button element:', (this as any).shadowRoot?.querySelector('button'));
    console.log('🏷️ Button attributes:', (this as any).shadowRoot?.querySelector('button')?.attributes);
  }, 100);
  
  return result;
};
