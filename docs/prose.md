# 📝 Prose Typography System

The Prose typography system provides beautiful, professional typography defaults for long-form content like blog posts, articles, documentation, and markdown-rendered content. It's designed to work seamlessly with the JIT CSS engine and requires zero configuration to get started.

## 🎯 Philosophy

Prose is built on these principles:

- **Zero Configuration** - Beautiful typography out of the box
- **Tree-Shakeable** - Only generates CSS when prose classes are actually used
- **Customizable** - CSS variables for easy theming
- **Responsive** - Five size variants for different contexts
- **Accessible** - Proper contrast ratios and readable line heights
- **Opt-out Ready** - Use `.not-prose` to exclude specific elements

## 🚀 Quick Start

Simply add the `prose` class to your content container:

```typescript
import { component, html } from '@jasonshimmy/custom-elements-runtime';

component('blog-post', () => {
  return html`
    <article class="prose">
      <h1>My Blog Post</h1>
      <p class="lead">
        This is an introductory paragraph with larger, emphasized text.
      </p>
      <p>
        Regular paragraph text with proper spacing, line height, and color for
        optimal readability.
      </p>
      <h2>Section Heading</h2>
      <p>More content here...</p>
      <ul>
        <li>Styled list item</li>
        <li>Another item</li>
      </ul>
    </article>
  `;
});
```

That's it! Your content now has beautiful typography with properly styled headings, paragraphs, lists, links, code blocks, tables, and more.

## 📐 Size Variants

Prose includes five size variants to match different contexts:

| Class       | Font Size | Use Case                                  |
| ----------- | --------- | ----------------------------------------- |
| `prose-sm`  | 0.875rem  | Compact content, sidebars, captions       |
| `prose`     | 1rem      | Default body text, articles (recommended) |
| `prose-lg`  | 1.125rem  | Prominent content, landing pages          |
| `prose-xl`  | 1.25rem   | Large displays, presentation mode         |
| `prose-2xl` | 1.5rem    | Extra large displays, hero content        |

## 🌙 Dark Mode with `prose-invert`

The `prose-invert` class automatically inverts all prose colors for dark backgrounds:

```html
<article class="prose prose-invert bg-neutral-900">
  <h1>Dark Mode Article</h1>
  <p>All colors are automatically optimized for dark backgrounds.</p>
  <a href="#">Links are readable on dark backgrounds</a>
</article>
```

**Responsive dark mode:**

```html
<!-- Invert on dark mode preference -->
<article class="prose dark:prose-invert">
  <h1>Adaptive Article</h1>
  <p>Automatically adapts to system dark mode preference.</p>
</article>

<!-- Class-based dark mode -->
<div class="dark">
  <article class="prose dark-class:prose-invert">
    <h1>Class-based Dark Mode</h1>
    <p>Inverts when parent has .dark class.</p>
  </article>
</div>
```

## 🎨 Color Schemes

Prose includes semantic color schemes for links with automatic dark mode support:

| Class             | Light Mode Link Color | Dark Mode Link Color |
| ----------------- | --------------------- | -------------------- |
| `prose-primary`   | `primary-700`         | `primary-300`        |
| `prose-secondary` | `secondary-700`       | `secondary-300`      |
| `prose-success`   | `success-700`         | `success-300`        |
| `prose-info`      | `info-700`            | `info-300`           |
| `prose-warning`   | `warning-700`         | `warning-300`        |
| `prose-error`     | `error-700`           | `error-300`          |

```html
<!-- Primary colored links that adapt to light/dark mode -->
<article class="prose prose-primary">
  <p><a href="#">This link uses primary colors</a></p>
</article>

<!-- Automatically inverts in dark mode -->
<article class="prose prose-primary prose-invert bg-neutral-900">
  <p><a href="#">Primary link optimized for dark backgrounds</a></p>
</article>

<!-- Combine with responsive dark mode -->
<article class="prose prose-error dark:prose-invert">
  <p><a href="#">Error-colored link that adapts to dark mode</a></p>
</article>
```

### Responsive Typography

Combine prose sizes with responsive variants for adaptive typography:

