/**
 * FormInputValidation: A form with input validation and error handling.
 * Demonstrates form.value, validation, and error feedback.
 */
import {
  component,
  html,
  ref,
  useOnConnected,
  useOnDisconnected,
} from '../../lib';
import { when } from '../../lib/directives';

component('form-input-validation', () => {
  const email = ref('');
  const username = ref('');
  const bio = ref('');
  const gender = ref('');
  const subscribe = ref(false);
  const fruits = ref<string[]>([]);
  const country = ref('');
  const errorMessage = ref('');
  const successMessage = ref('');
  const successTimer = ref<ReturnType<typeof setTimeout> | undefined>(undefined);

  const submit = (event: Event) => {
    event.preventDefault();
    // Ignore duplicate activation while a successful submission is being
    // announced. The first submit resets the fields, so processing a rapid
    // second click would otherwise replace the success status with a spurious
    // validation error from the freshly cleared form.
    if (successMessage.value) return;
    errorMessage.value = '';
    successMessage.value = '';
    // Email validation
    if (!email.value.trim().match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
      errorMessage.value = 'Please enter a valid email address.';
      return;
    }
    // Username validation
    if (username.value.trim().length < 3) {
      errorMessage.value = 'Username must be at least 3 characters.';
      return;
    }
    // Bio validation
    if (bio.value.trim().length < 10) {
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

    if (successTimer.value !== undefined) clearTimeout(successTimer.value);
    successTimer.value = setTimeout(() => {
      successMessage.value = '';
      successTimer.value = undefined;
    }, 3000);
  };

  const emailInput = ref<HTMLElement | null>(null);
  useOnConnected(() => {
    emailInput.value?.focus();
  });
  useOnDisconnected(() => {
    if (successTimer.value !== undefined) {
      clearTimeout(successTimer.value);
      successTimer.value = undefined;
    }
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
              required
            />
            Male</label
          >
          <label
            ><input
              :model="${gender}"
              type="radio"
              value="female"
              name="gender"
              required
            />
            Female</label
          >
          <label
            ><input
              :model="${gender}"
              type="radio"
              value="other"
              name="gender"
              required
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
            ><input
              :model="${fruits}"
              :required="${fruits.value.length === 0}"
              type="checkbox"
              value="apple"
            />
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
            required
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
            <div
              class="error mb-6 text-sm text-error-600 dark:text-error-400"
              role="alert"
              aria-live="assertive"
            >
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
            <div
              class="success mt-4 text-sm text-success-600 dark:text-success-400"
              role="status"
              aria-live="polite"
            >
              ${successMessage.value}
            </div>
          `,
        )}
      </fieldset>
    </form>
  `;
});
