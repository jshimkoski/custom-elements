// Example: Global Event Bus Integration with Reactive Components

import { createReactiveComponent } from '../lib/runtime.ts';

// Define types for cart items and events
interface CartItem {
  id: number;
  name: string;
  price: number;
}

interface AddItemData {
  name: string;
  price: number;
}

interface CartState {
  items: CartItem[];
}

// Example 1: Shopping Cart Component
const ShoppingCart = createReactiveComponent<CartState>({
  tag: 'shopping-cart',
  template(state: CartState): string {
    return `
      <div class="cart">
        <h3>Shopping Cart (${state.items.length} items)</h3>
        <div class="items">
          ${state.items.map(item => `
            <div class="item">
              ${item.name} - $${item.price.toFixed(2)}
              <button data-item-id="${item.id}" data-ref="remove">Remove</button>
            </div>
          `).join('')}
        </div>
        <div class="total">Total: $${(state as any).total}</div>
        <button data-ref="clear">Clear Cart</button>
        <div style="font-size: 12px; color: gray;">Debug: ${new Date().toLocaleTimeString()}</div>
      </div>
    `;
  },
  style: `
    .cart { border: 1px solid #ccc; padding: 20px; margin: 10px; }
    .item { display: flex; justify-content: space-between; margin: 5px 0; }
    .total { font-weight: bold; margin-top: 10px; }
  `,
  state: {
    items: [] as CartItem[]
  },
  computed: {
    total(state: CartState, _api): string {
      return state.items.reduce((sum, item) => sum + item.price, 0).toFixed(2);
    }
  },
  hooks: {
    setupGlobalEvents(state, api): void {
      console.log('ShoppingCart setupGlobalEvents called');
      // Listen for items being added from product components
      api.onGlobal('cart:add-item', (item: AddItemData) => {
        console.log('ShoppingCart received cart:add-item event:', item);
        console.log('Adding item to cart:', item);
        const newItem: CartItem = { ...item, id: Date.now() };
        state.items = [...state.items, newItem];
        
        // Emit confirmation
        api.emitGlobal('cart:item-added', { 
          item: newItem, 
          cartTotal: state.items.reduce((sum, item) => sum + item.price, 0).toFixed(2)
        });
      });

      // Listen for cart clear requests from other components
      api.onGlobal('cart:clear', () => {
        const itemCount = state.items.length;
        state.items = [];
        api.emitGlobal('cart:cleared', { itemCount });
      });
    }
  },
  events: {
    '[data-ref="remove"]': {
      click: (e, state, api) => {
        const target = e.target as HTMLElement;
        const itemIdStr = target.dataset.itemId;
        if (!itemIdStr) return;
        
        const itemId = parseInt(itemIdStr, 10);
        const item = state.items.find((item: CartItem) => item.id === itemId);
        if (!item) return;
        
        state.items = state.items.filter((item: CartItem) => item.id !== itemId);
        
        // Emit global event about item removal
        api.emitGlobal('cart:item-removed', { item });
      }
    },
    '[data-ref="clear"]': {
      click: (_e, _state, api) => {
        api.emitGlobal('cart:clear');
      }
    }
  }
});

// Define types for product component
interface ProductState {
  name: string;
  price: number;
  stock: number;
  statusMessage: string;
}

interface InventoryUpdateEvent {
  productName: string;
  stock: number;
}

interface NotificationState {
  notifications: NotificationItem[];
}

interface NotificationItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface NotifyEvent {
  message: string;
  type?: 'success' | 'error' | 'info';
}

// Example 2: Product Component
const ProductCard = createReactiveComponent<ProductState>({
  tag: 'product-card',
  template: (state: ProductState): string => `
    <div class="product">
      <h4>${state.name}</h4>
      <p>Price: $${state.price.toFixed(2)}</p>
      <p>Stock: ${state.stock}</p>
      <button data-ref="addToCart" ${state.stock === 0 ? 'disabled' : ''}>
        ${state.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
      </button>
      <div class="status">${state.statusMessage}</div>
    </div>
  `,
  style: `
    .product { 
      border: 1px solid #ddd; 
      padding: 15px; 
      margin: 10px; 
      border-radius: 5px; 
    }
    .status { 
      margin-top: 10px; 
      font-style: italic; 
      color: #666; 
    }
    button:disabled { 
      background: #ccc; 
      cursor: not-allowed; 
    }
  `,
  state: {
    name: 'Sample Product',
    price: 29.99,
    stock: 5,
    statusMessage: ''
  },
  attrs: {
    name: { type: 'string', reflect: true },
    price: { type: 'number', reflect: true },
    stock: { type: 'number', reflect: true }
  },
  hooks: {
    setupGlobalEvents(state, api): void {
      // Listen for cart events to show feedback
      api.onGlobal('cart:item-added', (data: any) => {
        if (data.item.name === state.name) {
          state.statusMessage = `Added to cart! Cart total: $${data.cartTotal}`;
          setTimeout(() => {
            state.statusMessage = '';
          }, 3000);
        }
      });

      // Listen for inventory updates from other systems
      api.onGlobal('inventory:update', (data: InventoryUpdateEvent) => {
        if (data.productName === state.name) {
          state.stock = data.stock;
          state.statusMessage = `Stock updated: ${data.stock} remaining`;
        }
      });
    }
  },
  events: {
    '[data-ref="addToCart"]': {
      click: (_e, state, api) => {
        console.log('Button clicked!');
        
        // Visual debug - change status message to confirm button works
        state.statusMessage = 'Button clicked! ' + new Date().toLocaleTimeString();
        
        if (state.stock > 0) {
          console.log('Emitting cart:add-item event for:', state.name);
          // Emit global event to add to cart
          api.emitGlobal('cart:add-item', {
            name: state.name,
            price: state.price
          });
          
          // Update local stock
          state.stock--;
          
          // Emit inventory update for other product instances
          api.emitGlobal('inventory:update', {
            productName: state.name,
            stock: state.stock
          });
        }
      }
    }
  }
});

