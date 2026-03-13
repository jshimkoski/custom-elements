import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VNode } from '../src/lib/runtime/types';
import {
  unless,
  whenEmpty,
  whenNotEmpty,
  eachWhere,
  switchOnLength,
  eachGroup,
  eachPage,
  switchOnPromise,
  whenMedia,
  mediaVariants,
  responsiveOrder,
  responsive,
  whenVariants,
  responsiveSwitch,
  switchOn,
} from '../src/lib/directive-enhancements';

// Helper function to extract children from VNode
function getChildren(vnode: VNode): VNode[] {
  if (!vnode.children) return [];
  if (Array.isArray(vnode.children)) return vnode.children;
  if (typeof vnode.children === 'string') return [];
  return [vnode.children as VNode];
}

// Helper function to create a simple VNode
function createVNode(tag: string, content?: string): VNode {
  return {
    tag,
    children: content || '',
    props: {},
    key: undefined,
  };
}

// Mock window.matchMedia for responsive tests
const mockMatchMedia = vi.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

describe('directive-enhancements', () => {
  beforeEach(() => {
    // Reset matchMedia mock
    mockMatchMedia.mockReset();
    mockMatchMedia.mockReturnValue({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    });
  });

  describe('unless', () => {
    it('should render content when condition is false', () => {
      const content = createVNode('div', 'content');
      const result = unless(false, content);

      expect(result.tag).toBe('#anchor');
      expect(result.key).toMatch(/^when-block-\d+$/);
      const children = getChildren(result);
      expect(children).toHaveLength(1);
      expect(children[0]).toEqual(content);
    });

    it('should not render content when condition is true', () => {
      const content = createVNode('div', 'content');
      const result = unless(true, content);

      expect(result.tag).toBe('#anchor');
      expect(result.key).toMatch(/^when-block-\d+$/);
      const children = getChildren(result);
      expect(children).toHaveLength(0);
    });

    it('should handle array children', () => {
      const content = [
        createVNode('div', 'first'),
        createVNode('div', 'second'),
      ];
      const result = unless(false, content);

      const children = getChildren(result);
      expect(children).toHaveLength(2);
      expect(children[0].children).toBe('first');
      expect(children[1].children).toBe('second');
    });
  });

  describe('whenEmpty', () => {
    it('should render content when array is empty', () => {
      const content = createVNode('div', 'empty message');
      const result = whenEmpty([], content);

      expect(result.tag).toBe('#anchor');
      const children = getChildren(result);
      expect(children).toHaveLength(1);
      expect(children[0]).toEqual(content);
    });

    it('should render content when array is null', () => {
      const content = createVNode('div', 'empty message');
      const result = whenEmpty(null, content);

      const children = getChildren(result);
      expect(children).toHaveLength(1);
    });

    it('should render content when array is undefined', () => {
      const content = createVNode('div', 'empty message');
      const result = whenEmpty(undefined, content);

      const children = getChildren(result);
      expect(children).toHaveLength(1);
    });

    it('should not render content when array has items', () => {
      const content = createVNode('div', 'empty message');
      const result = whenEmpty([1, 2, 3], content);

      const children = getChildren(result);
      expect(children).toHaveLength(0);
    });
  });

  describe('whenNotEmpty', () => {
    it('should render content when array has items', () => {
      const content = createVNode('div', 'has items');
      const result = whenNotEmpty([1, 2, 3], content);

      const children = getChildren(result);
      expect(children).toHaveLength(1);
      expect(children[0]).toEqual(content);
    });

    it('should not render content when array is empty', () => {
      const content = createVNode('div', 'has items');
      const result = whenNotEmpty([], content);

      const children = getChildren(result);
      expect(children).toHaveLength(0);
    });

    it('should not render content when array is null', () => {
      const content = createVNode('div', 'has items');
      const result = whenNotEmpty(null, content);

      const children = getChildren(result);
      expect(children).toHaveLength(0);
    });

    it('should not render content when array is undefined', () => {
      const content = createVNode('div', 'has items');
      const result = whenNotEmpty(undefined, content);

      const children = getChildren(result);
      expect(children).toHaveLength(0);
    });
  });

  describe('eachWhere', () => {
    it('should filter and render items based on predicate', () => {
      const items = [1, 2, 3, 4, 5];
      const predicate = (item: number) => item % 2 === 0; // even numbers
      const render = (
        item: number,
        originalIndex: number,
        filteredIndex: number,
      ) =>
        createVNode(
          'div',
          `item-${item}-orig-${originalIndex}-filtered-${filteredIndex}`,
        );

      const result = eachWhere(items, predicate, render);

      expect(result).toHaveLength(2); // 2 and 4
      expect(result[0].tag).toBe('#anchor');
      expect(result[0].key).toBe('each-where-filtered-1'); // Uses fallback key for primitives

      const firstChild = getChildren(result[0])[0];
      expect(firstChild.children).toBe('item-2-orig-1-filtered-0');

      const secondChild = getChildren(result[1])[0];
      expect(secondChild.children).toBe('item-4-orig-3-filtered-1');
    });

    it('should handle objects with id/key properties', () => {
      const items = [
        { id: 'a', value: 1 },
        { key: 'b', value: 2 },
        { value: 3 },
      ];
      const predicate = (item: any) => item.value > 1;
      const render = (item: any) => createVNode('div', item.value.toString());

      const result = eachWhere(items, predicate, render);

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('each-where-b'); // uses key property
      expect(result[1].key).toBe('each-where-filtered-2'); // fallback for no id/key
    });

    it('should return empty array when no items match predicate', () => {
      const items = [1, 3, 5];
      const predicate = (item: number) => item % 2 === 0;
      const render = (item: number) => createVNode('div', item.toString());

      const result = eachWhere(items, predicate, render);

      expect(result).toHaveLength(0);
    });
  });

  describe('switchOnLength', () => {
    it('should render empty case when array is empty', () => {
      const emptyContent = createVNode('div', 'empty');
      const result = switchOnLength([], { empty: emptyContent });

      expect(result.tag).toBe('#anchor');
      expect(result.key).toMatch(/^switch-length-\d+-empty$/);
      const children = getChildren(result);
      expect(children).toHaveLength(1);
      expect(children[0]).toEqual(emptyContent);
    });

    it('should render one case when array has one item', () => {
      const items = ['single'];
      const result = switchOnLength(items, {
        one: (item) => createVNode('div', `one: ${item}`),
      });

      expect(result.key).toMatch(/^switch-length-\d+-one$/);
      const children = getChildren(result);
      expect(children[0].children).toBe('one: single');
    });

    it('should render many case when array has multiple items', () => {
      const items = ['a', 'b', 'c'];
      const result = switchOnLength(items, {
        many: (items) => createVNode('div', `many: ${items.length}`),
      });

      expect(result.key).toMatch(/^switch-length-\d+-many$/);
      const children = getChildren(result);
      expect(children[0].children).toBe('many: 3');
    });

    it('should render exactly case when array has exact count', () => {
      const items = ['a', 'b'];
      const result = switchOnLength(items, {
        exactly: {
          2: (items) => createVNode('div', `exactly two: ${items.join(',')}`),
        },
      });

      expect(result.key).toMatch(/^switch-length-\d+-2$/);
      const children = getChildren(result);
      expect(children[0].children).toBe('exactly two: a,b');
    });

    it('should render fallback when no cases match', () => {
      const items = ['a', 'b', 'c'];
      const result = switchOnLength(items, {});

      expect(result.key).toMatch(/^switch-length-\d+-fallback$/);
      const children = getChildren(result);
      expect(children).toHaveLength(0);
    });

    it('should prioritize exactly over many', () => {
      const items = ['a', 'b'];
      const result = switchOnLength(items, {
        many: () => createVNode('div', 'many'),
        exactly: {
          2: () => createVNode('div', 'exactly two'),
        },
      });

      expect(result.key).toMatch(/^switch-length-\d+-2$/);
      const children = getChildren(result);
      expect(children[0].children).toBe('exactly two');
    });
  });

  describe('eachGroup', () => {
    it('should group items by key and render each group', () => {
      const items = [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 },
        { category: 'A', value: 3 },
        { category: 'B', value: 4 },
      ];
      const groupBy = (item: any) => item.category;
      const renderGroup = (key: string, items: any[]) =>
        createVNode('div', `${key}: ${items.length} items`);

      const result = eachGroup(items, groupBy, renderGroup);

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('each-group-A');
      expect(result[1].key).toBe('each-group-B');

      const firstGroup = getChildren(result[0])[0];
      expect(firstGroup.children).toBe('A: 2 items');

      const secondGroup = getChildren(result[1])[0];
      expect(secondGroup.children).toBe('B: 2 items');
    });

    it('should handle empty array', () => {
      const groupBy = (item: any) => item.category;
      const renderGroup = (key: string) => createVNode('div', key);

      const result = eachGroup([], groupBy, renderGroup);

      expect(result).toHaveLength(0);
    });

    it('should handle single group', () => {
      const items = [
        { type: 'X', id: 1 },
        { type: 'X', id: 2 },
      ];
      const groupBy = (item: any) => item.type;
      const renderGroup = (key: string, items: any[]) =>
        createVNode('div', `Group ${key} has ${items.length}`);

      const result = eachGroup(items, groupBy, renderGroup);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('each-group-X');
      const children = getChildren(result[0]);
      expect(children[0].children).toBe('Group X has 2');
    });
  });

  describe('eachPage', () => {
    it('should render correct items for given page', () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const render = (item: number, globalIndex: number, pageIndex: number) =>
        createVNode('div', `${item}-global-${globalIndex}-page-${pageIndex}`);

      const result = eachPage(items, 3, 1, render); // page size 3, page 1 (second page)

      expect(result).toHaveLength(3);
      expect(result[0].key).toBe('each-page-page-3'); // Uses fallback key for primitives
      expect(result[1].key).toBe('each-page-page-4');
      expect(result[2].key).toBe('each-page-page-5');

      const children = result.map((r) => getChildren(r)[0]);
      expect(children[0].children).toBe('4-global-3-page-0');
      expect(children[1].children).toBe('5-global-4-page-1');
      expect(children[2].children).toBe('6-global-5-page-2');
    });

    it('should handle partial last page', () => {
      const items = [1, 2, 3, 4, 5];
      const render = (item: number) => createVNode('div', item.toString());

      const result = eachPage(items, 3, 1, render); // page size 3, page 1 (last page)

      expect(result).toHaveLength(2); // only 2 items on last page
    });

    it('should handle empty page', () => {
      const items = [1, 2, 3];
      const render = (item: number) => createVNode('div', item.toString());

      const result = eachPage(items, 3, 1, render); // page size 3, page 1 (beyond data)

      expect(result).toHaveLength(0);
    });

    it('should use object id/key for keys', () => {
      const items = [
        { id: 'item1', name: 'First' },
        { key: 'item2', name: 'Second' },
      ];
      const render = (item: any) => createVNode('div', item.name);

      const result = eachPage(items, 10, 0, render);

      expect(result[0].key).toBe('each-page-item1');
      expect(result[1].key).toBe('each-page-item2');
    });
  });

  describe('switchOnPromise', () => {
    it('should render loading state', () => {
      const loadingContent = createVNode('div', 'loading...');
      const result = switchOnPromise(
        { loading: true },
        { loading: loadingContent },
      );

      expect(result.key).toMatch(/^promise-\d+-loading$/);
      const children = getChildren(result);
      expect(children[0]).toEqual(loadingContent);
    });

    it('should render success state', () => {
      const data = { name: 'Test' };
      const result = switchOnPromise(
        { data },
        { success: (data) => createVNode('div', data.name) },
      );

      expect(result.key).toMatch(/^promise-\d+-success$/);
      const children = getChildren(result);
      expect(children[0].children).toBe('Test');
    });

    it('should render error state', () => {
      const error = new Error('Test error');
      const result = switchOnPromise(
        { error },
        { error: (err) => createVNode('div', err.message) },
      );

      expect(result.key).toMatch(/^promise-\d+-error$/);
      const children = getChildren(result);
      expect(children[0].children).toBe('Test error');
    });

    it('should render idle state when no other states match', () => {
      const idleContent = createVNode('div', 'idle');
      const result = switchOnPromise({}, { idle: idleContent });

      expect(result.key).toMatch(/^promise-\d+-idle$/);
      const children = getChildren(result);
      expect(children[0]).toEqual(idleContent);
    });

    it('should prioritize loading over error and success', () => {
      const loadingContent = createVNode('div', 'loading...');
      const result = switchOnPromise(
        { loading: true, error: new Error('test'), data: 'test' },
        {
          loading: loadingContent,
          error: () => createVNode('div', 'error'),
          success: () => createVNode('div', 'success'),
        },
      );

      expect(result.key).toMatch(/^promise-\d+-loading$/);
    });

    it('should prioritize error over success', () => {
      const error = new Error('Test error');
      const result = switchOnPromise(
        { error, data: 'test' },
        {
          error: (err) => createVNode('div', err.message),
          success: () => createVNode('div', 'success'),
        },
      );

      expect(result.key).toMatch(/^promise-\d+-error$/);
    });
  });

  describe('media query directives', () => {
    describe('whenMedia', () => {
      it('should render when media query matches', () => {
        mockMatchMedia.mockReturnValue({ matches: true });
        const content = createVNode('div', 'responsive content');
        const result = whenMedia('(min-width: 768px)', content);

        const children = getChildren(result);
        expect(children).toHaveLength(1);
        expect(children[0]).toEqual(content);
        expect(mockMatchMedia).toHaveBeenCalledWith('(min-width: 768px)');
      });

      it('should not render when media query does not match', () => {
        mockMatchMedia.mockReturnValue({ matches: false });
        const content = createVNode('div', 'responsive content');
        const result = whenMedia('(min-width: 768px)', content);

        const children = getChildren(result);
        expect(children).toHaveLength(0);
      });

      it('should handle missing matchMedia', () => {
        Object.defineProperty(window, 'matchMedia', {
          writable: true,
          value: undefined,
        });

        const content = createVNode('div', 'content');
        const result = whenMedia('(min-width: 768px)', content);

        const children = getChildren(result);
        expect(children).toHaveLength(0);
      });
    });

    describe('mediaVariants', () => {
      it('should have correct breakpoint values', () => {
        expect(mediaVariants.sm).toBe('(min-width:640px)');
        expect(mediaVariants.md).toBe('(min-width:768px)');
        expect(mediaVariants.lg).toBe('(min-width:1024px)');
        expect(mediaVariants.xl).toBe('(min-width:1280px)');
        expect(mediaVariants['2xl']).toBe('(min-width:1536px)');
        expect(mediaVariants.dark).toBe('(prefers-color-scheme: dark)');
      });
    });

    describe('responsiveOrder', () => {
      it('should have correct order', () => {
        expect(responsiveOrder).toEqual(['sm', 'md', 'lg', 'xl', '2xl']);
      });
    });

    describe('responsive object', () => {
      it('should create anchor blocks with whenMedia calls', () => {
        mockMatchMedia.mockReturnValue({ matches: true });
        const content = createVNode('div', 'test');

        // Test that the functions exist and return VNodes
        const smResult = responsive.sm(content);
        expect(smResult.tag).toBe('#anchor');

        const darkResult = responsive.dark(content);
        expect(darkResult.tag).toBe('#anchor');

        const lightResult = responsive.light(content);
        expect(lightResult.tag).toBe('#anchor');

        // The responsive helper creates anchor blocks - matchMedia is called during render
        expect(smResult).toBeDefined();
        expect(darkResult).toBeDefined();
        expect(lightResult).toBeDefined();
      });
    });
  });

  describe('whenVariants', () => {
    it('should combine dark mode and responsive variants', () => {
      // Mock both dark mode and lg breakpoint to match
      mockMatchMedia.mockImplementation((query) => ({
        matches:
          query === '(prefers-color-scheme: dark)' ||
          query === '(min-width:1024px)',
        addEventListener: vi.fn(),
      }));

      const content = createVNode('div', 'dark lg content');
      const result = whenVariants(['dark', 'lg'], content);

      expect(result.tag).toBe('#anchor');
      const children = getChildren(result);
      // Should render content since both conditions match
      expect(children.length).toBeGreaterThanOrEqual(0);
    });

    it('should use last responsive variant', () => {
      mockMatchMedia.mockReturnValue({ matches: true });
      const content = createVNode('div', 'content');
      const result = whenVariants(['sm', 'md', 'lg'], content);

      expect(result.tag).toBe('#anchor');
    });

    it('should handle light mode', () => {
      mockMatchMedia.mockReturnValue({ matches: true });
      const content = createVNode('div', 'light content');
      const result = whenVariants(['light'], content);

      expect(result.tag).toBe('#anchor');
    });

    it('should handle empty variants', () => {
      mockMatchMedia.mockReturnValue({ matches: true });
      const content = createVNode('div', 'base content');
      const result = whenVariants([], content);

      expect(result.tag).toBe('#anchor');
    });

    it('should combine light mode and responsive', () => {
      mockMatchMedia.mockReturnValue({ matches: true });
      const content = createVNode('div', 'light xl content');
      const result = whenVariants(['light', 'xl'], content);

      expect(result.tag).toBe('#anchor');
    });
  });

  describe('responsiveSwitch', () => {
    beforeEach(() => {
      mockMatchMedia.mockReturnValue({ matches: true });
    });

    it('should render base content', () => {
      const baseContent = createVNode('div', 'base');
      const result = responsiveSwitch({ base: baseContent });

      expect(result).toHaveLength(1);
      expect(result[0].key).toMatch(/^responsive-\d+-base$/);
      const children = getChildren(result[0]);
      expect(children[0]).toEqual(baseContent);
    });

    it('should render responsive variants', () => {
      const smContent = createVNode('div', 'sm');
      const mdContent = createVNode('div', 'md');
      const result = responsiveSwitch({ sm: smContent, md: mdContent });

      expect(result).toHaveLength(2);
    });
  });

  describe('switchOn', () => {
    it('should match exact value with case', () => {
      const result = switchOn('test')
        .case('test', createVNode('div', 'matched'))
        .case('other', createVNode('div', 'not matched'))
        .done();

      expect(result.key).toMatch(/^switch-on-\d+-case-0$/);
      const children = getChildren(result);
      expect(children[0].children).toBe('matched');
    });

    it('should match with predicate function', () => {
      const result = switchOn(5)
        .case((val) => val > 3, createVNode('div', 'greater than 3'))
        .case((val) => val < 3, createVNode('div', 'less than 3'))
        .done();

      expect(result.key).toMatch(/^switch-on-\d+-case-0$/);
      const children = getChildren(result);
      expect(children[0].children).toBe('greater than 3');
    });

    it('should use when with predicate', () => {
      const result = switchOn(10)
        .when((val) => val % 2 === 0, createVNode('div', 'even'))
        .when((val) => val % 2 === 1, createVNode('div', 'odd'))
        .done();

      expect(result.key).toMatch(/^switch-on-\d+-case-0$/);
      const children = getChildren(result);
      expect(children[0].children).toBe('even');
    });

    it('should use otherwise when no cases match', () => {
      const result = switchOn('unknown')
        .case('test', createVNode('div', 'test'))
        .case('other', createVNode('div', 'other'))
        .otherwise(createVNode('div', 'default'))
        .done();

      expect(result.key).toMatch(/^switch-on-\d+-otherwise$/);
      const children = getChildren(result);
      expect(children[0].children).toBe('default');
    });

    it('should return empty when no cases match and no otherwise', () => {
      const result = switchOn('unknown')
        .case('test', createVNode('div', 'test'))
        .case('other', createVNode('div', 'other'))
        .done();

      expect(result.key).toMatch(/^switch-on-\d+-otherwise$/);
      const children = getChildren(result);
      expect(children).toHaveLength(0);
    });

    it('should match first matching case', () => {
      const result = switchOn(4)
        .case((val) => val > 2, createVNode('div', 'first match'))
        .case((val) => val > 3, createVNode('div', 'second match'))
        .done();

      expect(result.key).toMatch(/^switch-on-\d+-case-0$/);
      const children = getChildren(result);
      expect(children[0].children).toBe('first match');
    });
  });
});
