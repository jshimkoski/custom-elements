import { component, html, ref, watch, useEmit, useOnConnected } from '../lib/index.js';

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
component('ds-input', ({ modelValue = '', placeholder = '', disabled = false, type = 'text' }) => {
  const emit = useEmit();

  watch(() => modelValue, (newVal, oldVal) => {
    console.log('ds-input modelValue changed from', oldVal, 'to', newVal);
  }, { immediate: true });

  return html`
    <div class="input-wrapper">
      <input
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        type="${type}"
        placeholder="${placeholder}"
        :disabled="${disabled}"
        :value="${modelValue}"
        @input="${(e: Event) => {
          const input = e.target as HTMLInputElement;
          console.log('ds-input emitting update:modelValue with value:', input.value);
          emit('update:modelValue', input.value);
        }}"
        @keyup="${(e: Event) => {
          const input = e.target as HTMLInputElement;
          console.log('ds-input keyup emitting update:modelValue with value:', input.value);
          emit('update:modelValue', input.value);
        }}"
      />
    </div>
  `;
});

// Textarea Component
component('ds-textarea', ({ modelValue = '', placeholder = '', disabled = false, rows = 3 }) => {
  const emit = useEmit();
  watch(() => modelValue, (newVal, oldVal) => {
    console.log('ds-textarea modelValue changed from', oldVal, 'to', newVal);
  }, { immediate: true });

  return html`
    <div class="textarea-wrapper">
      <textarea
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="${placeholder}"
        :disabled="${disabled}"
        :rows="${rows}"
        :value="${modelValue}"
        @input="${(e: Event) => {
          const textarea = e.target as HTMLTextAreaElement;
          console.log('ds-textarea emitting update:modelValue with value:', textarea.value);
          emit('update:modelValue', textarea.value);
        }}"
      ></textarea>
    </div>
  `;
});

// Checkbox Component
component('ds-checkbox', ({ modelValue = false, label = '', disabled = false }) => {
  const emit = useEmit();
  watch(() => modelValue, (newVal, oldVal) => {
    console.log('ds-checkbox modelValue changed from', oldVal, 'to', newVal);
  }, { immediate: true });

  return html`
    <label class="inline-flex items-center gap-2 cursor-pointer">
      <input
        class="form-checkbox h-5 w-5 text-blue-600"
        type="checkbox"
        :disabled="${disabled}"
        :checked="${modelValue}"
        @change="${(e: Event) => {
          const input = e.target as HTMLInputElement;
          console.log('ds-checkbox emitting update:modelValue with value:', input.checked);
          emit('update:modelValue', input.checked);
        }}"
      />
      ${label ? html`<span class="text-sm text-gray-700">${label}</span>` : ''}
    </label>
  `;
});

