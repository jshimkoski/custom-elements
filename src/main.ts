import './style.css';
import {
  component,
  html,
  watch,
  ref,
  css,
  computed,
  useProps,
  useEmit,
  useOnConnected,
  useOnError,
  useStyle,
  enableJITCSS,
} from './lib';
import { createDOMJITCSS } from './lib/dom-jit-css';
import { when, each, match } from './lib/directives';
import { eventBus } from './lib/event-bus';

// Import example components so they register themselves
import './components/examples/BabyChildParent';
import './components/examples/MinimalExample';
import './components/examples/ShoppingCart';
import './components/examples/TodoApp';
import './components/examples/FormInputValidation';
import './components/examples/Prose';

// Import design system components
import './components/design-system';
// Test components used by automated tests
import './components/test-props';

// Enable JIT CSS globally
enableJITCSS();
const domJIT = createDOMJITCSS({ extendedColors: true });
domJIT.mount();

// --- Simple Switch ---

component('simple-switch', () => {
  const props = useProps({ modelValue: false });
  const emit = useEmit();
  return html`
    <div>
      <p>ModelValue: ${props.modelValue}</p>
      <input
        type="checkbox"
        :checked="${props.modelValue}"
        @change="${(e: Event) => {
          const input = e.target as HTMLInputElement;
          const isChecked = input.checked;
          emit('update:modelValue', isChecked);
        }}"
      />
      <label>Simple Switch</label>
    </div>
  `;
});

// --- Cer Switch ---

component('cer-switch', () => {
  const props = useProps({
    label: '',
    modelValue: false,
  });
  const emit = useEmit();
  return html`
    <label
      class="inline-flex items-center gap-3 cursor-pointer"
      role="switch"
      :aria-checked="${props.modelValue}"
    >
      ${props.modelValue}
      <div class="relative">
        <input
          class="sr-only"
          type="checkbox"
          :checked="${props.modelValue}"
          @change="${(e: Event) => {
            const input = e.target as HTMLInputElement;
            const isChecked = input.checked;
            emit('update:modelValue', isChecked);
          }}"
        />

        <div
          class="w-9 h-5 rounded-full shadow-inner transition"
          :class="${{
            'bg-primary-600': props.modelValue,
            'bg-neutral-200': !props.modelValue,
          }}"
        ></div>

        <div
          class="absolute left-0.5 transition top-0 w-4 h-4 mt-0.5 bg-white rounded-full shadow"
          :class="${[
            props.modelValue
              ? 'transform-[translateX(1rem)]'
              : 'transform-[translateX(0)]',
          ]}"
        ></div>
      </div>

      ${props.label
        ? html`<span class="text-sm text-neutral-700">${props.label}</span>`
        : ''}
    </label>
  `;
});

// --- Stateless Component ---

component('stateless-component', () => {
  useStyle(
    () => css`
      div {
        background: lightblue;
        padding: 10px;
      }
    `,
  );
  return html`
    <div>
      <p>This is a stateless component!</p>
    </div>
  `;
});

// --- Async Component ---

