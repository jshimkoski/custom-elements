import { component, html, css, type ComponentState, Store } from '../../lib/runtime';

// ============================================================================
// REACTIVE FORM EXAMPLE - Comprehensive form field reactivity
// ============================================================================

interface FormState extends ComponentState {
  // Text inputs
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  url: string;
  search: string;
  
  // Numbers and ranges
  age: number;
  salary: number;
  rating: number;
  
  // Dates and times
  birthDate: string;
  appointmentTime: string;
  meetingDateTime: string;
  
  // Selections
  country: string;
  favoriteColors: string[];
  gender: string;
  newsletter: boolean;
  terms: boolean;
  
  // Text areas
  bio: string;
  comments: string;
  
  // File
  profilePicture: string;
  
  // Form state
  isValid: boolean;
  errors: Record<string, string>;
  submitCount: number;
}

// Create a global store to demonstrate external state updates
const externalFormStore = new Store({
  formData: {
    firstName: 'External',
    lastName: 'User',
    age: 25,
    newsletter: true,
    bio: 'This is an external biography loaded from an external data source. It demonstrates how reactive forms can sync with external state management systems.',
    comments: 'This is external comment data loaded from an external store.'
  }
});

component<FormState>({
  tag: 'reactive-form',

  state: (() => {
    const firstName = '';
    const lastName = '';
    const email = '';
    const password = '';
    const phone = '';
    const url = '';
    const search = '';
    const age = 18;
    const salary = 50000;
    const rating = 5;
    const birthDate = '';
    const appointmentTime = '';
    const meetingDateTime = '';
    const country = '';
    const favoriteColors = [] as string[];
    const gender = '';
    const newsletter = false;
    const terms = false;
    const bio = '';
    const comments = '';
    const profilePicture = '';
    const isValid = false;
    const errors = {};
    const submitCount = 0;
    return {
      firstName,
      lastName,
      email,
      password,
      phone,
      url,
      search,
      age,
      salary,
      rating,
      birthDate,
      appointmentTime,
      meetingDateTime,
      country,
      favoriteColors,
      gender,
      newsletter,
      terms,
      bio,
      comments,
      profilePicture,
      isValid,
      errors,
      submitCount,
      get fullName() {
        return `${this.firstName} ${this.lastName}`.trim();
      },
      get formProgress() {
        const fields = [
          this.firstName, this.lastName, this.email, this.password,
          this.phone, this.birthDate, this.country, this.bio
        ];
        const filled = fields.filter(f => f && f.toString().length > 0).length;
        return Math.round((filled / fields.length) * 100);
      },
      get estimatedSalary() {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(this.salary);
      },
      canSubmit: () => {
        return firstName.length > 0 && 
              lastName.length > 0 && 
              email.includes('@') && 
              terms;
      },
      validationSummary: () => {
        const errorCount = Object.keys(errors).length;
        if (errorCount === 0) return 'All fields are valid ✓';
        return `${errorCount} validation error${errorCount === 1 ? '' : 's'}`;
      }
    };
  })(),

  refs: {
    // Text inputs with validation
    firstNameInput: (el, state, api) => {
      const input = el as HTMLInputElement;
      
      const validateAndUpdate = () => {
        const value = input.value;
        api.updateKey('firstName', value);
        
        // Validation
        const errors = { ...state.errors };
        if (value.length === 0) {
          errors.firstName = 'First name is required';
        } else if (value.length < 2) {
          errors.firstName = 'First name must be at least 2 characters';
        } else {
          delete errors.firstName;
        }
        api.updateKey('errors', errors);
      };
      
      input.addEventListener('input', validateAndUpdate);
      input.addEventListener('blur', validateAndUpdate);
    },

    lastNameInput: (el, state, api) => {
      const input = el as HTMLInputElement;
      
      const validateAndUpdate = () => {
        const value = input.value;
        api.updateKey('lastName', value);
        
        const errors = { ...state.errors };
        if (value.length === 0) {
          errors.lastName = 'Last name is required';
        } else {
          delete errors.lastName;
        }
        api.updateKey('errors', errors);
      };
      
      input.addEventListener('input', validateAndUpdate);
      input.addEventListener('blur', validateAndUpdate);
    },

    emailInput: (el, state, api) => {
      const input = el as HTMLInputElement;
      
      const validateAndUpdate = () => {
        const value = input.value;
        api.updateKey('email', value);
        
        const errors = { ...state.errors };
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value.length === 0) {
          errors.email = 'Email is required';
        } else if (!emailRegex.test(value)) {
          errors.email = 'Please enter a valid email address';
        } else {
          delete errors.email;
        }
        api.updateKey('errors', errors);
      };
      
      input.addEventListener('input', validateAndUpdate);
      input.addEventListener('blur', validateAndUpdate);
    },

    passwordInput: (el, state, api) => {
      const input = el as HTMLInputElement;
      
      const validateAndUpdate = () => {
        const value = input.value;
        api.updateKey('password', value);
        
        const errors = { ...state.errors };
        if (value.length < 8) {
          errors.password = 'Password must be at least 8 characters';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          errors.password = 'Password must contain uppercase, lowercase, and number';
        } else {
          delete errors.password;
        }
        api.updateKey('errors', errors);
      };
      
      input.addEventListener('input', validateAndUpdate);
      input.addEventListener('blur', validateAndUpdate);
    },

    phoneInput: (el, _state, api) => {
      const input = el as HTMLInputElement;
      input.addEventListener('input', () => {
        api.updateKey('phone', input.value);
      });
    },

    urlInput: (el, _state, api) => {
      const input = el as HTMLInputElement;
      input.addEventListener('input', () => {
        api.updateKey('url', input.value);
      });
    },

    searchInput: (el, _state, api) => {
      const input = el as HTMLInputElement;
      input.addEventListener('input', () => {
        api.updateKey('search', input.value);
      });
    },

    ageInput: (el, _state, api) => {
      const input = el as HTMLInputElement;
      input.addEventListener('input', () => {
        api.updateKey('age', parseInt(input.value, 10) || 0);
      });
    },

    salaryRange: (el, _state, api) => {
      const input = el as HTMLInputElement;
      input.addEventListener('input', () => {
        api.updateKey('salary', parseInt(input.value, 10) || 0);
      });
    },

    ratingRange: (el, _state, api) => {
      const input = el as HTMLInputElement;
      input.addEventListener('input', () => {
        api.updateKey('rating', parseInt(input.value, 10) || 0);
      });
    },

    birthDateInput: (el, _state, api) => {
      const input = el as HTMLInputElement;
      input.addEventListener('change', () => {
        api.updateKey('birthDate', input.value);
      });
    },

    appointmentTimeInput: (el, _state, api) => {
      const input = el as HTMLInputElement;
      input.addEventListener('change', () => {
        api.updateKey('appointmentTime', input.value);
      });
    },

    meetingDateTimeInput: (el, _state, api) => {
      const input = el as HTMLInputElement;
      input.addEventListener('change', () => {
        api.updateKey('meetingDateTime', input.value);
      });
    },

    countrySelect: (el, _state, api) => {
      const select = el as HTMLSelectElement;
      select.addEventListener('change', () => {
        api.updateKey('country', select.value);
      });
    },

    colorCheckboxes: (el, state, api) => {
      const container = el as HTMLElement;
      container.addEventListener('change', (e) => {
        const checkbox = e.target as HTMLInputElement;
        if (checkbox.type === 'checkbox') {
          const color = checkbox.value;
          const colors = [...state.favoriteColors];
          
          if (checkbox.checked && !colors.includes(color)) {
            colors.push(color);
          } else if (!checkbox.checked && colors.includes(color)) {
            colors.splice(colors.indexOf(color), 1);
          }
          
          api.updateKey('favoriteColors', colors);
        }
      });
    },

    genderRadios: (el, _state, api) => {
      const container = el as HTMLElement;
      container.addEventListener('change', (e) => {
        const radio = e.target as HTMLInputElement;
        if (radio.type === 'radio' && radio.checked) {
          api.updateKey('gender', radio.value);
        }
      });
    },

    newsletterCheckbox: (el, _state, api) => {
      const checkbox = el as HTMLInputElement;
      checkbox.addEventListener('change', () => {
        api.updateKey('newsletter', checkbox.checked);
      });
    },

    termsCheckbox: (el, _state, api) => {
      const checkbox = el as HTMLInputElement;
      checkbox.addEventListener('change', () => {
        api.updateKey('terms', checkbox.checked);
      });
    },

    bioTextarea: (el, _state, api) => {
      const textarea = el as HTMLTextAreaElement;
      textarea.addEventListener('input', () => {
        api.updateKey('bio', textarea.value);
      });
    },

    commentsTextarea: (el, _state, api) => {
      const textarea = el as HTMLTextAreaElement;
      textarea.addEventListener('input', () => {
        api.updateKey('comments', textarea.value);
      });
    },

    fileInput: (el, _state, api) => {
      const input = el as HTMLInputElement;
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        api.updateKey('profilePicture', file ? file.name : '');
      });
    },

    submitBtn: (el, state, api) => {
      const btn = el as HTMLButtonElement;
      btn.addEventListener('click', () => {
        api.updateKey('submitCount', state.submitCount + 1);
        api.emit('form-submit', { 
          ...state, 
          submitTime: new Date().toISOString() 
        });
      });
    },

    resetBtn: (el, _state, api) => {
      const btn = el as HTMLButtonElement;
      btn.addEventListener('click', () => {
        // Reset all form fields
        api.update({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          phone: '',
          url: '',
          search: '',
          age: 18,
          salary: 50000,
          rating: 5,
          birthDate: '',
          appointmentTime: '',
          meetingDateTime: '',
          country: '',
          favoriteColors: [],
          gender: '',
          newsletter: false,
          terms: false,
          bio: '',
          comments: '',
          profilePicture: '',
          errors: {}
        });
      });
    },

    // External update buttons
    externalUpdateBtn: (el, _state, api) => {
      const btn = el as HTMLButtonElement;
      btn.addEventListener('click', () => {
        // Update from external store
        const externalData = externalFormStore.getState().formData;
        api.update({
          firstName: externalData.firstName,
          lastName: externalData.lastName,
          age: externalData.age,
          newsletter: externalData.newsletter,
          bio: externalData.bio,
          comments: externalData.comments
        });
      });
    },

    randomizeBtn: (el, _state, api) => {
      const btn = el as HTMLButtonElement;
      btn.addEventListener('click', () => {
        const countries = ['US', 'CA', 'UK', 'FR', 'DE', 'JP', 'AU'];
        const colors = ['red', 'blue', 'green', 'yellow'];
        const genders = ['male', 'female', 'other'];
        const randomComments = [
          'This is a randomly generated comment for testing purposes.',
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
          'I love using reactive forms! They make development so much easier.',
          'This framework handles form state updates beautifully.',
          'Testing the textarea reactivity with random data.',
          'Another random comment to verify the form updates correctly.'
        ];
        
        api.update({
          firstName: `User${Math.floor(Math.random() * 1000)}`,
          lastName: `Test${Math.floor(Math.random() * 1000)}`,
          email: `user${Math.floor(Math.random() * 1000)}@example.com`,
          age: Math.floor(Math.random() * 50) + 18,
          salary: Math.floor(Math.random() * 100000) + 30000,
          rating: Math.floor(Math.random() * 5) + 1,
          country: countries[Math.floor(Math.random() * countries.length)],
          favoriteColors: colors.filter(() => Math.random() > 0.5),
          gender: genders[Math.floor(Math.random() * genders.length)],
          newsletter: Math.random() > 0.5,
          terms: Math.random() > 0.3,
          bio: `Random bio generated at ${new Date().toLocaleTimeString()}`,
          comments: randomComments[Math.floor(Math.random() * randomComments.length)]
        });
      });
    },

    // Subscribe to external store
    externalStoreSync: (_el, _state, _api) => {
      // Note: Auto-sync is disabled to prevent prepopulating bio and comments on page load
      // Users must explicitly click "Load External Data" to sync with external store
      
      // externalFormStore.subscribe((externalState) => {
      //   // Update specific fields when external store changes
      //   const data = externalState.formData;
      //   api.update({
      //     firstName: data.firstName,
      //     lastName: data.lastName,
      //     age: data.age,
      //     newsletter: data.newsletter,
      //     bio: data.bio,
      //     comments: data.comments
      //   });
      // });
    }
  },

  template: (state) => html`
    <div class="reactive-form">
      <div class="form-header">
        <h2>Reactive Form Demo</h2>
        <div class="form-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${(state as any).formProgress}%"></div>
          </div>
          <span class="progress-text">${(state as any).formProgress}% complete</span>
        </div>
        <div class="validation-summary ${Object.keys(state.errors).length === 0 ? 'valid' : 'invalid'}">
          ${(state as any).validationSummary}
        </div>
      </div>

      <form class="form-grid">
        <!-- Text Inputs Section -->
        <fieldset class="form-section">
          <legend>Personal Information</legend>
          
          <div class="form-group">
            <label for="firstName">First Name *</label>
            <input 
              data-ref="firstNameInput" 
              type="text" 
              id="firstName" 
              value="${state.firstName}"
              placeholder="Enter your first name"
              class="${state.errors.firstName ? 'error' : ''}"
            />
            ${state.errors.firstName ? html`<span class="error-text">${state.errors.firstName}</span>` : ''}
          </div>

          <div class="form-group">
            <label for="lastName">Last Name *</label>
            <input 
              data-ref="lastNameInput" 
              type="text" 
              id="lastName" 
              value="${state.lastName}"
              placeholder="Enter your last name"
              class="${state.errors.lastName ? 'error' : ''}"
            />
            ${state.errors.lastName ? html`<span class="error-text">${state.errors.lastName}</span>` : ''}
          </div>

          <div class="form-group">
            <label for="email">Email *</label>
            <input 
              data-ref="emailInput" 
              type="email" 
              id="email" 
              value="${state.email}"
              placeholder="your.email@example.com"
              class="${state.errors.email ? 'error' : ''}"
            />
            ${state.errors.email ? html`<span class="error-text">${state.errors.email}</span>` : ''}
          </div>

          <div class="form-group">
            <label for="password">Password *</label>
            <input 
              data-ref="passwordInput" 
              type="password" 
              id="password" 
              value="${state.password}"
              placeholder="Enter a secure password"
              class="${state.errors.password ? 'error' : ''}"
            />
            ${state.errors.password ? html`<span class="error-text">${state.errors.password}</span>` : ''}
          </div>

          <div class="form-group">
            <label for="phone">Phone</label>
            <input 
              data-ref="phoneInput" 
              type="tel" 
              id="phone" 
              value="${state.phone}"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div class="form-group">
            <label for="url">Website</label>
            <input 
              data-ref="urlInput" 
              type="url" 
              id="url" 
              value="${state.url}"
              placeholder="https://yourwebsite.com"
            />
          </div>

          <div class="form-group">
            <label for="search">Search Interests</label>
            <input 
              data-ref="searchInput" 
              type="search" 
              id="search" 
              value="${state.search}"
              placeholder="Search for your interests..."
            />
          </div>
        </fieldset>

        <!-- Numbers and Ranges -->
        <fieldset class="form-section">
          <legend>Numbers & Ranges</legend>
          
          <div class="form-group">
            <label for="age">Age: ${state.age}</label>
            <input 
              data-ref="ageInput" 
              type="number" 
              id="age" 
              value="${state.age}"
              min="0" 
              max="120"
            />
          </div>

          <div class="form-group">
            <label for="salary">Expected Salary: ${(state as any).estimatedSalary}</label>
            <input 
              data-ref="salaryRange" 
              type="range" 
              id="salary" 
              value="${state.salary}"
              min="0" 
              max="200000" 
              step="1000"
            />
          </div>

          <div class="form-group">
            <label for="rating">Rating: ${state.rating}/5 ${'★'.repeat(state.rating)}${'☆'.repeat(5-state.rating)}</label>
            <input 
              data-ref="ratingRange" 
              type="range" 
              id="rating" 
              value="${state.rating}"
              min="1" 
              max="5"
            />
          </div>
        </fieldset>

        <!-- Dates and Times -->
        <fieldset class="form-section">
          <legend>Dates & Times</legend>
          
          <div class="form-group">
            <label for="birthDate">Birth Date</label>
            <input 
              data-ref="birthDateInput" 
              type="date" 
              id="birthDate" 
              value="${state.birthDate}"
            />
          </div>

          <div class="form-group">
            <label for="appointmentTime">Preferred Time</label>
            <input 
              data-ref="appointmentTimeInput" 
              type="time" 
              id="appointmentTime" 
              value="${state.appointmentTime}"
            />
          </div>

          <div class="form-group">
            <label for="meetingDateTime">Meeting Date & Time</label>
            <input 
              data-ref="meetingDateTimeInput" 
              type="datetime-local" 
              id="meetingDateTime" 
              value="${state.meetingDateTime}"
            />
          </div>
        </fieldset>

        <!-- Selections -->
        <fieldset class="form-section">
          <legend>Selections</legend>
          
          <div class="form-group">
            <label for="country">Country</label>
            <select data-ref="countrySelect" id="country">
              <option value="" ${state.country === '' ? 'selected' : ''}>Select a country</option>
              <option value="US" ${state.country === 'US' ? 'selected' : ''}>United States</option>
              <option value="CA" ${state.country === 'CA' ? 'selected' : ''}>Canada</option>
              <option value="UK" ${state.country === 'UK' ? 'selected' : ''}>United Kingdom</option>
              <option value="FR" ${state.country === 'FR' ? 'selected' : ''}>France</option>
              <option value="DE" ${state.country === 'DE' ? 'selected' : ''}>Germany</option>
              <option value="JP" ${state.country === 'JP' ? 'selected' : ''}>Japan</option>
              <option value="AU" ${state.country === 'AU' ? 'selected' : ''}>Australia</option>
            </select>
          </div>

          <div class="form-group">
            <label>Favorite Colors (${state.favoriteColors.length} selected)</label>
            <div data-ref="colorCheckboxes" class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" value="red" ${state.favoriteColors.includes('red') ? 'checked' : ''} />
                <span class="color-swatch red"></span> Red
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="blue" ${state.favoriteColors.includes('blue') ? 'checked' : ''} />
                <span class="color-swatch blue"></span> Blue
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="green" ${state.favoriteColors.includes('green') ? 'checked' : ''} />
                <span class="color-swatch green"></span> Green
              </label>
              <label class="checkbox-label">
                <input type="checkbox" value="yellow" ${state.favoriteColors.includes('yellow') ? 'checked' : ''} />
                <span class="color-swatch yellow"></span> Yellow
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>Gender</label>
            <div data-ref="genderRadios" class="radio-group">
              <label class="radio-label">
                <input type="radio" name="gender" value="male" ${state.gender === 'male' ? 'checked' : ''} />
                Male
              </label>
              <label class="radio-label">
                <input type="radio" name="gender" value="female" ${state.gender === 'female' ? 'checked' : ''} />
                Female
              </label>
              <label class="radio-label">
                <input type="radio" name="gender" value="other" ${state.gender === 'other' ? 'checked' : ''} />
                Other
              </label>
            </div>
          </div>
        </fieldset>

        <!-- Text Areas -->
        <fieldset class="form-section">
          <legend>Text Areas</legend>
          
          <div class="form-group">
            <label for="bio">Biography (${state.bio.length} characters)</label>
            <textarea 
              data-ref="bioTextarea" 
              id="bio" 
              placeholder="Tell us about yourself..."
              rows="4"
              value="${state.bio}"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="comments">Additional Comments</label>
            <textarea 
              data-ref="commentsTextarea" 
              id="comments" 
              placeholder="Any additional comments..."
              rows="3"
              value="${state.comments}"
            ></textarea>
          </div>
        </fieldset>

        <!-- File Input -->
        <fieldset class="form-section">
          <legend>File Upload</legend>
          
          <div class="form-group">
            <label for="profilePicture">Profile Picture</label>
            <input 
              data-ref="fileInput" 
              type="file" 
              id="profilePicture" 
              accept="image/*"
            />
            ${state.profilePicture ? html`<div class="file-info">Selected: ${state.profilePicture}</div>` : ''}
          </div>
        </fieldset>

        <!-- Checkboxes -->
        <fieldset class="form-section">
          <legend>Agreements</legend>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                data-ref="newsletterCheckbox" 
                type="checkbox" 
                ${state.newsletter ? 'checked' : ''}
              />
              Subscribe to newsletter
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input 
                data-ref="termsCheckbox" 
                type="checkbox" 
                ${state.terms ? 'checked' : ''}
              />
              I agree to the terms and conditions *
            </label>
          </div>
        </fieldset>
      </form>

      <!-- State Display -->
      <div class="state-display">
        <h3>Current State (Real-time)</h3>
        <div class="state-grid">
          <div class="state-item">
            <strong>Full Name:</strong> ${(state as any).fullName || 'Not set'}
          </div>
          <div class="state-item">
            <strong>Email:</strong> ${state.email || 'Not set'}
          </div>
          <div class="state-item">
            <strong>Age:</strong> ${state.age}
          </div>
          <div class="state-item">
            <strong>Country:</strong> ${state.country || 'Not selected'}
          </div>
          <div class="state-item">
            <strong>Colors:</strong> ${state.favoriteColors.join(', ') || 'None'}
          </div>
          <div class="state-item">
            <strong>Gender:</strong> ${state.gender || 'Not specified'}
          </div>
          <div class="state-item">
            <strong>Newsletter:</strong> ${state.newsletter ? 'Yes' : 'No'}
          </div>
          <div class="state-item">
            <strong>Terms:</strong> ${state.terms ? 'Accepted' : 'Not accepted'}
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button 
          data-ref="submitBtn" 
          class="btn btn-primary ${(state as any).canSubmit ? '' : 'disabled'}"
          ${(state as any).canSubmit ? '' : 'disabled'}
        >
          Submit Form (${state.submitCount} times)
        </button>
        
        <button data-ref="resetBtn" class="btn btn-secondary">
          Reset Form
        </button>
        
        <button data-ref="externalUpdateBtn" class="btn btn-info">
          Load External Data
        </button>
        
        <button data-ref="randomizeBtn" class="btn btn-warning">
          Randomize Data
        </button>
      </div>

      <!-- External sync (hidden element for lifecycle) -->
      <div data-ref="externalStoreSync" style="display: none;"></div>
    </div>
  `,

  style: css`
    .reactive-form {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .form-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }

    .form-header h2 {
      margin: 0 0 1rem 0;
      font-size: 2rem;
    }

    .form-progress {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .progress-bar {
      flex: 1;
      height: 8px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: #4ade80;
      transition: width 0.3s ease;
    }

    .progress-text {
      font-weight: 600;
      min-width: 100px;
    }

    .validation-summary {
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-weight: 600;
    }

    .validation-summary.valid {
      background: rgba(74, 222, 128, 0.3);
      color: #065f46;
    }

    .validation-summary.invalid {
      background: rgba(248, 113, 113, 0.3);
      color: #991b1b;
    }

    .form-grid {
      display: grid;
      gap: 2rem;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    }

    .form-section {
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 1.5rem;
      background: #f9fafb;
    }

    .form-section legend {
      font-weight: 600;
      font-size: 1.1rem;
      color: #374151;
      padding: 0 0.5rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group:last-child {
      margin-bottom: 0;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #374151;
    }

    input, select, textarea {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #d1d5db;
      border-radius: 4px;
      font-size: 1rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    input.error {
      border-color: #ef4444;
    }

    .error-text {
      color: #ef4444;
      font-size: 0.875rem;
      margin-top: 0.25rem;
      display: block;
    }

    .checkbox-group, .radio-group {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .checkbox-label, .radio-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0;
      cursor: pointer;
    }

    .checkbox-label input, .radio-label input {
      width: auto;
      margin: 0;
    }

    .color-swatch {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: inline-block;
      border: 2px solid #d1d5db;
    }

    .color-swatch.red { background-color: #ef4444; }
    .color-swatch.blue { background-color: #3b82f6; }
    .color-swatch.green { background-color: #10b981; }
    .color-swatch.yellow { background-color: #f59e0b; }

    .file-info {
      margin-top: 0.5rem;
      color: #059669;
      font-size: 0.875rem;
    }

    .state-display {
      margin: 2rem 0;
      padding: 1.5rem;
      background: #f3f4f6;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }

    .state-display h3 {
      margin: 0 0 1rem 0;
      color: #374151;
    }

    .state-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
    }

    .state-item {
      padding: 0.75rem;
      background: white;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
    }

    .action-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      justify-content: center;
      margin-top: 2rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn:hover:not(.disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-secondary {
      background: #6b7280;
      color: white;
    }

    .btn-info {
      background: #06b6d4;
      color: white;
    }

    .btn-warning {
      background: #f59e0b;
      color: white;
    }

    .btn.disabled {
      background: #d1d5db;
      color: #9ca3af;
      cursor: not-allowed;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .reactive-form {
        padding: 1rem;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .form-header {
        padding: 1.5rem;
      }

      .form-header h2 {
        font-size: 1.5rem;
      }

      .action-buttons {
        flex-direction: column;
        align-items: stretch;
      }

      .btn {
        width: 100%;
      }
    }
  `
});
