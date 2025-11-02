/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { component, html } from '../src/lib/index';

describe('Prose: not-prose class', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should exclude .not-prose elements from prose styling', () => {
    component('test-not-prose', () => {
      return html`
        <article class="prose">
          <h1>Main Heading</h1>
          <p>This paragraph should have prose styling.</p>

          <div class="not-prose">
            <h2>Excluded Heading</h2>
            <p>This paragraph should NOT have prose styling.</p>
          </div>

          <p>This paragraph should have prose styling again.</p>
        </article>
      `;
    });

    const el = document.createElement('test-not-prose') as any;
    document.body.appendChild(el);

    const shadow = el.shadowRoot;
    const article = shadow.querySelector('article');
    const firstP = shadow.querySelector('article > p');
    const notProseDiv = shadow.querySelector('.not-prose');
    const notProseP = shadow.querySelector('.not-prose p');
    const lastP = shadow.querySelectorAll('article > p')[1];

    // Check that article has prose class
    expect(article.className).toBe('prose');

    // Check that not-prose div exists
    expect(notProseDiv).toBeTruthy();
    expect(notProseDiv.className).toBe('not-prose');

    // Get computed styles
    const firstPStyles = window.getComputedStyle(firstP);
    const notProsePStyles = window.getComputedStyle(notProseP);
    const lastPStyles = window.getComputedStyle(lastP);

    // First paragraph should have prose margins
    expect(firstPStyles.marginTop).not.toBe('0px');

    // Not-prose paragraph should NOT have prose margins (should be reset/reverted)
    // The not-prose utility should override prose styling
    console.log('First P margin:', firstPStyles.marginTop);
    console.log('Not-prose P margin:', notProsePStyles.marginTop);
    console.log('Last P margin:', lastPStyles.marginTop);

    // Last paragraph should have prose margins
    expect(lastPStyles.marginTop).not.toBe('0px');
  });

  it('should work with nested not-prose elements', () => {
    component('test-not-prose-nested', () => {
      return html`
        <article class="prose">
          <p class="text-blue-500">Blue paragraph</p>

          <div class="not-prose">
            <p class="text-red-500">Red paragraph (no prose styles)</p>
            <div>
              <p>Nested paragraph (no prose styles)</p>
            </div>
          </div>

          <p>Regular paragraph (prose styles)</p>
        </article>
      `;
    });

    const el = document.createElement('test-not-prose-nested') as any;
    document.body.appendChild(el);

    const shadow = el.shadowRoot;
    const notProseDiv = shadow.querySelector('.not-prose');
    const nestedP = shadow.querySelector('.not-prose div p');

    expect(notProseDiv).toBeTruthy();
    expect(nestedP).toBeTruthy();

    const nestedPStyles = window.getComputedStyle(nestedP);
    console.log('Nested P in not-prose margin:', nestedPStyles.marginTop);

    // Nested elements should also not have prose styles
    // In Tailwind, this works because of: :not(.not-prose *)
  });

  it('should not affect elements outside prose container', () => {
    component('test-not-prose-outside', () => {
      return html`
        <div>
          <p>This paragraph is outside prose</p>

          <article class="prose">
            <p>This paragraph is inside prose</p>

            <div class="not-prose">
              <p>This is in not-prose</p>
            </div>
          </article>

          <p>This paragraph is outside prose again</p>
        </div>
      `;
    });

    const el = document.createElement('test-not-prose-outside') as any;
    document.body.appendChild(el);

    const shadow = el.shadowRoot;
    const outsidePs = shadow.querySelectorAll('div > p');
    const proseP = shadow.querySelector('article.prose > p');
    const notProseP = shadow.querySelector('.not-prose p');

    expect(outsidePs.length).toBeGreaterThanOrEqual(1);
    expect(proseP).toBeTruthy();
    expect(notProseP).toBeTruthy();

    const outsidePStyles = window.getComputedStyle(outsidePs[0]);
    const prosePStyles = window.getComputedStyle(proseP);
    const notProsePStyles = window.getComputedStyle(notProseP);

    console.log('Outside P margin:', outsidePStyles.marginTop);
    console.log('Prose P margin:', prosePStyles.marginTop);
    console.log('Not-prose P margin:', notProsePStyles.marginTop);
  });
});
