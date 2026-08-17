import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag, Users, DollarSign, TrendingUp } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { formatCurrency } from "../../lib/utils";
import { ORDER_STATUS } from "../../lib/constants";
import api from "../../services/api";
import { useAutoRefreshAdmin } from "../../services/socket.service";
import type { DashboardStats, Order } from "../../types";

export default function AdminDashboard() {
  useAutoRefreshAdmin();
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await api.get("/dashboard/stats");
      return res.data.data as DashboardStats;
    },
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["recent-orders"],
    queryFn: async () => {
      const res = await api.get("/dashboard/recent-orders");
      return res.data.data as Order[];
    },
  });

  const { data: topProducts, isLoading: topLoading } = useQuery({
    queryKey: ["top-products"],
    queryFn: async () => {
      const res = await api.get("/dashboard/top-products");
      return res.data.data as { id: number; name: string; price: string; total_sold: string }[];
    },
  });

  const statCards = [
    { title: "Total Produk", value: stats?.total_products ?? 0, icon: Package, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "Total Pesanan", value: stats?.total_orders ?? 0, icon: ShoppingBag, color: "text-orange-600", bg: "bg-orange-100" },
    { title: "Total Pengguna", value: stats?.total_users ?? 0, icon: Users, color: "text-purple-600", bg: "bg-purple-100" },
    { title: "Total Pendapatan", value: formatCurrency(stats?.total_revenue ?? 0), icon: DollarSign, color: "text-green-600", bg: "bg-green-100", isCurrency: true },
  ];

  const getStatusBadge = (status: Order["status"]) => {
    const variants: Record<Order["status"], "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
      pending: "warning",
      processing: "default",
      ready: "success",
      completed: "success",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status]}>{ORDER_STATUS[status]}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Dashboard</h2>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <Card key={card.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold">{statsLoading ? "..." : card.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${card.bg}`}>
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Orders */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Pesanan Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <p className="text-muted-foreground text-sm">Memuat data...</p>
              ) : recentOrders && recentOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Nomor</th>
                        <th className="text-left py-2 font-medium">Pelanggan</th>
                        <th className="text-left py-2 font-medium">Total</th>
                        <th className="text-left py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order) => (
                        <tr key={order.id} className="border-b last:border-b-0">
                          <td className="py-2 font-mono text-xs">{order.order_number}</td>
                          <td className="py-2">{order.guest_name ?? order.user_name ?? "-"}</td>
                          <td className="py-2">{formatCurrency(order.total_amount)}</td>
                          <td className="py-2">{getStatusBadge(order.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Belum ada pesanan</p>
              )}
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Produk Terlaris
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topLoading ? (
                <p className="text-muted-foreground text-sm">Memuat data...</p>
              ) : topProducts && topProducts.length > 0 ? (
                <div className="space-y-3">
                  {topProducts.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-gray-50">
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{Number(item.total_sold)} terjual</p>
                      </div>
                      <p className="text-sm font-semibold">{formatCurrency(Number(item.price) * Number(item.total_sold))}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Belum ada data</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
