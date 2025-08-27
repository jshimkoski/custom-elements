/**
 * FormInputValidation: A form with input validation and error handling.
 * Demonstrates ctx, validation, and error feedback.
 */
import { component, html, css, when } from '../../lib/runtime';

component('form-input-validation', (ctx) => html`
  <form @submit="${ctx.submit}">
    <fieldset>
      <legend>Form Input Validation Demo</legend>
      <label>
        Email:
        <input #model="email" ref="emailInput" type="email" required />
      </label>
      <label>
        Username:
        <input #model="username" type="text" minlength="3" required />
      </label>
      <label>
        Bio:
        <textarea #model="bio" rows="3" minlength="10" required></textarea>
      </label>
      <div>
        Gender:
        <label><input #model="gender" type="radio" value="male" name="gender" /> Male</label>
        <label><input #model="gender" type="radio" value="female" name="gender" /> Female</label>
        <label><input #model="gender" type="radio" value="other" name="gender" /> Other</label>
      </div>
      <label>
        Subscribe:
        <input #model="subscribe" type="checkbox" /> Yes
      </label>
      <div>
        Favorite Fruits:
        <label><input #model="fruits" type="checkbox" value="apple" /> Apple</label>
        <label><input #model="fruits" type="checkbox" value="banana" /> Banana</label>
        <label><input #model="fruits" type="checkbox" value="orange" /> Orange</label>
      </div>
      <label>
        Country:
        <select #model="country">
          <option value="">Select...</option>
          <option value="us">United States</option>
          <option value="ca">Canada</option>
          <option value="uk">United Kingdom</option>
        </select>
      </label>
      ${when(ctx.error !== '', html`
        <div class="error">${ctx.error}</div>
      `)}
      <button type="submit">Submit</button>
      ${when(ctx.success !== '', html`
        <div class="success">${ctx.success}</div>
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
  async onConnected(ctx) {
    console.log("Verifying refs", ctx.refs);
    ctx.refs.emailInput?.focus();
  },
  async submit(event, ctx) {
    event.preventDefault();
    ctx.error = '';
    ctx.success = '';
    // Email validation
    if (!ctx.email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
      ctx.error = 'Please enter a valid email address.';
      return;
    }
    // Username validation
    if (!ctx.username || ctx.username.length < 3) {
      ctx.error = 'Username must be at least 3 characters.';
      return;
    }
    // Bio validation
    if (!ctx.bio || ctx.bio.length < 10) {
      ctx.error = 'Bio must be at least 10 characters.';
      return;
    }
    // Gender validation
    if (!ctx.gender) {
      ctx.error = 'Please select a gender.';
      return;
    }
    // Country validation
    if (!ctx.country) {
      ctx.error = 'Please select a country.';
      return;
    }
    // Fruits validation (at least one)
    if (!Array.isArray(ctx.fruits) || ctx.fruits.length === 0) {
      ctx.error = 'Please select at least one favorite fruit.';
      return;
    }
    ctx.success = 'Form submitted successfully!';
    // Reset form fields
    ctx.email = '';
    ctx.username = '';
    ctx.bio = '';
    ctx.gender = '';
    ctx.subscribe = false;
    ctx.fruits = [];
    ctx.country = '';

    await setTimeout(() => {
      ctx.success = '';
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
