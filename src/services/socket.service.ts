import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

let socket: Socket | null = null;

export const getSocket = (): Socket | null => {
  return socket;
};

export const initSocket = (): Socket => {
  if (socket?.connected) return socket;

  const token = localStorage.getItem('token');

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 10000,
    forceNew: false,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket error:', error.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const trackOrder = (orderNumber: string) => {
  socket?.emit('track-order', orderNumber);
};

export const untrackOrder = (orderNumber: string) => {
  socket?.emit('untrack-order', orderNumber);
};

export { toast };

// ============================================================
// AUTO-REFRESH HOOKS
// ============================================================

// Admin: auto-refresh all admin data on any change
export const useAutoRefreshAdmin = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const s = initSocket();

    const handleNewOrder = () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-orders'] });
      queryClient.invalidateQueries({ queryKey: ['pending-count'] });
    };

    const handleOrderUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['pending-count'] });
    };

    const handleEditRequestUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['edit-requests'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['pending-count'] });
    };

    const handleStockChanged = () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    };

    const handlePaymentConfirmed = () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['pending-count'] });
    };

    s.on('new-order', handleNewOrder);
    s.on('order-updated', handleOrderUpdated);
    s.on('edit-request-updated', handleEditRequestUpdated);
    s.on('stock-changed', handleStockChanged);
    s.on('payment-confirmed', handlePaymentConfirmed);

    return () => {
      s.off('new-order', handleNewOrder);
      s.off('order-updated', handleOrderUpdated);
      s.off('edit-request-updated', handleEditRequestUpdated);
      s.off('stock-changed', handleStockChanged);
      s.off('payment-confirmed', handlePaymentConfirmed);
    };
  }, [queryClient]);
};

// Customer: auto-refresh order data
export const useAutoRefreshCustomer = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const s = initSocket();

    const handleOrderUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
    };

    const handlePaymentConfirmed = () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
    };

    const handleStockChanged = () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['qr-table'] });
    };

    s.on('order-updated', handleOrderUpdated);
    s.on('payment-confirmed', handlePaymentConfirmed);
    s.on('stock-changed', handleStockChanged);

    return () => {
      s.off('order-updated', handleOrderUpdated);
      s.off('payment-confirmed', handlePaymentConfirmed);
      s.off('stock-changed', handleStockChanged);
    };
  }, [queryClient]);
};

// Real-time order notifications (admin)
export const useRealtimeOrders = (onNewOrder?: (order: any) => void) => {
  useEffect(() => {
    const s = initSocket();

    s.on('new-order', (order: any) => {
      toast.success(`Pesanan baru: ${order.order_number}`, { duration: 5000 });
      onNewOrder?.(order);
    });

    return () => {
      s.off('new-order');
    };
  }, [onNewOrder]);
};

// Order tracking (customer)
export const useOrderTracking = (orderNumber: string, onUpdate?: (order: any) => void) => {
  useEffect(() => {
    if (!orderNumber) return;

    const s = initSocket();
    trackOrder(orderNumber);

    s.on('order-updated', (order: any) => {
      const statusLabels: Record<string, string> = {
        processing: 'sedang diproses',
        ready: 'siap diambil',
        completed: 'telah selesai',
        cancelled: 'dibatalkan',
      };
      toast.success(`Pesanan ${order.order_number} ${statusLabels[order.status] || order.status}`);
      onUpdate?.(order);
    });

    s.on('payment-confirmed', (data: any) => {
      toast.success('Pembayaran dikonfirmasi!');
      onUpdate?.(data.order);
    });

    return () => {
      untrackOrder(orderNumber);
      s.off('order-updated');
      s.off('payment-confirmed');
    };
  }, [orderNumber, onUpdate]);
};

// Stock updates (all users)
export const useStockUpdates = (onStockChanged?: (data: { id: number; stock: number; name: string }) => void) => {
  useEffect(() => {
    const s = initSocket();

    s.on('stock-changed', (data: { id: number; stock: number; name: string }) => {
      onStockChanged?.(data);
    });

    return () => {
      s.off('stock-changed');
    };
  }, [onStockChanged]);
};
