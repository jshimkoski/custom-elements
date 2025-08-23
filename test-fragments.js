import { component } from "./src/lib/runtime.js";
import { html } from "./src/lib/template-compiler.js";
import { vFor } from "./src/lib/directives.js";

// Test component to verify fragment support in vFor
component("fragment-test", {
  state: {
    items: ["apple", "banana", "cherry"],
    selectedItems: [],
  },

  methods: {
    toggleItem(item) {
      const index = this.state.selectedItems.indexOf(item);
      if (index > -1) {
        this.state.selectedItems.splice(index, 1);
      } else {
        this.state.selectedItems.push(item);
      }
    },
  },

  render() {
    return html`
      <div>
        <h2>Fragment Support Test</h2>
        <p>This should render items with fragments (no wrapper divs):</p>

        <div class="fragment-list">
          ${vFor(
            this.state.items,
            (item) => html`
              ${item}:
              <input type="checkbox" value="${item}" data-bind="array" />
            `,
          )}
        </div>

        <h3>Self-Closing Input Only Test</h3>
        <div class="self-closing-test">
          ${vFor(
            this.state.items,
            (item) => html`
              <input type="checkbox" value="${item}" data-bind="array" />
            `,
          )}
        </div>

        <p>Selected items: ${this.state.selectedItems.join(", ")}</p>

        <h3>Multiple Root Nodes Test</h3>
        <div class="multi-root">
          ${vFor(
            this.state.items,
            (item, index) => html`
              <span class="item-label">${index + 1}.</span>
              <strong>${item}</strong>
              <span class="separator"> | </span>
            `,
          )}
        </div>

        <h3>Mixed Content Test</h3>
        <div class="mixed-content">
          ${vFor(
            this.state.items,
            (item) => html`
              Item: ${item}
              <button @click="${() => this.toggleItem(item)}">
                ${this.state.selectedItems.includes(item)
                  ? "Unselect"
                  : "Select"}
              </button>
              <hr />
            `,
          )}
        </div>
      </div>
    `;
  },

  style: `
    .fragment-list {
      border: 1px solid #ccc;
      padding: 10px;
      margin: 10px 0;
    }

    .multi-root {
      border: 1px solid #999;
      padding: 10px;
      margin: 10px 0;
    }

    .mixed-content {
      border: 1px solid #666;
      padding: 10px;
      margin: 10px 0;
    }

    .self-closing-test {
      border: 1px solid #333;
      padding: 10px;
      margin: 10px 0;
    }

    .item-label {
      color: blue;
      font-weight: bold;
    }

    .separator {
      color: #ccc;
    }

    button {
      margin: 0 5px;
      padding: 2px 8px;
    }

    hr {
      margin: 5px 0;
      border: none;
      border-top: 1px solid #eee;
    }
  `,
});
