import { component, html, css } from '../../lib/runtime';

component('data-model-demo', {
  state: {
    text: '',
    checked: ['checked1'],
    checkedSingle: true,
    checkedSingleCustom: 'awesome',
    radio: 'option1',
    textarea: '',
    select: 'b',
    number: 0
  },
  template: (state) => html`
    <div>
      <form class="demo-form">
        <label>
          Text Input:
          <input type="text" data-model="text|trim" placeholder="Type here..." />
        </label>
        <label>
          Checkbox:
          <input type="checkbox" value="checked1" data-model="checked" />
          <input type="checkbox" value="checked2" data-model="checked" />
          <span>${state.checked.join(', ')}</span>
          Checkbox single:
          <input type="checkbox" data-model="checkedSingle" />
          Checkbox single custom:
          <input
            type="checkbox"
            data-model="checkedSingleCustom"
            data-true-value="awesome"
            data-false-value="not awesome"
          />
        </label>
        <fieldset>
          <legend>Radio Group:</legend>
          <label>
            <input type="radio" name="radio" value="option1" data-model="radio" /> Option 1
          </label>
          <label>
            <input type="radio" name="radio" value="option2" data-model="radio" /> Option 2
          </label>
          <span>Selected: ${state.radio}</span>
        </fieldset>
        <label>
          Textarea:
          <textarea data-model="textarea"></textarea>
        </label>
        <label>
          Select:
          <select data-model="select">
            <option value="a">A</option>
            <option value="b">B</option>
            <option value="c">C</option>
          </select>
          <span>Selected: ${state.select}</span>
        </label>
        <label>
          Number Input:
          <input type="number" data-model="number|number" />
          <span>Value: ${state.number}</span>
        </label>
      </form>
      <pre>${JSON.stringify(state, null, 2)}</pre>
    </div>
  `(state),
  style: css`
    .demo-form { display: grid; gap: 1rem; max-width: 400px; margin: 2rem auto; padding: 1rem; border-radius: 8px; background: #fafafa; }
    label, fieldset { display: flex; flex-direction: column; gap: 0.5rem; }
    input, textarea, select { font-size: 1rem; padding: 0.5rem; border-radius: 4px; border: 1px solid #ddd; }
    pre { background: #f0f0f0; padding: 1rem; border-radius: 4px; font-size: 0.9rem; }
  `
});
