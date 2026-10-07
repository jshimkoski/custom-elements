/** Reflected native properties promoted by the template compiler. */
export const NATIVE_PROPERTY_NAMES: Readonly<Record<string, string>> = {
  readonly: 'readOnly', maxlength: 'maxLength', minlength: 'minLength', playsinline: 'playsInline',
};

export const NATIVE_PROMOTE_MAP: Readonly<Record<string, readonly string[]>> = {
  input: [
    'value',
    'checked',
    'readonly',
    'required',
    'placeholder',
    'maxlength',
    'minlength',
  ],
  textarea: [
    'value',
    'readonly',
    'required',
    'placeholder',
    'maxlength',
    'minlength',
  ],
  select: ['value', 'required', 'multiple'],
  option: ['selected', 'value'],
  video: ['muted', 'autoplay', 'controls', 'loop', 'playsinline'],
  audio: ['muted', 'autoplay', 'controls', 'loop'],
  img: ['src', 'alt', 'width', 'height'],
  button: ['type', 'name', 'value', 'autofocus', 'form'],
};
