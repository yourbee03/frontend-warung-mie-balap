import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Tag,
  ShoppingBag,
  Users,
  LogOut,
  Menu,
  X,
  Table,
  Settings,
  Pencil,
  Bell,
} from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/Button";
import { useAuth } from "../../contexts/AuthContext";
import { useAdminNotifications } from "../../services/adminNotification.service";
import { formatDateTime } from "../../lib/utils";

const baseMenuItems: { href: string; label: string; icon: any; badge: string | false }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, badge: false },
  { href: "/admin/products", label: "Produk", icon: Package, badge: false },
  { href: "/admin/categories", label: "Kategori", icon: Tag, badge: false },
  { href: "/admin/orders", label: "Pesanan", icon: ShoppingBag, badge: "orders" },
  { href: "/admin/edit-requests", label: "Edit Pesanan", icon: Pencil, badge: "edits" },
  { href: "/admin/tables", label: "Meja & QR", icon: Table, badge: false },
  { href: "/admin/settings", label: "Pengaturan", icon: Settings, badge: false },
];

const ownerOnlyItem = { href: "/admin/users", label: "Pengguna", icon: Users, badge: false as string | false };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { user } = useAuth();
  const isOwner = user?.role_id === 3;
  const menuItems = isOwner ? [...baseMenuItems, ownerOnlyItem] : baseMenuItems;
  const { notifications, unreadCount, pendingOrders, pendingEdits, markAsRead, clearAll } = useAdminNotifications();

  const getBadgeCount = (type: string | false) => {
    if (type === "orders") return pendingOrders;
    if (type === "edits") return pendingEdits;
    return 0;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 border-b px-4">
            <Link to="/admin" className="font-bold text-lg text-primary">
              Warung Mie Balap
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.href;
              const badgeCount = getBadgeCount(item.badge);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="flex-1">{item.label}</span>
                  {badgeCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t p-4">
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              <LogOut className="h-5 w-5" />
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="md:ml-64">
        {/* Top Bar */}
        <header className="bg-white border-b h-16 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden mr-2"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Admin Panel</h1>
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Bell className="h-5 w-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border z-50 max-h-[70vh] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h3 className="font-semibold text-sm">Notifikasi</h3>
                    {unreadCount > 0 && (
                      <button onClick={clearAll} className="text-xs text-primary hover:underline">
                        Tandai semua dibaca
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto max-h-[50vh]">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-sm">
                        Belum ada notifikasi
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <button
                          key={notif.id}
                          onClick={() => {
                            markAsRead(notif.id);
                            if (notif.link) window.location.href = notif.link;
                            setNotifOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 border-b last:border-0 hover:bg-gray-50 transition-colors ${
                            !notif.read ? "bg-primary/5" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${!notif.read ? "bg-primary" : "bg-gray-300"}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800">{notif.title}</p>
                              <p className="text-xs text-gray-500 truncate">{notif.message}</p>
                              <p className="text-[10px] text-gray-400 mt-1">{formatDateTime(notif.timestamp.toISOString())}</p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
