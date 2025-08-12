import './style.css';
import './components/examples/MinimalExample';
import './components/examples/TodoApp';
import './components/examples/TodoAppCompiled';
import './components/examples/ShoppingCart';
import './components/examples/TemplateCompilationDemo';
import './components/examples/SimpleTest';
import './components/examples/DataModelDemo';
// import './components/examples/Examples';
// import './components/examples/NotificationSystem';

// The new runtime is completely self-contained
// Components automatically register themselves when imported

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <h1>🚀 Modern TypeScript Runtime</h1>
    <p style="font-size: 1.1em; color: #666; margin-bottom: 2rem;">
      ✨ Performant • Type-Safe • Developer-Friendly ✨
    </p>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 2rem; margin: 2rem 0;">
      <minimal-example></minimal-example>
      <todo-app></todo-app>
      <todo-app-compiled></todo-app-compiled>
      <perf-counter></perf-counter>
      <data-model-demo></data-model-demo>
    </div>
    
    <h2 style="margin-top: 3rem; margin-bottom: 1rem; color: #4f46e5;">Template Compilation Comparison</h2>
    <p style="color: #666; margin-bottom: 2rem;">
      Compare the performance between compiled and traditional templates. Both components have identical functionality.
    </p>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 2rem; margin: 2rem 0;">
      <compiled-template-example></compiled-template-example>
      <traditional-template-example></traditional-template-example>
    </div>
    
    <simple-test-component></simple-test-component>
    
    <div style="margin: 2rem 0;">
      <reactive-form></reactive-form>
    </div>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 2rem; margin: 2rem 0;">
      <smart-form></smart-form>
      <dynamic-styling></dynamic-styling>
    </div>
    
    <div style="margin: 2rem 0;">
      <shopping-cart-demo></shopping-cart-demo>
    </div>
    
    <div style="margin: 2rem 0;">
      <test-live-typing></test-live-typing>
    </div>
    
    <div style="margin: 2rem 0;">
      <notification-system-demo></notification-system-demo>
    </div>
    
    <div style="text-align: center; margin: 3rem 0;">
      <p style="font-size: 1.1em; margin-bottom: 1rem;">
        <strong>✅ Runtime Features Demonstrated:</strong>
      </p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; max-width: 800px; margin: 0 auto;">
        <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
          📊 <strong>Reactive State</strong><br>
          <small>Proxy-based reactivity</small>
        </div>
        <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
          🧮 <strong>Computed Props</strong><br>
          <small>Cached calculations</small>
        </div>
        <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
          🎨 <strong>Dynamic Styling</strong><br>
          <small>CSS-in-JS with variables</small>
        </div>
        <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
          🔗 <strong>Event Handling</strong><br>
          <small>Single-attach refs</small>
        </div>
        <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
          📝 <strong>Form Validation</strong><br>
          <small>Real-time feedback</small>
        </div>
        <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
          ⚡ <strong>Performance</strong><br>
          <small>Smart DOM morphing</small>
        </div>
      </div>
      
      <p style="margin-top: 2rem;">
        <a href="./showcase.html" style="display: inline-block; padding: 0.75rem 1.5rem; background: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
          View Complete Showcase →
        </a>
      </p>
    </div>
  </div>
`;

// Listen for custom events from components
document.addEventListener('form-submit', (e: any) => {
  console.log('📝 Form submitted:', e.detail);
  alert(`✅ Form submitted successfully!\n\nName: ${e.detail.name}\nEmail: ${e.detail.email}\nAge: ${e.detail.age}\nNewsletter: ${e.detail.newsletter ? 'Yes' : 'No'}`);
});

document.addEventListener('todo-added', (e: any) => {
  console.log('✅ Todo added:', e.detail);
});

document.addEventListener('todo-toggled', (e: any) => {
  console.log('🔄 Todo toggled:', e.detail);
});
