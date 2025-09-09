import { component, html } from '../lib/index.js';

/**
 * 🎨 Design System Components
 * 
 * A comprehensive set of form components that support Vue-like directives:
 * - :model (two-way data binding)
 * - :bind (one-way data binding)  
 * - :model:prop (model binding with custom prop names)
 * 
 * All components emit 'update:model-value' events for model binding compatibility.
 */

// Text Input Component
component('ds-input', {
  props: {
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    type: { type: String, default: 'text' },
  },

  watch: {
    modelValue: [
      (newVal: any, oldVal: any, ctx: any) => {
        console.log('ds-input modelValue changed from', oldVal, 'to', newVal);
      },
      { immediate: true },
    ],
  },

  render: (ctx: any) => html`
    <div class="input-wrapper">
      <input
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        type="${ctx.type}"
        placeholder="${ctx.placeholder}"
        :disabled="${ctx.disabled}"
        :value="${ctx.modelValue}"
        @input="${(e: Event) => {
          const input = e.target as HTMLInputElement;
          console.log('ds-input emitting update:model-value with value:', input.value);
          ctx.emit('update:model-value', input.value);
        }}"
        @keyup="${(e: Event) => {
          const input = e.target as HTMLInputElement;
          console.log('ds-input keyup emitting update:model-value with value:', input.value);
          ctx.emit('update:model-value', input.value);
        }}"
      />
    </div>
  `,
});

// Textarea Component
component('ds-textarea', {
  props: {
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    rows: { type: Number, default: 3 },
  },

  watch: {
    modelValue: [
      (newVal: any, oldVal: any, ctx: any) => {
        console.log('ds-textarea modelValue changed from', oldVal, 'to', newVal);
        // Force re-render to ensure UI updates
        if (ctx._requestRender) {
          ctx._requestRender();
        }
      },
      { immediate: true },
    ],
  },

  render: (ctx: any) => html`
    <div class="textarea-wrapper">
      <textarea
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="${ctx.placeholder}"
        :disabled="${ctx.disabled}"
        :rows="${ctx.rows}"
        :value="${ctx.modelValue}"
        @input="${(e: Event) => {
          const textarea = e.target as HTMLTextAreaElement;
          console.log('ds-textarea emitting update:model-value with value:', textarea.value);
          ctx.emit('update:model-value', textarea.value);
        }}"
      ></textarea>
    </div>
  `,
});

// Checkbox Component
component('ds-checkbox', {
  props: {
    modelValue: { type: Boolean, default: false },
    label: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
  },

  watch: {
    modelValue: [
      (newVal: any, oldVal: any, ctx: any) => {
        console.log('ds-checkbox modelValue changed from', oldVal, 'to', newVal);
      },
      { immediate: true },
    ],
  },

  render: (ctx: any) => html`
    <label class="inline-flex items-center gap-2 cursor-pointer">
      <input
        class="form-checkbox h-5 w-5 text-blue-600"
        type="checkbox"
        :disabled="${ctx.disabled}"
        :checked="${ctx.modelValue}"
        @change="${(e: Event) => {
          const input = e.target as HTMLInputElement;
          console.log('ds-checkbox emitting update:model-value with value:', input.checked);
          ctx.emit('update:model-value', input.checked);
        }}"
      />
      ${ctx.label ? html`<span class="text-sm text-gray-700">${ctx.label}</span>` : ''}
    </label>
  `,
});

// Select Component
component('ds-select', {
  props: {
    modelValue: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
  },

  state: {
    options: [
      { value: 'red', label: 'Red' },
      { value: 'green', label: 'Green' },
      { value: 'blue', label: 'Blue' },
    ],
  },

  watch: {
    modelValue: [
      (newVal: any, oldVal: any, ctx: any) => {
        console.log('ds-select modelValue changed from', oldVal, 'to', newVal);
      },
      { immediate: true },
    ],
  },

  onConnected: (ctx: any) => {
    // Ensure initial value is set correctly
    const select = ctx.shadowRoot?.querySelector('select');
    if (select) {
      select.value = ctx.modelValue || '';
    }
  },

  render: (ctx: any) => html`
    <div class="select-wrapper">
      <select
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        :disabled="${ctx.disabled}"
        :value="${ctx.modelValue}"
        @change="${(e: Event) => {
          const select = e.target as HTMLSelectElement;
          console.log('ds-select emitting update:model-value with value:', select.value);
          ctx.emit('update:model-value', select.value);
        }}"
      >
        <option value="">Select an option</option>
        ${ctx.options.map((option: any) => html`
          <option value="${option.value}">${option.label}</option>
        `)}
      </select>
    </div>
  `,
});