// Select Component
component('ds-select', ({ modelValue = '', disabled = false }) => {
  const emit = useEmit();
  const options = ref([
    { value: 'red', label: 'Red' },
    { value: 'green', label: 'Green' },
    { value: 'blue', label: 'Blue' },
  ]);

  watch(() => modelValue, (newVal, oldVal) => {
    console.log('ds-select modelValue changed from', oldVal, 'to', newVal);
  }, { immediate: true });

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
        :disabled="${disabled}"
        :value="${modelValue}"
        @change="${(e: Event) => {
          const select = e.target as HTMLSelectElement;
          console.log('ds-select emitting update:modelValue with value:', select.value);
          emit('update:modelValue', select.value);
        }}"
      >
        <option value="">Select an option</option>
        ${options.value.map((option: any) => html`
          <option value="${option.value}">${option.label}</option>
        `)}
      </select>
    </div>
  `;
});

// Radio Group Component
component('ds-radio-group', ({ modelValue = '', name = 'radio-group', disabled = false }) => {
  const emit = useEmit();

  const options = ref([
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ]);

  watch(() => modelValue, (newVal, oldVal) => {
    console.log('ds-radio-group modelValue changed from', oldVal, 'to', newVal);
  }, { immediate: true });

  return html`
    <div class="radio-group space-y-2">
      ${options.value.map((option: any) => html`
        <label class="inline-flex items-center gap-2 cursor-pointer">
          <input
            class="form-radio h-4 w-4 text-blue-600"
            type="radio"
            name="${name}"
            value="${option.value}"
            :disabled="${disabled}"
            :checked="${modelValue === option.value}"
            @change="${(e: Event) => {
              const input = e.target as HTMLInputElement;
              if (input.checked) {
                console.log('ds-radio-group emitting update:modelValue with value:', input.value);
                emit('update:modelValue', input.value);
              }
            }}"
          />
          <span class="text-sm text-gray-700">${option.label}</span>
        </label>
      `)}
    </div>
  `;
});

// Button Component
component('ds-button', ({ disabled = false, type = 'button', variant = 'primary' }) => {
  const emit = useEmit();
  return html`
    <button
      class="px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 transition-colors"
      :class="${{
        'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500': variant === 'primary',
        'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500': variant === 'secondary',
        'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500': variant === 'success',
        'opacity-50 cursor-not-allowed': disabled
      }}"
      type="${type}"
      :disabled="${disabled}"
      @click="${(e: Event) => {
        console.log('ds-button clicked');
        emit('click', e);
      }}"
    >
      <slot></slot>
    </button>
  `;
});

// Progress Component
component('ds-progress', ({ modelValue = 0, max = 100, showValue = true }) => {

  watch(() => modelValue, (newVal, oldVal) => {
    console.log('ds-progress modelValue changed from', oldVal, 'to', newVal);
  }, { immediate: true });

  return html`
    <div class="progress-wrapper">
      <progress
        class="w-full h-4 rounded"
        :value="${modelValue}"
        :max="${max}"
      ></progress>
      ${showValue ? html`
        <div class="text-sm text-gray-600 mt-1">
          ${modelValue} / ${max} (${Math.round((modelValue / max) * 100)}%)
        </div>
      ` : ''}
    </div>
  `;
});

// Range Slider Component
component('ds-range', ({ modelValue = 0, min = 0, max = 100, step = 1, disabled = false }) => {
  const emit = useEmit();
  watch(() => modelValue, (newVal, oldVal) => {
    console.log('ds-range modelValue changed from', oldVal, 'to', newVal);
  }, { immediate: true });

  return html`
    <div class="range-wrapper">
      <input
        class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        type="range"
        :min="${min}"
        :max="${max}"
        :step="${step}"
        :disabled="${disabled}"
        :value="${modelValue}"
        @input="${(e: Event) => {
          const input = e.target as HTMLInputElement;
          console.log('ds-range emitting update:modelValue with value:', Number(input.value));
          emit('update:modelValue', Number(input.value));
        }}"
      />
      <div class="flex justify-between text-sm text-gray-600 mt-1">
        <span>${min}</span>
        <span class="font-medium">${modelValue}</span>
        <span>${max}</span>
      </div>
    </div>
  `;
});

// Number Input Component
component('ds-number', ({ modelValue = 0, min = undefined, max = undefined, step = 1, disabled = false, placeholder = '' }) => {
  const emit = useEmit();

  watch(() => modelValue, (newVal, oldVal) => {
    console.log('ds-number modelValue changed from', oldVal, 'to', newVal);
  }, { immediate: true });

  return html`
    <div class="number-wrapper">
      <input
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        type="number"
        :min="${min}"
        :max="${max}"
        :step="${step}"
        :disabled="${disabled}"
        placeholder="${placeholder}"
        :value="${modelValue}"
        @input="${(e: Event) => {
          const input = e.target as HTMLInputElement;
          const value = Number(input.value);
          console.log('ds-number emitting update:modelValue with value:', value);
          emit('update:modelValue', value);
        }}"
      />
    </div>
  `;
});
