import { component, html, useEmit, useOnConnected, useProps } from '../lib/index.js';

// Example component that uses useProps inside the render to read props
component('ce-test-props', () => {
  const props = useProps({ modelValue: 'default', count: 0 });
  const emit = useEmit();

  useOnConnected(() => {
    // emit an event to indicate connected for tests
    emit('connected', { value: props.modelValue });
  });

  return html`
    <div class="test-props">
      <span class="value">${props.modelValue}</span>
      <span class="count">${props.count}</span>
      <button class="inc" @click="${() => emit('inc')}">Increment</button>
    </div>
  `;
});