component('async-greeting', async () => {
  const name = ref('World');

  const loading = ref(false);
  const error = ref<Error | null>(null);

  useStyle(
    () => css`
      .greeting {
        padding: 20px;
        border: 2px solid ${name.value === 'World' ? '#4CAF50' : '#5722FF'};
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
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
    `,
  );

  const fetchData = async (newName: string) => {
    try {
      loading.value = true;
      error.value = null;
      // Simulate API call or dynamic import
      await new Promise((resolve) => setTimeout(resolve, 1000));
      name.value = newName;
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  };

  return html`
    <h3 class="text-lg font-semibold">Async Greeting Component</h3>
    ${match()
      .when(
        error.value,
        html`
          <div class="error">
            <h3>Failed to load greeting</h3>
            <p>Error: ${error.value?.message}</p>
            <button @click="${() => location.reload()}">Retry</button>
          </div>
        `,
      )
      .when(
        loading.value,
        html`
          <div class="loading">
            <p>Loading greeting for ${name.value}...</p>
            <div class="spinner">⏳</div>
          </div>
        `,
      )
      .otherwise(html`
        <div class="greeting">
          <h1>Hello, ${name.value}!</h1>
          <p>This content loaded asynchronously after 1 seconds.</p>
          <small>Loaded at: ${new Date().toLocaleTimeString()}</small>
          <button @click="${() => fetchData('Dude')}">Reload</button>
        </div>
      `)
      .done()}
  `;
});

// --- Main Component with Child and Parent Interaction ---

export const message = ref('Hello from Child Component');

watch(
  () => message.value,
  (newValue, oldValue) => {
    console.log(
      `Watcher called: message changed from ${oldValue} to ${newValue}`,
    );
  },
);

export const handleSomething = (event: Event) => {
  console.log('component did something', event, message.value);
};

component('child-component', () => {
  const props = useProps({
    test: '',
  });
  return html`
    <div>
      <p>From parent: ${props.test}</p>
      <slot></slot>
      <p>Slot is right above me</p>
      <p>${message.value}</p>
      <button @click="${handleSomething}">Click Me (handleSomething)</button>
      <button @click="${__test_setMessage.bind(undefined, message, 'cool')}">
        Change Message
      </button>
    </div>
  `;
});

export const myGreetingState = ref({
  name: 'World',
  array: ['A', 'B', 'C'],
  email: 'test@me.com',
  age: 25,
  isActive: true,
  color: 'red',
  featureEnabled: false,
});

const funnyName = computed(() => `Funny ${myGreetingState.value.name}`);

watch(
  () => myGreetingState.value.name,
  (newName, oldName) => {
    console.log(`Watcher called: Name changed from ${oldName} to ${newName}`);
  },
);

watch(
  () => myGreetingState.value.email,
  (newEmail, oldEmail) => {
    console.log(
      `Watcher called: Email changed from ${oldEmail} to ${newEmail}`,
    );
  },
);

watch(
  () => myGreetingState.value.featureEnabled,
  (newVal, oldVal) => {
    console.log(
      `Watcher called: featureEnabled changed from ${oldVal} to ${newVal}`,
    );
  },
);

export const handleSomethingMyGreeting = (event: Event) => {
  myGreetingState.value.name = 'Updated Name';
  myGreetingState.value.array.push('New Item');
  console.log(
    'component did something, event, state',
    event,
    myGreetingState.value,
  );
};

component('my-greeting', () => {
  useOnConnected(() => {
    console.log('Component connected:', myGreetingState.value);
    console.log('Feature enabled:', myGreetingState.value.featureEnabled);
    eventBus.on('messageChanged', (detail) => {
      console.log('Message changed event received in my-greeting', detail);
    });
  });

  useOnError((error) => {
    console.error('Component error:', error, myGreetingState.value);
  });

  useStyle(
    () => css`
      div {
        color: ${myGreetingState.value.color};
        padding: 20px;
      }
      .form-group {
        margin: 10px 0;
      }
      .form-control {
        border: 1px solid ${myGreetingState.value.color};
      }
      label {
        display: inline-block;
        width: 100px;
      }
    `,
  );

  return html`
    <div>
      <section>
        <h2>Switch</h2>
        <simple-switch :model="featureEnabled" />
        <cer-switch label="Enable feature" :model="featureEnabled" />
      </section>
      <async-greeting></async-greeting>
      <child-component test="${myGreetingState.value.name}">
        <stateless-component></stateless-component>
      </child-component>
      <h2>Hello, <span>${myGreetingState.value.name}</span></h2>
      <h3>You have a funny name: ${funnyName.value}</h3>
      ${when(
        myGreetingState.value.name === 'World',
        html`<span>Welcome to the world!</span>`,
      )}

      <div class="form-group">
        <label>Name:</label>
        <input
          type="text"
          :model="name.name"
          :show="${myGreetingState.value.isActive}"
        />

        <div class="form-group">
          <label>Name (:model):</label>
          <input
            type="text"
            :model="name.name"
            :class="${[
              'form-control',
              { active: myGreetingState.value.isActive },
            ]}"
            :style="${{
              color: myGreetingState.value.isActive ? 'green' : 'red',
            }}"
          />
          <button :bind="${{ disabled: myGreetingState.value.isActive }}">
            Submit
          </button>
          <button :disabled="${myGreetingState.value.isActive}">Submit</button>
        </div>
      </div>

      <div class="form-group">
        <label>Email:</label>
        <input type="email" :model="email.email" />
      </div>

      <div class="form-group">
        <label>Age:</label>
        <input type="number" :model="age.age" />
      </div>

      <div class="form-group">
        <label>Active:</label>
        <input type="checkbox" :model="isActive.isActive" />
      </div>

      <div class="form-group">
        <label>Color:</label>
        <select :model="color.color">
          <option value="red">Red</option>
          <option value="green">Green</option>
          <option value="blue">Blue</option>
        </select>
      </div>

      <div class="form-group">
        <label>Active group:</label>
        ${each(
          myGreetingState.value.array,
          (item) => html`
            ${item}:
            <input
              type="checkbox"
              key="checkbox-${item}"
              value="${item}"
              :model="array.array"
              :class="['item', item === 'A' ? 'active' : '']"
            />
          `,
        )}
      </div>

      <div class="form-group">
        <p>State: ${JSON.stringify(myGreetingState.value, null, 2)}</p>
      </div>

      <button
        @click="${() => {
          // delegate to helper to avoid inline function explosion
          __test_setGreetingName(myGreetingState, 'Custom Element');
        }}"
      >
        Change Name
      </button>
      <button @click="${handleSomethingMyGreeting}">Click Me</button>
      ${each(myGreetingState.value.array, (item) => html`<span>${item}</span>`)}
      ${match()
        .when(
          myGreetingState.value.name === 'World',
          html`<span>Welcome to the world!</span>`,
        )
        .when(
          myGreetingState.value.name === 'Custom Element',
          html`<span>Welcome to the custom element!</span>`,
        )
        .otherwise(html`<span>In otherwise statement</span>`)
        .done()}
    </div>
  `;
});

// --- Switch Test ---

component('switch-test', () => {
  const featureEnabled = ref(false);

  return html`
    <div style="padding: 20px; border: 1px solid #ccc; margin: 20px;">
      <h2 class="text-lg font-semibold">Switch Component Test</h2>
      <h3>Model Binding Test</h3>
      <p>Current value: ${featureEnabled.value}</p>

      <div style="margin: 10px 0;">
        <label>Simple Switch:</label>
        <simple-switch :model="${featureEnabled}"></simple-switch>
      </div>

      <div style="margin: 10px 0;">
        <label>Custom Switch:</label>
        <cer-switch
          :model="${featureEnabled}"
          label="Enable Feature"
        ></cer-switch>
      </div>

      <button
        @click="${() => {
          featureEnabled.value = !featureEnabled.value;
        }}"
      >
        Toggle Programmatically
      </button>
    </div>
  `;
});

// --- Design System Comprehensive Test ---

// Create comprehensive design system test component
component('design-system-test', () => {
  // Text inputs
  const textInput = ref('Hello World');
  const textareaContent = ref('This is a multi-line\ntext area example');

  // Boolean inputs
  const checkboxValue = ref(true);
  const radioValue = ref('option2');

  // Selection inputs
  const selectValue = ref('blue');

  // Numeric inputs
  const numberValue = ref(42);
  const rangeValue = ref(75);
  const progressValue = ref(60);

  // Validation
  const lastAction = ref('None');

  return html`
    <div
      style="padding: 20px; border: 2px solid #007acc; margin: 20px; border-radius: 8px;"
    >
      <h2>🧪 Design System Comprehensive Test</h2>

      <div
        style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;"
      >
        <!-- Text Inputs Section -->
        <div style="border: 1px solid #ddd; padding: 15px; border-radius: 4px;">
          <h3>📝 Text Inputs</h3>

          <div style="margin: 10px 0;">
            <label>Text Input (model):</label>
            <ds-input
              :model="${textInput}"
              placeholder="Type something..."
            ></ds-input>
            <small>Value: "${textInput.value}"</small>
          </div>

          <div style="margin: 10px 0;">
            <label>Text Input (bind):</label>
            <ds-input
              :model-value="${textInput.value}"
              placeholder="Bound value"
            ></ds-input>
          </div>

          <div style="margin: 10px 0;">
            <label>Textarea (model):</label>
            <ds-textarea :model="${textareaContent}" rows="3"></ds-textarea>
            <small
              >Value: "${textareaContent.value.replace(/\n/g, '\\n')}"</small
            >
          </div>
        </div>

        <!-- Boolean Inputs Section -->
        <div style="border: 1px solid #ddd; padding: 15px; border-radius: 4px;">
          <h3>✅ Boolean Inputs</h3>

          <div style="margin: 10px 0;">
            <label>Checkbox (model):</label>
            <ds-checkbox
              :model="${checkboxValue}"
              label="Enable notifications"
            ></ds-checkbox>
            <small>Value: ${checkboxValue.value}</small>
          </div>

          <div style="margin: 10px 0;">
            <label>Radio Group (model):</label>
            <ds-radio-group
              :model="${radioValue}"
              name="test-radio"
            ></ds-radio-group>
            <small>Value: "${radioValue.value}"</small>
          </div>
        </div>

        <!-- Selection Inputs Section -->
        <div style="border: 1px solid #ddd; padding: 15px; border-radius: 4px;">
          <h3>🎯 Selection Inputs</h3>

          <div style="margin: 10px 0;">
            <label>Select (model):</label>
            <ds-select :model="${selectValue}"></ds-select>
            <small>Value: "${selectValue.value}"</small>
          </div>

          <div style="margin: 10px 0;">
            <label>Select (bind):</label>
            <ds-select :model-value="${selectValue.value}"></ds-select>
          </div>
        </div>

        <!-- Numeric Inputs Section -->
        <div style="border: 1px solid #ddd; padding: 15px; border-radius: 4px;">
          <h3>🔢 Numeric Inputs</h3>

          <div style="margin: 10px 0;">
            <label>Number Input (model):</label>
            <ds-number :model="${numberValue}" min="0" max="100"></ds-number>
            <small>Value: ${numberValue.value}</small>
          </div>

          <div style="margin: 10px 0;">
            <label>Range Slider (model):</label>
            <ds-range :model="${rangeValue}" min="0" max="100"></ds-range>
            <small>Value: ${rangeValue.value}</small>
          </div>

          <div style="margin: 10px 0;">
            <label>Progress Bar:</label>
            <ds-progress :model="${progressValue}" max="100"></ds-progress>
            <small>Progress: ${progressValue.value}%</small>
          </div>
        </div>
      </div>

      <!-- Action Buttons Section -->
      <div
        style="border: 1px solid #ddd; padding: 15px; border-radius: 4px; margin: 20px 0;"
      >
        <h3>🎬 Actions & Validation</h3>

        <div style="margin: 10px 0;">
          <ds-button
            @click="${__test_resetTextInputs.bind(
              undefined,
              textInput,
              textareaContent,
              lastAction,
            )}"
            >Reset Text Inputs</ds-button
          >

          <ds-button
            @click="${__test_toggleBooleans.bind(
              undefined,
              checkboxValue,
              radioValue,
              lastAction,
            )}"
            >Toggle Booleans</ds-button
          >

          <ds-button
            @click="${__test_randomizeNumbers.bind(
              undefined,
              numberValue,
              rangeValue,
              progressValue,
              lastAction,
            )}"
            >Randomize Numbers</ds-button
          >
        </div>

        <div
          style="margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 4px;"
        >
          <strong>Last Action:</strong> ${lastAction.value}
        </div>
      </div>

      <!-- State Dump Section -->
      <details style="margin: 20px 0;">
        <summary style="cursor: pointer; font-weight: bold;">
          🔍 Full State Dump
        </summary>
        <pre
          style="background: #f0f0f0; padding: 10px; margin: 10px 0; overflow: auto; max-height: 200px;"
        >
${JSON.stringify(
            {
              textInput,
              textareaContent,
              lastAction,
              checkboxValue,
              radioValue,
              selectValue,
              numberValue,
              rangeValue,
              progressValue,
            },
            null,
            2,
          )}
        </pre
        >
      </details>
    </div>
  `;
});

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <ce-test-props></ce-test-props>
    <test-app></test-app>
    <switch-test></switch-test>
    <design-system-test></design-system-test>
    <cer-parent></cer-parent>
    <minimal-example></minimal-example>
    <shopping-cart></shopping-cart>
    <todo-app></todo-app>
    <form-input-validation></form-input-validation>
    <prose-example></prose-example>
    <my-greeting></my-greeting>
  </div>
`;

// --- Exported test helpers for design-system actions ---
export function __test_resetTextInputs(
  textInput: { value: string },
  textareaContent: { value: string },
  lastAction: { value: string },
) {
  textInput.value = 'Reset Text';
  textareaContent.value = 'Reset Content';
  lastAction.value = 'Text Reset';
}

export function __test_toggleBooleans(
  checkboxValue: { value: boolean },
  radioValue: { value: string },
  lastAction: { value: string },
) {
  checkboxValue.value = !checkboxValue.value;
  radioValue.value = radioValue.value === 'option1' ? 'option2' : 'option1';
  lastAction.value = 'Boolean Toggle';
}

export function __test_randomizeNumbers(
  numberValue: { value: number },
  rangeValue: { value: number },
  progressValue: { value: number },
  lastAction: { value: string },
) {
  numberValue.value = Math.floor(Math.random() * 100);
  rangeValue.value = Math.floor(Math.random() * 100);
  progressValue.value = Math.floor(Math.random() * 100);
  lastAction.value = 'Numbers Randomized';
}

export function __test_setMessage(msgRef: { value: string }, val: string) {
  msgRef.value = val;
}

export function __test_setGreetingName(
  stateRef: { value: Record<string, unknown> },
  name: string,
) {
  const s = stateRef.value as Record<string, unknown>;
  (s as Record<string, unknown>)['name'] = name;
  (s as Record<string, unknown>)['array'] = ['D', 'E', 'F'];
}
