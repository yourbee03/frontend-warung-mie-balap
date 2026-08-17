import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Package, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../lib/constants';
import { initSocket, trackOrder, untrackOrder } from '../../services/socket.service';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const qrApi = axios.create({ baseURL: API_URL });

const STATUS_CONFIG = {
  pending: { label: 'Menunggu Konfirmasi', icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-100' },
  processing: { label: 'Sedang Disiapkan', icon: Loader, color: 'text-blue-500', bg: 'bg-blue-100' },
  ready: { label: 'Siap Diantar', icon: Package, color: 'text-green-500', bg: 'bg-green-100' },
  completed: { label: 'Selesai', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' },
  cancelled: { label: 'Dibatalkan', icon: XCircle, color: 'text-red-500', bg: 'bg-red-100' },
};

export default function QRTracking() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const queryClient = useQueryClient();

  const { data: orderData, isLoading } = useQuery({
    queryKey: ['qr-order', orderNumber],
    queryFn: async () => {
      const response = await qrApi.get(`/qr/track/${orderNumber}`);
      return response.data.data;
    },
    enabled: !!orderNumber,
    refetchInterval: 5000,
  });

  // Real-time socket listener
  useEffect(() => {
    if (!orderNumber) return;

    const socket = initSocket();
    trackOrder(orderNumber);

    const handleOrderUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['qr-order', orderNumber] });
    };

    socket.on('order-updated', handleOrderUpdated);
    socket.on('payment-confirmed', handleOrderUpdated);

    return () => {
      untrackOrder(orderNumber);
      socket.off('order-updated', handleOrderUpdated);
      socket.off('payment-confirmed', handleOrderUpdated);
    };
  }, [orderNumber, queryClient]);

  if (isLoading) {
    return <LoadingSpinner className="min-h-screen" />;
  }

  if (!orderData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Pesanan tidak ditemukan</p>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[orderData.status as keyof typeof STATUS_CONFIG];
  const StatusIcon = statusConfig?.icon || Clock;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-primary">🍜 Warung Mie Balap</h1>
          <p className="text-sm text-gray-500">Lacak Pesanan</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Order Info */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-mono text-sm text-gray-500">{orderData.order_number}</p>
              <p className="text-xs text-gray-400">{formatDateTime(orderData.created_at)}</p>
            </div>
            <p className="font-bold text-primary">{formatCurrency(orderData.total_amount)}</p>
          </div>
        </div>

        {/* Status Card */}
        <div className={`rounded-lg shadow-sm p-6 mb-4 ${statusConfig?.bg || 'bg-gray-100'}`}>
          <div className="flex items-center gap-4">
            <StatusIcon className={`h-12 w-12 ${statusConfig?.color || 'text-gray-500'}`} />
            <div>
              <p className="font-bold text-lg">{statusConfig?.label || orderData.status}</p>
              <p className="text-sm text-gray-600">Status pesanan Anda</p>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h3 className="font-bold mb-3">Item Pesanan</h3>
          <div className="space-y-2">
            {orderData.items?.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b">
                <div>
                  <p className="font-semibold text-sm">{item.product_name}</p>
                  <p className="text-xs text-gray-500">{item.quantity} x {formatCurrency(item.price)}</p>
                </div>
                <p className="font-semibold text-sm">{formatCurrency(item.subtotal)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Table Info */}
        {orderData.table_number && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-500">
              Meja: <span className="font-semibold">{orderData.table_number}</span>
            </p>
          </div>
        )}

        {/* Notes */}
        {orderData.notes && (
          <div className="bg-white rounded-lg shadow-sm p-4 mt-4">
            <p className="text-sm text-gray-500">
              <span className="font-semibold">Catatan:</span> {orderData.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
