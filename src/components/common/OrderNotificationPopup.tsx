import { useEffect, useState } from 'react';
import { X, Package, CheckCircle, Clock, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { initSocket } from '../../services/socket.service';
import { ORDER_STATUS } from '../../lib/constants';

interface NotificationPopup {
  id: number;
  orderNumber: string;
  status: string;
  message: string;
}

const STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  processing: Package,
  ready: Truck,
  completed: CheckCircle,
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  processing: 'bg-blue-500',
  ready: 'bg-green-500',
  completed: 'bg-green-600',
  cancelled: 'bg-red-500',
};

export default function OrderNotificationPopup() {
  const [notifications, setNotifications] = useState<NotificationPopup[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const socket = initSocket();

    const handleOrderUpdated = (order: any) => {
      const statusMessages: Record<string, string> = {
        processing: 'sedang diproses',
        ready: 'siap diambil',
        completed: 'telah selesai',
        cancelled: 'dibatalkan',
      };

      const newNotification: NotificationPopup = {
        id: Date.now(),
        orderNumber: order.order_number,
        status: order.status,
        message: `Pesanan ${order.order_number} ${statusMessages[order.status] || order.status}`,
      };

      setNotifications((prev) => [...prev, newNotification]);

      // Auto dismiss after 10 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== newNotification.id));
      }, 10000);
    };

    socket.on('order-updated', handleOrderUpdated);

    return () => {
      socket.off('order-updated', handleOrderUpdated);
    };
  }, []);

  const dismiss = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[100] space-y-3 w-80">
      {notifications.map((notif) => {
        const Icon = STATUS_ICONS[notif.status] || Package;
        const bgColor = STATUS_COLORS[notif.status] || 'bg-gray-500';

        return (
          <div
            key={notif.id}
            className="bg-white rounded-lg shadow-xl border overflow-hidden animate-slide-in"
          >
            <div className={`${bgColor} px-4 py-2 flex items-center justify-between`}>
              <div className="flex items-center gap-2 text-white">
                <Icon className="h-5 w-5" />
                <span className="font-semibold text-sm">
                  {ORDER_STATUS[notif.status as keyof typeof ORDER_STATUS] || notif.status}
                </span>
              </div>
              <button
                onClick={() => dismiss(notif.id)}
                className="text-white/80 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-700">{notif.message}</p>
              <button
                onClick={() => {
                  dismiss(notif.id);
                  navigate('/orders');
                }}
                className="mt-2 text-sm text-primary hover:underline font-medium"
              >
                Lihat Pesanan →
              </button>
            </div>
            {/* Progress bar - 10 seconds */}
            <div className="h-1 bg-gray-100">
              <div
                className="h-full bg-white/50 animate-progress-bar"
                style={{ animationDuration: '10s', animationIterationCount: 1, animationFillMode: 'forwards' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