// Radio Group Component
component('ds-radio-group', {
  props: {
    modelValue: { type: String, default: '' },
    name: { type: String, default: 'radio-group' },
    disabled: { type: Boolean, default: false },
  },

  state: {
    options: [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' },
    ],
  },

  watch: {
    modelValue: [
      (newVal: any, oldVal: any, ctx: any) => {
        console.log('ds-radio-group modelValue changed from', oldVal, 'to', newVal);
      },
      { immediate: true },
    ],
  },

  render: (ctx: any) => html`
    <div class="radio-group space-y-2">
      ${ctx.options.map((option: any) => html`
        <label class="inline-flex items-center gap-2 cursor-pointer">
          <input
            class="form-radio h-4 w-4 text-blue-600"
            type="radio"
            name="${ctx.name}"
            value="${option.value}"
            :disabled="${ctx.disabled}"
            :checked="${ctx.modelValue === option.value}"
            @change="${(e: Event) => {
              const input = e.target as HTMLInputElement;
              if (input.checked) {
                console.log('ds-radio-group emitting update:model-value with value:', input.value);
                ctx.emit('update:model-value', input.value);
              }
            }}"
          />
          <span class="text-sm text-gray-700">${option.label}</span>
        </label>
      `)}
    </div>
  `,
});

// Button Component
component('ds-button', {
  props: {
    disabled: { type: Boolean, default: false },
    type: { type: String, default: 'button' },
    variant: { type: String, default: 'primary' },
  },

  render: (ctx: any) => html`
    <button
      class="px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 transition-colors"
      :class="${{
        'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500': ctx.variant === 'primary',
        'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500': ctx.variant === 'secondary',
        'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500': ctx.variant === 'success',
        'opacity-50 cursor-not-allowed': ctx.disabled
      }}"
      type="${ctx.type}"
      :disabled="${ctx.disabled}"
      @click="${(e: Event) => {
        console.log('ds-button clicked');
        ctx.emit('click', e);
      }}"
    >
      <slot></slot>
    </button>
  `,
});

// Progress Component
component('ds-progress', {
  props: {
    modelValue: { type: Number, default: 0 },
    max: { type: Number, default: 100 },
    showValue: { type: Boolean, default: true },
  },

  watch: {
    modelValue: [
      (newVal: any, oldVal: any, ctx: any) => {
        console.log('ds-progress modelValue changed from', oldVal, 'to', newVal);
      },
      { immediate: true },
    ],
  },

  render: (ctx: any) => html`
    <div class="progress-wrapper">
      <progress
        class="w-full h-4 rounded"
        :value="${ctx.modelValue}"
        :max="${ctx.max}"
      ></progress>
      ${ctx.showValue ? html`
        <div class="text-sm text-gray-600 mt-1">
          ${ctx.modelValue} / ${ctx.max} (${Math.round((ctx.modelValue / ctx.max) * 100)}%)
        </div>
      ` : ''}
    </div>
  `,
});

// Range Slider Component
component('ds-range', {
  props: {
    modelValue: { type: Number, default: 0 },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 100 },
    step: { type: Number, default: 1 },
    disabled: { type: Boolean, default: false },
  },

  watch: {
    modelValue: [
      (newVal: any, oldVal: any, ctx: any) => {
        console.log('ds-range modelValue changed from', oldVal, 'to', newVal);
      },
      { immediate: true },
    ],
  },

  render: (ctx: any) => html`
    <div class="range-wrapper">
      <input
        class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        type="range"
        :min="${ctx.min}"
        :max="${ctx.max}"
        :step="${ctx.step}"
        :disabled="${ctx.disabled}"
        :value="${ctx.modelValue}"
        @input="${(e: Event) => {
          const input = e.target as HTMLInputElement;
          console.log('ds-range emitting update:model-value with value:', Number(input.value));
          ctx.emit('update:model-value', Number(input.value));
        }}"
      />
      <div class="flex justify-between text-sm text-gray-600 mt-1">
        <span>${ctx.min}</span>
        <span class="font-medium">${ctx.modelValue}</span>
        <span>${ctx.max}</span>
      </div>
    </div>
  `,
});

// Number Input Component
component('ds-number', {
  props: {
    modelValue: { type: Number, default: 0 },
    min: { type: Number, default: undefined },
    max: { type: Number, default: undefined },
    step: { type: Number, default: 1 },
    disabled: { type: Boolean, default: false },
    placeholder: { type: String, default: '' },
  },

  watch: {
    modelValue: [
      (newVal: any, oldVal: any, ctx: any) => {
        console.log('ds-number modelValue changed from', oldVal, 'to', newVal);
      },
      { immediate: true },
    ],
  },

  render: (ctx: any) => html`
    <div class="number-wrapper">
      <input
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        type="number"
        :min="${ctx.min}"
        :max="${ctx.max}"
        :step="${ctx.step}"
        :disabled="${ctx.disabled}"
        placeholder="${ctx.placeholder}"
        :value="${ctx.modelValue}"
        @input="${(e: Event) => {
          const input = e.target as HTMLInputElement;
          const value = Number(input.value);
          console.log('ds-number emitting update:model-value with value:', value);
          ctx.emit('update:model-value', value);
        }}"
      />
    </div>
  `,
});
