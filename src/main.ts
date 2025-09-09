import './style.css';
import { component, html, when, each, match, eventBus } from "./lib";

// Import example components so they register themselves
import './components/examples/DesignSystem';
import './components/examples/MinimalExample';
import './components/examples/ShoppingCart';
import './components/examples/TodoApp';
import './components/examples/FormInputValidation';

// Import design system components
import './components/design-system';

// The new runtime is completely self-contained
// Components automatically register themselves when imported

interface SwitchProps {
  label?: string;
  modelValue?: boolean;
}

// Simple test component to debug model binding
component('simple-switch', {
  props: {
    modelValue: { type: Boolean, default: false },
  },

  watch: {
    modelValue: [
      (newVal: any, oldVal: any, ctx: any) => {
        console.log('simple-switch modelValue changed from', oldVal, 'to', newVal);
      },
      { immediate: true },
    ],
  },

  render: (ctx: any) => html`
    <div>
      <p>ModelValue: ${ctx.modelValue}</p>
      <input
        type="checkbox"
        :checked="${ctx.modelValue}"
        @change="${(e: Event) => {
          const input = e.target as HTMLInputElement;
          const isChecked = input.checked;
          console.log('simple-switch emitting update:model-value with value:', isChecked);
          ctx.emit('update:model-value', isChecked);
        }}"
      />
      <label>Simple Switch</label>
    </div>
  `,
});