```html
<article class="prose sm:prose-lg lg:prose-xl">
  <h1>Responsive Article</h1>
  <p>
    This article scales up on larger screens for better readability on desktops
    and tablets.
  </p>
</article>
```

## 🎨 Styled Elements

Prose automatically styles these HTML elements:

### Headings

```html
<article class="prose">
  <h1>Heading 1</h1>
  <!-- 2.25em, bold, tight line-height -->
  <h2>Heading 2</h2>
  <!-- 1.5em, bold, 2em top margin -->
  <h3>Heading 3</h3>
  <!-- 1.25em, bold, 1.6em top margin -->
  <h4>Heading 4</h4>
  <!-- 1em, bold, 1.5em top margin -->
  <h5>Heading 5</h5>
  <!-- 1em, bold -->
  <h6>Heading 6</h6>
  <!-- 1em, bold -->
</article>
```

### Paragraphs & Lead Text

```html
<article class="prose">
  <p class="lead">
    Lead paragraphs use larger text (1.25em) to emphasize introductory content.
  </p>
  <p>Regular paragraphs have comfortable spacing and line height.</p>
</article>
```

### Links

```html
<article class="prose">
  <p>
    Links are
    <a href="#">automatically styled</a>
    with color, underline, and hover effects.
  </p>
</article>
```

### Lists

```html
<article class="prose">
  <!-- Unordered lists -->
  <ul>
    <li>Bulleted list item</li>
    <li>Another item with proper marker styling</li>
    <li>
      Nested lists work too
      <ul>
        <li>Nested item</li>
      </ul>
    </li>
  </ul>

  <!-- Ordered lists -->
  <ol>
    <li>Numbered list item</li>
    <li>Counters are styled consistently</li>
  </ol>

  <!-- Custom list types -->
  <ol type="A">
    <li>Upper alpha</li>
  </ol>
  <ol type="I">
    <li>Roman numerals</li>
  </ol>
</article>
```

### Code

```html
<article class="prose">
  <p>Inline <code>code</code> has background and monospace font.</p>

  <pre><code>// Code blocks are properly styled
function hello() {
  console.log('Hello, world!');
}</code></pre>
</article>
```

### Blockquotes

```html
<article class="prose">
  <blockquote>
    <p>Blockquotes have italic text, left border, and automatic quote marks.</p>
  </blockquote>
</article>
```

### Tables

```html
<article class="prose">
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Age</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Alice</td>
        <td>30</td>
      </tr>
      <tr>
        <td>Bob</td>
        <td>25</td>
      </tr>
    </tbody>
  </table>
</article>
```

### Images & Figures

```html
<article class="prose">
  <figure>
    <img src="photo.jpg" alt="Description" />
    <figcaption>Image captions are styled with smaller, muted text.</figcaption>
  </figure>
</article>
```

### Horizontal Rules

```html
<article class="prose">
  <p>Content above</p>
  <hr />
  <p>Content below</p>
</article>
```

## 🎯 Element Modifiers

Element modifiers let you customize specific elements within prose content using utility classes:

```html
<article class="prose prose-a:text-primary-600 prose-headings:font-black">
  <h1>This heading uses font-black</h1>
  <p>
    <a href="#">This link uses primary-600 color</a>
  </p>
</article>
```

### Available Element Modifiers

| Modifier           | Targets                      |
| ------------------ | ---------------------------- |
| `prose-headings`   | `h1, h2, h3, h4, h5, h6, th` |
| `prose-h1`         | `h1`                         |
| `prose-h2`         | `h2`                         |
| `prose-h3`         | `h3`                         |
| `prose-h4`         | `h4`                         |
| `prose-h5`         | `h5`                         |
| `prose-h6`         | `h6`                         |
| `prose-p`          | `p`                          |
| `prose-a`          | `a`                          |
| `prose-blockquote` | `blockquote`                 |
| `prose-figure`     | `figure`                     |
| `prose-figcaption` | `figcaption`                 |
| `prose-strong`     | `strong`                     |
| `prose-em`         | `em`                         |
| `prose-kbd`        | `kbd`                        |
| `prose-code`       | `code`                       |
| `prose-pre`        | `pre`                        |
| `prose-ol`         | `ol`                         |
| `prose-ul`         | `ul`                         |
| `prose-li`         | `li`                         |
| `prose-table`      | `table`                      |
| `prose-thead`      | `thead`                      |
| `prose-tbody`      | `tbody`                      |
| `prose-tr`         | `tr`                         |
| `prose-th`         | `th`                         |
| `prose-td`         | `td`                         |
| `prose-img`        | `img`                        |
| `prose-picture`    | `picture`                    |
| `prose-video`      | `video`                      |
| `prose-hr`         | `hr`                         |
| `prose-dl`         | `dl`                         |
| `prose-dt`         | `dt`                         |
| `prose-dd`         | `dd`                         |
| `prose-lead`       | `[class~="lead"]`            |