// Example 3: Notification System Component
const NotificationCenter = createReactiveComponent<NotificationState>({
  tag: 'notification-center',
  template: (state: NotificationState): string => `
    <div class="notifications">
      ${state.notifications.map(notification => `
        <div class="notification ${notification.type}">
          ${notification.message}
          <button data-notification-id="${notification.id}" data-ref="dismiss">×</button>
        </div>
      `).join('')}
    </div>
  `,
  style: `
    .notifications {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
    }
    .notification {
      background: white;
      border: 1px solid #ccc;
      padding: 10px;
      margin: 5px 0;
      border-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-width: 250px;
    }
    .notification.success { border-left: 4px solid #4caf50; }
    .notification.error { border-left: 4px solid #f44336; }
    .notification.info { border-left: 4px solid #2196f3; }
  `,
  state: {
    notifications: [] as NotificationItem[]
  },
  hooks: {
    setupGlobalEvents(state, api): void {
      // Helper function to add notifications
      const addNotification = (message: string, type: 'success' | 'error' | 'info' = 'info'): void => {
        const notification: NotificationItem = {
          id: Date.now(),
          message,
          type
        };
        state.notifications = [...state.notifications, notification];
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          state.notifications = state.notifications.filter((n: NotificationItem) => n.id !== notification.id);
        }, 5000);
      };

      // Listen for various events to show notifications
      api.onGlobal('cart:item-added', (data: any) => {
        addNotification(`${data.item.name} added to cart!`, 'success');
      });

      api.onGlobal('cart:item-removed', (data: any) => {
        addNotification(`${data.item.name} removed from cart`, 'info');
      });

      api.onGlobal('cart:cleared', (data: any) => {
        addNotification(`Cart cleared (${data.itemCount} items removed)`, 'info');
      });

      // Listen for explicit notification requests
      api.onGlobal('notify', (data: NotifyEvent) => {
        addNotification(data.message, data.type || 'info');
      });
    }
  },
  refs: {
    dismiss: (el, state, _api) => {
      el.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const notificationIdStr = target.dataset.notificationId;
        if (!notificationIdStr) return;
        
        const notificationId = parseInt(notificationIdStr, 10);
        state.notifications = state.notifications.filter(n => n.id !== notificationId);
      });
    }
  },
  // events: {
  //   '[data-ref="dismiss"]': {
  //     click: (e, state, _api) => {
  //       const target = e.target as HTMLElement;
  //       const notificationIdStr = target.dataset.notificationId;
  //       if (!notificationIdStr) return;
        
  //       const notificationId = parseInt(notificationIdStr, 10);
  //       state.notifications = state.notifications.filter(n => n.id !== notificationId);
  //     }
  //   }
  // }
});

// Define types for app state
interface AppState {
  user: UserData | null;
  theme: string;
  language: string;
}

interface UserData {
  id: string;
  name: string;
  email?: string;
  [key: string]: any;
}

// Example 4: Global State Manager Component
const AppStateManager = createReactiveComponent<AppState>({
  tag: 'app-state-manager',
  template: (): string => `
    <div style="display: none;">
      <!-- This component manages global state but doesn't render anything -->
    </div>
  `,
  state: {
    user: null,
    theme: 'light',
    language: 'en'
  },
  hooks: {
    setupGlobalEvents(state, api): void {
      // Handle authentication events
      api.onGlobal('auth:login', (userData: UserData) => {
        state.user = userData;
        api.emitGlobal('app:state-changed', { user: userData });
      });

      api.onGlobal('auth:logout', () => {
        state.user = null;
        api.emitGlobal('app:state-changed', { user: null });
      });

      // Handle theme changes
      api.onGlobal('theme:change', (theme: string) => {
        state.theme = theme;
        document.body.className = `theme-${theme}`;
        api.emitGlobal('app:state-changed', { theme });
      });

      // Provide state on request
      api.onGlobal('app:get-state', () => {
        api.emitGlobal('app:state-response', {
          user: state.user,
          theme: state.theme,
          language: state.language
        });
      });
    }
  }
});

// Usage Example:
// document.body.innerHTML = `
// <app-state-manager></app-state-manager>
// <notification-center></notification-center>

// <product-card name="Laptop" price="999.99" stock="3"></product-card>
// <product-card name="Mouse" price="29.99" stock="10"></product-card>
// <product-card name="Keyboard" price="79.99" stock="0"></product-card>

// <shopping-cart></shopping-cart>
// `;

// Example of external event triggering:
// setTimeout(() => {
//   emit('notify', { message: 'Welcome to our store!', type: 'success' });
// }, 1000);

// Example of listening to events outside components:
// on('cart:item-added', (data) => {
//   console.log('External listener: Item added to cart', data);
//   // Could send analytics, update external systems, etc.
// });

export { ShoppingCart, ProductCard, NotificationCenter, AppStateManager };
