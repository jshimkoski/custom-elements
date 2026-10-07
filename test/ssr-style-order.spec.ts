import { afterEach, expect, it, vi } from 'vitest';
import { DSD_STYLE_SHARING_SCRIPT } from '../src/lib/ssr';
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('keeps shared reset before unique component styles when adopting DSD styles', () => {
  class Sheet { text = ''; replaceSync(text: string) { this.text = text; } }
  vi.stubGlobal('CSSStyleSheet', Sheet);
  const host = document.createElement('div'); document.body.append(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<style data-cer-style-ref="0"></style><style>:host{display:block}</style><p>Content</p>';
  const payload = document.createElement('script'); payload.type = 'application/json'; payload.textContent = JSON.stringify({ '0': ':host{display:contents}' });
  const script = document.createElement('script'); document.body.append(payload, script);
  vi.spyOn(document, 'currentScript', 'get').mockReturnValue(script);
  Function(DSD_STYLE_SHARING_SCRIPT.slice('<script>'.length, -'</script>'.length))();
  expect((root.adoptedStyleSheets as unknown as Sheet[]).map((sheet) => sheet.text)).toEqual([':host{display:contents}', ':host{display:block}']);
  expect(root.querySelector('style')).toBeNull();
  expect(root.textContent).toBe('Content');
});

it('keeps conditional styles as tags without changing their cascade or media behavior', () => {
  class Sheet { replaceSync() {} }
  vi.stubGlobal('CSSStyleSheet', Sheet);
  const host = document.createElement('div'); document.body.append(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<style data-cer-style-ref="0"></style><style media="print">:host{color:black}</style>';
  const payload = document.createElement('script'); payload.type = 'application/json'; payload.textContent = JSON.stringify({ '0': ':host{color:red}' });
  const script = document.createElement('script'); document.body.append(payload, script);
  vi.spyOn(document, 'currentScript', 'get').mockReturnValue(script);
  Function(DSD_STYLE_SHARING_SCRIPT.slice('<script>'.length, -'</script>'.length))();
  expect(root.querySelectorAll('style')).toHaveLength(2);
  expect(root.querySelector('style')!.textContent).toBe(':host{color:red}');
  expect(root.querySelector('style[media]')!.getAttribute('media')).toBe('print');
  expect(root.adoptedStyleSheets ?? []).toHaveLength(0);
});
