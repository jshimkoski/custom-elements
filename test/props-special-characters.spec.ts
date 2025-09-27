import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { component, html } from '../src/lib/index';

describe('Props with Special Characters', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    // Clean up any registered components
    const testTags = ['test-special-chars', 'test-quotes', 'test-symbols', 'test-mixed-chars', 'test-unicode'];
    testTags.forEach(tag => {
      const elements = document.querySelectorAll(tag);
      elements.forEach(el => el.remove());
    });
  });

  it('should handle special characters in default prop values', async () => {
    component('test-special-chars', ({ text = "'\"`!@#$%^&*() should render properly" }) => {
      return html`<div>${text}</div>`;
    });

    container.innerHTML = '<test-special-chars></test-special-chars>';
    await new Promise(resolve => setTimeout(resolve, 0));

    const element = container.querySelector('test-special-chars');
    const div = element?.shadowRoot?.querySelector('div');

    expect(div?.textContent).toBe("'\"`!@#$%^&*() should render properly");
  });

  it('should handle quotes in default values without double encoding', async () => {
    component('test-quotes', ({ message = 'He said "Hello \'world\'" to me' }) => {
      return html`<span>${message}</span>`;
    });

    container.innerHTML = '<test-quotes></test-quotes>';
    await new Promise(resolve => setTimeout(resolve, 0));

    const element = container.querySelector('test-quotes');
    const span = element?.shadowRoot?.querySelector('span');

    expect(span?.textContent).toBe('He said "Hello \'world\'" to me');
  });

  it('should handle HTML-like strings in props without escaping them internally', async () => {
    component('test-html-strings', ({ content = '<div>Test &amp; More</div>' }) => {
      return html`<p>${content}</p>`;
    });

    container.innerHTML = '<test-html-strings></test-html-strings>';
    await new Promise(resolve => setTimeout(resolve, 0));

    const element = container.querySelector('test-html-strings');
    const p = element?.shadowRoot?.querySelector('p');

    // The content should be escaped when rendered in the DOM for safety
    expect(p?.textContent).toBe('<div>Test &amp; More</div>');
  });

  it('should handle symbols and special characters in prop values', async () => {
    component('test-symbols', ({ symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?' }) => {
      return html`<code>${symbols}</code>`;
    });

    container.innerHTML = '<test-symbols></test-symbols>';
    await new Promise(resolve => setTimeout(resolve, 0));

    const element = container.querySelector('test-symbols');
    const code = element?.shadowRoot?.querySelector('code');

    expect(code?.textContent).toBe('!@#$%^&*()_+-=[]{}|;:,.<>?');
  });

  it('should handle mixed quotes and special characters', async () => {
    component('test-mixed-chars', ({
      title = "Title with 'single' and \"double\" quotes",
      description = `Backticks with ${Date.now()} and symbols: !@#$%`
    }) => {
      return html`<div><h1>${title}</h1><p>${description}</p></div>`;
    });

    container.innerHTML = '<test-mixed-chars></test-mixed-chars>';
    await new Promise(resolve => setTimeout(resolve, 0));

    const element = container.querySelector('test-mixed-chars');
    const h1 = element?.shadowRoot?.querySelector('h1');
    const p = element?.shadowRoot?.querySelector('p');

    expect(h1?.textContent).toBe("Title with 'single' and \"double\" quotes");
    expect(p?.textContent).toContain('Backticks with');
    expect(p?.textContent).toContain('and symbols: !@#$%');
  });

  it('should handle unicode characters in props', async () => {
    component('test-unicode', ({ emoji = '🚀✨🎉', chinese = '你好世界' }) => {
      return html`<div>${emoji} ${chinese}</div>`;
    });

    container.innerHTML = '<test-unicode></test-unicode>';
    await new Promise(resolve => setTimeout(resolve, 0));

    const element = container.querySelector('test-unicode');
    const div = element?.shadowRoot?.querySelector('div');

    expect(div?.textContent).toBe('🚀✨🎉 你好世界');
  });

  it('should handle props passed via attributes with special characters', async () => {
    component('test-attr-special', ({ text = 'default' }) => {
      return html`<span>${text}</span>`;
    });

    container.innerHTML = '<test-attr-special text="Hello &quot;world&quot; &amp; more"></test-attr-special>';
    await new Promise(resolve => setTimeout(resolve, 0));

    const element = container.querySelector('test-attr-special');
    const span = element?.shadowRoot?.querySelector('span');

    // Attributes are HTML-decoded by the browser, so we should get the original characters
    expect(span?.textContent).toBe('Hello "world" & more');
  });

  it('should handle props passed via JavaScript properties with special characters', async () => {
    component('test-js-props', ({ message = 'default' }) => {
      return html`<div>${message}</div>`;
    });

    container.innerHTML = '<test-js-props></test-js-props>';
    const element = container.querySelector('test-js-props') as any;

    // Set property directly (not attribute)
    element.message = 'JavaScript: "quotes", <tags>, & symbols!';

    await new Promise(resolve => setTimeout(resolve, 0));

    const div = element?.shadowRoot?.querySelector('div');
    expect(div?.textContent).toBe('JavaScript: "quotes", <tags>, & symbols!');
  });

  it('should properly handle empty and whitespace strings', async () => {
    component('test-whitespace', ({
      empty = '',
      spaces = '   ',
      tabs = '\t\t',
      newlines = '\n\n'
    }) => {
      return html`<div>
        <span class="empty">${empty}</span>
        <span class="spaces">${spaces}</span>
        <span class="tabs">${tabs}</span>
        <span class="newlines">${newlines}</span>
      </div>`;
    });

    container.innerHTML = '<test-whitespace></test-whitespace>';
    await new Promise(resolve => setTimeout(resolve, 0));

    const element = container.querySelector('test-whitespace');
    const empty = element?.shadowRoot?.querySelector('.empty');
    const spaces = element?.shadowRoot?.querySelector('.spaces');
    const tabs = element?.shadowRoot?.querySelector('.tabs');
    const newlines = element?.shadowRoot?.querySelector('.newlines');

    expect(empty?.textContent).toBe('');
    expect(spaces?.textContent).toBe('   ');
    expect(tabs?.textContent).toBe('\t\t');
    expect(newlines?.textContent).toBe('\n\n');
  });

  it('should handle complex nested quotes and escape sequences', async () => {
    component('test-complex-quotes', ({
      nested = 'She said: "He replied \'I don\'t know\' to her"'
    }) => {
      return html`<blockquote>${nested}</blockquote>`;
    });

    container.innerHTML = '<test-complex-quotes></test-complex-quotes>';
    await new Promise(resolve => setTimeout(resolve, 0));

    const element = container.querySelector('test-complex-quotes');
    const blockquote = element?.shadowRoot?.querySelector('blockquote');

    expect(blockquote?.textContent).toBe('She said: "He replied \'I don\'t know\' to her"');
  });

  it('should handle potential XSS attempts safely', async () => {
    component('test-xss-safety', ({
      malicious = '<script>alert("xss")</script><img src=x onerror=alert("xss2")>'
    }) => {
      return html`<div>${malicious}</div>`;
    });

    container.innerHTML = '<test-xss-safety></test-xss-safety>';
    await new Promise(resolve => setTimeout(resolve, 0));

    const element = container.querySelector('test-xss-safety');
    const div = element?.shadowRoot?.querySelector('div');

    // Should be safely escaped when rendered
    expect(div?.textContent).toBe('<script>alert("xss")</script><img src=x onerror=alert("xss2")>');
    // Verify no actual script tags were created
    expect(element?.shadowRoot?.querySelector('script')).toBeNull();
    expect(element?.shadowRoot?.querySelector('img')).toBeNull();
  });
});
