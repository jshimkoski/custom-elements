import { component } from "./lib/runtime-v2";
import { html } from "./lib/template-compiler-v2";
import { vBind, vShow, vClass, vStyle } from "./lib/directives-v2";

// Test component to verify directive functionality
export const TestDirectives = component({
  name: "test-directives",

  state: {
    isVisible: true,
    dynamicClass: "active",
    hasError: false,
    width: 200,
    height: 100,
    backgroundColor: "lightblue",
    attributes: {
      disabled: true,
      placeholder: "Enter text",
      "data-test": "directive-test"
    },
    styles: {
      color: "red",
      fontSize: 16,
      marginTop: 10
    }
  },

  render() {
    return html`
      <div>
        <h2>Directive Tests</h2>

        <!-- v-show test -->
        <div v-show="${this.state.isVisible}">
          This div should be visible when isVisible is true
        </div>

        <!-- v-class with string -->
        <div v-class="${this.state.dynamicClass}">
          Dynamic class: ${this.state.dynamicClass}
        </div>

        <!-- v-class with object -->
        <div v-class="${{ active: this.state.dynamicClass === 'active', error: this.state.hasError }}">
          Conditional classes based on state
        </div>

        <!-- v-style with object -->
        <div v-style="${{ width: this.state.width, height: this.state.height, backgroundColor: this.state.backgroundColor }}">
          Dynamic styles: ${this.state.width}px x ${this.state.height}px
        </div>

        <!-- v-style with computed styles -->
        <div v-style="${this.state.styles}">
          Styles from state object
        </div>

        <!-- v-bind test -->
        <input v-bind="${this.state.attributes}" type="text" />

        <!-- Helper function tests -->
        <div ${vShow(this.state.isVisible)}>
          vShow helper function test
        </div>

        <div ${vClass(['base-class', this.state.dynamicClass, { 'error-class': this.state.hasError }])}>
          vClass helper with mixed array/object
        </div>

        <div ${vStyle({ color: 'blue', fontSize: this.state.styles.fontSize + 4 })}>
          vStyle helper function test
        </div>

        <input ${vBind({ placeholder: 'Helper function bind', disabled: this.state.attributes.disabled })} />

        <!-- Control buttons -->
        <div style="margin-top: 20px;">
          <button @click="${() => { this.state.isVisible = !this.state.isVisible; }}">
            Toggle Visibility
          </button>

          <button @click="${() => { this.state.hasError = !this.state.hasError; }}">
            Toggle Error State
          </button>

          <button @click="${() => {
            this.state.dynamicClass = this.state.dynamicClass === 'active' ? 'inactive' : 'active';
          }}">
            Toggle Class
          </button>

          <button @click="${() => {
            this.state.width = this.state.width === 200 ? 300 : 200;
            this.state.height = this.state.height === 100 ? 150 : 100;
          }}">
            Toggle Size
          </button>

          <button @click="${() => {
            this.state.backgroundColor = this.state.backgroundColor === 'lightblue' ? 'lightgreen' : 'lightblue';
          }}">
            Toggle Background Color
          </button>
        </div>

        <!-- v-model test -->
        <div style="margin-top: 20px;">
          <h3>v-model Tests</h3>
          <input v-model="textValue" placeholder="Type here..." />
          <p>Text value: ${this.state.textValue || 'empty'}</p>

          <label>
            <input type="checkbox" v-model="checkboxValue" />
            Checkbox (${this.state.checkboxValue || 'false'})
          </label>

          <div>
            <label><input type="radio" v-model="radioValue" value="option1" /> Option 1</label>
            <label><input type="radio" v-model="radioValue" value="option2" /> Option 2</label>
            <p>Radio value: ${this.state.radioValue || 'none selected'}</p>
          </div>

          <select v-model="selectValue">
            <option value="">Choose...</option>
            <option value="red">Red</option>
            <option value="blue">Blue</option>
            <option value="green">Green</option>
          </select>
          <p>Select value: ${this.state.selectValue || 'none selected'}</p>
        </div>
      </div>
    `;
  }
});

// Initialize additional state for v-model tests
TestDirectives.prototype.state.textValue = "";
TestDirectives.prototype.state.checkboxValue = false;
TestDirectives.prototype.state.radioValue = "";
TestDirectives.prototype.state.selectValue = "";
