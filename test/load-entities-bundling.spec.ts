import { describe, it, expect, vi } from 'vitest';
import { decodeEntities } from '../src/lib/runtime/helpers';

describe('entity map bundling behavior', () => {
  it('does not load entities.json when document is present', async () => {
    // Ensure a fake document exists to trigger the browser branch
    const realDocument = (globalThis as any).document;
    // Provide a minimal fake element that decodes a few common entities when innerHTML is set.
    (globalThis as any).document = {
      createElement: () => {
        let _text = '';
        return {
          set innerHTML(v: string) {
            // Simulate browser decoding for the small set of entities used in the test.
            _text = String(v)
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'");
          },
          get textContent() {
            return _text;
          },
        };
      },
    };

    // Spy on loadEntityMap
    const spy = vi.spyOn(
      await import('../src/lib/runtime/helpers'),
      'loadEntityMap',
    );

    // Call decodeEntities which should take the DOM path and not call the loader
    const result = decodeEntities('&lt;&gt;&amp;');
    expect(result).toBe('<>&');
    expect(spy).not.toHaveBeenCalled();

    // Restore document
    (globalThis as any).document = realDocument;
  });
});
