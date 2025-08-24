/**
 * FormInputValidation: A form with input validation and error handling.
 * Demonstrates state, validation, and error feedback.
 */
import { component, html, css, when } from '../../lib/runtime';

component('form-input-validation', (state) => html`
  <form @submit="${state.submit}">
    <fieldset>
      <legend>Form Input Validation Demo</legend>
      <label>
        Email:
        <input #model="email" type="email" required />
      </label>
      <label>
        Username:
        <input #model="username" type="text" minlength="3" required />
      </label>
      <label>
        Bio:
        <textarea #model="bio" rows="3" minlength="10" required></textarea>
      </label>
      <label>
        Gender:
        <input #model="gender" type="radio" value="male" name="gender" /> Male
        <input #model="gender" type="radio" value="female" name="gender" /> Female
        <input #model="gender" type="radio" value="other" name="gender" /> Other
      </label>
      <label>
        Subscribe:
        <input #model="subscribe" type="checkbox" /> Yes
      </label>
      <label>
        Favorite Fruits:
        <input #model="fruits" type="checkbox" value="apple" /> Apple
        <input #model="fruits" type="checkbox" value="banana" /> Banana
        <input #model="fruits" type="checkbox" value="orange" /> Orange
      </label>
      <label>
        Country:
        <select #model="country">
          <option value="">Select...</option>
          <option value="us">United States</option>
          <option value="ca">Canada</option>
          <option value="uk">United Kingdom</option>
        </select>
      </label>
      ${when(state.error !== '', html`
        <div class="error">${state.error}</div>
      `)}
      <button type="submit">Submit</button>
      ${when(state.success !== '', html`
        <div class="success">${state.success}</div>
      `)}
    </fieldset>
  </form>
`, {
  state: {
    email: '',
    username: '',
    bio: '',
    gender: '',
    subscribe: false,
    fruits: [],
    country: '',
    error: '',
    success: '',
  },
  async submit(event, state) {
    event.preventDefault();
    state.error = '';
    state.success = '';
    // Email validation
    if (!state.email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
      state.error = 'Please enter a valid email address.';
      return;
    }
    // Username validation
    if (!state.username || state.username.length < 3) {
      state.error = 'Username must be at least 3 characters.';
      return;
    }
    // Bio validation
    if (!state.bio || state.bio.length < 10) {
      state.error = 'Bio must be at least 10 characters.';
      return;
    }
    // Gender validation
    if (!state.gender) {
      state.error = 'Please select a gender.';
      return;
    }
    // Country validation
    if (!state.country) {
      state.error = 'Please select a country.';
      return;
    }
    // Fruits validation (at least one)
    if (!Array.isArray(state.fruits) || state.fruits.length === 0) {
      state.error = 'Please select at least one favorite fruit.';
      return;
    }
    state.success = 'Form submitted successfully!';
    // Reset form fields
    state.email = '';
    state.username = '';
    state.bio = '';
    state.gender = '';
    state.subscribe = false;
    state.fruits = [];
    state.country = '';

    await setTimeout(() => {
      state.success = '';
    }, 3000);
  },
  style: css`
    form {
      max-width: 400px;
      margin: 2rem auto;
      padding: 2rem;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
      font-family: system-ui, sans-serif;
    }
    fieldset {
      border: none;
      padding: 0;
      margin: 0 0 1rem 0;
    }
    legend {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    label {
      display: block;
      margin-bottom: 1rem;
      font-weight: 500;
    }
    input, textarea, select {
      display: block;
      width: 100%;
      padding: 0.5rem;
      margin-top: 0.25rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 1rem;
      box-sizing: border-box;
    }
    input[type="checkbox"], input[type="radio"] {
      display: inline-block;
      width: auto;
      margin-right: 0.5rem;
    }
    button[type="submit"] {
      background: #0078d4;
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 0.6rem 1.2rem;
      font-size: 1rem;
      cursor: pointer;
      margin-top: 1rem;
      transition: background 0.2s;
    }
    button[type="submit"]:hover {
      background: #005fa3;
    }
    .error {
      color: red;
      font-size: 0.9em;
      margin-top: 0.5rem;
    }
    .success {
      color: green;
      font-size: 0.9em;
      margin-top: 0.5rem;
    }
  `
});
