import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ShoppingCart, Plus, Minus, Trash2, Send } from 'lucide-react';
import axios from 'axios';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../../components/ui/Dialog';
import { API_URL } from '../../lib/constants';
import { formatCurrency } from '../../lib/utils';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const qrApi = axios.create({ baseURL: API_URL });

interface CartItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  notes?: string;
  options_price?: number;
}

interface TableData {
  id: number;
  table_number: string;
  products: any[];
}

export default function QRMenu() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [optionPickerProduct, setOptionPickerProduct] = useState<any>(null);
  const [optionSelections, setOptionSelections] = useState<Record<string, string>>({});
  const [customNote, setCustomNote] = useState('');

  const { data: tableData, isLoading: tableLoading } = useQuery({
    queryKey: ['qr-table', tableId],
    queryFn: async () => {
      const response = await qrApi.get(`/qr/table/${tableId}`);
      return response.data.data as TableData;
    },
    enabled: !!tableId,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await qrApi.post('/qr/order', orderData);
      return response.data;
    },
    onSuccess: (response) => {
      toast.success('Pesanan berhasil dibuat!');
      navigate(`/qr/order/${response.data.order_number}`);
    },
    onError: () => {
      toast.error('Gagal membuat pesanan');
    },
  });

  const parseCustomOptions = (product: any) => {
    if (!product.custom_options) return [];
    try {
      const raw = typeof product.custom_options === 'string'
        ? JSON.parse(product.custom_options)
        : product.custom_options;
      return raw.map((opt: any) => ({
        name: opt.name,
        key: opt.key,
        options: (opt.options || []).map((v: any) =>
          typeof v === 'string' ? { label: v, price: 0 } : v
        ),
      }));
    } catch { return []; }
  };

  const handleAddProduct = (product: any) => {
    const options = parseCustomOptions(product);
    if (options.length > 0) {
      setOptionPickerProduct({ ...product, parsedOptions: options });
      setOptionSelections({});
      setCustomNote('');
      return;
    }
    addToCart(product);
  };

  const confirmOptionPicker = () => {
    if (!optionPickerProduct) return;
    const notes = buildNotes(optionPickerProduct.parsedOptions, optionSelections, customNote);
    const optionsPrice = calcOptionsPrice(optionPickerProduct.parsedOptions, optionSelections);
    addToCart(optionPickerProduct, notes || undefined, optionsPrice || undefined);
    setOptionPickerProduct(null);
  };

  const buildNotes = (parsedOptions: any[], selections: Record<string, string>, note: string): string => {
    const parts: string[] = [];
    for (const opt of parsedOptions) {
      const selected = selections[opt.key];
      if (selected) parts.push(selected);
    }
    if (note.trim()) parts.push(note.trim());
    return parts.join(', ');
  };

  const calcOptionsPrice = (parsedOptions: any[], selections: Record<string, string>): number => {
    let total = 0;
    for (const opt of parsedOptions) {
      const selected = selections[opt.key];
      if (selected) {
        const val = opt.options.find((v: any) => v.label === selected);
        if (val && val.price) total += val.price;
      }
    }
    return total;
  };

  const addToCart = (product: any, notes?: string, optionsPrice?: number) => {
    const itemKey = `${product.id}_${notes || ''}`;
    setCart((prev) => {
      const existing = prev.find((item) => {
        const existingKey = `${item.product_id}_${item.notes || ''}`;
        return existingKey === itemKey;
      });
      if (existing) {
        return prev.map((item) => {
          const existingKey = `${item.product_id}_${item.notes || ''}`;
          return existingKey === itemKey
            ? { ...item, quantity: item.quantity + 1 }
            : item;
        });
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          image: product.primary_image || product.images?.[0]?.image || `https://placehold.co/400x300/f3f4f6/9ca3af?text=${encodeURIComponent(product.name)}`,
          notes,
          options_price: optionsPrice,
        },
      ];
    });
  };

  const updateQuantity = (product_id: number, notes: string | undefined, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          const key = `${item.product_id}_${item.notes || ''}`;
          const target = `${product_id}_${notes || ''}`;
          return key === target ? { ...item, quantity: item.quantity + delta } : item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (product_id: number, notes: string | undefined) => {
    setCart((prev) => prev.filter((item) => {
      const key = `${item.product_id}_${item.notes || ''}`;
      const target = `${product_id}_${notes || ''}`;
      return key !== target;
    }));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (Number(item.price) + (item.options_price || 0)) * item.quantity, 0);

  const handleOrder = () => {
    if (cart.length === 0) {
      toast.error('Pilih menu terlebih dahulu');
      return;
    }
    if (!guestName.trim()) {
      toast.error('Masukkan nama Anda');
      return;
    }

    const tableNum = parseInt(tableId || '');
    if (isNaN(tableNum)) {
      toast.error('Meja tidak valid');
      return;
    }

    createOrderMutation.mutate({
      order_type: 'qr',
      table_id: tableNum,
      guest_name: guestName,
      guest_phone: guestPhone,
      items: cart.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        ...(item.notes ? { notes: item.notes } : {}),
      })),
    });
  };

  if (tableLoading) {
    return <LoadingSpinner className="min-h-screen" />;
  }

  if (!tableData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Meja tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-primary">🍜 Warung Mie Balap</h1>
              <p className="text-sm text-gray-500">Meja {tableData.table_number}</p>
            </div>
            <div className="relative">
              <ShoppingCart className="h-6 w-6 text-gray-600" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Menu Grid */}
        <h2 className="text-lg font-bold mb-4">Daftar Menu</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {tableData.products?.map((product: any) => {
            const isOutOfStock = product.stock <= 0;
            const hasOptions = parseCustomOptions(product).length > 0;
            const inCart = cart.find((item) => item.product_id === product.id);
            return (
              <div key={product.id} className={`bg-white rounded-lg shadow-sm overflow-hidden ${isOutOfStock ? 'opacity-60' : ''}`}>
                <div className="relative">
                  <img
                    src={product.primary_image || product.images?.[0]?.image || `https://placehold.co/400x300/f3f4f6/9ca3af?text=${encodeURIComponent(product.name)}`}
                    alt={product.name}
                    className={`w-full h-32 object-cover ${isOutOfStock ? 'grayscale' : ''}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/400x300/f3f4f6/9ca3af?text=${encodeURIComponent(product.name)}`;
                    }}
                  />
                  {isOutOfStock && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                      Habis
                    </span>
                  )}
                  {hasOptions && (
                    <span className="absolute top-1 left-1 bg-primary/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      Opsi
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                  <p className="text-primary font-bold text-sm">{formatCurrency(product.price)}</p>
                  {isOutOfStock ? (
                    <Button size="sm" className="w-full mt-2" disabled variant="outline">
                      Stok Habis
                    </Button>
                  ) : inCart ? (
                    <div className="flex items-center justify-center gap-2 bg-primary/10 rounded-full mt-2 px-1 py-0.5">
                      <button
                        onClick={() => updateQuantity(product.id, undefined, -1)}
                        className="p-1 hover:bg-primary/20 rounded-full"
                      >
                        <Minus className="h-3.5 w-3.5 text-primary" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold text-primary">{inCart.quantity}</span>
                      <button
                        onClick={() => handleAddProduct(product)}
                        className="p-1 hover:bg-primary/20 rounded-full"
                      >
                        <Plus className="h-3.5 w-3.5 text-primary" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => handleAddProduct(product)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <h3 className="font-bold mb-3">Pesanan Anda</h3>
            <div className="space-y-3">
              {cart.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.name}</p>
                    {item.notes && (
                      <p className="text-xs text-gray-500 italic">"{item.notes}"</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {formatCurrency(Number(item.price) + (item.options_price || 0))}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => updateQuantity(item.product_id, item.notes, -1)}
                        className="p-0.5 hover:bg-gray-100 rounded"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product_id, item.notes, 1)}
                        className="p-0.5 hover:bg-gray-100 rounded"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.product_id, item.notes)}
                        className="p-0.5 text-red-500 hover:bg-red-50 rounded ml-auto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-bold shrink-0">{formatCurrency((Number(item.price) + (item.options_price || 0)) * item.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="border-t mt-3 pt-3">
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Guest Info */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-20">
          <h3 className="font-bold mb-3">Informasi Pelanggan</h3>
          <div className="space-y-3">
            <Input
              placeholder="Nama Anda *"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
            <Input
              placeholder="Nomor HP (opsional)"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              type="tel"
            />
          </div>
        </div>

        {/* Fixed Submit Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
          <Button
            onClick={handleOrder}
            className="w-full"
            size="lg"
            disabled={cart.length === 0 || createOrderMutation.isPending}
          >
            <Send className="h-5 w-5 mr-2" />
            {createOrderMutation.isPending ? 'Mengirim...' : 'Kirim Pesanan'}
          </Button>
        </div>
      </div>

      {/* Option Picker Dialog */}
      <Dialog open={!!optionPickerProduct} onOpenChange={(open) => { if (!open) setOptionPickerProduct(null); }}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogClose onClick={() => setOptionPickerProduct(null)} />
          <DialogHeader>
            <DialogTitle>{optionPickerProduct?.name}</DialogTitle>
          </DialogHeader>
          {optionPickerProduct?.parsedOptions?.map((opt: any) => (
            <div key={opt.key} className="mt-3">
              <p className="text-sm font-medium mb-2">{opt.name}</p>
              <div className="flex flex-wrap gap-2">
                {opt.options.map((v: any) => (
                  <button
                    key={v.label}
                    onClick={() => setOptionSelections((prev) => ({
                      ...prev,
                      [opt.key]: prev[opt.key] === v.label ? '' : v.label,
                    }))}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      optionSelections[opt.key] === v.label
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-primary'
                    }`}
                  >
                    {v.label}
                    {v.price > 0 && <span className="ml-1 text-xs opacity-80">+{formatCurrency(v.price)}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-3">
            <p className="text-sm font-medium mb-1">Catatan Tambahan</p>
            <Input
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Contoh: Extra pedas, kurangi minyak..."
            />
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setOptionPickerProduct(null)}>
              Batal
            </Button>
            <Button className="flex-1" onClick={confirmOptionPicker}>
              Tambah
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
