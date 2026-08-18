import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Wallet, MapPin, Phone, Navigation, Loader2, Plus, Minus, Trash2, Store, Bike, ShoppingBag, QrCode } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { useCart } from '../../contexts/CartContext';
import { orderService } from '../../services/order.service';
import { shippingService, ShippingResult } from '../../services/shipping.service';
import { formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';

const ORDER_SERVICE_OPTIONS: { value: 'takeaway' | 'delivery' | 'dine_in'; label: string; icon: any }[] = [
  { value: 'takeaway', label: 'Take Away', icon: ShoppingBag },
  { value: 'delivery', label: 'Diantar / Delivery', icon: Bike },
  { value: 'dine_in', label: 'Makan di Tempat', icon: Store },
];

export default function Checkout() {
  const navigate = useNavigate();
  const { selectedItems: items, selectedAmount: totalAmount, clearSelected: clearCart, updateQuantity, removeItem, updateNotes } = useCart();
  const [orderServiceType, setOrderServiceType] = useState<'takeaway' | 'delivery' | 'dine_in'>('dine_in');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
  const [shippingAddress, setShippingAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [shippingInfo, setShippingInfo] = useState<ShippingResult | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const handleGetLocation = async () => {
    setLocationLoading(true);
    try {
      const position = await shippingService.getUserLocation();
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setUserCoords({ lat, lng });

      const result = await shippingService.calculate(lat, lng);
      setShippingInfo(result);
      toast.success(`Jarak: ${result.distance} km`);
    } catch (err: any) {
      toast.error(err.message || 'Gagal mendapatkan lokasi');
    } finally {
      setLocationLoading(false);
    }
  };

  const createOrderMutation = useMutation({
    mutationFn: orderService.create,
    onSuccess: async (response) => {
      if (response.data && paymentMethod === 'qris') {
        // Buat QRIS payment dulu, lalu redirect ke OrderDetail
        try {
          await orderService.createQrisPayment(response.data.id);
          toast.success('Pesanan berhasil dibuat!');
          clearCart();
          navigate(`/orders/${response.data.id}?pay=true`);
        } catch (error) {
          toast.success('Pesanan berhasil dibuat!');
          clearCart();
          navigate(`/orders/${response.data.id}`);
        }
      } else {
        toast.success('Pesanan berhasil dibuat!');
        clearCart();
        if (response.data) {
          navigate(`/orders/${response.data.id}`);
        }
      }
    },
    onError: () => {
      toast.error('Gagal membuat pesanan');
    },
  });

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error('Keranjang kosong');
      return;
    }
    if (orderServiceType === 'delivery' && !shippingAddress.trim()) {
      toast.error('Masukkan alamat pengiriman');
      return;
    }
    if (!phone.trim()) {
      toast.error('Masukkan nomor HP yang bisa dihubungi');
      return;
    }

    const allNotes: string[] = [];
    items.forEach((item) => {
      if (item.notes) {
        allNotes.push(`${item.name}: ${item.notes}`);
      }
    });
    if (extraNotes.trim()) {
      allNotes.push(extraNotes.trim());
    }

    createOrderMutation.mutate({
      order_type: 'online',
      order_service_type: orderServiceType,
      payment_method: paymentMethod,
      shipping_address: orderServiceType === 'delivery' ? shippingAddress.trim() : undefined,
      guest_phone: phone.trim(),
      user_latitude: userCoords?.lat,
      user_longitude: userCoords?.lng,
      items: items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        options_price: item.options_price || 0,
      })),
      notes: allNotes.length > 0 ? allNotes.join(' | ') : undefined,
    });
  };

  const grandTotal = totalAmount + (totalAmount * 0.1) + (shippingInfo?.cost || 0);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-4 lg:gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">Ringkasan Pesanan</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Jenis Pesanan</label>
                <div className="grid grid-cols-3 gap-2">
                  {ORDER_SERVICE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setOrderServiceType(opt.value);
                          if (opt.value !== 'delivery') setShippingInfo(null);
                        }}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-lg text-xs font-semibold border-2 transition-all ${
                          orderServiceType === opt.value
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-primary/50'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.product_id} className="flex gap-3 sm:gap-4 pb-4 border-b">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base truncate">{item.name}</h3>
                          <p className="text-primary font-bold text-sm sm:text-base">{formatCurrency(Number(item.price) + (item.options_price || 0))}</p>
                          {item.options_price && item.options_price > 0 && (
                            <p className="text-xs text-gray-400">Harga: {formatCurrency(Number(item.price))} + Opsi: {formatCurrency(item.options_price)}</p>
                          )}
                        </div>
                        <p className="font-bold text-sm sm:text-base shrink-0">{formatCurrency((Number(item.price) + (item.options_price || 0)) * item.quantity)}</p>
                      </div>
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
                      <Textarea
                        value={item.notes || ''}
                        onChange={(e) => updateNotes(item.product_id, e.target.value)}
                        placeholder="Catatan untuk produk ini (opsional)"
                        rows={1}
                        className="mt-2 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Catatan Tambahan</label>
                <Textarea
                  placeholder="Contoh: Jangan lupa sendok..."
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Payment & Total */}
          <div className="space-y-6">
            {/* Shipping Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">Informasi Pengiriman</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    <Phone className="h-4 w-4 inline mr-1" />
                    Nomor HP *
                  </label>
                  <Input
                    placeholder="08xxxxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                  />
                </div>

                {orderServiceType === 'delivery' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        <MapPin className="h-4 w-4 inline mr-1" />
                        Alamat Pengiriman *
                      </label>
                      <Textarea
                        placeholder="Masukkan alamat lengkap pengiriman..."
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {/* Geolocation Button */}
                    <div>
                      <Button
                        variant="outline"
                        onClick={handleGetLocation}
                        disabled={locationLoading}
                        className="w-full"
                      >
                        {locationLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Navigation className="h-4 w-4 mr-2" />
                        )}
                        {userCoords ? 'Lokasi Terdeteksi' : 'Gunakan Lokasi Saya'}
                      </Button>
                      {shippingInfo && (
                        <div className="mt-2 p-2 bg-primary/5 rounded-lg">
                          <p className="text-sm text-gray-600">
                            Jarak: <span className="font-semibold">{shippingInfo.distance} km</span>
                          </p>
                          <p className="text-sm text-primary font-bold">
                            Ongkir: {formatCurrency(shippingInfo.cost)}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">Metode Pembayaran</h2>
              <div className="space-y-3">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`w-full flex items-center gap-3 p-3 border-2 rounded-lg transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-primary/50'
                  }`}
                >
                  <Wallet className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <p className="font-semibold text-sm">Bayar di Tempat (COD)</p>
                    <p className="text-xs text-gray-500">Bayar tunai saat pesanan diterima</p>
                  </div>
                </button>
                <button
                  onClick={() => setPaymentMethod('qris')}
                  className={`w-full flex items-center gap-3 p-3 border-2 rounded-lg transition-all ${
                    paymentMethod === 'qris'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-primary/50'
                  }`}
                >
                  <QrCode className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <p className="font-semibold text-sm">QRIS</p>
                    <p className="text-xs text-gray-500">Scan QR untuk bayar dengan semua e-wallet & mobile banking</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">Total Pembayaran</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pajak PPN (10%)</span>
                  <span>{formatCurrency(totalAmount * 0.1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ongkir</span>
                  <span>{shippingInfo ? formatCurrency(shippingInfo.cost) : '-'}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-primary text-xl">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleCheckout}
              className="w-full"
              size="lg"
              disabled={createOrderMutation.isPending}
            >
              {createOrderMutation.isPending ? 'Memproses...' : 'Buat Pesanan'}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
