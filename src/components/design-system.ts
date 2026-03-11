import {
  component,
  html,
  ref,
  defineModel,
  useProps,
  useEmit,
  useOnConnected,
} from '../lib/index.js';

interface Option {
  value: string;
  label: string;
}

/**
 * 🎨 Design System Components
 *
 * A comprehensive set of form components that support Vue-like directives:
 * - :model (two-way data binding)
 * - :bind (one-way data binding)
 * - :model:prop (model binding with custom prop names)
 *
 * All components emit 'update:modelValue' events for model binding compatibility.
 */

// Text Input Component
component('ds-input', () => {
  const props = useProps({
    placeholder: '',
    disabled: false,
    type: 'text',
  });

  const modelValue = defineModel('');

  return html`
    <div class="input-wrapper">
      <input
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        type="${props.type}"
        placeholder="${props.placeholder}"
        :disabled="${props.disabled}"
        :value="${modelValue.value}"
        @input="${(e: Event) => {
          const input = e.target as HTMLInputElement;
          modelValue.value = input.value;
        }}"
      />
    </div>
  `;
});

// Textarea Component
component('ds-textarea', () => {
  const props = useProps({
    modelValue: '',
    placeholder: '',
    disabled: false,
    rows: 3,
  });
  const emit = useEmit();

  return html`
    <div class="textarea-wrapper">
      <textarea
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="${props.placeholder}"
        :disabled="${props.disabled}"
        :rows="${props.rows}"
        :value="${props.modelValue}"
        @input="${(e: Event) => {
          const textarea = e.target as HTMLTextAreaElement;
          emit('update:modelValue', textarea.value);
        }}"
      ></textarea>
    </div>
  `;
});

// Checkbox Component
component('ds-checkbox', () => {
  const props = useProps({
    modelValue: false,
    label: '',
    disabled: false,
  });
  const emit = useEmit();

  return html`
    <label class="inline-flex items-center gap-2 cursor-pointer">
      <input
        class="form-checkbox h-5 w-5 text-blue-600"
        type="checkbox"
        :disabled="${props.disabled}"
        :checked="${props.modelValue}"
        @change="${(e: Event) => {
          const input = e.target as HTMLInputElement;
          emit('update:modelValue', input.checked);
        }}"
      />
      ${props.label
        ? html`<span class="text-sm text-gray-700">${props.label}</span>`
        : ''}
    </label>
  `;
});

// Select Component
component('ds-select', () => {
  const props = useProps({
    modelValue: '',
    disabled: false,
  });
  const emit = useEmit();
  const options = ref([
    { value: 'red', label: 'Red' },
    { value: 'green', label: 'Green' },
    { value: 'blue', label: 'Blue' },
  ]);

  useOnConnected(() => {
    // Ensure initial value is set correctly
    // const select = ctx.shadowRoot?.querySelector('select');
    // if (select) {
    //   select.value = modelValue || '';
    // }
  });

  return html`
    <div class="select-wrapper">
      <select
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        :disabled="${props.disabled}"
        :value="${props.modelValue}"
        @change="${(e: Event) => {
          const select = e.target as HTMLSelectElement;
          emit('update:modelValue', select.value);
        }}"
      >
        <option value="">Select an option</option>
        ${options.value.map(
          (option: Option) => html`
            <option value="${option.value}">${option.label}</option>
          `,
        )}
      </select>
    </div>
  `;
});

// Radio Group Component
component('ds-radio-group', () => {
  const props = useProps({
    modelValue: '',
    name: 'radio-group',
    disabled: false,
  });
  const emit = useEmit();

  const options = ref([
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ]);

  return html`
    <div class="radio-group space-y-2">
      ${options.value.map(
        (option: Option) => html`
          <label class="inline-flex items-center gap-2 cursor-pointer">
            <input
              class="form-radio h-4 w-4 text-blue-600"
              type="radio"
              name="${props.name}"
              value="${option.value}"
              :disabled="${props.disabled}"
              :checked="${props.modelValue === option.value}"
              @change="${(e: Event) => {
                const input = e.target as HTMLInputElement;
                if (input.checked) {
                  emit('update:modelValue', input.value);
                }
              }}"
            />
            <span class="text-sm text-gray-700">${option.label}</span>
          </label>
        `,
      )}
    </div>
  `;
});

// Button Component
component('ds-button', () => {
  const props = useProps({
    disabled: false,
    type: 'button',
    variant: 'primary',
  });
  const emit = useEmit();
  return html`
    <button
      class="px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 transition-colors"
      :class="${{
        'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500':
          props.variant === 'primary',
        'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500':
          props.variant === 'secondary',
        'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500':
          props.variant === 'success',
        'opacity-50 cursor-not-allowed': props.disabled,
      }}"
      type="${props.type}"
      :disabled="${props.disabled}"
      @click="${(e: Event) => {
        emit('click', e);
      }}"
    >
      <slot></slot>
    </button>
  `;
});

// Progress Component
component('ds-progress', () => {
  const props = useProps({
    modelValue: 0,
    max: 100,
    showValue: true,
  });

  return html`
    <div class="progress-wrapper">
      <progress
        class="w-full h-4 rounded"
        :value="${props.modelValue}"
        :max="${props.max}"
      ></progress>
      ${props.showValue
        ? html`
            <div class="text-sm text-gray-600 mt-1">
              ${props.modelValue} / ${props.max}
              (${Math.round((props.modelValue / props.max) * 100)}%)
            </div>
          `
        : ''}
    </div>
  `;
});

// Range Slider Component
component('ds-range', () => {
  const props = useProps({
    modelValue: 0,
    min: 0,
    max: 100,
    step: 1,
    disabled: false,
  });
  const emit = useEmit();

  return html`
    <div class="range-wrapper">
      <input
        class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        type="range"
        :min="${props.min}"
        :max="${props.max}"
        :step="${props.step}"
        :disabled="${props.disabled}"
        :value="${props.modelValue}"
        @input="${(e: Event) => {
          const input = e.target as HTMLInputElement;
          emit('update:modelValue', Number(input.value));
        }}"
      />
      <div class="flex justify-between text-sm text-gray-600 mt-1">
        <span>${props.min}</span>
        <span class="font-medium">${props.modelValue}</span>
        <span>${props.max}</span>
      </div>
    </div>
  `;
});

// Number Input Component
component('ds-number', () => {
  const props = useProps({
    modelValue: 0,
    min: undefined,
    max: undefined,
    step: 1,
    disabled: false,
    placeholder: '',
  });
  const emit = useEmit();

  return html`
    <div class="number-wrapper">
      <input
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        type="number"
        :min="${props.min}"
        :max="${props.max}"
        :step="${props.step}"
        :disabled="${props.disabled}"
        placeholder="${props.placeholder}"
        :value="${props.modelValue}"
        @input="${(e: Event) => {
          const input = e.target as HTMLInputElement;
          const value = Number(input.value);
          emit('update:modelValue', value);
        }}"
      />
    </div>
  `;
});
