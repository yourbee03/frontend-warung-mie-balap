import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, ArrowLeft, Plus, Minus, Check } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { productService } from '../../services/product.service';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { formatCurrency } from '../../lib/utils';
import { useCart } from '../../contexts/CartContext';
import { useAutoRefreshCustomer } from '../../services/socket.service';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import type { ProductOption } from '../../types';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [showAdded, setShowAdded] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string | null>>({});
  const { addItem } = useCart();
  useAutoRefreshCustomer();

  const { data: productData, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productService.getBySlug(slug!),
    enabled: !!slug,
  });

  const product = productData?.data;

  // Parse custom_options from product
  let customOptions: ProductOption[] = [];
  if (product?.custom_options) {
    try {
      customOptions = typeof product.custom_options === 'string'
        ? JSON.parse(product.custom_options as string)
        : product.custom_options;
    } catch {
      customOptions = [];
    }
  }

  const isOutOfStock = product ? product.stock <= 0 : false;

  // Calculate options price
  const optionsPrice = customOptions.reduce((sum, opt) => {
    const selected = selectedOptions[opt.key];
    if (!selected) return sum;
    const optValue = opt.options.find((v) => v.label === selected);
    return sum + Number(optValue?.price || 0);
  }, 0);

  const unitPrice = Number(product?.price || 0) + optionsPrice;
  const totalPrice = unitPrice * quantity;

  const handleOptionToggle = (key: string, value: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [key]: prev[key] === value ? null : value,
    }));
  };

  const handleAddToCart = () => {
    if (!product || isOutOfStock) return;

    // Build notes from options
    const optionNotes: string[] = [];
    const selectedOpts: Record<string, string> = {};
    for (const opt of customOptions) {
      const selected = selectedOptions[opt.key];
      if (selected) {
        optionNotes.push(selected);
        selectedOpts[opt.key] = selected;
      }
    }
    if (notes.trim()) {
      optionNotes.push(notes.trim());
    }

    addItem({
      product_id: product.id,
      name: product.name,
      price: Number(product.price),
      image: product.images?.[0]?.image || `https://placehold.co/400x400/f3f4f6/9ca3af?text=${encodeURIComponent(product.name)}`,
      quantity,
      notes: optionNotes.length > 0 ? optionNotes.join(', ') : undefined,
      selected_options: Object.keys(selectedOpts).length > 0 ? selectedOpts : undefined,
      options_price: optionsPrice > 0 ? optionsPrice : undefined,
    });
    setShowAdded(true);
    setTimeout(() => setShowAdded(false), 3000);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <LoadingSpinner className="py-20" />
      </MainLayout>
    );
  }

  if (!product) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-gray-500">Produk tidak ditemukan</p>
          <Link to="/products" className="text-primary hover:underline mt-4 inline-block">
            Kembali ke Daftar Menu
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center text-gray-600 hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
            <img
              src={product.images?.[0]?.image || `https://placehold.co/400x400/f3f4f6/9ca3af?text=${encodeURIComponent(product.name)}`}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {showAdded && (
              <div className="absolute inset-0 bg-green-500/90 flex items-center justify-center z-10">
                <div className="text-center text-white">
                  <Check className="h-16 w-16 mx-auto mb-3" />
                  <p className="font-bold text-2xl mb-2">Ditambahkan!</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
                    <Button
                      onClick={() => navigate('/checkout')}
                      className="bg-white text-green-600 hover:bg-gray-100"
                    >
                      Checkout Sekarang
                    </Button>
                    <Button
                      onClick={() => setShowAdded(false)}
                      variant="outline"
                      className="border-white text-white hover:bg-green-600"
                    >
                      Lanjut Belanja
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <p className="text-sm text-gray-500 mb-2">{product.category_name}</p>
            <h1 className="text-2xl sm:text-3xl font-bold mb-4">{product.name}</h1>
            <p className="text-2xl sm:text-3xl font-bold text-primary mb-1">
              {formatCurrency(unitPrice)}
            </p>
            {optionsPrice > 0 && (
              <p className="text-xs text-gray-500 mb-6">Harga: {formatCurrency(product.price)} + Opsi: {formatCurrency(optionsPrice)}</p>
            )}
            {optionsPrice === 0 && <div className="mb-6" />}
            
            {product.description && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Deskripsi</h3>
                <p className="text-gray-600">{product.description}</p>
              </div>
            )}

            <div className="mb-6">
              {isOutOfStock ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                  Stok Habis
                </span>
              ) : (
                <p className="text-sm text-gray-500">
                  Stok: <span className="font-semibold">{product.stock}</span>
                </p>
              )}
            </div>

            {/* Dynamic Custom Options */}
            {customOptions.map((opt) => (
              <div key={opt.key} className="mb-4">
                <h3 className="font-semibold mb-2">{opt.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {opt.options.map((value) => (
                    <button
                      key={value.label}
                      onClick={() => handleOptionToggle(opt.key, value.label)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                        selectedOptions[opt.key] === value.label
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-primary'
                      }`}
                    >
                      {value.label}
                      {value.price > 0 && (
                        <span className="ml-1 text-xs opacity-80">+{formatCurrency(value.price)}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Notes */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Catatan</h3>
              <Textarea
                placeholder="Contoh: Tambah telur, kurangi minyak..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Quantity Selector */}
            {!isOutOfStock && (
              <div className="flex items-center gap-4 mb-6">
                <span className="font-semibold">Jumlah:</span>
                <div className="flex items-center border rounded-md">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 hover:bg-gray-100"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-4 py-2 font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-2 hover:bg-gray-100"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {isOutOfStock ? (
              <Button disabled size="lg" className="w-full" variant="outline">
                Stok Habis
              </Button>
            ) : (
              <Button onClick={handleAddToCart} size="lg" className="w-full">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Tambah ke Keranjang - {formatCurrency(totalPrice)}
              </Button>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
