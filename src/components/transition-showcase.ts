/**
 * Transition Demo Component
 * Showcases the transition system with JIT CSS integration
 */

import { component, html, ref } from '../lib/index';
import { when, each } from '../lib/directives';
import { Transition, TransitionGroup } from '../lib/transitions';

// Simple fade demo
component('fade-demo', () => {
  const show = ref(true);

  // Debug: Check if CSS is actually in the shadow DOM
  if (typeof document !== 'undefined') {
    setTimeout(() => {
      const fadeDemo = document.querySelector('fade-demo');
      if (fadeDemo?.shadowRoot) {
        Array.from(fadeDemo.shadowRoot.adoptedStyleSheets)
          .map((sheet) => {
            try {
              return Array.from(sheet.cssRules)
                .map((rule) => rule.cssText)
                .join('\n');
            } catch {
              return 'Cannot access stylesheet';
            }
          })
          .join('\n\n');
      }
    }, 1000);
  }

  return html`
    <div class="p-4">
      <button
        @click="${() => (show.value = !show.value)}"
        class="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 mb-4"
      >
        Toggle Fade
      </button>

      ${Transition(
        {
          preset: 'fade',
          show: show.value,
        },
        html`
          <div class="p-4 bg-primary-100 rounded-lg">
            Hello! I fade in and out smoothly.
          </div>
        `,
      )}
    </div>
  `;
});

// Slide transitions demo
component('slide-demo', () => {
  const show = ref(true);
  const direction = ref('right');

  const getPreset = () => {
    switch (direction.value) {
      case 'right':
        return 'slide-right';
      case 'left':
        return 'slide-left';
      case 'up':
        return 'slide-up';
      case 'down':
        return 'slide-down';
      default:
        return 'fade';
    }
  };

  return html`
    <div class="p-4">
      <div class="mb-4 space-x-2">
        <button
          @click="${() => (show.value = !show.value)}"
          class="px-4 py-2 bg-primary-500 text-white rounded"
        >
          Toggle
        </button>

        <select :model="${direction}" class="px-4 py-2 border rounded">
          <option value="right">Slide Right</option>
          <option value="left">Slide Left</option>
          <option value="up">Slide Up</option>
          <option value="down">Slide Down</option>
        </select>
      </div>

      ${Transition(
        {
          preset: getPreset(),
          show: show.value,
        },
        html`
          <div class="p-4 bg-secondary-100 rounded-lg">
            I slide from different directions!
          </div>
        `,
      )}
    </div>
  `;
});

// Notification system demo
component('notification-demo', () => {
  const notifications = ref<
    Array<{ id: number; message: string; type: string }>
  >([]);

  const addNotification = (type: string) => {
    const id = __test_generateId();
    const message = __test_notificationMessage(type);
    notifications.value = __test_addByItem(notifications.value, {
      id,
      message,
      type,
    });

    // Auto-remove after 3 seconds
    setTimeout(() => {
      notifications.value = __test_removeById(notifications.value, id);
    }, 3000);
  };

  const removeNotification = (id: number) => {
    notifications.value = __test_removeById(notifications.value, id);
  };

  return html`
    <div class="p-4">
      <div class="mb-4 space-x-2">
        <button
          @click="${() => addNotification('success')}"
          class="px-4 py-2 bg-success-500 text-white rounded"
        >
          Success
        </button>
        <button
          @click="${() => addNotification('error')}"
          class="px-4 py-2 bg-error-500 text-white rounded"
        >
          Error
        </button>
        <button
          @click="${() => addNotification('info')}"
          class="px-4 py-2 bg-info-500 text-white rounded"
        >
          Info
        </button>
        <button
          @click="${() => addNotification('warning')}"
          class="px-4 py-2 bg-warning-500 text-white rounded"
        >
          Warning
        </button>
      </div>

      <div class="fixed top-4 right-4 w-80 space-y-2">
        ${TransitionGroup(
          {
            tag: 'div',
            class: 'space-y-2',
            appear: true, // Always animate, even first notification
            enterFrom: 'translate-x-[100%] opacity-0',
            enterActive: 'transition-all duration-300 ease-out',
            enterTo: 'translate-x-[0%] opacity-100',
            leaveFrom: 'translate-x-[0%] opacity-100',
            leaveActive: 'transition-all duration-200 ease-in',
            leaveTo: 'translate-x-[100%] opacity-0',
            moveClass: 'transition-transform duration-300',
          },
          each(
            notifications.value,
            (notif: { id: number; message: string; type: string }) => html`
              <div
                key="${notif.id}"
                class="p-4 rounded-lg shadow-lg flex justify-between items-start
                   ${notif.type === 'success'
                  ? 'bg-success-100 text-success-900'
                  : notif.type === 'error'
                    ? 'bg-error-100 text-error-900'
                    : notif.type === 'warning'
                      ? 'bg-warning-100 text-warning-900'
                      : 'bg-info-100 text-info-900'}"
              >
                <p class="flex-1">${notif.message}</p>
                <button
                  @click="${() => removeNotification(notif.id)}"
                  class="ml-2 text-current opacity-50 hover:opacity-100 text-xl font-bold"
                >
                  ×
                </button>
              </div>
            `,
          ),
        )}
      </div>
    </div>
  `;
});

