/**
 * Transition Demo Component
 * Showcases the transition system with JIT CSS integration
 */

import { component, html, ref, Transition, TransitionGroup, each, when } from '../lib/index';

// Simple fade demo
component('fade-demo', () => {
  const show = ref(true);
  
  // Debug: Check if CSS is actually in the shadow DOM
  if (typeof document !== 'undefined') {
    setTimeout(() => {
      const fadeDemo = document.querySelector('fade-demo');
      if (fadeDemo?.shadowRoot) {
        const styles = Array.from(fadeDemo.shadowRoot.adoptedStyleSheets).map(sheet => {
          try {
            return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
          } catch (e) {
            return 'Cannot access stylesheet';
          }
        }).join('\n\n');
      }
    }, 1000);
  }
  
  return html`
    <div class="p-4">
      <!-- Preload transition classes -->
      <div style="display:none" class="opacity-0 opacity-100 transition-opacity duration-300 ease-out duration-200 ease-in"></div>
      
      <button 
        @click="${() => show.value = !show.value}"
        class="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 mb-4"
      >
        Toggle Fade
      </button>
      
      ${Transition({
        preset: 'fade',
        show: show.value
      }, html`
        <div class="p-4 bg-primary-100 rounded-lg">
          Hello! I fade in and out smoothly.
        </div>
      `)}
    </div>
  `;
});

// Slide transitions demo
component('slide-demo', () => {
  const show = ref(true);
  const direction = ref('right');
  
  const getPreset = () => {
    switch (direction.value) {
      case 'right': return 'slide-right';
      case 'left': return 'slide-left';
      case 'up': return 'slide-up';
      case 'down': return 'slide-down';
      default: return 'fade';
    }
  };
  
  return html`
    <div class="p-4">
      <div class="mb-4 space-x-2">
        <button 
          @click="${() => show.value = !show.value}"
          class="px-4 py-2 bg-primary-500 text-white rounded"
        >
          Toggle
        </button>
        
        <select 
          :model="${direction}"
          class="px-4 py-2 border rounded"
        >
          <option value="right">Slide Right</option>
          <option value="left">Slide Left</option>
          <option value="up">Slide Up</option>
          <option value="down">Slide Down</option>
        </select>
      </div>
      
      ${Transition({
        preset: getPreset(),
        show: show.value
      }, html`
        <div class="p-4 bg-secondary-100 rounded-lg">
          I slide from different directions!
        </div>
      `)}
    </div>
  `;
});

