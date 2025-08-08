import { component, html, css, type ComponentState } from '../../lib/runtime.ts';

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface ShoppingCartState extends ComponentState {
  items: CartItem[];
  couponCode: string;
  isCartOpen: boolean;
}

component<ShoppingCartState>({
  tag: 'shopping-cart-demo',
  
  state: {
    items: [
      { id: 1, name: 'Wireless Headphones', price: 99.99, quantity: 1 },
      { id: 2, name: 'Smartphone Case', price: 24.99, quantity: 2 },
      { id: 3, name: 'USB-C Cable', price: 12.99, quantity: 1 }
    ],
    couponCode: '',
    isCartOpen: true
  },

  computed: {
    subtotal: (state) => 
      state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    
    tax: (state) => {
      const subtotal = (state as any).subtotal;
      return subtotal * 0.08; // 8% tax
    },
    
    discount: (state) => {
      const subtotal = (state as any).subtotal;
      if (state.couponCode.toLowerCase() === 'save10') return subtotal * 0.1;
      if (state.couponCode.toLowerCase() === 'save20') return subtotal * 0.2;
      return 0;
    },
    
    total: (state) => {
      const subtotal = (state as any).subtotal;
      const tax = (state as any).tax;
      const discount = (state as any).discount;
      return Math.max(0, subtotal + tax - discount);
    },
    
    itemCount: (state) => 
      state.items.reduce((sum, item) => sum + item.quantity, 0)
  },

  template: (state) => {
    const subtotal = (state as any).subtotal;
    const tax = (state as any).tax;
    const discount = (state as any).discount;
    const total = (state as any).total;
    const itemCount = (state as any).itemCount;

    return html`
    <div class="cart-container">
      <div class="cart-header">
        <h2>🛒 Shopping Cart</h2>
        <button 
          data-ref="toggleCart" 
          class="toggle-btn"
        >
          ${state.isCartOpen ? 'Hide' : 'Show'} (${itemCount} items)
        </button>
      </div>

      ${state.isCartOpen ? `
        <div class="cart-panel">
          <div class="cart-header">
            <h3>🛒 Shopping Cart (${state.items.length} items)</h3>
            <button data-ref="toggleCart" class="toggle-btn">✕</button>
          </div>
          
          <div class="cart-content">
            ${state.items.length === 0 ? `
              <div class="empty-cart">
                <p>Your cart is empty</p>
                <button data-ref="addSample" class="add-sample-btn">Add Sample Items</button>
              </div>
            ` : `
              <div class="cart-items" data-ref="cartContainer">
                ${state.items.map(item => `
                  <div class="cart-item" key="${item.id}">
                    <div class="item-info">
                      <span class="item-name">${item.name}</span>
                      <span class="item-price">$${item.price.toFixed(2)}</span>
                    </div>
                    <div class="item-controls">
                      <button class="qty-btn" data-item-id="${item.id}" data-action="decrease">−</button>
                      <span class="quantity">${item.quantity}</span>
                      <button class="qty-btn" data-item-id="${item.id}" data-action="increase">+</button>
                      <button class="remove-btn" data-item-id="${item.id}" data-action="remove">🗑</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        ` : ''}

        ${state.items.length > 0 ? html`
          <div class="coupon-section">
            <h3>Promo Code</h3>
            <div class="coupon-input">
              <input 
                data-ref="couponInput"
                type="text" 
                value="${state.couponCode}"
                placeholder="Enter coupon code (try SAVE10 or SAVE20)"
                class="coupon-field"
              >
              <button data-ref="applyCoupon" class="apply-btn">
                Apply
              </button>
            </div>
            ${discount > 0 ? html`
              <div class="coupon-success">
                ✅ Coupon applied! You saved $${discount.toFixed(2)}
              </div>
            ` : ''}
          </div>

          <div class="cart-summary">
            <h3>Order Summary</h3>
            <div class="summary-line">
              <span>Subtotal:</span>
              <span>$${subtotal.toFixed(2)}</span>
            </div>
            <div class="summary-line">
              <span>Tax (8%):</span>
              <span>$${tax.toFixed(2)}</span>
            </div>
            ${discount > 0 ? html`
              <div class="summary-line discount">
                <span>Discount:</span>
                <span>-$${discount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="summary-line total">
              <span>Total:</span>
              <span>$${total.toFixed(2)}</span>
            </div>
            
            <div class="cart-actions">
              <button data-ref="clearCart" class="clear-btn">
                Clear Cart
              </button>
              <button data-ref="checkout" class="checkout-btn">
                Checkout ($${total.toFixed(2)})
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
    `;
  },

  style: css`
    .cart-container {
      max-width: 600px;
      margin: 2rem auto;
      padding: 1rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .cart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #eee;
    }

    .cart-header h2 {
      margin: 0;
      color: #333;
    }

    .toggle-btn {
      padding: 0.5rem 1rem;
      border: 1px solid #007bff;
      background: #007bff;
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
    }

    .toggle-btn:hover {
      background: #0056b3;
    }

    .cart-content {
      transition: all 0.3s ease;
      overflow: hidden;
    }

    .cart-content.closed {
      max-height: 0;
      opacity: 0;
    }

    .cart-content.open {
      max-height: 1000px;
      opacity: 1;
    }

    .items-section h3,
    .coupon-section h3,
    .cart-summary h3 {
      color: #333;
      margin-bottom: 1rem;
      font-size: 1.1rem;
    }

    .empty-cart {
      text-align: center;
      padding: 2rem;
      color: #666;
    }

    .add-sample-btn {
      padding: 0.75rem 1.5rem;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
    }

    .add-sample-btn:hover {
      background: #218838;
    }

    .cart-items {
      space-y: 1rem;
    }

    .cart-item {
      display: grid;
      grid-template-columns: 1fr auto auto auto;
      gap: 1rem;
      align-items: center;
      padding: 1rem;
      border: 1px solid #eee;
      border-radius: 4px;
      margin-bottom: 0.5rem;
    }

    .item-info h4 {
      margin: 0 0 0.25rem 0;
      color: #333;
      font-size: 1rem;
    }

    .item-info .price {
      margin: 0;
      color: #666;
      font-size: 0.9rem;
    }

    .quantity-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .qty-btn {
      width: 32px;
      height: 32px;
      border: 1px solid #ddd;
      background: white;
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
    }

    .qty-btn:hover {
      background: #f8f9fa;
    }

    .quantity {
      min-width: 40px;
      text-align: center;
      font-weight: 500;
    }

    .item-total {
      font-weight: 600;
      color: #007bff;
      text-align: right;
    }

    .remove-btn {
      width: 32px;
      height: 32px;
      border: 1px solid #dc3545;
      background: #dc3545;
      color: white;
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
    }

    .remove-btn:hover {
      background: #c82333;
    }

    .coupon-section {
      margin: 2rem 0;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 4px;
    }

    .coupon-input {
      display: flex;
      gap: 0.5rem;
    }

    .coupon-field {
      flex: 1;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }

    .apply-btn {
      padding: 0.5rem 1rem;
      border: 1px solid #28a745;
      background: #28a745;
      color: white;
      border-radius: 4px;
      cursor: pointer;
    }

    .apply-btn:hover {
      background: #218838;
    }

    .coupon-success {
      margin-top: 0.5rem;
      color: #28a745;
      font-weight: 500;
    }

    .cart-summary {
      border-top: 1px solid #eee;
      padding-top: 1rem;
      margin-top: 1rem;
    }

    .summary-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .summary-line.discount {
      color: #28a745;
      font-weight: 500;
    }

    .summary-line.total {
      font-size: 1.2rem;
      font-weight: 600;
      padding-top: 0.5rem;
      border-top: 1px solid #eee;
      margin-top: 0.5rem;
    }

    .cart-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .clear-btn {
      flex: 1;
      padding: 0.75rem;
      border: 1px solid #dc3545;
      background: white;
      color: #dc3545;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
    }

    .clear-btn:hover {
      background: #dc3545;
      color: white;
    }

    .checkout-btn {
      flex: 2;
      padding: 0.75rem;
      border: 1px solid #007bff;
      background: #007bff;
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 600;
    }

    .checkout-btn:hover {
      background: #0056b3;
    }
  `,

  refs: {
    toggleCart: (element, _state, api) => {
      element.addEventListener('click', () => {
        api.updateKey('isCartOpen', !api.state.isCartOpen);
      });
    },

    couponInput: (element, _state, api) => {
      const input = element as HTMLInputElement;
      
      input.addEventListener('input', () => {
        api.updateKey('couponCode', input.value);
      });
    },

    applyCoupon: (element, state, api) => {
      element.addEventListener('click', () => {
        // The coupon logic is handled by computed properties
        // Just trigger a re-render by updating the coupon code
        const currentCode = state.couponCode.trim();
        api.updateKey('couponCode', currentCode);
        
        if (currentCode.toLowerCase() === 'save10' || currentCode.toLowerCase() === 'save20') {
          api.emit('coupon-applied', { code: currentCode });
        }
      });
    },

    clearCart: (element, _state, api) => {
      element.addEventListener('click', () => {
        api.updateKey('items', []);
        api.updateKey('couponCode', '');
        api.emit('cart-cleared');
      });
    },

    addSample: (element, _state, api) => {
      element.addEventListener('click', () => {
        const sampleItems: CartItem[] = [
          { id: Date.now() + 1, name: 'Wireless Mouse', price: 29.99, quantity: 1 },
          { id: Date.now() + 2, name: 'Keyboard', price: 79.99, quantity: 1 },
          { id: Date.now() + 3, name: 'Monitor Stand', price: 49.99, quantity: 1 }
        ];
        api.updateKey('items', sampleItems);
      });
    },

    checkout: (element, state, api) => {
      element.addEventListener('click', () => {
        const total = (state as any).total;
        api.emit('checkout-initiated', { 
          items: state.items, 
          total: total,
          couponCode: state.couponCode 
        });
        alert(`Checkout initiated! Total: $${total.toFixed(2)}`);
      });
    },

    // Add a container ref for event delegation
    cartContainer: (element, state, api) => {
      // Use event delegation for dynamic cart item buttons
      element.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLElement;
        const itemId = parseInt(target.getAttribute('data-item-id') || '0');
        const action = target.getAttribute('data-action');

        if (!itemId || !action) return;

        const items = [...state.items];
        const itemIndex = items.findIndex(item => item.id === itemId);

        if (itemIndex === -1) return;

        switch (action) {
          case 'increase':
            items[itemIndex].quantity += 1;
            api.updateKey('items', items);
            api.emit('quantity-changed', { itemId, quantity: items[itemIndex].quantity });
            break;

          case 'decrease':
            if (items[itemIndex].quantity > 1) {
              items[itemIndex].quantity -= 1;
              api.updateKey('items', items);
              api.emit('quantity-changed', { itemId, quantity: items[itemIndex].quantity });
            }
            break;

          case 'remove':
            const removedItem = items[itemIndex];
            items.splice(itemIndex, 1);
            api.updateKey('items', items);
            api.emit('item-removed', { item: removedItem });
            break;
        }
      });
    }
  },

  onMount: () => {
    console.log('🛒 Shopping Cart Demo mounted');
  }
});
