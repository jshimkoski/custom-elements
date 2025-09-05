import { component, html } from "../../lib";

component("baby", {
  props: { babyText: { type: String } },
  render: (ctx) => html`
    <input
      type="text"
      class="border p-2 rounded"
      :value="${ctx.babyText}"
      @input="onInput"
    />
  `,
  onInput(e, ctx) {
    ctx.emit('update:baby-text', (e.target as HTMLInputElement).value);
  }
})

component("child", {
  props: { test: { type: String } },
  state: { text: "baby text" },
  render: (ctx) => html`
    <div>
      <button @click="onClick">Model Value Update - Click me</button>
      <button @click="onPropClick">Prop Value Update - ${ctx.test}</button>
      <div>
        <cer-baby :model:babyText="text"></cer-baby>
        Baby text is (in child): ${ctx.text}
      </div>
    </div>
  `,
  onClick: (_, ctx) => {
    ctx.emit('update:model-value', 'Clicked from child');
  },
  onPropClick: (_, ctx) => {
    ctx.emit('update:test', 'Clicked from child prop');
  }
});

component("design-system", {
  render: (ctx) => html`
    <div class="p-4 border rounded space-y-4">
      <h2 class="text-xl font-bold">Design System Example</h2>
      <cer-child :model="value" :model:test="anotherValue"></cer-child>
      <p>Value: ${ctx.value}</p>
      <button
        class="bg-green-600 hover:bg-green-500 text-white py-2 px-4 rounded"
        @click="resetValue"
      >
        Reset Value
      </button>
    </div>
  `,
  state: {
    value: 'Initial Value',
    anotherValue: 'Initial Prop Value',
  },
  resetValue: (_event, ctx) => {
    console.log('Resetting value');
    ctx.value = 'Initial Value';
    ctx.anotherValue = 'Initial Prop Value';
  },
});