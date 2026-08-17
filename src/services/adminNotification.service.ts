import { useEffect, useState, useCallback } from 'react';
import { initSocket } from './socket.service';
import api from './api';

export interface AdminNotification {
  id: number;
  type: 'new-order' | 'edit-request' | 'order-updated' | 'payment-confirmed';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
}

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [pendingEdits, setPendingEdits] = useState(0);

  // Fetch initial counts
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [ordersRes, editsRes] = await Promise.all([
          api.get('/orders/admin/all', { params: { status: 'pending', limit: 1 } }),
          api.get('/edit-request/requests', { params: { status: 'pending', limit: 1 } }),
        ]);
        setPendingOrders(ordersRes.data.data?.pagination?.total || 0);
        setPendingEdits(editsRes.data.data?.pagination?.total || 0);
      } catch {}
    };
    fetchCounts();
  }, []);

  // Socket listeners for badge counts + notifications
  useEffect(() => {
    const s = initSocket();

    const handleNewOrder = (order: any) => {
      setPendingOrders((prev) => prev + 1);
      setNotifications((prev) => [{
        id: Date.now(),
        type: 'new-order' as const,
        title: 'Pesanan Baru',
        message: `${order.order_number} — ${order.user_name || order.guest_name || 'Pelanggan'}`,
        timestamp: new Date(),
        read: false,
        link: '/admin/orders',
      }, ...prev].slice(0, 20));
    };

    const handleOrderUpdated = (order: any) => {
      if (order.status === 'completed' || order.status === 'cancelled') {
        setPendingOrders((prev) => Math.max(0, prev - 1));
      }
      setNotifications((prev) => [{
        id: Date.now(),
        type: 'order-updated' as const,
        title: 'Status Pesanan',
        message: `${order.order_number} → ${order.status}`,
        timestamp: new Date(),
        read: false,
        link: '/admin/orders',
      }, ...prev].slice(0, 20));
    };

    const handleEditRequestUpdated = () => {
      setPendingEdits((prev) => prev + 1);
      setNotifications((prev) => [{
        id: Date.now(),
        type: 'edit-request' as const,
        title: 'Edit Pesanan',
        message: 'Ada permintaan edit pesanan baru',
        timestamp: new Date(),
        read: false,
        link: '/admin/edit-requests',
      }, ...prev].slice(0, 20));
    };

    const handlePaymentConfirmed = () => {
      setNotifications((prev) => [{
        id: Date.now(),
        type: 'payment-confirmed' as const,
        title: 'Pembayaran',
        message: 'Pembayaran telah dikonfirmasi',
        timestamp: new Date(),
        read: false,
        link: '/admin/orders',
      }, ...prev].slice(0, 20));
    };

    s.on('new-order', handleNewOrder);
    s.on('order-updated', handleOrderUpdated);
    s.on('edit-request-updated', handleEditRequestUpdated);
    s.on('payment-confirmed', handlePaymentConfirmed);

    return () => {
      s.off('new-order', handleNewOrder);
      s.off('order-updated', handleOrderUpdated);
      s.off('edit-request-updated', handleEditRequestUpdated);
      s.off('payment-confirmed', handlePaymentConfirmed);
    };
  }, []);

  // Re-fetch counts periodically as fallback
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [ordersRes, editsRes] = await Promise.all([
          api.get('/orders/admin/all', { params: { status: 'pending', limit: 1 } }),
          api.get('/edit-request/requests', { params: { status: 'pending', limit: 1 } }),
        ]);
        setPendingOrders(ordersRes.data.data?.pagination?.total || 0);
        setPendingEdits(editsRes.data.data?.pagination?.total || 0);
      } catch {}
    }, 30000); // every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const markAsRead = useCallback((id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    pendingOrders,
    pendingEdits,
    markAsRead,
    clearAll,
  };
}
