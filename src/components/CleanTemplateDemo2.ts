import { quickComponent } from '../lib/runtime.js';

// Test the event parsing directly
console.log('Testing enhanced template features...');

// Simple test with just click
const TestComponent = quickComponent(
  { count: 0 },
  `
    <div>
      <p>Count: {{count}}</p>
      <button @click="count++">Test Click</button>
    </div>
  `
);

console.log('TestComponent created:', TestComponent);
const SimpleComponent = quickComponent(
  { message: 'Enhanced Template Features', timestamp: Date.now() },
  `
    <h2>{{message}}</h2>
    <p>This component uses template string interpolation!</p>
    <p>Timestamp: {{timestamp}}</p>
    <p>Calculated: {{timestamp + 1000}}</p>
    <style>
      h2 { color: blue; }
      p { margin: 10px 0; }
    </style>
  `
);

const ExpressionComponent = quickComponent(
  { name: 'User', count: 5, isActive: true },
  `
    <h2>Expression Test - {{name}}</h2>
    <p>Hello, {{name.toUpperCase()}}!</p>
    <p>Count: {{count}} ({{count > 0 ? 'positive' : count < 0 ? 'negative' : 'zero'}})</p>
    <p class="{{isActive ? 'active' : 'inactive'}}">Status: {{isActive ? 'Active' : 'Inactive'}}</p>
    <button @click="count++">Increment ({{count + 1}})</button>
    <button @click="count = Math.max(0, count - 1)">Safe Decrement</button>
    <button @click="isActive = !isActive">Toggle Status</button>
    <style>
      h2 { color: green; }
      .active { color: green; font-weight: bold; }
      .inactive { color: red; font-style: italic; }
      button { 
        padding: 5px 10px; 
        margin: 2px;
        background: #f0f0f0;
        border: 1px solid #ccc;
        border-radius: 4px;
        cursor: pointer;
      }
      button:hover {
        background: #e0e0e0;
      }
    </style>
  `
);

const EventComponent = quickComponent(
  { 
    message: 'Click me!', 
    inputValue: '',
    items: ['apple', 'banana', 'cherry'],
    newItem: ''
  },
  `
    <h2>Event Test - {{message}}</h2>
    <button @click="message = message === 'Click me!' ? 'Clicked!' : 'Click me!'">
      {{message}}
    </button>
    
    <div style="margin: 15px 0;">
      <h3>Input Test</h3>
      <input @input="inputValue = $event.target.value" value="{{inputValue}}" placeholder="Type something...">
      <p>You typed: {{inputValue}} ({{inputValue.length}} chars)</p>
    </div>
    
    <div style="margin: 15px 0;">
      <h3>List Test ({{items.length}} items)</h3>
      <ul>
        {{items.map((item, index) => \`<li>{{item}} <button @click="items.splice({{index}}, 1)">×</button></li>\`).join('')}}
      </ul>
      <input @input="newItem = $event.target.value" value="{{newItem}}" placeholder="Add new item...">
      <button @click="newItem.trim() && (items.push(newItem.trim()), newItem = '')">Add Item</button>
    </div>
    
    <div style="margin: 15px 0;">
      <h3>Event Modifiers</h3>
      <form @submit.prevent="alert('Form submitted! Input: ' + inputValue)">
        <input value="{{inputValue}}" placeholder="Test form submission">
        <button type="submit">Submit (with .prevent)</button>
      </form>
    </div>
    
    <style>
      h2 { color: purple; }
      h3 { color: #666; font-size: 1.1em; }
      button { 
        padding: 8px 12px; 
        margin: 2px;
        background: #f0f0f0;
        border: 1px solid #ccc;
        border-radius: 4px;
        cursor: pointer;
      }
      button:hover {
        background: #e0e0e0;
      }
      input {
        padding: 6px;
        margin: 2px;
        border: 1px solid #ccc;
        border-radius: 3px;
      }
      ul {
        list-style-type: none;
        padding: 0;
      }
      li {
        padding: 4px;
        margin: 2px 0;
        background: #f5f5f5;
        border-radius: 3px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    </style>
  `
);

// Export components for direct use
(window as any).TestComponent = TestComponent;

console.log('Enhanced template components created successfully');
console.log('TestComponent:', TestComponent);
