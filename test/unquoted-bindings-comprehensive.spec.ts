import { it, expect, describe } from 'vitest';
import { html } from '../src/lib/runtime/template-compiler';
import type { VNode } from '../src/lib/runtime/types';

/**
 * Comprehensive test suite demonstrating that ALL bindings work without quotes.
 * The template compiler supports unquoted attribute values for both regular
 * attributes and directives.
 */
describe('unquoted bindings - comprehensive', () => {
  describe('directives without quotes', () => {
    it(':model works without quotes', () => {
      const value = { a: 1 };
      const vnode = html`<input :model=${value} />` as VNode;
      expect(vnode.props?.directives?.model?.value).toBe(value);
    });

    it(':model:checked works without quotes', () => {
      const checked = true;
      const vnode = html`<input :model:checked=${checked} />` as VNode;
      expect(vnode.props?.directives?.['model:checked']?.value).toBe(true);
    });

    it(':disabled works without quotes', () => {
      const disabled = true;
      const vnode = html`<input :disabled=${disabled} />` as VNode;
      expect(vnode.props?.props?.disabled).toBe(true);
    });

    it(':style works without quotes (string)', () => {
      const style = 'color: red; background: blue;';
      const vnode = html`<div :style=${style}></div>` as VNode;
      expect(vnode.props?.directives?.style?.value).toBe(style);
    });

    it(':style works without quotes (object)', () => {
      const style = { color: 'red', background: 'blue' };
      const vnode = html`<div :style=${style}></div>` as VNode;
      expect(vnode.props?.directives?.style?.value).toBe(style);
    });

    it(':class works without quotes (string)', () => {
      const classes = 'foo bar baz';
      const vnode = html`<div :class=${classes}></div>` as VNode;
      expect(vnode.props?.directives?.class?.value).toBe(classes);
    });

    it(':class works without quotes (object)', () => {
      const classes = { active: true, disabled: false };
      const vnode = html`<div :class=${classes}></div>` as VNode;
      expect(vnode.props?.directives?.class?.value).toBe(classes);
    });

    it(':class works without quotes (array)', () => {
      const classes = ['foo', 'bar', { baz: true }];
      const vnode = html`<div :class=${classes}></div>` as VNode;
      expect(vnode.props?.directives?.class?.value).toBe(classes);
    });

    it(':bind works without quotes', () => {
      const obj = { foo: 'bar', count: 42 };
      const vnode = html`<custom-el :bind=${obj}></custom-el>` as VNode;
      expect(vnode.props?.directives?.bind?.value).toBe(obj);
    });

    it(':show works without quotes', () => {
      const visible = true;
      const vnode = html`<div :show=${visible}></div>` as VNode;
      expect(vnode.props?.directives?.show?.value).toBe(true);
    });

    it(':ref works without quotes', () => {
      const refCallback = (el: Element) => console.log(el);
      const vnode = html`<div :ref=${refCallback}></div>` as VNode;
      expect(vnode.props?.directives?.ref?.value).toBe(refCallback);
    });
  });

  describe('regular attributes without quotes', () => {
    it('name works without quotes', () => {
      const name = 'my-input';
      const vnode = html`<input name=${name} />` as VNode;
      expect(vnode.props?.attrs?.name).toBe('my-input');
    });

    it('id works without quotes', () => {
      const id = 'my-id';
      const vnode = html`<div id=${id}></div>` as VNode;
      expect(vnode.props?.attrs?.id).toBe('my-id');
    });

    it('type works without quotes', () => {
      const type = 'email';
      const vnode = html`<input type=${type} />` as VNode;
      expect(vnode.props?.attrs?.type).toBe('email');
    });

    it('placeholder works without quotes', () => {
      const placeholder = 'Enter text...';
      const vnode = html`<input placeholder=${placeholder} />` as VNode;
      expect(vnode.props?.attrs?.placeholder).toBe('Enter text...');
    });

    it('data-* attributes work without quotes', () => {
      const dataId = '123';
      const dataName = 'test';
      const vnode = html`<div
        data-id=${dataId}
        data-name=${dataName}
      ></div>` as VNode;
      expect(vnode.props?.attrs?.['data-id']).toBe('123');
      expect(vnode.props?.attrs?.['data-name']).toBe('test');
    });

    it('aria-* attributes work without quotes', () => {
      const ariaLabel = 'Close button';
      const vnode = html`<button aria-label=${ariaLabel}></button>` as VNode;
      expect(vnode.props?.attrs?.['aria-label']).toBe('Close button');
    });

    it('class works without quotes', () => {
      const classes = 'foo bar baz';
      const vnode = html`<div class=${classes}></div>` as VNode;
      expect(vnode.props?.attrs?.class).toBe('foo bar baz');
    });

    it('style works without quotes', () => {
      const style = 'color: red;';
      const vnode = html`<div style=${style}></div>` as VNode;
      expect(vnode.props?.attrs?.style).toBe('color: red;');
    });
  });

  describe('event handlers without quotes', () => {
    it('@click works without quotes', () => {
      const handler = () => console.log('clicked');
      const vnode = html`<button @click=${handler}></button>` as VNode;
      expect(typeof vnode.props?.props?.onClick).toBe('function');
    });

    it('@input works without quotes', () => {
      const handler = (e: Event) => console.log(e);
      const vnode = html`<input @input=${handler} />` as VNode;
      expect(typeof vnode.props?.props?.onInput).toBe('function');
    });

    it('@change works without quotes', () => {
      const handler = () => {};
      const vnode = html`<select @change=${handler}></select>` as VNode;
      expect(typeof vnode.props?.props?.onChange).toBe('function');
    });

    it('@submit works without quotes', () => {
      const handler = () => {};
      const vnode = html`<form @submit=${handler}></form>` as VNode;
      expect(typeof vnode.props?.props?.onSubmit).toBe('function');
    });

    it('event modifiers work without quotes', () => {
      const handler = () => {};
      const vnode = html`<button
        @click.prevent.stop=${handler}
      ></button>` as VNode;
      expect(typeof vnode.props?.props?.onClick).toBe('function');
    });
  });

  describe('mixed quoted and unquoted', () => {
    it('handles mix of quoted and unquoted attributes', () => {
      const name = 'test';
      const disabled = true;
      const handler = () => {};

      const vnode = html`<input
        name=${name}
        type="text"
        :disabled=${disabled}
        placeholder="Enter value"
        @input=${handler}
      />` as VNode;

      expect(vnode.props?.attrs?.name).toBe('test');
      expect(vnode.props?.attrs?.type).toBe('text');
      expect(vnode.props?.props?.disabled).toBe(true);
      expect(vnode.props?.attrs?.placeholder).toBe('Enter value');
      expect(typeof vnode.props?.props?.onInput).toBe('function');
    });
  });

  describe('custom elements with unquoted bindings', () => {
    it('promotes bound attrs to props for custom elements', () => {
      const data = { foo: 'bar' };
      const enabled = true;

      const vnode = html`<custom-el
        :data=${data}
        :enabled=${enabled}
      ></custom-el>` as VNode;

      expect(vnode.props?.isCustomElement).toBe(true);
      expect(vnode.props?.props?.data).toBe(data);
      expect(vnode.props?.props?.enabled).toBe(true);
    });
  });

  describe('complex values without quotes', () => {
    it('handles objects without quotes', () => {
      const obj = { a: 1, b: 'test', c: true };
      const vnode = html`<div :bind=${obj}></div>` as VNode;
      expect(vnode.props?.directives?.bind?.value).toBe(obj);
    });

    it('handles arrays without quotes', () => {
      const arr = [1, 2, 3, 'test', { foo: 'bar' }];
      const vnode = html`<custom-el :items=${arr}></custom-el>` as VNode;
      expect(vnode.props?.props?.items).toBe(arr);
    });

    it('handles functions without quotes', () => {
      const fn = () => console.log('test');
      const vnode = html`<custom-el :callback=${fn}></custom-el>` as VNode;
      expect(vnode.props?.props?.callback).toBe(fn);
    });

    it('handles null/undefined without quotes', () => {
      const nullVal = null;
      const undefinedVal = undefined;
      const vnode = html`<div
        :data-null=${nullVal}
        :data-undef=${undefinedVal}
      ></div>` as VNode;
      expect(vnode.props?.attrs?.['data-null']).toBe(null);
      // undefined attrs may not appear in attrs object
      expect(vnode.props?.attrs?.['data-undef']).toBe(null);
    });

    it('handles numbers without quotes', () => {
      const count = 42;
      const vnode = html`<input :max=${count} />` as VNode;
      expect(vnode.props?.attrs?.max).toBe(42);
    });

    it('handles booleans without quotes', () => {
      const isTrue = true;
      const isFalse = false;
      const vnode = html`<input
        :required=${isTrue}
        :disabled=${isFalse}
      />` as VNode;
      // :required with true becomes a prop for inputs
      expect(vnode.props?.props?.required).toBe(true);
      expect(vnode.props?.props?.disabled).toBe(false);
    });
  });
});