// Custom complex animation demo
component('complex-animation-demo', () => {
  const show = ref(true);

  return html`
    <div class="p-4">
      <button
        @click="${() => (show.value = !show.value)}"
        class="px-4 py-2 bg-primary-500 text-white rounded mb-4"
      >
        Toggle Complex Animation
      </button>

      ${Transition(
        {
          show: show.value,
          enterFrom: 'scale-50 rotate-[45deg] opacity-0',
          enterActive: 'transition-all duration-500 ease-out delay-100',
          enterTo: 'scale-100 rotate-[0deg] opacity-100',
          leaveFrom: 'scale-100 rotate-[0deg] opacity-100',
          leaveActive: 'transition-all duration-300 ease-in',
          leaveTo: 'scale-50 rotate-[-45deg] opacity-0',
        },
        html`
          <div
            class="p-8 bg-linear-to-br from-primary-500 to-secondary-500 text-white rounded-xl shadow-2xl"
          >
            <h2 class="text-2xl font-bold mb-2">Complex Animation</h2>
            <p>Multiple transforms combined with opacity and timing!</p>
          </div>
        `,
      )}
    </div>
  `;
});

// List animation demo
component('list-animation-demo', () => {
  const items = ref([
    { id: 1, text: 'Item 1' },
    { id: 2, text: 'Item 2' },
    { id: 3, text: 'Item 3' },
    { id: 4, text: 'Item 4' },
    { id: 5, text: 'Item 5' },
  ]);

  const addItem = () => {
    const id = __test_generateId();
    items.value = __test_addByItem(items.value, {
      id,
      text: `Item ${items.value.length + 1}`,
    });
  };

  const removeItem = (id: number) => {
    items.value = __test_removeById(items.value, id);
  };

  const shuffle = () => {
    // Delegate to shared shuffle helper to keep logic DRY and testable
    items.value = __test_shuffleArray(
      items.value as unknown as Array<{ id: number; text: string }>,
    );
  };

  return html`
    <div class="p-4">
      <div class="mb-4 space-x-2">
        <button
          @click="${addItem}"
          class="px-4 py-2 bg-success-500 text-white rounded"
        >
          Add Item
        </button>
        <button
          @click="${shuffle}"
          class="px-4 py-2 bg-info-500 text-white rounded"
        >
          Shuffle
        </button>
      </div>

      ${TransitionGroup(
        {
          preset: 'slide-right',
          tag: 'div',
          moveClass: 'transition-transform duration-500 ease-out',
          appear: true,
        },
        each(
          items.value,
          (item: { id: number; text: string }) => html`
            <div
              key="${item.id}"
              class="p-4 mb-2 bg-neutral-100 rounded-lg flex justify-between items-center
                 hover:bg-neutral-200 transition-colors"
            >
              <span class="font-medium">${item.text}</span>
              <button
                @click="${() => removeItem(item.id)}"
                class="px-3 py-1 bg-error-500 text-white rounded hover:bg-error-600"
              >
                Remove
              </button>
            </div>
          `,
        ),
      )}
    </div>
  `;
});

