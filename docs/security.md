# Security Guide

> XSS prevention, safe template authoring, and best practices for handling user-controlled input

## Default Behaviour: Templates Are Safe

The `html` tagged template function **escapes all interpolated string values by default**. You cannot accidentally inject raw HTML into a component by interpolating user input.

```ts
const userInput = '<script>alert("xss")</script>';

// Safe — the string is escaped and rendered as text, not as HTML
html`<p>${userInput}</p>`;
// Renders as: <p>&lt;script&gt;alert("xss")&lt;/script&gt;</p>
```

This protection applies to every interpolated value: strings, numbers, booleans, and the stringified form of any other type.

---

## `unsafeHTML` — Opt-In Raw HTML

The `unsafeHTML()` helper bypasses template escaping and inserts raw HTML into the DOM. **Only use it with content you control or have already sanitized.**

```ts
import { html, unsafeHTML } from '@jasonshimmy/custom-elements-runtime';

// Safe — the HTML string comes from a trusted CMS or is sanitized before use
const trustedContent = '<b>Bold</b> and <i>italic</i>';

component('rich-text', () => {
  return html`<article>${unsafeHTML(trustedContent)}</article>`;
});
```

### When to use `unsafeHTML`

- Rendering trusted server-generated HTML (e.g., a sanitized CMS payload)
- Embedding pre-rendered SVG markup from a build tool
- Any case where you need real HTML nodes from a string and you own the source

### When NOT to use `unsafeHTML`

- User-submitted content (form fields, URL parameters, database records from third parties)
- Content from third-party APIs unless you have applied a trusted sanitizer first

### Sanitizing before `unsafeHTML`

If you must render user-provided HTML, sanitize it first with a dedicated library:

```ts
import DOMPurify from 'dompurify';
import { html, unsafeHTML } from '@jasonshimmy/custom-elements-runtime';

component('user-bio', () => {
  const props = useProps({ bio: '' });
  // Sanitize with DOMPurify before inserting
  const safeBio = DOMPurify.sanitize(props.bio, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p'] });
  return html`<div class="bio">${unsafeHTML(safeBio)}</div>`;
});
```

---

## CSS Sanitization

The runtime automatically sanitizes CSS produced by `useStyle()` and the `css` template tag via an internal `sanitizeCSS()` utility. The sanitizer strips:

- `javascript:` URL references
- `expression()` calls (IE legacy XSS vector)
- Inline `<script>` tags embedded inside style strings

This means styles generated from user input (e.g., a user-chosen color) are reasonably safe when passed through `css`:

```ts
component('themed-box', () => {
  const props = useProps({ accentColor: '#007bff' });

  useStyle(() => css`
    :host {
      border-color: ${props.accentColor};
    }
  `);

  return html`<slot></slot>`;
});
```

> Note: `sanitizeCSS` is not a full CSS sanitizer. For high-assurance scenarios (e.g., allowing arbitrary user CSS), apply a dedicated CSS sanitizer before passing values into `css`.

---

## The Secure Expression Evaluator

Template attribute expressions (e.g., `:disabled="${isDisabled}"`) are evaluated by an internal secure evaluator, not by `eval` or `new Function`. The evaluator:

- **Blocks dangerous identifiers**: `eval`, `Function`, `constructor`, `prototype`, `__proto__`, `globalThis`, `window`, `document`, `fetch`, `XMLHttpRequest`, and others
- **Caps expression length** at 1,000 characters to limit denial-of-service via complex expressions
- **Caches compiled expressions** via an LRU cache to avoid re-parsing on every render

This is transparent to component authors — it only affects dynamic expressions resolved at runtime from attribute strings. Static template literals are compiled at module load time and are unaffected.

### Limitations

The secure evaluator is a defence-in-depth measure, not a sandbox. It reduces the attack surface for injection through attribute bindings but is not a substitute for sanitizing inputs that feed into `unsafeHTML` or raw DOM manipulation.

---

## `decodeEntities` — Safe Entity Decoding

`decodeEntities(str)` decodes common HTML entities (`&lt;`, `&gt;`, `&amp;`, `&quot;`, numeric references) into their character equivalents. Use it when you receive an entity-encoded string and want to display the decoded text — **not** parse it as HTML.

```ts
import { html, decodeEntities } from '@jasonshimmy/custom-elements-runtime';

const encoded = '&lt;hello&gt; &amp; world';
const decoded = decodeEntities(encoded); // '<hello> & world'

// Renders as the text string '<hello> & world', not as an HTML tag
html`<p>${decoded}</p>`;
```

Do not pass `decodeEntities` output to `unsafeHTML` — decoding entities re-introduces angle brackets which would then be interpreted as HTML.

---

## Event Handler Safety

Event handlers registered via `@event` bindings receive native DOM events. The runtime does not alter the event or its properties. Standard browser event security rules apply:

- Use `event.preventDefault()` to block default browser behaviour
- Do not trust `event.origin` unless you explicitly validate it for `MessageEvent`
- Handlers bound to trusted DOM elements are not a XSS vector — the attacker would need DOM access to inject a handler

---

## Content Security Policy (CSP)

The runtime does not use `eval`, `new Function`, or dynamic `<script>` injection. `unsafe-eval` is **not required** in your CSP.

If you use the JIT CSS engine with Custom Elements (Shadow DOM), the runtime injects styles into each shadow root via `CSSStyleSheet` with `replaceSync()` — this uses the [Constructable Stylesheets API](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/CSSStyleSheet) and does **not** require `'unsafe-inline'` in your CSP. No `<style>` elements or inline `style` attributes are written.

For light-DOM contexts using `createDOMJITCSS()` with a `<style>` element fallback (for browsers that lack constructable stylesheet support), `'unsafe-inline'` may be required for styles. The Vite plugin generates a static CSS file at build time for light-DOM use, which avoids any inline style injection entirely.

---

## Summary

| Feature | Safe by default? | Notes |
|---------|-----------------|-------|
| `html` template interpolation | Yes | All values are escaped |
| `unsafeHTML()` | No | Only use with trusted / sanitized content |
| `css` template tag | Partially | `sanitizeCSS` strips common vectors; apply dedicated sanitizer for user CSS |
| Secure expression evaluator | Yes | Blocks `eval` and dangerous globals |
| `decodeEntities` | Yes | Decodes text — do not pipe to `unsafeHTML` |
| Event handlers | Yes | Standard browser security rules apply |
| CSP `unsafe-eval` | Not required | Runtime never uses `eval` |
