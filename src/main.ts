import './style.css';
import { component, html, vIf, vFor, vIfBuilder } from "./lib/runtime";
// import './docs-site/docs-app.ts';
// import './docs-site/docs-nav.ts';
// import './docs-site/docs-content.ts';
// import './components/examples/MinimalExample';
// import './components/examples/TodoApp';
// import './components/examples/TodoAppCompiled';
// import './components/examples/ShoppingCart';
// import './components/examples/TemplateCompilationDemo';
// import './components/examples/SimpleTest';
// import './components/examples/DataModelDemo';

// The new runtime is completely self-contained
// Components automatically register themselves when imported

component("child-component", {
  state: { message: "Hello from Child Component" },
  render(state) {
    return html`
      <div>
        <p>${state.message}</p>
        <button @click="${state.handleSomething}">Click Me</button>
        <button @click="${() => (state.message = "cool")}">
          Another button
        </button>
      </div>
    `;
  },
  handleSomething() {
    console.log("component did something");
  },
});

component("my-greeting", {
  state: {
    name: "World",
    array: ["A", "B", "C"],
    email: "test@me.com",
    age: 25,
    isActive: true,
    color: "red",
  },
  computed: {
    funnyName(state) {
      return `Funny ${state.name}`;
    },
  },
  watch: {
    name(newValue, oldValue) {
      console.log(
        `Watcher called: Name changed from ${oldValue} to ${newValue}`,
      );
    },
    email(newValue, oldValue) {
      console.log(
        `Watcher called: Email changed from ${oldValue} to ${newValue}`,
      );
    },
  },
  style: (state) => `
    div {
      color: ${state.color};
      padding: 20px;
    }
    .form-group {
      margin: 10px 0;
    }
    .form-control {
      border: 1px solid ${state.color};
    }
    label {
      display: inline-block;
      width: 100px;
    }
  `,
  render(state) {
    return html`
      <div>
        <h2>Hello, <span>${state.name}</span></h2>
        <h3>You have a funny name: ${state.funnyName}</h3>
        ${vIf(state.name === "World", html`<span>Welcome to the world!</span>`)}

        <div class="form-group">
          <label>Name:</label>
          <input type="text" #model="name" />

          <div class="form-group">
            <label>Name (vModel):</label>
            <input
              #if="${state.isActive}"
              type="text"
              #model="name"
              #class="${ ['form-control', { 'active': state.isActive }] }"
              #show="${true}"
              #style="${ { color: state.isActive ? 'green' : 'red' } }"
            />
            <button #bind="${ { disabled: state.isActive } }">Submit</button>
            <button :disabled="${state.isActive}">Submit</button>
          </div>
        </div>

        <div class="form-group">
          <label>Email:</label>
          <input type="email" #model="email" />
        </div>

        <div class="form-group">
          <label>Age:</label>
          <input type="number" #model="age" />
        </div>

        <div class="form-group">
          <label>Active:</label>
          <input type="checkbox" #model="isActive" />
        </div>

        <div class="form-group">
          <label>Color:</label>
          <select #model="color">
            <option value="red">Red</option>
            <option value="green">Green</option>
            <option value="blue">Blue</option>
          </select>
        </div>

        <div class="form-group">
          <label>Active group:</label>
          ${vFor(
            state.array,
            (item) => html`
              ${item}:
              <input
                type="checkbox"
                key="checkbox-${item}"
                value="${item}"
                #model="array"
                #class="['item', item === 'A' ? 'active' : '']"
              />
            `,
          )}
        </div>

        <div class="form-group">
          <p>State: ${JSON.stringify(state, null, 2)}</p>
        </div>

        <button
          @click="${() => {
            state.name = "Custom Element";
            state.array = ["D", "E", "F"];
          }}"
        >
          Change Name
        </button>
        <button @click="${state.handleSomething}">Click Me</button>
        ${vFor(state.array, (item) => html`<span>${item}</span>`)}
        ${vIfBuilder()
          .if(state.name === "World", html`<span>Welcome to the world!</span>`)
          .elseIf(state.name === "Custom Element", html`<span>Welcome to the custom element!</span>`)
          .done()}
      </div>
    `;
  },
  onConnected(state, api) {
    console.log("Component connected:", state, api);
  },
  onError(error, state, api) {
    console.error("Component error:", error, state, api);
  },
  handleSomething(state: any, e: Event) {
    state.name = "Updated Name";
    state.array.push("New Item");
    console.log("component did something", state, e);
  },
});

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <my-greeting></my-greeting>
    <docs-app></docs-app>
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
