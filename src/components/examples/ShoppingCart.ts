/**
 * ShoppingCart: A simple shopping cart demo.
 * Demonstrates ctx, computed, and quantity controls.
 */
import { component, html, useStyle, css, each, ref, computed } from '../../lib';

interface Item {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

const initialItems: Item[] = [
  { id: 1, name: 'Apple', price: 1.5, quantity: 1 },
  { id: 2, name: 'Banana', price: 1.0, quantity: 1 },
  { id: 3, name: 'Orange', price: 2.0, quantity: 1 }
];

export const ShoppingCart = component('shopping-cart', () => {
  const items = ref([...initialItems]);

  const total = computed(() => {
    return items.value.reduce((sum, item) => sum + item.price * item.quantity, 0);
  });

  const increaseQty = (id: number) => {
    items.value = items.value.map(item =>
      item.id === id ? { ...item, quantity: item.quantity + 1 } : item
    );
  };

  const decreaseQty = (id: number) => {
    items.value = items.value.map(item =>
      item.id === id && item.quantity > 1
        ? { ...item, quantity: item.quantity - 1 }
        : item
    );
  };

  const removeItem = (id: number) => {
    items.value = items.value.filter(item => item.id !== id);
  };

  const reset = () => {
    items.value = [...initialItems];
  };

  useStyle(() => css`
    .cart-container {
      max-width: 420px;
      margin: 2rem auto;
      padding: 2rem;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
      font-family: system-ui, sans-serif;
    }
    @media (prefers-color-scheme: dark) {
      .cart-container {
        background: #111;
        color: #fff;
      }
    }
    h2 {
      margin-bottom: 1rem;
      font-size: 1.3rem;
      font-weight: 600;
    }
    ul {
      list-style: none;
      padding: 0;
      margin-bottom: 1rem;
    }
    li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #eee;
      gap: 0.5rem;
    }
    .item-name {
      flex: 1;
      font-weight: 500;
    }
    .item-price {
      margin-right: 1rem;
      color: #555;
      min-width: 70px;
      text-align: right;
    }
    .quantity-controls {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      min-width: 90px;
      justify-content: center;
    }
    .item-qty {
      min-width: 2em;
      text-align: center;
      font-weight: 500;
    }
    .qty-btn {
      background: #eee;
      color: #333;
      border: none;
      border-radius: 4px;
      padding: 0.2rem 0.7rem;
      font-size: 1.1rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    .qty-btn:disabled {
      pointer-events: none;
      background: #f0f0f0;
      color: #aaa;
      cursor: not-allowed;
    }
    .qty-btn:hover {
      background: #d1d5db;
    }
    .remove-btn {
      background: #e53e3e;
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 0.3rem 0.8rem;
      font-size: 0.95rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    .remove-btn:hover {
      background: #c53030;
    }
    .cart-total {
      font-weight: 600;
      margin-bottom: 1rem;
      text-align: right;
    }
    .reset-btn {
      background: #0078d4;
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 0.6rem 1.2rem;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s;
      width: 100%;
    }
    .reset-btn:hover {
      background: #005fa3;
    }
  `);

  return html`
    <div class="cart-container">
      <h2>Shopping Cart</h2>
      <ul>
        ${each(items.value, (item) => html`
          <li>
            <span class="item-name">${item.name}</span>
            <span class="item-price">$${item.price.toFixed(2)}</span>
            <div class="quantity-controls">
              <button
                class="qty-btn"
                aria-label="Decrease quantity"
                :disabled="${item.quantity <= 1}"
                @click="${() => decreaseQty(item.id)}"
              >-</button>
              <span class="item-qty">${item.quantity}</span>
              <button
                class="qty-btn"
                aria-label="Increase quantity"
                :disabled="${item.quantity >= 10}"
                @click="${() => increaseQty(item.id)}"
              >+</button>
            </div>
            <button class="remove-btn" @click="${() => removeItem(item.id)}">Remove</button>
          </li>
        `)}
      </ul>
      <div class="cart-total">Total: $${total.value.toFixed(2)}</div>
      <button class="reset-btn" @click="${reset}">Reset Cart</button>
    </div>
  `;
});