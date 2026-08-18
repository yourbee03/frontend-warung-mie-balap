import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Printer, QrCode, CheckCircle, Loader2, FlaskConical } from 'lucide-react';
import { useEffect, useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { Button } from '../../components/ui/Button';
import { orderService } from '../../services/order.service';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { ORDER_STATUS, ORDER_SERVICE_TYPE, PAYMENT_METHOD } from '../../lib/constants';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { initSocket, trackOrder, untrackOrder } from '../../services/socket.service';
import toast from 'react-hot-toast';

const getServiceTypeLabel = (order: any) => {
  if (order.order_service_type) {
    return ORDER_SERVICE_TYPE[order.order_service_type as keyof typeof ORDER_SERVICE_TYPE] || order.order_service_type;
  }
  if (order.order_type === 'online') return 'Online';
  if (order.order_type === 'takeaway') return 'Take Away';
  return 'Dine In (QR)';
};

function Receipt({ order }: { order: any }) {
  return (
    <div className="receipt-container text-black">
      <div className="receipt-header">
        <h2 className="receipt-title">Warung Mie Balap</h2>
        <p className="receipt-sub">Struk Pesanan</p>
      </div>
      <div className="receipt-section">
        <p><strong>No. Pesanan:</strong> {order.order_number}</p>
        <p><strong>Tanggal:</strong> {formatDateTime(order.created_at)}</p>
        <p><strong>Jenis Pesanan:</strong> {getServiceTypeLabel(order)}</p>
        {order.table_number && <p><strong>Meja:</strong> {order.table_number}</p>}
        {order.guest_name && <p><strong>Nama:</strong> {order.guest_name}</p>}
        {order.guest_phone && <p><strong>HP:</strong> {order.guest_phone}</p>}
        {order.shipping_address && <p><strong>Alamat:</strong> {order.shipping_address}</p>}
      </div>
      <div className="receipt-section">
        <table className="receipt-table">
          <thead>
            <tr>
              <th>Produk</th>
              <th>Jml</th>
              <th>Harga</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item: any) => (
              <tr key={item.id}>
                <td>{item.product_name || item.product?.name}</td>
                <td className="text-center">{item.quantity}</td>
                <td>
                  {formatCurrency(item.price)}
                  {Number(item.options_price) > 0 && (
                    <span className="text-xs text-gray-500 block">(+{formatCurrency(Number(item.options_price))} opsi)</span>
                  )}
                </td>
                <td className="text-right">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="receipt-section">
        {order.shipping_cost > 0 && (
          <p className="receipt-row"><span>Ongkir</span><span>{formatCurrency(order.shipping_cost)}</span></p>
        )}
        <p className="receipt-total"><span>Total</span><span>{formatCurrency(order.total_amount)}</span></p>
      </div>
      <div className="receipt-section">
        <p><strong>Metode Pembayaran:</strong> {PAYMENT_METHOD[order.payment_method as keyof typeof PAYMENT_METHOD] || order.payment_method || (order.order_type === 'online' ? 'Bayar di Tempat (COD)' : 'Bayar di Kasir')}</p>
        <p><strong>Status:</strong> {ORDER_STATUS[order.status as keyof typeof ORDER_STATUS] || order.status}</p>
        {order.notes && <p><strong>Catatan:</strong> {order.notes}</p>}
      </div>
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const shouldPay = searchParams.get('pay') === 'true';
  const queryClient = useQueryClient();
  const [qrData, setQrData] = useState<{
    qr_code_id: string;
    qr_string: string;
    amount: number;
  } | null>(null);

  const { data: orderData, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderService.getById(parseInt(id!)),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const order = orderData?.data;

  const createQrisPaymentMutation = useMutation({
    mutationFn: () => orderService.createQrisPayment(parseInt(id!)),
    onSuccess: (response) => {
      if (response.data) {
        setQrData({
          qr_code_id: response.data.qr_code_id,
          qr_string: response.data.qr_string,
          amount: response.data.amount,
        });
        toast.success('QR Code berhasil dibuat');
      }
    },
    onError: () => {
      toast.error('Gagal membuat QR Code');
    },
  });

  const simulatePaymentMutation = useMutation({
    mutationFn: () => orderService.simulatePayment(parseInt(id!)),
    onSuccess: () => {
      toast.success('Pembayaran berhasil disimulasi!');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
    onError: () => {
      toast.error('Gagal simulasi pembayaran');
    },
  });

  useEffect(() => {
    if (shouldPay && order && order.payment?.status === 'pending' && !qrData) {
      createQrisPaymentMutation.mutate();
    }
  }, [shouldPay, order]);

  // Real-time socket listener for this specific order
  useEffect(() => {
    if (!order?.order_number) return;

    const socket = initSocket();
    trackOrder(order.order_number);

    const handleOrderUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    };

    const handlePaymentConfirmed = () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    };

    socket.on('order-updated', handleOrderUpdated);
    socket.on('payment-confirmed', handlePaymentConfirmed);

    return () => {
      untrackOrder(order.order_number);
      socket.off('order-updated', handleOrderUpdated);
      socket.off('payment-confirmed', handlePaymentConfirmed);
    };
  }, [order?.order_number, id, queryClient]);

  if (isLoading) {
    return (
      <MainLayout>
        <LoadingSpinner className="py-20" />
      </MainLayout>
    );
  }

  if (!order) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-gray-500">Pesanan tidak ditemukan</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <Link to="/orders" className="inline-flex items-center text-gray-600 hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali ke Riwayat Pesanan
        </Link>

        <div className="flex justify-end mb-4">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-red-700 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Cetak Struk
          </button>
        </div>

        {/* Printable receipt (hidden on screen, shown when printing) */}
        <div className="print-only">
          <Receipt order={order} />
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold">Detail Pesanan</h1>
              <p className="font-mono text-gray-500">{order.order_number}</p>
            </div>
            <span
              className={`inline-block px-3 py-1 text-sm rounded-full ${
                order.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : order.status === 'cancelled'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {ORDER_STATUS[order.status]}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold mb-2">Informasi Pesanan</h3>
              <p className="text-gray-600">Tanggal: {formatDateTime(order.created_at)}</p>
              <p className="text-gray-600">Jenis Pesanan: {getServiceTypeLabel(order)}</p>
              {order.table_number && (
                <p className="text-gray-600">Meja: {order.table_number}</p>
              )}
              {order.shipping_address && (
                <p className="text-gray-600">Alamat: {order.shipping_address}</p>
              )}
            </div>
            <div>
              <h3 className="font-semibold mb-2">Status Pembayaran</h3>
              <p className="text-gray-600">
                Metode: {PAYMENT_METHOD[order.payment_method as keyof typeof PAYMENT_METHOD] || order.payment_method}
              </p>
              <p className="text-gray-600">
                Status:{' '}
                <span
                  className={
                    order.payment?.status === 'paid'
                      ? 'text-green-600 font-semibold'
                      : 'text-yellow-600'
                  }
                >
                  {order.payment?.status === 'paid' ? 'Lunas' : 'Belum Dibayar'}
                </span>
              </p>
            </div>
          </div>

          {/* QRIS Payment Section */}
          {order.payment_method === 'qris' && order.payment?.status === 'pending' && (
            <div className="mb-6 p-4 border-2 border-primary/30 rounded-lg bg-primary/5">
              <div className="flex items-center gap-2 mb-4">
                <QrCode className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Pembayaran QRIS</h3>
              </div>

              {!qrData && !createQrisPaymentMutation.isPending && (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Klik tombol di bawah untuk membuat QR Code pembayaran
                  </p>
                  <Button
                    onClick={() => createQrisPaymentMutation.mutate()}
                    className="bg-primary hover:bg-red-700"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Buat QR Code
                  </Button>
                </div>
              )}

              {createQrisPaymentMutation.isPending && (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-gray-600 mt-2">Membuat QR Code...</p>
                </div>
              )}

              {qrData && (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Scan QR Code ini untuk membayar dengan QRIS
                  </p>
                  <div className="inline-block p-4 bg-white rounded-lg shadow-sm">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData.qr_string)}`}
                      alt="QRIS Code"
                      className="w-48 h-48"
                    />
                  </div>
                  <p className="text-lg font-bold text-primary mt-4">
                    {formatCurrency(qrData.amount)}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    QR Code ID: {qrData.qr_code_id}
                  </p>
                  <Button
                    onClick={() => simulatePaymentMutation.mutate()}
                    disabled={simulatePaymentMutation.isPending}
                    variant="outline"
                    className="mt-4 border-orange-400 text-orange-600 hover:bg-orange-50"
                  >
                    {simulatePaymentMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FlaskConical className="h-4 w-4 mr-2" />
                    )}
                    Simulasi Bayar
                  </Button>
                </div>
              )}
            </div>
          )}

          {order.payment_method === 'qris' && order.payment?.status === 'paid' && (
            <div className="mb-6 p-4 border-2 border-green-500/30 rounded-lg bg-green-50">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-800">Pembayaran QRIS Berhasil</h3>
              </div>
              <p className="text-sm text-green-600 mt-2">Pembayaran telah dikonfirmasi oleh sistem.</p>
            </div>
          )}

          <h3 className="font-semibold mb-3">Item Pesanan</h3>
          <div className="space-y-3 mb-6">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b">
                <div>
                  <p className="font-semibold">{item.product_name}</p>
                  <p className="text-sm text-gray-500">
                    {item.quantity} x {formatCurrency(Number(item.price) - Number(item.options_price || 0))}
                    {Number(item.options_price) > 0 && (
                      <span className="text-xs"> + {formatCurrency(Number(item.options_price))} opsi</span>
                    )}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-gray-500 italic">" {item.notes}"</p>
                  )}
                </div>
                <p className="font-bold">{formatCurrency(item.subtotal)}</p>
              </div>
            ))}
          </div>

          {order.shipping_cost > 0 && (
            <div className="border-t pt-4 flex justify-between">
              <span className="text-gray-600">Ongkir</span>
              <span>{formatCurrency(order.shipping_cost)}</span>
            </div>
          )}

          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">Total</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          </div>

          {order.notes && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Catatan:</span> {order.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}