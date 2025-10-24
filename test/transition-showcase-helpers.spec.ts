import { describe, it, expect } from 'vitest';

describe('transition-showcase exported helpers', () => {
  it('generate id returns a number and add/remove helpers behave', async () => {
    const mod = await import('../src/components/transition-showcase');

    // id generator
    const id = mod.__test_generateId();
    expect(typeof id).toBe('number');

    // add/remove helpers
    const start = [{ id: 1, text: 'a' }];
    const added = mod.__test_addByItem(start, { id: 2, text: 'b' });
    expect(added.length).toBe(2);
    const removed = mod.__test_removeById(added, 2);
    expect(removed.length).toBe(1);

    // shuffle returns same length and does not throw
    const arr = [1, 2, 3, 4];
    const shuffled = mod.__test_shuffleArray(arr);
    expect(shuffled.length).toBe(arr.length);

    // notification message mapping
    expect(mod.__test_notificationMessage('success')).toMatch(/successfully/i);

    // add notification helper
    const { list: notifList, id: notifId } = mod.__test_addNotificationTo(
      [],
      'info',
    );
    expect(Array.isArray(notifList)).toBe(true);
    expect(typeof notifId).toBe('number');

    // add list item helper
    const newList = mod.__test_addListItem([{ id: 1, text: 'Item 1' }]);
    expect(newList.length).toBe(2);

    // add flex/grid helper simply increase length
    const flexNew = mod.__test_addFlexItemArray([
      { id: 1, emoji: 'a', name: 'One' },
    ]);
    expect(flexNew.length).toBe(2);
    const gridNew = mod.__test_addGridItemArray([
      { id: 1, emoji: 'x', name: 'One', color: 'bg-primary-500' },
    ]);
    expect(gridNew.length).toBe(2);
    // extra small helpers
    expect(mod.__test_toggleBoolean(true)).toBe(false);
    expect(mod.__test_formatListItemText(2)).toBe('Item 3');
    expect(
      [1, 2, 3].includes(mod.__test_pickRandomFromArray([1, 2, 3]) as number),
    ).toBe(true);
    expect(typeof mod.__test_getNavButtonClass('a', 'b')).toBe('string');
    expect(mod.__test_increment(4)).toBe(5);
    expect(Array.isArray(mod.__test_extractIds([{ id: 1 }, { id: 2 }]))).toBe(
      true,
    );
  });
});