### Examples

```html
<!-- Blue links with hover effect -->
<div class="prose prose-a:text-blue-600 prose-a:hover:text-blue-800">
  <a href="#">Styled link</a>
</div>

<!-- Custom heading colors -->
<div class="prose prose-headings:text-neutral-900 prose-h1:text-primary-600">
  <h1>Primary colored heading</h1>
  <h2>Neutral colored heading</h2>
</div>

<!-- Style code blocks -->
<div
  class="prose prose-pre:bg-neutral-900 prose-pre:text-neutral-100 prose-code:text-primary-600"
>
  <pre><code>const x = 10;</code></pre>
  <p>Inline <code>code</code> is also styled.</p>
</div>

<!-- Combine with responsive variants -->
<div class="prose prose-a:text-primary-500 lg:prose-a:text-secondary-500">
  <a href="#">Link color changes at lg breakpoint</a>
</div>
```

## 🚫 Opt-Out: The `.not-prose` Class

Sometimes you need to exclude specific elements from prose styling. Use the `.not-prose` class:

```html
<article class="prose">
  <h1>Styled Article</h1>
  <p>This paragraph has prose styling.</p>

  <div class="not-prose">
    <!-- This content ignores all prose styles -->
    <p class="text-xs text-neutral-500">
      Custom styled content outside of prose
    </p>
    <button class="px-4 py-2 bg-primary-500 text-white">Button</button>
  </div>

  <p>Back to prose styling.</p>
</article>
```

### How `.not-prose` Works

The `.not-prose` class uses CSS `:not()` selectors to exclude elements from prose styling:

- **Direct exclusion**: Elements with `.not-prose` are excluded
- **Descendant exclusion**: All children of `.not-prose` elements are also excluded
- **Granular control**: Each prose rule includes `:not(.not-prose):not(.not-prose *)` selectors

This approach ensures `.not-prose` works reliably in Shadow DOM without relying on CSS properties like `all: revert`.

**Example CSS generated:**

```css
/* Base prose paragraph rule */
.prose p:not(.not-prose):not(.not-prose *) {
  margin: 1.25em 0;
}

/* The :not() selectors exclude:
   1. Elements with class="not-prose"
   2. Descendants of elements with class="not-prose" */
```

The `.not-prose` class gives you complete control when you need to break out of prose styling for custom-designed sections.

## 🎨 Theming with CSS Variables

Prose uses CSS variables for all colors, making it easy to create custom themes:

```typescript
component('themed-article', () => {
  useStyle(
    () => css`
      :host {
        /* Override prose colors */
        --cer-prose-body: #1a1a1a;
        --cer-prose-headings: #0066cc;
        --cer-prose-links: #0066cc;
        --cer-prose-links-hover: #0052a3;
        --cer-prose-bold: #000;
        --cer-prose-quotes: #666;
        --cer-prose-quote-border: #0066cc;
        --cer-prose-code: #d73a49;
        --cer-prose-code-bg: #f6f8fa;
        --cer-prose-pre-code: #e6e6e6;
        --cer-prose-pre-bg: #1a1a1a;
        --cer-prose-pre-border: #333;
      }
    `,
  );

  return html`
    <article class="prose">
      <h1>Themed Article</h1>
      <p>This content uses your custom theme colors.</p>
    </article>
  `;
});
```

### Available CSS Variables

