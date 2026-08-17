import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem } from '../types';

interface CartContextType {
  items: CartItem[];
  selectedItems: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  updateNotes: (productId: number, notes: string) => void;
  toggleItem: (productId: number) => void;
  toggleAll: (checked: boolean) => void;
  clearSelected: () => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
  selectedCount: number;
  selectedAmount: number;
  allSelected: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const normalizeItems = (items: CartItem[]): CartItem[] =>
  items.map((item) => ({ ...item, selected: item.selected !== false }));

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? normalizeItems(JSON.parse(saved)) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    setItems((prev) => {
      // Check if same product with same options exists
      const existing = prev.find(
        (i) =>
          i.product_id === item.product_id &&
          i.notes === item.notes &&
          JSON.stringify(i.selected_options) === JSON.stringify(item.selected_options)
      );
      if (existing) {
        return prev.map((i) =>
          i.product_id === item.product_id &&
          i.notes === item.notes &&
          JSON.stringify(i.selected_options) === JSON.stringify(item.selected_options)
            ? { ...i, quantity: i.quantity + (item.quantity || 1), selected: true }
            : i
        );
      }
      return [...prev, { ...item, quantity: item.quantity || 1, selected: true }];
    });
  };

  const removeItem = (productId: number) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.product_id === productId ? { ...i, quantity } : i))
    );
  };

  const updateNotes = (productId: number, notes: string) => {
    setItems((prev) => prev.map((i) => (i.product_id === productId ? { ...i, notes } : i)));
  };

  const toggleItem = (productId: number) => {
    setItems((prev) =>
      prev.map((i) => (i.product_id === productId ? { ...i, selected: !i.selected } : i))
    );
  };

  const toggleAll = (checked: boolean) => {
    setItems((prev) => prev.map((i) => ({ ...i, selected: checked })));
  };

  const clearSelected = () => {
    setItems((prev) => prev.filter((i) => i.selected === false));
  };

  const clearCart = () => {
    setItems([]);
  };

  const selectedItems = items.filter((i) => i.selected !== false);
  const allSelected = items.length > 0 && selectedItems.length === items.length;
  const selectedCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const selectedAmount = selectedItems.reduce(
    (sum, item) => sum + (Number(item.price) + (item.options_price || 0)) * item.quantity,
    0
  );
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + (Number(item.price) + (item.options_price || 0)) * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        selectedItems,
        addItem,
        removeItem,
        updateQuantity,
        updateNotes,
        toggleItem,
        toggleAll,
        clearSelected,
        clearCart,
        totalItems,
        totalAmount,
        selectedCount,
        selectedAmount,
        allSelected,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}