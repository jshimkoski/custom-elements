/**
 * FormInputValidation: A form with input validation and error handling.
 * Demonstrates ctx, validation, and error feedback.
 */
import { component, html, css, when } from '../../lib/runtime';

component('form-input-validation', (ctx) => html`
  <form
    class="max-w-128 mx-auto p-8 rounded-lg shadow bg-white dark:bg-black text-black dark:text-white shadow-lg border border-neutral-100 dark:border-neutral-900"
    @submit="${ctx.submit}"
  >
    <fieldset>
      <legend class="text-2xl mb-8">Form Input Validation Demo</legend>
      <label class="flex flex-col items-start gap-2 w-full mb-6">
        <span class="font-semibold">Email:</span>
        <input
          #model="email"
          ref="emailInput"
          type="email"
          required
          class="w-full px-2 py-1 rounded border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-50 focus:bg-white dark:hover:bg-neutral-900 dark:focus:bg-black"
        />
      </label>
      <label class="flex flex-col items-start gap-2 w-full mb-6">
        <span class="font-semibold">Username:</span>
        <input
          #model="username"
          type="text"
          minlength="3"
          required
          class="w-full px-2 py-1 rounded border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-50 focus:bg-white dark:hover:bg-neutral-900 dark:focus:bg-black"
        />
      </label>
      <label class="flex flex-col items-start gap-2 w-full mb-6">
        <span class="font-semibold">Bio:</span>
        <textarea
          #model="bio"
          rows="3"
          minlength="10"
          required
          class="w-full px-2 py-1 rounded border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-50 focus:bg-white dark:hover:bg-neutral-900 dark:focus:bg-black"
        ></textarea>
      </label>
      <div class="flex flex-col items-start gap-2 w-full mb-6">
        <span class="font-semibold">Gender:</span>
        <label><input #model="gender" type="radio" value="male" name="gender" /> Male</label>
        <label><input #model="gender" type="radio" value="female" name="gender" /> Female</label>
        <label><input #model="gender" type="radio" value="other" name="gender" /> Other</label>
      </div>
      <label class="flex flex-col items-start gap-2 w-full mb-6">
        <span class="font-semibold">Subscribe:</span>
        <div>
          <input #model="subscribe" type="checkbox" /> Yes
        </div>
      </label>
      <div class="flex flex-col items-start gap-2 w-full mb-6">
        <span class="font-semibold">Favorite Fruits:</span>
        <label><input #model="fruits" type="checkbox" value="apple" /> Apple</label>
        <label><input #model="fruits" type="checkbox" value="banana" /> Banana</label>
        <label><input #model="fruits" type="checkbox" value="orange" /> Orange</label>
      </div>
      <label class="flex flex-col items-start gap-2 w-full mb-6">
        <span class="font-semibold">Country:</span>
        <select
          #model="country"
          class="w-full px-2 py-1 rounded border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-50 focus:bg-white dark:hover:bg-neutral-900 dark:focus:bg-black"
        >
          <option value="">Select...</option>
          <option value="us">United States</option>
          <option value="ca">Canada</option>
          <option value="uk">United Kingdom</option>
        </select>
      </label>
      ${when(ctx.error !== '', html`
        <div class="text-sm text-red-600 dark:text-red-400">${ctx.error}</div>
      `)}
      <button
        type="submit"
        class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:bg-blue-700"
      >Submit</button>
      ${when(ctx.success !== '', html`
        <div class="text-sm text-green-600 dark:text-green-400">${ctx.success}</div>
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
});
