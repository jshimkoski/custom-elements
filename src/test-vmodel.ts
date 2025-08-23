import { component } from "./lib/runtime";
import { html } from "./lib/template-compiler";
import { vModel } from "./lib/directives";

export const TestVModel = component({
  name: "test-vmodel",

  state: {
    textInput: "Hello World",
    numberInput: 42,
    checkboxValue: true,
    radioValue: "option1",
    selectValue: "blue",
    textareaValue: "Multi-line\ntext content",
    rangeValue: 50,

    // Nested object for testing nested property binding
    user: {
      name: "John Doe",
      email: "john@example.com",
      preferences: {
        theme: "dark",
        notifications: true
      }
    },

    // Array for testing multi-checkbox binding
    selectedItems: ["item1", "item3"],

    renderCount: 0
  },

  render() {
    // Track render count to detect infinite loops
    this.state.renderCount++;

    return html`
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h2>vModel Test Component</h2>
        <p style="color: ${this.state.renderCount > 100 ? 'red' : 'green'};">
          Render count: ${this.state.renderCount}
          ${this.state.renderCount > 100 ? ' (INFINITE LOOP DETECTED!)' : ' (Normal)'}
        </p>

        <div style="margin-bottom: 20px;">
          <h3>Text Input Tests</h3>

          <!-- Basic text input -->
          <div style="margin-bottom: 10px;">
            <label>Text Input: </label>
            <input type="text" #model="textInput" placeholder="Enter text..." />
            <span>Value: "${this.state.textInput}"</span>
          </div>

          <!-- Helper function usage -->
          <div style="margin-bottom: 10px;">
            <label>Text Input (Helper): </label>
            <input
              type="text"
              ${vModel(this.state.textInput, (val) => { this.state.textInput = val; })}
              placeholder="Using vModel helper"
            />
          </div>

          <!-- Nested property binding -->
          <div style="margin-bottom: 10px;">
            <label>User Name: </label>
            <input type="text" #model="user.name" />
            <span>Value: "${this.state.user.name}"</span>
          </div>

          <div style="margin-bottom: 10px;">
            <label>User Email: </label>
            <input type="email" #model="user.email" />
            <span>Value: "${this.state.user.email}"</span>
          </div>

          <!-- Deep nested property -->
          <div style="margin-bottom: 10px;">
            <label>Theme Preference: </label>
            <select #model="user.preferences.theme">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
            <span>Value: "${this.state.user.preferences.theme}"</span>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <h3>Number Input Tests</h3>

          <div style="margin-bottom: 10px;">
            <label>Number Input: </label>
            <input type="number" #model="numberInput" min="0" max="100" />
            <span>Value: ${this.state.numberInput} (Type: ${typeof this.state.numberInput})</span>
          </div>

          <div style="margin-bottom: 10px;">
            <label>Range Input: </label>
            <input type="range" #model="rangeValue" min="0" max="100" />
            <span>Value: ${this.state.rangeValue}</span>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <h3>Checkbox Tests</h3>

          <!-- Single checkbox -->
          <div style="margin-bottom: 10px;">
            <label>
              <input type="checkbox" #model="checkboxValue" />
              Single Checkbox (${this.state.checkboxValue})
            </label>
          </div>

          <!-- Nested checkbox -->
          <div style="margin-bottom: 10px;">
            <label>
              <input type="checkbox" #model="user.preferences.notifications" />
              Notifications (${this.state.user.preferences.notifications})
            </label>
          </div>

          <!-- Multiple checkboxes bound to array -->
          <div style="margin-bottom: 10px;">
            <p>Selected Items: [${this.state.selectedItems.join(', ')}]</p>
            <label><input type="checkbox" #model="selectedItems" value="item1" /> Item 1</label><br>
            <label><input type="checkbox" #model="selectedItems" value="item2" /> Item 2</label><br>
            <label><input type="checkbox" #model="selectedItems" value="item3" /> Item 3</label><br>
            <label><input type="checkbox" #model="selectedItems" value="item4" /> Item 4</label>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <h3>Radio Button Tests</h3>

          <div style="margin-bottom: 10px;">
            <p>Selected Option: "${this.state.radioValue}"</p>
            <label><input type="radio" #model="radioValue" value="option1" /> Option 1</label><br>
            <label><input type="radio" #model="radioValue" value="option2" /> Option 2</label><br>
            <label><input type="radio" #model="radioValue" value="option3" /> Option 3</label>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <h3>Select Tests</h3>

          <div style="margin-bottom: 10px;">
            <label>Color Selection: </label>
            <select #model="selectValue">
              <option value="">Choose a color...</option>
              <option value="red">Red</option>
              <option value="blue">Blue</option>
              <option value="green">Green</option>
              <option value="yellow">Yellow</option>
            </select>
            <span>Selected: "${this.state.selectValue}"</span>
          </div>

          <!-- Multiple select -->
          <div style="margin-bottom: 10px;">
            <label>Multiple Selection: </label>
            <select #model="selectedItems" multiple size="4">
              <option value="item1">Item 1</option>
              <option value="item2">Item 2</option>
              <option value="item3">Item 3</option>
              <option value="item4">Item 4</option>
            </select>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <h3>Textarea Test</h3>

          <div style="margin-bottom: 10px;">
            <label>Textarea: </label><br>
            <textarea #model="textareaValue" rows="4" cols="50" placeholder="Enter multi-line text..."></textarea>
            <div style="border: 1px solid #ccc; padding: 10px; margin-top: 5px; white-space: pre-wrap;">
              ${this.state.textareaValue}
            </div>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <h3>Control Buttons</h3>

          <button @click="${() => { this.state.textInput = 'Reset Value'; }}">
            Reset Text Input
          </button>

          <button @click="${() => { this.state.numberInput = Math.floor(Math.random() * 100); }}">
            Random Number
          </button>

          <button @click="${() => { this.state.checkboxValue = !this.state.checkboxValue; }}">
            Toggle Checkbox
          </button>

          <button @click="${() => { this.state.renderCount = 0; }}">
            Reset Render Count
          </button>

          <button @click="${() => {
            this.state.selectedItems = this.state.selectedItems.length > 0 ? [] : ['item1', 'item2'];
          }}">
            Toggle Array Selection
          </button>
        </div>

        <div style="border-top: 1px solid #ccc; padding-top: 20px;">
          <h3>Debug Information</h3>
          <pre style="background: #f5f5f5; padding: 10px; font-size: 12px;">
State:
${JSON.stringify({
  textInput: this.state.textInput,
  numberInput: this.state.numberInput,
  checkboxValue: this.state.checkboxValue,
  radioValue: this.state.radioValue,
  selectValue: this.state.selectValue,
  textareaValue: this.state.textareaValue.substring(0, 50) + (this.state.textareaValue.length > 50 ? '...' : ''),
  rangeValue: this.state.rangeValue,
  user: this.state.user,
  selectedItems: this.state.selectedItems,
  renderCount: this.state.renderCount
}, null, 2)}
          </pre>
        </div>
      </div>
    `;
  }
});
