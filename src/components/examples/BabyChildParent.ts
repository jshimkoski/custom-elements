import { component, useEmit, ref, html } from "../../lib";

component("baby", ({ babyText = '' }) => {
  const emit = useEmit();
  return html`
    <div class="p-4 border rounded-sm">
      <input
        type="text"
        class="border border-neutral-300 p-2 rounded-sm"
        :value="${babyText}"
        @input="${(e: Event) => emit('update:babyText', (e.target as HTMLInputElement).value)}"
      />
    </div>
  `;
})

component("child", ({ test = '' }) =>{
  const text = ref("baby text");

  const emit = useEmit();

  const onClick = () => {
    emit('update:modelValue', 'Clicked from child');
  };
  const onPropClick = () => {
    emit('update:test', 'Clicked from child prop');
  };

  return html`
    <div class="p-4 border rounded-sm space-y-4">
      <button @click="${onClick}">Model Value Update - Click me</button>
      <button @click="${onPropClick}">Prop Value Update - ${test}</button>
      <div>
        <cer-baby :model:babyText="${text}"></cer-baby>
        Baby text is (in child): ${text.value}
      </div>
    </div>
  `;
});

component("parent", () => {
  const value = ref('Initial Value');
  const anotherValue = ref('Initial Prop Value');
  const resetValue = () => {
    console.log('Resetting value');
    value.value = 'Initial Value';
    anotherValue.value = 'Initial Prop Value';
  }
  return html`
    <div class="p-4 border rounded-sm space-y-4">
      <h2 class="text-xl font-bold">Baby Child Parent Example</h2>
      <cer-child :model="${value}" :model:test="${anotherValue}"></cer-child>
      <p>Value: ${value.value}</p>
      <button
        class="bg-success-600 hover:bg-success-500 text-white py-2 px-4 rounded-sm"
        @click="${resetValue}"
      >
        Reset Value
      </button>
    </div>
  `;
});