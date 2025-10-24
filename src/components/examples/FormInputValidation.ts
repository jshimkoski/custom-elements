/**
 * FormInputValidation: A form with input validation and error handling.
 * Demonstrates form.value, validation, and error feedback.
 */
import { component, html, ref, useOnConnected } from '../../lib';
import { when } from '../../lib/directives';

component('form-input-validation', () => {
  const email = ref('');
  const username = ref('');
  const bio = ref('');
  const gender = ref('');
  const subscribe = ref(false);
  const fruits = ref([]);
  const country = ref('');
  const errorMessage = ref('');
  const successMessage = ref('');

  const submit = async (event: Event) => {
    event.preventDefault();
    errorMessage.value = '';
    successMessage.value = '';
    // Email validation
    if (!email.value.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
      errorMessage.value = 'Please enter a valid email address.';
      return;
    }
    // Username validation
    if (!username.value || username.value.length < 3) {
      errorMessage.value = 'Username must be at least 3 characters.';
      return;
    }
    // Bio validation
    if (!bio.value || bio.value.length < 10) {
      errorMessage.value = 'Bio must be at least 10 characters.';
      return;
    }
    // Gender validation
    if (!gender.value) {
      errorMessage.value = 'Please select a gender.';
      return;
    }
    // Fruits validation (at least one)
    if (!Array.isArray(fruits.value) || fruits.value.length === 0) {
      errorMessage.value = 'Please select at least one favorite fruit.';
      return;
    }
    // Country validation
    if (!country.value) {
      errorMessage.value = 'Please select a country.';
      return;
    }
    successMessage.value = 'Form submitted successfully!';
    // Reset form fields
    email.value = '';
    username.value = '';
    bio.value = '';
    gender.value = '';
    subscribe.value = false;
    fruits.value = [];
    country.value = '';

    await setTimeout(() => {
      successMessage.value = '';
    }, 3000);
  };

  const emailInput = ref<HTMLElement | null>(null);
  useOnConnected(() => {
    emailInput.value?.focus();
  });

  return html`
    <form
      class="max-w-128 mx-auto p-8 rounded-lg bg-white dark:bg-black text-black dark:text-white shadow-lg border border-neutral-100 dark:border-neutral-900"
      @submit="${submit}"
    >
      <fieldset>
        <legend class="text-2xl font-medium mb-8">
          Form Input Validation Demo
        </legend>
        <label class="flex flex-col items-start gap-2 w-full mb-6">
          <span class="font-semibold">Email:</span>
          <input
            :model="${email}"
            :ref="${emailInput}"
            type="email"
            required
            class="w-full px-2 py-1 rounded-sm border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-50 focus:bg-white dark:hover:bg-neutral-900 dark:focus:bg-black"
          />
        </label>
        <label class="flex flex-col items-start gap-2 w-full mb-6">
          <span class="font-semibold">Username:</span>
          <input
            :model="${username}"
            type="text"
            minlength="3"
            required
            class="w-full px-2 py-1 rounded-sm border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-50 focus:bg-white dark:hover:bg-neutral-900 dark:focus:bg-black"
          />
        </label>
        <label class="flex flex-col items-start gap-2 w-full mb-6">
          <span class="font-semibold">Bio:</span>
          <textarea
            :model="${bio}"
            rows="3"
            minlength="10"
            required
            class="w-full px-2 py-1 rounded-sm border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-50 focus:bg-white dark:hover:bg-neutral-900 dark:focus:bg-black"
          ></textarea>
        </label>
        <div class="flex flex-col items-start gap-2 w-full mb-6">
          <span class="font-semibold">Gender:</span>
          <label
            ><input
              :model="${gender}"
              type="radio"
              value="male"
              name="gender"
            />
            Male</label
          >
          <label
            ><input
              :model="${gender}"
              type="radio"
              value="female"
              name="gender"
            />
            Female</label
          >
          <label
            ><input
              :model="${gender}"
              type="radio"
              value="other"
              name="gender"
            />
            Other</label
          >
        </div>
        <label class="flex flex-col items-start gap-2 w-full mb-6">
          <span class="font-semibold">Subscribe:</span>
          <div><input :model="${subscribe}" type="checkbox" /> Yes</div>
        </label>
        <div class="flex flex-col items-start gap-2 w-full mb-6">
          <span class="font-semibold">Favorite Fruits:</span>
          <label
            ><input :model="${fruits}" type="checkbox" value="apple" />
            Apple</label
          >
          <label
            ><input :model="${fruits}" type="checkbox" value="banana" />
            Banana</label
          >
          <label
            ><input :model="${fruits}" type="checkbox" value="orange" />
            Orange</label
          >
        </div>
        <label class="flex flex-col items-start gap-2 w-full mb-6">
          <span class="font-semibold">Country:</span>
          <select
            :model="${country}"
            class="w-full px-2 py-1 rounded-sm border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-50 focus:bg-white dark:hover:bg-neutral-900 dark:focus:bg-black"
          >
            <option value="">Select...</option>
            <option value="us">United States</option>
            <option value="ca">Canada</option>
            <option value="uk">United Kingdom</option>
          </select>
        </label>
        ${when(
          errorMessage.value !== '',
          html`
            <div class="mb-6 text-sm text-error-600 dark:text-error-400">
              ${errorMessage.value}
            </div>
          `,
        )}
        <button
          type="submit"
          class="px-4 py-2 bg-primary-600 text-white rounded-sm hover:bg-primary-500 focus:bg-primary-500"
        >
          Submit
        </button>
        ${when(
          successMessage.value !== '',
          html`
            <div class="mt-4 text-sm text-success-600 dark:text-success-400">
              ${successMessage.value}
            </div>
          `,
        )}
      </fieldset>
    </form>
  `;
});
