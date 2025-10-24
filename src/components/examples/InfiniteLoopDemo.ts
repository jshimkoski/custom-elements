import {
  component,
  html,
  css,
  ref,
  computed,
  useEmit,
  useStyle,
} from '../../lib/index';

/**
 * Demo component showing common infinite loop pitfalls and their solutions
 */
component('infinite-loop-demo', () => {
  const count = ref(0);
  const message = ref('');
  const emit = useEmit();

  // ❌ BAD: This would cause an infinite loop if used in template
  // const _badHandler = () => {
  //   count.value++;
  //   console.log('This modifies ref during render!');
  // };

  // ✅ GOOD: Proper event handler
  const goodHandler = () => {
    count.value++;
    emit('count-changed', count.value);
  };

  // ❌ BAD: Computed property that modifies ref
  // const _badComputed = computed(() => {
  //   if (count.value > 5) {
  //     // This would cause infinite loops!
  //     // message.value = 'Count is high!';
  //   }
  //   return `Count: ${count.value}`;
  // });

  // ✅ GOOD: Pure computed property
  const goodComputed = computed(() => {
    return count.value > 5 ? 'Count is high!' : 'Count is normal';
  });

  // ✅ GOOD: Use event handlers to modify ref
  const handleReset = () => {
    count.value = 0;
    message.value = 'Reset!';
  };

  const handleMessageChange = (e: Event) => {
    message.value = (e.target as HTMLInputElement).value;
  };

  useStyle(
    () => css`
      .demo-container {
        max-width: 600px;
        margin: 2rem auto;
        padding: 2rem;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
      }

      .warning {
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 4px;
        padding: 1rem;
        margin: 1rem 0;
      }

      .good {
        background: #d4edda;
        border: 1px solid #c3e6cb;
        border-radius: 4px;
        padding: 1rem;
        margin: 1rem 0;
      }

      .counter {
        font-size: 2rem;
        font-weight: bold;
        text-align: center;
        margin: 2rem 0;
        color: #2c3e50;
      }

      button {
        background: #007bff;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        margin: 0.25rem;
      }

      button:hover {
        background: #0056b3;
      }

      button.danger {
        background: #dc3545;
      }

      button.danger:hover {
        background: #c82333;
      }

      input {
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin: 0.5rem;
        width: 200px;
      }

      code {
        background: #f8f9fa;
        padding: 0.2rem 0.4rem;
        border-radius: 3px;
        font-family: 'Courier New', monospace;
      }
    `,
  );

  return html`
    <div class="demo-container">
      <h2>🛡️ Infinite Loop Protection Demo</h2>

      <div class="counter">Count: ${count.value}</div>

      <div class="good">
        <h3>✅ Correct Patterns</h3>
        <p>These patterns are safe and won't cause infinite loops:</p>

        <button @click="${goodHandler}">
          Good: Increment (function reference)
        </button>

        <button @click="${() => count.value--}">
          Good: Decrement (arrow function)
        </button>

        <button @click="${handleReset}">Good: Reset</button>

        <br /><br />
        <code>@click="\${functionName}"</code> - Pass function reference<br />
        <code>@click="\${() => doSomething()}"</code> - Use arrow function
      </div>

      <div class="warning">
        <h3>⚠️ Dangerous Patterns (Don't Use These!)</h3>
        <p>
          These patterns would cause infinite loops and are automatically
          detected:
        </p>

        <!-- These would trigger warnings in development -->
        <button class="danger" disabled>
          Bad: @click="\${badHandler()}" - Immediate invocation
        </button>

        <button class="danger" disabled>
          Bad: @click="\${undefined}" - Undefined handler
        </button>

        <br /><br />
        <strong>Common mistakes:</strong><br />
        <code>@click="\${fn()}"</code> - ❌ Calls function immediately<br />
        <code>@click="\${null}"</code> - ❌ No handler<br />
        <code>computed(() => ref.value++)</code> - ❌ Modifies ref in computed
      </div>

      <div class="good">
        <h3>📊 Computed Values</h3>
        <p>Computed values should be pure (no side effects):</p>
        <p>Status: ${goodComputed.value}</p>
        <p>Double Count: ${computed(() => count.value * 2).value}</p>
      </div>

      <div>
        <h3>📝 Form Binding</h3>
        <input
          type="text"
          :value="${message.value}"
          @input="${handleMessageChange}"
          placeholder="Type a message..."
        />
        <p>Message: ${message.value}</p>
      </div>

      <div class="warning">
        <h3>🚨 What the Runtime Does</h3>
        <ul>
          <li>Detects event handlers with non-function values</li>
          <li>Warns about ref modifications during render</li>
          <li>Throttles excessive re-renders (>15 in 16ms)</li>
          <li>Provides helpful error messages with solutions</li>
          <li>Prevents browser freeze with automatic limits</li>
        </ul>
      </div>
    </div>
  `;
});
