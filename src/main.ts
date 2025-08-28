import './style.css';
import { component, html, when, each, match, eventBus } from "./lib";

// Import example components so they register themselves
import './components/examples/MinimalExample';
import './components/examples/ShoppingCart';
import './components/examples/TodoApp';
import './components/examples/FormInputValidation';

// The new runtime is completely self-contained
// Components automatically register themselves when imported

component("stateless-component", () => html`
  <div>
    <p>This is a stateless component!</p>
  </div>
`, {
  style: `
    div {
      background: lightblue;
      padding: 10px;
    }
  `
});

component('async-greeting', {
  state: { name: 'World' },

  reload: async (e: Event, state) => {
    state.name = 'Dude';
  },

  render: async (state) => {
    // Simulate API call or dynamic import
    await new Promise(resolve => setTimeout(resolve, 1000));

    return html`
      <div class="greeting">
        <h1>Hello, ${state.name}!</h1>
        <p>This content loaded asynchronously after 1 seconds.</p>
        <small>Loaded at: ${new Date().toLocaleTimeString()}</small>
        <button @click="${state.reload}">Reload</button>
      </div>
    `;
  },

  loadingTemplate: (state) => html`
    <div class="loading">
      <p>Loading greeting for ${state.name}...</p>
      <div class="spinner">⏳</div>
    </div>
  `,

  errorTemplate: (error, state) => html`
    <div class="error">
      <h3>Failed to load greeting</h3>
      <p>Error: ${error.message}</p>
      <button @click="${() => location.reload()}">Retry</button>
    </div>
  `,

  style: `
    .greeting {
      padding: 20px;
      border: 2px solid #4CAF50;
      border-radius: 8px;
    }
    .loading {
      text-align: center;
      padding: 20px;
    }
    .spinner {
      font-size: 24px;
      animation: spin 1s linear infinite;
    }
    .error {
      padding: 20px;
      border: 2px solid #f44336;
      border-radius: 8px;
      background: #ffebee;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `
});

component("child-component", {
  props: { test: { type: String } },
  state: { message: "Hello from Child Component" },
  render(state) {
    return html`
      <div>
        <p>From parent: ${state.test}</p>
        <slot></slot>
        <p>Slot is right above me</p>
        <p>${state.message}</p>
        <button @click="${state.handleSomething}">Click Me (handleSomething)</button>
        <button @click="${() => (state.message = "cool")}">
          Change Message
        </button>
      </div>
    `;
  },
  watch: {
    message(newValue, oldValue, _state) {
      console.log(`Watcher called: message changed from ${oldValue} to ${newValue}`);
      eventBus.emit("messageChanged", { newValue, oldValue });
    },
  },
  handleSomething(event: Event, state: any) {
    console.log("component did something", event, state);
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
  onConnected(state) {
    console.log("Component connected:", state);
    eventBus.on("messageChanged", (detail) => {
      console.log("Message changed event received in my-greeting", detail);
    });
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
        <async-greeting></async-greeting>
        <child-component test="${state.name}">
          <stateless-component></stateless-component>
        </child-component>
        <h2>Hello, <span>${state.name}</span></h2>
        <h3>You have a funny name: ${state.funnyName}</h3>
        ${when(state.name === "World", html`<span>Welcome to the world!</span>`)}

        <div class="form-group">
          <label>Name:</label>
          <input type="text" #model="name" #show="${state.isActive}" />

          <div class="form-group">
            <label>Name (#model):</label>
            <input
              type="text"
              #model="name"
              #class="${ ['form-control', { 'active': state.isActive }] }"
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
          ${each(
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
        ${each(state.array, (item) => html`<span>${item}</span>`)}
        ${match()
          .when(state.name === "World", html`<span>Welcome to the world!</span>`)
          .when(state.name === "Custom Element", html`<span>Welcome to the custom element!</span>`)
          .otherwise(html`<span>In otherwise statement</span>`)
          .done()}
      </div>
    `;
  },
  onError(error, state) {
    console.error("Component error:", error, state);
  },
  handleSomething(event: Event, state: any) {
    state.name = "Updated Name";
    state.array.push("New Item");
    console.log("component did something, event, state", event, state);
  },
});

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <minimal-example></minimal-example>
    <shopping-cart></shopping-cart>
    <todo-app></todo-app>
    <form-input-validation></form-input-validation>
    <my-greeting></my-greeting>
  </div>
`;