| Variable                         | Default                        | Description                    |
| -------------------------------- | ------------------------------ | ------------------------------ |
| `--cer-prose-body`               | `var(--cer-color-neutral-900)` | Body text color                |
| `--cer-prose-headings`           | `var(--cer-color-neutral-900)` | Heading text color             |
| `--cer-prose-lead`               | `var(--cer-color-neutral-700)` | Lead paragraph color           |
| `--cer-prose-links`              | `var(--cer-color-neutral-700)` | Link text color                |
| `--cer-prose-links-hover`        | `var(--cer-color-neutral-500)` | Link hover color               |
| `--cer-prose-bold`               | `var(--cer-color-neutral-900)` | Bold text color                |
| `--cer-prose-quotes`             | `var(--cer-color-neutral-700)` | Blockquote text color          |
| `--cer-prose-quote-border`       | `var(--cer-color-neutral-200)` | Blockquote border color        |
| `--cer-prose-code`               | `var(--cer-color-neutral-800)` | Inline code text color         |
| `--cer-prose-code-bg`            | `var(--cer-color-neutral-100)` | Inline code background         |
| `--cer-prose-pre-code`           | `var(--cer-color-neutral-800)` | Code block text color          |
| `--cer-prose-pre-bg`             | `var(--cer-color-neutral-100)` | Code block background          |
| `--cer-prose-pre-border`         | `var(--cer-color-neutral-200)` | Code block border              |
| `--cer-prose-hr`                 | `var(--cer-color-neutral-200)` | Horizontal rule color          |
| `--cer-prose-caps`               | `var(--cer-color-neutral-600)` | Small caps color               |
| `--cer-prose-list-marker`        | `var(--cer-color-neutral-600)` | List marker color              |
| `--cer-prose-list-marker-strong` | `var(--cer-color-neutral-700)` | Bold list marker color         |
| `--cer-prose-counters`           | `var(--cer-color-neutral-600)` | Ordered list counter color     |
| `--cer-prose-bullets`            | `var(--cer-color-neutral-400)` | Unordered list bullet color    |
| `--cer-prose-img-caption`        | `var(--cer-color-neutral-600)` | Image caption color            |
| `--cer-prose-table-border`       | `var(--cer-color-neutral-200)` | Table border color             |
| `--cer-prose-table-head`         | `var(--cer-color-neutral-700)` | Table heading color            |
| `--cer-prose-invert-links`       | varies by color scheme         | Link color for dark mode       |
| `--cer-prose-invert-links-hover` | varies by color scheme         | Link hover color for dark mode |

## 📊 Real-World Examples

### Blog Post Component

```typescript
component('blog-article', () => {
  const props = useProps({
    title: '',
    author: '',
    date: '',
    content: '',
  });

  return html`
    <article class="max-w-4xl mx-auto px-6 py-8">
      <header class="mb-8 not-prose">
        <h1 class="text-4xl font-bold text-neutral-900 mb-2">${props.title}</h1>
        <div class="flex items-center gap-4 text-sm text-neutral-600">
          <span>${props.author}</span>
          <span>•</span>
          <time>${props.date}</time>
        </div>
      </header>

      <div class="prose lg:prose-lg prose-a:text-primary-600">
        ${unsafeHTML(props.content)}
      </div>
    </article>
  `;
});
```

### Documentation Page

```typescript
component('docs-page', () => {
  const props = useProps({ markdown: '' });

  return html`
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <aside class="lg:col-span-1 not-prose">
        <!-- Sidebar navigation -->
        <nav class="space-y-2">
          <a class="block px-3 py-2 rounded hover:bg-neutral-100"
            >Introduction</a
          >
          <a class="block px-3 py-2 rounded hover:bg-neutral-100"
            >Getting Started</a
          >
        </nav>
      </aside>

      <main class="lg:col-span-3">
        <article
          class="prose prose-lg prose-headings:font-semibold prose-a:text-primary-600 prose-code:text-primary-700 prose-pre:bg-neutral-900 prose-pre:text-neutral-100"
        >
          ${unsafeHTML(props.markdown)}
        </article>
      </main>
    </div>
  `;
});
```

### Dark Theme Article

