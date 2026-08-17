import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { Button } from '../../components/ui/Button';
import { useCart } from '../../contexts/CartContext';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

export default function Cart() {
  const { items, removeItem, updateQuantity, toggleItem, toggleAll, allSelected, selectedAmount, selectedCount } = useCart();
  const { isAuthenticated } = useAuth();

  if (items.length === 0) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Keranjang Kosong</h2>
          <p className="text-gray-500 mb-6">Belum ada item di keranjang Anda</p>
          <Link to="/products">
            <Button>Mulai Belanja</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Keranjang Belanja</h1>

        <div className="grid lg:grid-cols-3 gap-4 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 pb-3 mb-4 border-b">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => toggleAll(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm text-gray-600">Pilih semua</span>
              <span className="ml-auto text-sm text-gray-500">
                {selectedCount} item dipilih
              </span>
            </div>

            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.product_id} className="flex gap-3 sm:gap-4 bg-white rounded-lg shadow-sm p-3 sm:p-4">
                  <input
                    type="checkbox"
                    checked={item.selected !== false}
                    onChange={() => toggleItem(item.product_id)}
                    className="h-5 w-5 mt-4 accent-primary shrink-0"
                    aria-label={`Pilih ${item.name}`}
                  />
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-md shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base truncate">{item.name}</h3>
                    <p className="text-primary font-bold text-sm sm:text-base">{formatCurrency(Number(item.price) + (item.options_price || 0))}</p>
                    {item.options_price && item.options_price > 0 && (
                      <p className="text-xs text-gray-500">Harga: {formatCurrency(Number(item.price))} + Opsi: {formatCurrency(item.options_price)}</p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-gray-500 mt-1 italic hidden sm:block">"{item.notes}"</p>
                    )}
                    <div className="flex items-center gap-3 sm:gap-4 mt-2">
                      <div className="flex items-center border rounded-md">
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          className="px-2 py-1 hover:bg-gray-100"
                        >
                          <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                        <span className="px-2 sm:px-3 py-1 text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          className="px-2 py-1 hover:bg-gray-100"
                        >
                          <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.product_id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm sm:text-base">{formatCurrency((Number(item.price) + (item.options_price || 0)) * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6 h-fit">
            <h2 className="text-xl font-bold mb-4">Ringkasan</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">{formatCurrency(selectedAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ongkir</span>
                <span className="font-semibold">Gratis</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-primary text-xl">{formatCurrency(selectedAmount)}</span>
                </div>
              </div>
            </div>

            {selectedCount > 0 ? (
              isAuthenticated ? (
                <Link to="/checkout">
                  <Button className="w-full" size="lg">
                    Checkout ({selectedCount} item)
                  </Button>
                </Link>
              ) : (
                <div className="space-y-2">
                  <Link to="/login">
                    <Button className="w-full" size="lg">
                      Login untuk Checkout
                    </Button>
                  </Link>
                  <p className="text-xs text-gray-500 text-center">
                    Anda harus login untuk melakukan pemesanan
                  </p>
                </div>
              )
            ) : (
              <Button className="w-full" size="lg" disabled>
                Pilih item untuk checkout
              </Button>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}