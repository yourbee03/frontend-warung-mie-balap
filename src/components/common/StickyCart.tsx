import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, ChevronRight, ChevronDown, Plus, Minus, Trash2 } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../lib/utils';

const HIDE_ON = ['/checkout', '/cart', '/login', '/register'];

export default function StickyCart() {
  const { items, updateQuantity, removeItem, toggleItem, selectedCount, selectedAmount } = useCart();
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  if (items.length === 0 || HIDE_ON.includes(pathname)) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {open && (
        <div className="bg-white border-t shadow-lg">
          <div className="container mx-auto px-4">
            <div className="max-h-[40vh] overflow-y-auto py-3 space-y-3">
              {items.map((item) => (
                <div key={item.product_id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={item.selected !== false}
                    onChange={() => toggleItem(item.product_id)}
                    className="h-4 w-4 accent-primary shrink-0"
                    aria-label={`Pilih ${item.name}`}
                  />
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 object-cover rounded-md shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.name}</p>
                    <p className="text-primary font-bold text-sm">
                      {formatCurrency((Number(item.price) + (item.options_price || 0)) * item.quantity)}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-gray-500 italic truncate">"{item.notes}"</p>
                    )}
                  </div>
                  <div className="flex items-center border rounded-md shrink-0">
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      className="px-2 py-1 hover:bg-gray-100"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-2 py-1 text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                      className="px-2 py-1 hover:bg-gray-100"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.product_id)}
                    className="text-red-500 hover:text-red-700 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-t shadow-lg safe-area-bottom">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 gap-3">
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-3 min-w-0 flex-1 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="relative flex-shrink-0">
                <ShoppingCart className="h-6 w-6 text-primary" />
                <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-xs text-white flex items-center justify-center font-bold">
                  {selectedCount > 9 ? '9+' : selectedCount}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-500">{selectedCount} item</p>
                <p className="font-bold text-primary">{formatCurrency(selectedAmount)}</p>
              </div>
              {open ? (
                <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
              )}
            </button>
            <Link
              to={isAuthenticated ? '/checkout' : '/login'}
              className={`flex-shrink-0 bg-primary text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-1 transition-colors ${
                selectedCount > 0 ? 'hover:bg-red-700' : 'pointer-events-none opacity-50'
              }`}
            >
              Bayar
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}