// Notification system demo
component('notification-demo', () => {
  const notifications = ref<Array<{ id: number; message: string; type: string }>>([]);
  
  const addNotification = (type: string) => {
    const messages = {
      success: 'Operation completed successfully!',
      error: 'An error occurred!',
      info: 'Here is some information.',
      warning: 'Warning: Please be careful!'
    };
    
    const id = Date.now();
    notifications.value = [...notifications.value, {
      id,
      message: messages[type as keyof typeof messages] || 'Notification',
      type
    }];
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      notifications.value = notifications.value.filter((n: { id: number }) => n.id !== id);
    }, 3000);
  };
  
  const removeNotification = (id: number) => {
    notifications.value = notifications.value.filter((n: { id: number }) => n.id !== id);
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
        ${TransitionGroup({
          tag: 'div',
          enterFrom: 'translate-x-[100%] opacity-0',
          enterActive: 'transition-all duration-300 ease-out',
          enterTo: 'translate-x-[0%] opacity-100',
          leaveFrom: 'translate-x-[0%] opacity-100',
          leaveActive: 'transition-all duration-200 ease-in',
          leaveTo: 'translate-x-[100%] opacity-0',
          moveClass: 'transition-transform duration-300'
        }, each(notifications.value, (notif: { id: number; message: string; type: string }) => html`
          <div
            key="${notif.id}"
            class="p-4 rounded-lg shadow-lg flex justify-between items-start
                   ${notif.type === 'success' ? 'bg-success-100 text-success-900' :
                     notif.type === 'error' ? 'bg-error-100 text-error-900' :
                     notif.type === 'warning' ? 'bg-warning-100 text-warning-900' :
                     'bg-info-100 text-info-900'}"
          >
            <p class="flex-1">${notif.message}</p>
            <button
              @click="${() => removeNotification(notif.id)}"
              class="ml-2 text-current opacity-50 hover:opacity-100 text-xl font-bold"
            >
              ×
            </button>
          </div>
        `))}
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
        @click="${() => show.value = !show.value}"
        class="px-4 py-2 bg-primary-500 text-white rounded mb-4"
      >
        Toggle Complex Animation
      </button>
      
      ${Transition({
        show: show.value,
        enterFrom: 'scale-50 rotate-[45deg] opacity-0',
        enterActive: 'transition-all duration-500 ease-out delay-100',
        enterTo: 'scale-100 rotate-[0deg] opacity-100',
        leaveFrom: 'scale-100 rotate-[0deg] opacity-100',
        leaveActive: 'transition-all duration-300 ease-in',
        leaveTo: 'scale-50 rotate-[-45deg] opacity-0'
      }, html`
        <div class="p-8 bg-gradient-to-br from-primary-500 to-secondary-500 text-white rounded-xl shadow-2xl">
          <h2 class="text-2xl font-bold mb-2">Complex Animation</h2>
          <p>Multiple transforms combined with opacity and timing!</p>
        </div>
      `)}
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
    { id: 5, text: 'Item 5' }
  ]);

  const addItem = () => {
    const id = Date.now();
    items.value = [...items.value, { id, text: `Item ${items.value.length + 1}` }];
  };
  
  const removeItem = (id: number) => {
    items.value = items.value.filter((item: { id: number }) => item.id !== id);
  };
  
  const shuffle = () => {
    const before = items.value.map(i => i.id);
    
    // Ensure we actually shuffle by doing multiple passes
    const shuffled = [...items.value];
    // Do 3 shuffle passes to ensure the order changes
    for (let pass = 0; pass < 3; pass++) {
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
    }
    
    // If still the same order (very unlikely), manually reverse
    if (shuffled.every((item, idx) => item.id === items.value[idx].id)) {
      shuffled.reverse();
    }
    
    // Assign new array to trigger reactivity
    items.value = shuffled;
    
    const after = items.value.map(i => i.id);
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
      
      ${TransitionGroup({
        preset: 'slide-right',
        tag: 'div',
        moveClass: 'transition-transform duration-500 ease-out'
      }, each(items.value, (item: { id: number; text: string }) => html`
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
      `))}
    </div>
  `;
});

// Master demo component
component('transition-showcase', () => {
  const activeDemo = ref('fade');
  
  const demos = [
    { id: 'fade', name: 'Fade', component: 'fade-demo' },
    { id: 'slide', name: 'Slide', component: 'slide-demo' },
    { id: 'notifications', name: 'Notifications', component: 'notification-demo' },
    { id: 'complex', name: 'Complex', component: 'complex-animation-demo' },
    { id: 'list', name: 'List Animation', component: 'list-animation-demo' }
  ];
  
  return html`
    <!-- Hidden div to pre-generate JIT CSS for all transition classes -->
    <div style="display:none" class="
      opacity-0 opacity-100
      transition-slide-right-from transition-slide-right-to
      transition-slide-left-from transition-slide-left-to
      transition-slide-up-from transition-slide-up-to
      transition-slide-down-from transition-slide-down-to
      transition-scale-from transition-scale-to
      transition-scale-down-from transition-scale-down-to
      transition-zoom-from transition-zoom-to
      transition-bounce-from transition-bounce-to
      transition-flip-from transition-flip-to
      transition-complex-from transition-complex-to transition-complex-leave
      transition-opacity transition-all transition-transform transition-colors
      duration-300 duration-200 duration-500 duration-150 duration-400
      ease-out ease-in ease-bounce ease-elastic
      delay-100
    "></div>
    
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
          ${each(demos, (demo: { id: string; name: string; component: string }) => html`
            <button
              key="${demo.id}"
              @click="${() => activeDemo.value = demo.id}"
              class="px-4 py-2 rounded whitespace-nowrap
                     ${activeDemo.value === demo.id 
                       ? 'bg-primary-500 text-white' 
                       : 'bg-white text-neutral-700 hover:bg-neutral-100'}"
            >
              ${demo.name}
            </button>
          `)}
        </nav>
        
        <div class="bg-white rounded-xl shadow-lg overflow-hidden">
          ${when(activeDemo.value === 'fade', html`<fade-demo></fade-demo>`)}
          ${when(activeDemo.value === 'slide', html`<slide-demo></slide-demo>`)}
          ${when(activeDemo.value === 'notifications', html`<notification-demo></notification-demo>`)}
          ${when(activeDemo.value === 'complex', html`<complex-animation-demo></complex-animation-demo>`)}
          ${when(activeDemo.value === 'list', html`<list-animation-demo></list-animation-demo>`)}
        </div>
      </main>
    </div>
  `;
});