```typescript
component('dark-article', () => {
  return html`
    <article class="prose prose-invert bg-neutral-900 p-8">
      <h1>Dark Theme Article</h1>
      <p class="lead">Beautiful typography optimized for dark backgrounds.</p>
      <p>All colors automatically adapt using prose-invert.</p>
      <a href="#">Links are readable on dark backgrounds</a>
    </article>
  `;
});
```

**Or with custom theme and prose-invert:**

```typescript
component('custom-dark-article', () => {
  useStyle(
    () => css`
      :host {
        background: #0a0a0a;
        /* Override specific prose colors for custom dark theme */
        --cer-prose-body: #e5e5e5;
        --cer-prose-headings: #fff;
      }
    `,
  );

  return html`
    <article class="prose prose-invert prose-primary lg:prose-lg p-8">
      <h1>Custom Dark Theme Article</h1>
      <p class="lead">Combines prose-invert with custom overrides.</p>
      <p><a href="#">Primary colored links work in dark mode</a></p>
    </article>
  `;
});
```

### Responsive Article with Custom Styling

```typescript
component('responsive-article', () => {
  return html`
    <article
      class="prose 
             sm:prose-lg 
             lg:prose-xl
             prose-headings:text-neutral-900
             prose-a:text-primary-600 
             prose-a:hover:text-primary-800
             prose-code:text-secondary-700
             prose-pre:bg-neutral-900
             prose-pre:text-neutral-100
             max-w-none
             px-4
             sm:px-6
             lg:px-8
             py-8
             lg:py-12"
    >
      <h1>Responsive Typography</h1>
      <p class="lead">
        This article grows from mobile to desktop with properly scaled
        typography.
      </p>

      <h2>Code Examples</h2>
      <pre><code>function example() {
  return 'styled code';
}</code></pre>

      <p>Inline <code>code</code> is also styled.</p>

      <h2>Lists</h2>
      <ul>
        <li>First item</li>
        <li>Second item</li>
      </ul>
    </article>
  `;
});
```

## 🎯 Best Practices

1. **Use semantic HTML** - Prose works best with proper HTML structure
2. **Combine with layout utilities** - Use `max-w-*`, `mx-auto`, `px-*` for container styling
3. **Responsive scaling** - Use size variants with breakpoints for optimal readability
4. **Theme consistently** - Override CSS variables at the component or host level
5. **Opt-out when needed** - Use `.not-prose` for custom-styled sections
6. **Element modifiers for precision** - Target specific elements without global overrides
7. **Test color contrast** - Ensure custom themes meet accessibility standards

## 🔍 Technical Details

### Tree-Shaking

Prose CSS is only generated when prose classes are detected in your HTML. If you never use prose classes, zero prose CSS is included in your bundle.

### Performance

- **On-demand generation**: CSS is generated only for used prose classes
- **Singleton stylesheet**: All prose sizes share a single stylesheet
- **Cached**: Generated CSS is cached and reused across components
- **Minified**: All prose CSS is automatically minified

### SSR Support

Prose works perfectly with server-side rendering. The CSS is generated on the server and hydrated on the client without flashing or re-rendering.

### Browser Support

Prose uses standard CSS features supported in all modern browsers. No polyfills required.

## 📚 See Also

- [JIT CSS Documentation](./jit-css.md) - Complete JIT CSS system guide
- [Template Documentation](./template.md) - Template syntax and rendering
- [Functional API](./functional-api.md) - Component creation guide
- [Styling Overview](../README.md#-styling) - Overview of styling approaches

## 💡 Tips

- **Markdown rendering?** Prose is perfect for styling markdown-converted HTML
- **Blog content?** Use `prose-lg` or `prose-xl` for comfortable reading
- **Documentation?** Combine with syntax highlighting for code blocks
- **Dark mode?** Use `prose-invert` instead of manually overriding all colors
- **Color schemes?** Combine `prose-primary`, `prose-secondary`, etc. with `prose-invert` for semantic colored links that work in both light and dark modes
- **Need custom spacing?** Override specific CSS variables for fine-tuning
- **Multiple themes?** Create theme variants using CSS variable overrides
- **Mixing styled/unstyled?** Use `.not-prose` liberally for custom sections
- **Responsive design?** Combine size variants with breakpoints: `prose sm:prose-lg lg:prose-xl`
