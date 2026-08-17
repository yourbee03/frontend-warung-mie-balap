import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { orderService } from '../../services/order.service';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { ORDER_STATUS } from '../../lib/constants';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { initSocket } from '../../services/socket.service';

export default function OrderHistory() {
  const queryClient = useQueryClient();

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.getAll(),
    refetchInterval: 5000,
  });

  // Real-time socket listener for order status changes
  useEffect(() => {
    const socket = initSocket();

    const handleOrderUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    };

    socket.on('order-updated', handleOrderUpdated);

    return () => {
      socket.off('order-updated', handleOrderUpdated);
    };
  }, [queryClient]);

  const orders = ordersData?.data?.items || [];

  if (isLoading) {
    return (
      <MainLayout>
        <LoadingSpinner className="py-20" />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Riwayat Pesanan</h1>

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Belum Ada Pesanan</h2>
            <p className="text-gray-500 mb-6">Mulai belanja untuk membuat pesanan pertama</p>
            <Link to="/products">
              <button className="bg-primary text-white px-6 py-2 rounded-md hover:bg-red-700">
                Mulai Belanja
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="block bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono text-sm text-gray-500">{order.order_number}</p>
                    <p className="font-semibold">{formatDateTime(order.created_at)}</p>
                    <p className="text-sm text-gray-500">{order.items?.length || 0} item</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{formatCurrency(order.total_amount)}</p>
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded-full ${
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
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