// Flex and Grid layout demo with class prop
component('layout-demo', () => {
  const flexItems = ref([
    { id: 1, emoji: '🎨', name: 'Design' },
    { id: 2, emoji: '💻', name: 'Code' },
    { id: 3, emoji: '🚀', name: 'Deploy' },
    { id: 4, emoji: '🎉', name: 'Celebrate' },
  ]);

  const gridItems = ref([
    { id: 1, emoji: '🏠', name: 'Home', color: 'bg-primary-500' },
    { id: 2, emoji: '⚙️', name: 'Settings', color: 'bg-secondary-500' },
    { id: 3, emoji: '📊', name: 'Analytics', color: 'bg-success-500' },
    { id: 4, emoji: '👤', name: 'Profile', color: 'bg-info-500' },
    { id: 5, emoji: '📧', name: 'Messages', color: 'bg-error-500' },
    { id: 6, emoji: '🔔', name: 'Alerts', color: 'bg-warning-500' },
  ]);

  const layoutType = ref('flex');
  const flexShuffleCount = ref(0);
  const gridShuffleCount = ref(0);
  const lastFlexOrder = ref<string>('');
  const lastGridOrder = ref<string>('');

  const addFlexItem = () => {
    const emojis = ['✨', '🌟', '⭐', '💫', '🌈', '🎯', '🎪'];
    const names = ['New', 'Item', 'Feature', 'Update', 'Release', 'Version'];
    const id = __test_generateId();
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    const name = names[Math.floor(Math.random() * names.length)];
    flexItems.value = __test_addByItem(flexItems.value, { id, emoji, name });
  };

  const removeFlexItem = (id: number) => {
    flexItems.value = __test_removeById(flexItems.value, id);
  };

  const shuffleFlexItems = () => {
    const beforeOrder = flexItems.value.map((i) => i.id).join(',');
    lastFlexOrder.value = beforeOrder;

    flexItems.value = __test_shuffleArray(
      flexItems.value as unknown as Array<{ id: number }>,
    );
    flexShuffleCount.value++;
  };

  const addGridItem = () => {
    const emojis = ['🎮', '🎲', '🎭', '🎪', '🎨', '🎬', '🎸'];
    const names = [
      'Gaming',
      'Random',
      'Theater',
      'Circus',
      'Art',
      'Movies',
      'Music',
    ];
    const colors = [
      'bg-primary-500',
      'bg-secondary-500',
      'bg-success-500',
      'bg-info-500',
      'bg-warning-500',
      'bg-error-500',
    ];
    const id = __test_generateId();
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    const name = names[Math.floor(Math.random() * names.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    gridItems.value = __test_addByItem(gridItems.value, {
      id,
      emoji,
      name,
      color,
    });
  };

  const removeGridItem = (id: number) => {
    gridItems.value = __test_removeById(gridItems.value, id);
  };

  const shuffleGridItems = () => {
    const beforeOrder = gridItems.value.map((i) => i.id).join(',');
    lastGridOrder.value = beforeOrder;

    gridItems.value = __test_shuffleArray(
      gridItems.value as unknown as Array<{ id: number }>,
    );
    gridShuffleCount.value++;
  };

  return html`
    <div class="p-6">
      <div class="mb-6">
        <h2 class="text-2xl font-bold mb-2">
          🎨 Layout Styling with class Prop
        </h2>
        <p class="text-neutral-600 mb-4">
          The <code class="bg-neutral-100 px-2 py-1 rounded">class</code> prop
          allows you to style the TransitionGroup wrapper with flex, grid, or
          any other layout system!
        </p>

        <div class="flex gap-2 mb-4">
          <button
            @click="${() => (layoutType.value = 'flex')}"
            class="px-4 py-2 rounded ${layoutType.value === 'flex'
              ? 'bg-primary-500 text-white'
              : 'bg-neutral-200'}"
          >
            Flex Layout
          </button>
          <button
            @click="${() => (layoutType.value = 'grid')}"
            class="px-4 py-2 rounded ${layoutType.value === 'grid'
              ? 'bg-primary-500 text-white'
              : 'bg-neutral-200'}"
          >
            Grid Layout
          </button>
        </div>
      </div>

      ${when(
        layoutType.value === 'flex',
        html`
          <div class="mb-4">
            <h3 class="text-xl font-semibold mb-3">Flex Layout Example</h3>
            <p class="text-neutral-600 mb-4">
              Using
              <code class="bg-neutral-100 px-2 py-1 rounded text-sm"
                >class="flex gap-4 items-center justify-around p-6
                bg-linear-to-r from-blue-50 to-purple-50 rounded-xl"</code
              >
            </p>

            <div class="flex gap-2 mb-4 items-center">
              <button
                @click="${addFlexItem}"
                class="px-4 py-2 bg-success-500 text-white rounded hover:bg-success-600"
              >
                ➕ Add Item
              </button>
              <button
                @click="${shuffleFlexItems}"
                class="px-4 py-2 bg-info-500 text-white rounded hover:bg-info-600"
              >
                🔀 Shuffle
              </button>
              ${when(
                flexShuffleCount.value > 0,
                html`
                  <span
                    class="px-3 py-1 bg-neutral-100 rounded text-sm font-medium"
                  >
                    Shuffles: ${flexShuffleCount.value}
                  </span>
                `,
              )}
            </div>

            ${TransitionGroup(
              {
                preset: 'scale',
                class:
                  'flex gap-4 items-center justify-around p-6 bg-linear-to-r from-primary-50 to-secondary-50 rounded-xl min-h-[120px]',
                tag: 'div',
                moveClass: 'transition-all duration-500 ease-out',
                appear: true,
              },
              each(
                flexItems.value,
                (item: { id: number; emoji: string; name: string }) => html`
                  <div
                    key="${item.id}"
                    class="flex flex-col items-center gap-2 p-4 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer group"
                  >
                    <div
                      class="text-4xl group-hover:scale-110 transition-transform"
                    >
                      ${item.emoji}
                    </div>
                    <div class="font-medium text-neutral-700">${item.name}</div>
                    <button
                      @click="${() => removeFlexItem(item.id)}"
                      class="text-xs px-2 py-1 bg-error-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Remove
                    </button>
                  </div>
                `,
              ),
            )}
          </div>
        `,
      )}
      ${when(
        layoutType.value === 'grid',
        html`
          <div>
            <h3 class="text-xl font-semibold mb-3">Grid Layout Example</h3>
            <p class="text-neutral-600 mb-4">
              Using
              <code class="bg-neutral-100 px-2 py-1 rounded text-sm"
                >class="grid grid-cols-3 gap-4 p-6 bg-neutral-50
                rounded-xl"</code
              >
            </p>

            <div class="flex gap-2 mb-4 items-center">
              <button
                @click="${addGridItem}"
                class="px-4 py-2 bg-success-500 text-white rounded hover:bg-success-600"
              >
                ➕ Add Card
              </button>
              <button
                @click="${shuffleGridItems}"
                class="px-4 py-2 bg-info-500 text-white rounded hover:bg-info-600"
              >
                🔀 Shuffle
              </button>
              ${when(
                gridShuffleCount.value > 0,
                html`
                  <span
                    class="px-3 py-1 bg-neutral-100 rounded text-sm font-medium"
                  >
                    Shuffles: ${gridShuffleCount.value}
                  </span>
                `,
              )}
            </div>

            ${TransitionGroup(
              {
                preset: 'fade',
                class:
                  'grid grid-cols-3 gap-4 p-6 bg-neutral-50 rounded-xl min-h-[200px]',
                tag: 'div',
                moveClass: 'transition-all duration-700 ease-in-out',
                appear: true,
              },
              each(
                gridItems.value,
                (item: {
                  id: number;
                  emoji: string;
                  name: string;
                  color: string;
                }) => html`
                  <div
                    key="${item.id}"
                    class="${item.color} text-white rounded-xl p-6 shadow-lg hover:shadow-2xl hover:scale-105 transition-all cursor-pointer group relative"
                  >
                    <div class="text-5xl mb-3">${item.emoji}</div>
                    <div class="text-lg font-bold">${item.name}</div>
                    <button
                      @click="${() => removeGridItem(item.id)}"
                      class="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                `,
              ),
            )}
          </div>
        `,
      )}

      <div class="mt-8 p-4 bg-info-50 border border-info-200 rounded-lg">
        <h4 class="font-semibold text-info-900 mb-2">💡 Pro Tip</h4>
        <p class="text-info-800 text-sm">
          The <code class="bg-info-100 px-2 py-1 rounded">class</code> prop
          works seamlessly with JIT CSS! All utility classes are automatically
          generated and added to the component's adoptedStyleSheets. You can use
          any Tailwind-like utilities including responsive variants (<code
            class="bg-info-100 px-2 py-1 rounded"
            >sm:</code
          >, <code class="bg-info-100 px-2 py-1 rounded">md:</code>), state
          variants (<code class="bg-info-100 px-2 py-1 rounded">hover:</code>,
          <code class="bg-info-100 px-2 py-1 rounded">focus:</code>), and more!
        </p>
      </div>
    </div>
  `;
});

// Master demo component
component('transition-showcase', () => {
  const activeDemo = ref('fade');

  const demos = [
    { id: 'fade', name: 'Fade', component: 'fade-demo' },
    { id: 'slide', name: 'Slide', component: 'slide-demo' },
    {
      id: 'notifications',
      name: 'Notifications',
      component: 'notification-demo',
    },
    { id: 'complex', name: 'Complex', component: 'complex-animation-demo' },
    { id: 'list', name: 'List Animation', component: 'list-animation-demo' },
    { id: 'layouts', name: 'Flex & Grid Layouts', component: 'layout-demo' },
  ];

  return html`
    <div class="min-h-screen bg-neutral-50">
      <header class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4 py-6">
          <h1 class="text-3xl font-bold text-neutral-900">
            🎬 Transition System Demo
          </h1>
          <p class="text-neutral-600 mt-2">
            Vue-like transitions with JIT CSS integration
          </p>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-4 py-8">
        <nav class="mb-8 flex space-x-2 overflow-x-auto">
          ${each(
            demos,
            (demo: { id: string; name: string; component: string }) => html`
              <button
                key="${demo.id}"
                @click="${() => (activeDemo.value = demo.id)}"
                class="px-4 py-2 rounded whitespace-nowrap
                     ${activeDemo.value === demo.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-neutral-700 hover:bg-neutral-100'}"
              >
                ${demo.name}
              </button>
            `,
          )}
        </nav>

        <div class="bg-white rounded-xl shadow-lg overflow-hidden">
          ${when(activeDemo.value === 'fade', html`<fade-demo></fade-demo>`)}
          ${when(activeDemo.value === 'slide', html`<slide-demo></slide-demo>`)}
          ${when(
            activeDemo.value === 'notifications',
            html`<notification-demo></notification-demo>`,
          )}
          ${when(
            activeDemo.value === 'complex',
            html`<complex-animation-demo></complex-animation-demo>`,
          )}
          ${when(
            activeDemo.value === 'list',
            html`<list-animation-demo></list-animation-demo>`,
          )}
          ${when(
            activeDemo.value === 'layouts',
            html`<layout-demo></layout-demo>`,
          )}
        </div>
      </main>
    </div>
  `;
});

// --- Exported helpers for tests and coverage ---
/**
 * Return a preset name for a given direction.
 * Mirrors the internal getPreset used in slide-demo.
 */
export function __test_getPreset(direction: string): string {
  switch (direction) {
    case 'right':
      return 'slide-right';
    case 'left':
      return 'slide-left';
    case 'up':
      return 'slide-up';
    case 'down':
      return 'slide-down';
    default:
      return 'fade';
  }
}

/**
 * Simple shuffle utility used by several demos. Returns a new shuffled array.
 */
export function __test_shuffleArray<T>(input: T[]): T[] {
  const shuffled = [...input];
  for (let pass = 0; pass < 3; pass++) {
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
  }
  if (shuffled.every((item, idx) => (input as unknown[])[idx] === item)) {
    shuffled.reverse();
  }
  return shuffled;
}

/**
 * Return a notification message for a given type.
 * Mirrors the messages map used by addNotification.
 */
export function __test_notificationMessage(type: string): string {
  const messages: Record<string, string> = {
    success: 'Operation completed successfully!',
    error: 'An error occurred!',
    info: 'Here is some information.',
    warning: 'Warning: Please be careful!',
  };
  return messages[type] || 'Notification';
}

/**
 * Add a notification to an array and return the new array and id.
 */
export function __test_addNotificationTo(
  notifs: Array<{ id: number; message: string; type: string }>,
  type: string,
): { list: Array<{ id: number; message: string; type: string }>; id: number } {
  const id = __test_generateId();
  const message = __test_notificationMessage(type);
  const list = __test_addByItem(notifs, { id, message, type });
  return { list, id };
}

/**
 * Create and add a list item (used by list-demo)
 */
export function __test_addListItem(
  items: Array<{ id: number; text: string }>,
): Array<{ id: number; text: string }> {
  const id = __test_generateId();
  return __test_addByItem(items, { id, text: `Item ${items.length + 1}` });
}

/**
 * Create and add a flex item (used by layout-demo)
 */
export function __test_addFlexItemArray(
  items: Array<{ id: number; emoji: string; name: string }>,
): Array<{ id: number; emoji: string; name: string }> {
  const emojis = ['✨', '🌟', '⭐', '💫', '🌈', '🎯', '🎪'];
  const names = ['New', 'Item', 'Feature', 'Update', 'Release', 'Version'];
  const id = __test_generateId();
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
  const name = names[Math.floor(Math.random() * names.length)];
  return __test_addByItem(items, { id, emoji, name });
}

/**
 * Create and add a grid item (used by layout-demo)
 */
export function __test_addGridItemArray(
  items: Array<{ id: number; emoji: string; name: string; color: string }>,
): Array<{ id: number; emoji: string; name: string; color: string }> {
  const emojis = ['🎮', '🎲', '🎭', '🎪', '🎨', '🎬', '🎸'];
  const names = [
    'Gaming',
    'Random',
    'Theater',
    'Circus',
    'Art',
    'Movies',
    'Music',
  ];
  const colors = [
    'bg-primary-500',
    'bg-secondary-500',
    'bg-success-500',
    'bg-info-500',
    'bg-warning-500',
    'bg-error-500',
  ];
  const id = __test_generateId();
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
  const name = names[Math.floor(Math.random() * names.length)];
  const color = colors[Math.floor(Math.random() * colors.length)];
  return __test_addByItem(items, { id, emoji, name, color });
}

// Small utility helpers to make many small behaviors directly testable.
export function __test_toggleBoolean(v: boolean): boolean {
  return !v;
}

export function __test_formatListItemText(len: number): string {
  return `Item ${len + 1}`;
}

export function __test_pickRandomFromArray<T>(arr: T[]): T | undefined {
  if (!arr || arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function __test_getNavButtonClass(
  activeId: string,
  demoId: string,
): string {
  return activeId === demoId
    ? 'bg-primary-500 text-white'
    : 'bg-white text-neutral-700 hover:bg-neutral-100';
}

export function __test_increment(n: number): number {
  return n + 1;
}

export function __test_extractIds<T extends { id: number }>(
  arr: T[],
): number[] {
  return arr.map((i) => i.id);
}

/**
 * Generate an id for test/demo items.
 */
export function __test_generateId(): number {
  return Date.now();
}

/**
 * Add an item to an array (immutable). Useful to mirror component logic in tests.
 */
export function __test_addByItem<T>(array: T[], item: T): T[] {
  return [...array, item];
}

/**
 * Remove an item by `id` from an array of objects with `id:number`.
 */
export function __test_removeById<T extends { id: number }>(
  array: T[],
  id: number,
): T[] {
  return array.filter((it) => it.id !== id);
}