component<{}, {}, SwitchProps>('cer-switch', {
  props: {
    label: { type: String, default: '' },
    modelValue: { type: Boolean, default: false },
  },

  watch: {
    modelValue: [
      (newVal: any, oldVal: any, ctx: any) => {
        console.log('cer-switch modelValue changed from', oldVal, 'to', newVal);
        // Force re-render to ensure UI updates
        if (ctx._requestRender) {
          ctx._requestRender();
        }
      },
      { immediate: true },
    ],
  },

  render: (ctx: any) => html`
    <label
      class="inline-flex items-center gap-3 cursor-[pointer]"
      role="switch"
      :aria-checked="${ctx.modelValue}"
    >
      ${ctx.modelValue}
      <div class="relative">
        <input
          class="sr-only"
          type="checkbox"
          :checked="${ctx.modelValue}"
          @change="${(e: Event) => {
            const input = e.target as HTMLInputElement;
            const isChecked = input.checked;
            console.log('cer-switch emitting update:model-value with value:', isChecked);
            ctx.emit('update:model-value', isChecked);
          }}"
        />

        <div
          class="w-9 h-5 rounded-full shadow-inner transition"
          :class="${{ 'bg-primary-600': ctx.modelValue, 'bg-neutral-200': !ctx.modelValue }}"
        ></div>

        <div
          class="absolute left-0.5 transition top-0 w-4 h-4 mt-0.5 bg-white rounded-full shadow"
          :class="${[ ctx.modelValue ? 'transform-[translateX(1rem)]' : 'transform-[translateX(0)]' ]}"
        ></div>
      </div>

      ${ctx.label ? html`<span class="text-sm text-neutral-700">${ctx.label}</span>` : ''}
    </label>
  `,
});

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
    featureEnabled: false,
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
    featureEnabled(newValue, oldValue) {
      console.log(
        `Watcher called: featureEnabled changed from ${oldValue} to ${newValue}`,
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
        <section>
          <h2>Switch</h2>
          <simple-switch
            :model="featureEnabled"
          />
          <cer-switch
            label="Enable feature"
            :model="featureEnabled"
          />
        </section>
        <async-greeting></async-greeting>
        <child-component test="${state.name}">
          <stateless-component></stateless-component>
        </child-component>
        <h2>Hello, <span>${state.name}</span></h2>
        <h3>You have a funny name: ${state.funnyName}</h3>
        ${when(state.name === "World", html`<span>Welcome to the world!</span>`)}

        <div class="form-group">
          <label>Name:</label>
          <input type="text" :model="name" :show="${state.isActive}" />

          <div class="form-group">
            <label>Name (:model):</label>
            <input
              type="text"
              :model="name"
              :class="${ ['form-control', { 'active': state.isActive }] }"
              :style="${ { color: state.isActive ? 'green' : 'red' } }"
            />
            <button :bind="${ { disabled: state.isActive } }">Submit</button>
            <button :disabled="${state.isActive}">Submit</button>
          </div>
        </div>

        <div class="form-group">
          <label>Email:</label>
          <input type="email" :model="email" />
        </div>

        <div class="form-group">
          <label>Age:</label>
          <input type="number" :model="age" />
        </div>

        <div class="form-group">
          <label>Active:</label>
          <input type="checkbox" :model="isActive" />
        </div>

        <div class="form-group">
          <label>Color:</label>
          <select :model="color">
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
                :model="array"
                :class="['item', item === 'A' ? 'active' : '']"
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

// Create a component to test model binding
component('switch-test', {
  state: {
    featureEnabled: false,
  },

  render: (ctx: any) => html`
    <div style="padding: 20px; border: 1px solid #ccc; margin: 20px;">
      <h3>Model Binding Test</h3>
      <p>Current value: ${ctx.featureEnabled}</p>
      
      <div style="margin: 10px 0;">
        <label>Simple Switch:</label>
        <simple-switch :model="featureEnabled"></simple-switch>
      </div>
      
      <div style="margin: 10px 0;">
        <label>Custom Switch:</label>
        <cer-switch :model="featureEnabled" label="Enable Feature"></cer-switch>
      </div>
      
      <button @click="${() => { ctx.featureEnabled = !ctx.featureEnabled; }}">
        Toggle Programmatically
      </button>
    </div>
  `,
});

// Create comprehensive design system test component
component('design-system-test', {
  state: {
    // Text inputs
    textInput: 'Hello World',
    textareaContent: 'This is a multi-line\ntext area example',
    
    // Boolean inputs
    checkboxValue: true,
    radioValue: 'option2',
    
    // Selection inputs
    selectValue: 'blue',
    
    // Numeric inputs
    numberValue: 42,
    rangeValue: 75,
    progressValue: 60,
    
    // Validation
    lastAction: 'None',
  },

  render: (ctx: any) => html`
    <div style="padding: 20px; border: 2px solid #007acc; margin: 20px; border-radius: 8px;">
      <h2>🧪 Design System Comprehensive Test</h2>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
        
        <!-- Text Inputs Section -->
        <div style="border: 1px solid #ddd; padding: 15px; border-radius: 4px;">
          <h3>📝 Text Inputs</h3>
          
          <div style="margin: 10px 0;">
            <label>Text Input (model):</label>
            <ds-input :model="textInput" placeholder="Type something..."></ds-input>
            <small>Value: "${ctx.textInput}"</small>
          </div>
          
          <div style="margin: 10px 0;">
            <label>Text Input (bind):</label>
            <ds-input :model-value="${ctx.textInput}" placeholder="Bound value"></ds-input>
          </div>
          
          <div style="margin: 10px 0;">
            <label>Textarea (model):</label>
            <ds-textarea :model="textareaContent" rows="3"></ds-textarea>
            <small>Value: "${ctx.textareaContent.replace(/\n/g, '\\n')}"</small>
          </div>
        </div>
        
        <!-- Boolean Inputs Section -->
        <div style="border: 1px solid #ddd; padding: 15px; border-radius: 4px;">
          <h3>✅ Boolean Inputs</h3>
          
          <div style="margin: 10px 0;">
            <label>Checkbox (model):</label>
            <ds-checkbox :model="checkboxValue" label="Enable notifications"></ds-checkbox>
            <small>Value: ${ctx.checkboxValue}</small>
          </div>
          
          <div style="margin: 10px 0;">
            <label>Radio Group (model):</label>
            <ds-radio-group :model="radioValue" name="test-radio"></ds-radio-group>
            <small>Value: "${ctx.radioValue}"</small>
          </div>
        </div>
        
        <!-- Selection Inputs Section -->
        <div style="border: 1px solid #ddd; padding: 15px; border-radius: 4px;">
          <h3>🎯 Selection Inputs</h3>
          
          <div style="margin: 10px 0;">
            <label>Select (model):</label>
            <ds-select :model="selectValue"></ds-select>
            <small>Value: "${ctx.selectValue}"</small>
          </div>
          
          <div style="margin: 10px 0;">
            <label>Select (bind):</label>
            <ds-select :model-value="${ctx.selectValue}"></ds-select>
          </div>
        </div>
        
        <!-- Numeric Inputs Section -->
        <div style="border: 1px solid #ddd; padding: 15px; border-radius: 4px;">
          <h3>🔢 Numeric Inputs</h3>
          
          <div style="margin: 10px 0;">
            <label>Number Input (model):</label>
            <ds-number :model="numberValue" min="0" max="100"></ds-number>
            <small>Value: ${ctx.numberValue}</small>
          </div>
          
          <div style="margin: 10px 0;">
            <label>Range Slider (model):</label>
            <ds-range :model="rangeValue" min="0" max="100"></ds-range>
            <small>Value: ${ctx.rangeValue}</small>
          </div>
          
          <div style="margin: 10px 0;">
            <label>Progress Bar:</label>
            <ds-progress :model="progressValue" max="100"></ds-progress>
            <small>Progress: ${ctx.progressValue}%</small>
          </div>
        </div>
      </div>
      
      <!-- Action Buttons Section -->
      <div style="border: 1px solid #ddd; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <h3>🎬 Actions & Validation</h3>
        
        <div style="margin: 10px 0;">
          <ds-button @click="${() => {
            ctx.textInput = 'Reset Text';
            ctx.textareaContent = 'Reset Content';
            ctx.lastAction = 'Text Reset';
          }}">Reset Text Inputs</ds-button>
          
          <ds-button @click="${() => {
            ctx.checkboxValue = !ctx.checkboxValue;
            ctx.radioValue = ctx.radioValue === 'option1' ? 'option2' : 'option1';
            ctx.lastAction = 'Boolean Toggle';
          }}">Toggle Booleans</ds-button>
          
          <ds-button @click="${() => {
            ctx.numberValue = Math.floor(Math.random() * 100);
            ctx.rangeValue = Math.floor(Math.random() * 100);
            ctx.progressValue = Math.floor(Math.random() * 100);
            ctx.lastAction = 'Numbers Randomized';
          }}">Randomize Numbers</ds-button>
        </div>
        
        <div style="margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 4px;">
          <strong>Last Action:</strong> ${ctx.lastAction}
        </div>
      </div>
      
      <!-- State Dump Section -->
      <details style="margin: 20px 0;">
        <summary style="cursor: pointer; font-weight: bold;">🔍 Full State Dump</summary>
        <pre style="background: #f0f0f0; padding: 10px; margin: 10px 0; overflow: auto; max-height: 200px;">
${JSON.stringify(ctx, null, 2)}
        </pre>
      </details>
    </div>
  `,
});

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <switch-test></switch-test>
    <design-system-test></design-system-test>
    <design-system></design-system>
    <minimal-example></minimal-example>
    <shopping-cart></shopping-cart>
    <todo-app></todo-app>
    <form-input-validation></form-input-validation>
    <my-greeting></my-greeting>
  </div>
`;
