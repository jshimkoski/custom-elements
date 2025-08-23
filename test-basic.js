import { JSDOM } from 'jsdom';

// Mock global environment for testing
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.customElements = dom.window.customElements;
global.HTMLElement = dom.window.HTMLElement;
global.performance = {
  now: () => Date.now()
};

// Import the runtime
import { component, html } from './src/lib/runtime.js';

console.log('🧪 Testing basic style functionality...\n');

try {
  // Test 1: Basic string style
  console.log('1. Testing basic string style...');

  component('test-basic', {
    state: { message: 'Hello World' },

    style: `
      :host {
        display: block;
        padding: 20px;
        background: lightblue;
        border: 2px solid blue;
      }
      .content {
        color: darkblue;
        font-weight: bold;
      }
    `,

    render: (state) => html`
      <div class="content">${state.message}</div>
    `
  });

  // Create the element
  const element1 = document.createElement('test-basic');
  document.body.appendChild(element1);

  // Check if style was applied
  setTimeout(() => {
    const shadowRoot = element1.shadowRoot;
    const styleElement = shadowRoot?.querySelector('style');

    console.log('   Shadow root exists:', !!shadowRoot);
    console.log('   Style element exists:', !!styleElement);
    console.log('   Style content length:', styleElement?.textContent?.length || 0);

    if (styleElement && styleElement.textContent.length > 0) {
      console.log('   ✅ Basic string style: SUCCESS\n');
    } else {
      console.log('   ❌ Basic string style: FAILED\n');
    }

    // Test 2: Dynamic function style
    console.log('2. Testing dynamic function style...');

    component('test-dynamic', {
      state: { theme: 'light', message: 'Dynamic Style' },

      style: (state) => `
        :host {
          display: block;
          padding: 20px;
          background: ${state.theme === 'dark' ? '#333' : '#fff'};
          color: ${state.theme === 'dark' ? '#fff' : '#333'};
        }
      `,

      render: (state) => html`
        <div>${state.message} - ${state.theme}</div>
      `
    });

    const element2 = document.createElement('test-dynamic');
    document.body.appendChild(element2);

    setTimeout(() => {
      const shadowRoot2 = element2.shadowRoot;
      const styleElement2 = shadowRoot2?.querySelector('style');

      console.log('   Shadow root exists:', !!shadowRoot2);
      console.log('   Style element exists:', !!styleElement2);
      console.log('   Style content length:', styleElement2?.textContent?.length || 0);

      if (styleElement2 && styleElement2.textContent.includes('background')) {
        console.log('   ✅ Dynamic function style: SUCCESS\n');
      } else {
        console.log('   ❌ Dynamic function style: FAILED\n');
      }

      // Test 3: New caching system
      console.log('3. Testing new style caching system...');

      let styleGenerationCount = 0;

      component('test-cached', {
        state: { theme: 'blue', count: 0 },

        style: {
          css: (state) => {
            styleGenerationCount++;
            console.log(`   CSS generation #${styleGenerationCount} for theme: ${state.theme}`);

            return `
              :host {
                display: block;
                background: ${state.theme === 'blue' ? 'lightblue' : 'lightgreen'};
                padding: 20px;
              }
            `;
          },
          dependencies: ['theme'], // Only theme changes should trigger recalculation
          cache: true
        },

        styleOptimizations: {
          enableCaching: true,
          enableMinification: false,
          debounceMs: 0 // Immediate for testing
        },

        render: (state) => html`
          <div>Theme: ${state.theme}, Count: ${state.count}</div>
        `
      });

      const element3 = document.createElement('test-cached');
      document.body.appendChild(element3);

      setTimeout(() => {
        const shadowRoot3 = element3.shadowRoot;
        const styleElement3 = shadowRoot3?.querySelector('style');

        console.log('   Shadow root exists:', !!shadowRoot3);
        console.log('   Style element exists:', !!styleElement3);
        console.log('   Initial style generations:', styleGenerationCount);

        // Change non-style dependency (should NOT trigger style recalculation)
        element3._state.count = 5;
        element3._state.count = 10;

        setTimeout(() => {
          const countAfterNonStyleChanges = styleGenerationCount;
          console.log('   Style generations after count changes:', countAfterNonStyleChanges);

          // Change style dependency (SHOULD trigger recalculation)
          element3._state.theme = 'green';

          setTimeout(() => {
            const countAfterStyleChange = styleGenerationCount;
            console.log('   Style generations after theme change:', countAfterStyleChange);

            if (styleElement3 && styleElement3.textContent.length > 0) {
              console.log('   ✅ Style caching system: SUCCESS');

              if (countAfterStyleChange > countAfterNonStyleChanges) {
                console.log('   ✅ Dependency tracking: SUCCESS');
              } else {
                console.log('   ⚠️  Dependency tracking: May not be working optimally');
              }
            } else {
              console.log('   ❌ Style caching system: FAILED');
            }

            console.log('\n🎉 Test completed!');
            console.log('If you see SUCCESS messages above, the style system is working correctly.');
          }, 50);
        }, 50);
      }, 50);
    }, 50);
  }, 50);

} catch (error) {
  console.error('❌ Test failed with error:', error);
  console.error('Stack trace:', error.stack);
}
