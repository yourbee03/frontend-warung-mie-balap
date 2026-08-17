import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Search, ChevronDown, ChevronUp, CheckCircle2, Clock, Package, XCircle, Truck, Plus, Minus, ShoppingBag, Pencil } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "../../components/ui/Dialog";
import { Textarea } from "../../components/ui/Textarea";
import { formatCurrency, formatDateTime } from "../../lib/utils";
import { ORDER_STATUS, PAYMENT_STATUS, ORDER_TYPE } from "../../lib/constants";
import api from "../../services/api";
import { useAutoRefreshAdmin } from "../../services/socket.service";
import { editRequestService } from "../../services/edit-request.service";
import { useAuth } from "../../contexts/AuthContext";
import type { Order, PaginatedResponse } from "../../types";

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "pending", label: "Menunggu" },
  { value: "processing", label: "Disiapkan" },
  { value: "ready", label: "Siap" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
];

// Status flow: pending -> processing -> ready -> completed
const STATUS_FLOW: Record<string, { next: string; label: string; icon: any; color: string }[]> = {
  pending: [
    { next: "processing", label: "Proses Pesanan", icon: Clock, color: "bg-blue-600 hover:bg-blue-700" },
    { next: "cancelled", label: "Batalkan", icon: XCircle, color: "bg-red-600 hover:bg-red-700" },
  ],
  processing: [
    { next: "ready", label: "Siap Diambil", icon: Package, color: "bg-yellow-500 hover:bg-yellow-600" },
    { next: "cancelled", label: "Batalkan", icon: XCircle, color: "bg-red-600 hover:bg-red-700" },
  ],
  ready: [
    { next: "completed", label: "Selesai", icon: CheckCircle2, color: "bg-green-600 hover:bg-green-700" },
  ],
  completed: [],
  cancelled: [],
};

const STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  processing: Package,
  ready: Truck,
  completed: CheckCircle2,
  cancelled: XCircle,
};

const STATUS_STEP: Record<string, number> = {
  pending: 0,
  processing: 1,
  ready: 2,
  completed: 3,
  cancelled: -1,
};

export default function AdminOrders() {
  const queryClient = useQueryClient();
  useAutoRefreshAdmin();
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ orderId: number; orderNumber: string; action: string; status: string } | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [orderType, setOrderType] = useState<'takeaway' | 'qr'>('takeaway');
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [showGuestInfo, setShowGuestInfo] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [orderItems, setOrderItems] = useState<{ product_id: number; name: string; price: number; quantity: number; notes?: string; options_price?: number }[]>([]);
  const [optionPickerProduct, setOptionPickerProduct] = useState<any>(null);
  const [optionPickerSelections, setOptionPickerSelections] = useState<Record<string, string>>({});
  const [optionPickerCustomNote, setOptionPickerCustomNote] = useState('');
  const [editDialogOrder, setEditDialogOrder] = useState<Order | null>(null);
  const [editItems, setEditItems] = useState<{ product_id: number; name: string; price: number; quantity: number; notes?: string; options_price?: number }[]>([]);
  const [editReason, setEditReason] = useState('');
  const [editOptionPickerProduct, setEditOptionPickerProduct] = useState<any>(null);
  const [editOptionPickerSelections, setEditOptionPickerSelections] = useState<Record<string, string>>({});
  const [editOptionPickerCustomNote, setEditOptionPickerCustomNote] = useState('');
  const { user } = useAuth();
  const isAdmin = user?.role_id === 2;

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["admin-orders", statusFilter, search],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await api.get("/orders/admin/all", { params });
      return res.data.data as PaginatedResponse<Order>;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await api.put(`/orders/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Status pesanan berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setConfirmDialog(null);
    },
    onError: () => toast.error("Gagal memperbarui status pesanan"),
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products-list"],
    queryFn: async () => {
      const res = await api.get("/products", { params: { limit: 200 } });
      return res.data.data.items as any[];
    },
  });

  const { data: tables } = useQuery({
    queryKey: ["admin-tables-list"],
    queryFn: async () => {
      const res = await api.get("/tables/active");
      return res.data.data as any[];
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/orders/admin/create", data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Pesanan berhasil dibuat");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setCreateDialogOpen(false);
      resetCreateForm();
    },
    onError: () => toast.error("Gagal membuat pesanan"),
  });

  const orders = ordersData?.items ?? [];

  const editRequestMutation = useMutation({
    mutationFn: async ({ orderId, items, reason }: { orderId: number; items: any[]; reason?: string }) => {
      return await editRequestService.create(orderId, { items, reason });
    },
    onSuccess: () => {
      toast.success("Permintaan edit berhasil dikirim");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setEditDialogOrder(null);
      setEditItems([]);
      setEditReason('');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal mengirim permintaan edit"),
  });

  const openEditDialog = (order: Order) => {
    setEditDialogOrder(order);
    setEditItems(
      (order.items || []).map((item: any) => ({
        product_id: item.product_id,
        name: item.product_name || item.product?.name || `Produk #${item.product_id}`,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes || undefined,
        options_price: item.options_price || 0,
      }))
    );
    setEditReason('');
  };

  const updateEditItemQuantity = (productId: number, delta: number) => {
    setEditItems((prev) =>
      prev
        .map((item) =>
          item.product_id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const submitEditRequest = () => {
    if (!editDialogOrder || editItems.length === 0) return;
    editRequestMutation.mutate({
      orderId: editDialogOrder.id,
      items: editItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        ...(item.notes ? { notes: item.notes } : {}),
        ...(item.options_price ? { options_price: item.options_price } : {}),
      })),
      reason: editReason.trim() || undefined,
    });
  };

  const removeEditItem = (productId: number) => {
    setEditItems((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const addProductToEdit = (product: any) => {
    let options: any[] = [];
    if (product.custom_options) {
      try {
        const raw = typeof product.custom_options === 'string'
          ? JSON.parse(product.custom_options)
          : product.custom_options;
        options = raw.map((opt: any) => ({
          name: opt.name,
          key: opt.key,
          options: (opt.options || []).map((v: any) =>
            typeof v === 'string' ? { label: v, price: 0 } : v
          ),
        }));
      } catch { options = []; }
    }

    if (options.length > 0) {
      setEditOptionPickerProduct({ ...product, parsedOptions: options });
      setEditOptionPickerSelections({});
      setEditOptionPickerCustomNote('');
      return;
    }

    setEditItems((prev) => {
      const existing = prev.find((item) => item.product_id === product.id && !item.notes);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id && !item.notes
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const confirmEditOptionPicker = () => {
    if (!editOptionPickerProduct) return;
    const notes = buildOptionNotes(editOptionPickerProduct.parsedOptions, editOptionPickerSelections, editOptionPickerCustomNote);
    const optionsPrice = calcOptionsPrice(editOptionPickerProduct.parsedOptions, editOptionPickerSelections);
    setEditItems((prev) => {
      const normNotes = notes || undefined;
      const existing = prev.find(
        (item) => item.product_id === editOptionPickerProduct.id && (item.notes || undefined) === normNotes
      );
      if (existing) {
        return prev.map((item) =>
          item.product_id === editOptionPickerProduct.id && (item.notes || undefined) === normNotes
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        product_id: editOptionPickerProduct.id,
        name: editOptionPickerProduct.name,
        price: editOptionPickerProduct.price,
        quantity: 1,
        notes: normNotes,
        options_price: optionsPrice,
      }];
    });
    setEditOptionPickerProduct(null);
  };

  const resetCreateForm = () => {
    setOrderType('takeaway');
    setSelectedTable(null);
    setGuestName('');
    setGuestPhone('');
    setOrderNotes('');
    setOrderItems([]);
    setShowGuestInfo(false);
    setShowNotes(false);
  };

  const addProductToOrder = (product: any) => {
    // Parse custom_options
    let options: any[] = [];
    if (product.custom_options) {
      try {
        const raw = typeof product.custom_options === 'string'
          ? JSON.parse(product.custom_options)
          : product.custom_options;
        options = raw.map((opt: any) => ({
          name: opt.name,
          key: opt.key,
          options: (opt.options || []).map((v: any) =>
            typeof v === 'string' ? { label: v, price: 0 } : v
          ),
        }));
      } catch { options = []; }
    }

    // If product has custom options, open option picker
    if (options.length > 0) {
      setOptionPickerProduct({ ...product, parsedOptions: options });
      setOptionPickerSelections({});
      setOptionPickerCustomNote('');
      return;
    }

    // No options, add directly
    setOrderItems((prev) => {
      const existing = prev.find((item) => item.product_id === product.id && !item.notes);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id && !item.notes
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const confirmOptionPicker = () => {
    if (!optionPickerProduct) return;
    const notes = buildOptionNotes(optionPickerProduct.parsedOptions, optionPickerSelections, optionPickerCustomNote);
    const optionsPrice = calcOptionsPrice(optionPickerProduct.parsedOptions, optionPickerSelections);
    setOrderItems((prev) => {
      const normNotes = notes || undefined;
      const existing = prev.find(
        (item) => item.product_id === optionPickerProduct.id && (item.notes || undefined) === normNotes
      );
      if (existing) {
        return prev.map((item) =>
          item.product_id === optionPickerProduct.id && (item.notes || undefined) === normNotes
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        product_id: optionPickerProduct.id,
        name: optionPickerProduct.name,
        price: optionPickerProduct.price,
        quantity: 1,
        notes: normNotes,
        options_price: optionsPrice,
      }];
    });
    setOptionPickerProduct(null);
  };

  const buildOptionNotes = (parsedOptions: any[], selections: Record<string, string>, customNote: string): string => {
    const parts: string[] = [];
    for (const opt of parsedOptions) {
      const selected = selections[opt.key];
      if (selected) parts.push(selected);
    }
    if (customNote.trim()) parts.push(customNote.trim());
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

  const updateItemQuantity = (productId: number, delta: number) => {
    setOrderItems((prev) =>
      prev
        .map((item) =>
          item.product_id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const orderTotal = orderItems.reduce((sum, item) => sum + (Number(item.price) + (item.options_price || 0)) * item.quantity, 0);

  const handleSubmitOrder = () => {
    if (orderItems.length === 0) {
      toast.error("Pilih minimal 1 produk");
      return;
    }
    const payload: any = {
      order_type: orderType,
      items: orderItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        ...(item.notes ? { notes: item.notes } : {}),
      })),
    };
    if (orderType === 'qr' && selectedTable) payload.table_id = selectedTable;
    if (guestName.trim()) payload.guest_name = guestName.trim();
    if (guestPhone.trim()) payload.guest_phone = guestPhone.trim();
    if (orderNotes.trim()) payload.notes = orderNotes.trim();
    createOrderMutation.mutate(payload);
  };

  const getStatusBadge = (status: Order["status"], orderType?: string) => {
    const variants: Record<Order["status"], "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
      pending: "warning",
      processing: "default",
      ready: "success",
      completed: "success",
      cancelled: "destructive",
    };
    const labels: Record<string, Record<string, string>> = {
      qr: { processing: "Disiapkan", ready: "Siap Diantar" },
      online: { processing: "Diproses", ready: "Siap Diambil" },
      takeaway: { processing: "Disiapkan", ready: "Siap Diambil" },
    };
    const label = labels[orderType ?? ""]?.[status] ?? ORDER_STATUS[status];
    return <Badge variant={variants[status]}>{label}</Badge>;
  };

  const getPaymentBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
      pending: "warning",
      paid: "success",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] ?? "secondary"}>{PAYMENT_STATUS[status as keyof typeof PAYMENT_STATUS] ?? status}</Badge>;
  };

  const getOrderTypeBadge = (type: string) => {
    return <Badge variant="outline">{ORDER_TYPE[type as keyof typeof ORDER_TYPE] ?? type}</Badge>;
  };

  const handleStatusClick = (orderId: number, orderNumber: string, action: string, status: string) => {
    setConfirmDialog({ orderId, orderNumber, action, status });
  };

  const renderStatusProgress = (status: string) => {
    if (status === "cancelled") {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <XCircle className="h-4 w-4" />
          <span className="text-xs font-medium">Dibatalkan</span>
        </div>
      );
    }

    const steps = ["pending", "processing", "ready", "completed"];
    const currentStep = STATUS_STEP[status] ?? 0;

    return (
      <div className="flex items-center gap-1">
        {steps.map((step, index) => {
          const StepIcon = STATUS_ICONS[step];
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          return (
            <div key={step} className="flex items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isCurrent
                    ? "bg-primary text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                <StepIcon className="h-3 w-3" />
              </div>
              {index < steps.length - 1 && (
                <div className={`w-4 h-0.5 ${index < currentStep ? "bg-green-500" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Pesanan</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{orders.length} pesanan</span>
            <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Buat Pesanan
            </Button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nomor pesanan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground text-sm mt-2">Memuat data...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-muted-foreground">Tidak ada pesanan ditemukan</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const isExpanded = expandedOrder === order.id;
                  const nextActions = STATUS_FLOW[order.status] || [];
                  const customerName = order.user_name || order.guest_name || `User #${order.user_id}`;

                  return (
                    <div key={order.id} className="border rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
                      {/* Order Header */}
                      <div
                        className="p-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-gray-400 shrink-0" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-mono text-sm font-semibold">{order.order_number}</p>
                                {getOrderTypeBadge(order.order_type)}
                              </div>
                              <p className="text-sm text-gray-500 truncate">{customerName}</p>
                              {/* Item Summary */}
                              {order.items && order.items.length > 0 && (
                                <div className="mt-1.5 space-y-0.5">
                                  {order.items.slice(0, 3).map((item: any) => (
                                    <p key={item.id} className="text-xs text-gray-600">
                                      {item.product_name || item.product?.name} x{item.quantity}
                                    </p>
                                  ))}
                                  {order.items.length > 3 && (
                                    <p className="text-xs text-gray-400">+{order.items.length - 3} lainnya</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="font-semibold">{formatCurrency(order.total_amount)}</p>
                              <p className="text-xs text-gray-500">{formatDateTime(order.created_at)}</p>
                            </div>
                            {getStatusBadge(order.status, order.order_type)}
                          </div>
                        </div>

                        {/* Status Progress */}
                        <div className="mt-3 ml-8">
                          {renderStatusProgress(order.status)}
                        </div>
                      </div>

                      {/* Expanded Detail */}
                      {isExpanded && (
                        <div className="border-t bg-gray-50 p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm font-medium text-gray-500 mb-1">Item Pesanan:</p>
                              {order.items?.map((item: any) => (
                                <div key={item.id} className="flex justify-between text-sm">
                                  <span>{item.product_name || item.product?.name} x{item.quantity}</span>
                                  <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                                </div>
                              ))}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500 mb-1">Info:</p>
                              {order.order_type === 'online' ? (
                                <p className="text-sm">Pembayaran: {order.payment ? getPaymentBadge(order.payment.status) : <Badge variant="warning">Belum Dibayar</Badge>}</p>
                              ) : (
                                <p className="text-sm">Pembayaran: <Badge variant="outline">Bayar di Kasir</Badge></p>
                              )}
                              {order.notes && <p className="text-sm mt-1">Catatan: {order.notes}</p>}
                              {order.table_number && <p className="text-sm mt-1">Meja: {order.table_number}</p>}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          {nextActions.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-3 border-t">
                              {nextActions.map((action) => {
                                const ActionIcon = action.icon;
                                const actionLabel = action.next === "ready"
                                  ? (order.order_type === "qr" ? "Siap Diantar" : "Siap Diambil")
                                  : action.label;
                                return (
                                  <Button
                                    key={action.next}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusClick(order.id, order.order_number, actionLabel, action.next);
                                    }}
                                    className={`${action.color} text-white`}
                                    size="sm"
                                  >
                                    <ActionIcon className="h-4 w-4 mr-1" />
                                    {actionLabel}
                                  </Button>
                                );
                              })}
                              {isAdmin && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditDialog(order);
                                  }}
                                >
                                  <Pencil className="h-4 w-4 mr-1" />
                                  Edit Pesanan
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
          <DialogContent>
            <DialogClose onClick={() => setConfirmDialog(null)} />
            <DialogHeader>
              <DialogTitle>Konfirmasi Perubahan Status</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-center text-gray-600">
                Ubah status pesanan <span className="font-bold">{confirmDialog.orderNumber}</span> menjadi{" "}
                <span className="font-bold text-primary">{confirmDialog.action}</span>?
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmDialog(null)}>
                Batal
              </Button>
              <Button
                onClick={() =>
                  updateStatusMutation.mutate({
                    id: confirmDialog.orderId,
                    status: confirmDialog.status,
                  })
                }
                disabled={updateStatusMutation.isPending}
                className="bg-primary text-white"
              >
                {updateStatusMutation.isPending ? "Memproses..." : "Ya, Ubah Status"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Order Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) resetCreateForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogClose onClick={() => { setCreateDialogOpen(false); resetCreateForm(); }} />
          <DialogHeader>
            <DialogTitle>Buat Pesanan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Order Type Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setOrderType('takeaway')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                  orderType === 'takeaway'
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-primary/50'
                }`}
              >
                🥡 Take Away
              </button>
              <button
                onClick={() => setOrderType('qr')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                  orderType === 'qr'
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-primary/50'
                }`}
              >
                🍜 Dine In
              </button>
            </div>

            {/* Table Selection (Dine In only) */}
            {orderType === 'qr' && (
              <div>
                <label className="text-sm font-medium">Pilih Meja</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  value={selectedTable || ''}
                  onChange={(e) => setSelectedTable(Number(e.target.value) || null)}
                >
                  <option value="">Pilih meja</option>
                  {tables?.map((table: any) => (
                    <option key={table.id} value={table.id}>Meja {table.table_number}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Menu List */}
            <div>
              <label className="text-sm font-medium">Pilih Menu</label>
              <div className="mt-1 max-h-56 overflow-y-auto border rounded-lg divide-y bg-white">
                {(() => {
                  const activeProducts = products?.filter((p: any) => p.is_active) || [];
                  const categories = [...new Set(activeProducts.map((p: any) => p.category_name || 'Lainnya'))];
                  return categories.map((cat) => (
                    <div key={cat}>
                      <p className="text-[11px] font-bold text-primary/70 uppercase tracking-wider px-3 py-1.5 bg-gray-50 sticky top-0">{cat}</p>
                      {activeProducts.filter((p: any) => (p.category_name || 'Lainnya') === cat).map((product: any) => {
                        const inCart = orderItems.find((item) => item.product_id === product.id);
                        return (
                          <div
                            key={product.id}
                            className={`flex items-center justify-between px-3 py-2.5 transition-colors ${inCart ? 'bg-primary/5' : ''}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium truncate">{product.name}</p>
                                {product.custom_options && (
                                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium shrink-0">opsi</span>
                                )}
                              </div>
                              <p className="text-xs text-primary font-semibold">{formatCurrency(product.price)}</p>
                            </div>
                            {inCart ? (
                              <div className="flex items-center gap-2 bg-primary/10 rounded-full px-1">
                                <button
                                  onClick={() => updateItemQuantity(product.id, -1)}
                                  className="p-1 hover:bg-primary/20 rounded-full transition-colors"
                                >
                                  <Minus className="h-3.5 w-3.5 text-primary" />
                                </button>
                                <span className="w-5 text-center text-sm font-bold text-primary">{inCart.quantity}</span>
                                <button
                                  onClick={() => updateItemQuantity(product.id, 1)}
                                  className="p-1 hover:bg-primary/20 rounded-full transition-colors"
                                >
                                  <Plus className="h-3.5 w-3.5 text-primary" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addProductToOrder(product)}
                                className="p-1.5 rounded-full hover:bg-primary/10 text-primary transition-colors"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Total */}
            {orderItems.length > 0 && (
              <div className="bg-primary/5 rounded-lg p-3 space-y-1.5">
                {orderItems.map((item, idx) => (
                  <div key={idx} className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">{item.name} x{item.quantity}</span>
                      <span className="font-medium">{formatCurrency((Number(item.price) + (item.options_price || 0)) * item.quantity)}</span>
                    </div>
                    {item.notes && (
                      <p className="text-xs text-gray-500 pl-2 italic">"{item.notes}"</p>
                    )}
                  </div>
                ))}
                <div className="border-t border-primary/10 pt-1.5 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-600">{orderItems.reduce((s, i) => s + i.quantity, 0)} item</span>
                  <span className="font-bold text-primary">{formatCurrency(orderTotal)}</span>
                </div>
              </div>
            )}

            {/* Guest Info Toggle */}
            <button
              onClick={() => setShowGuestInfo(!showGuestInfo)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showGuestInfo ? 'rotate-180' : ''}`} />
              Info Pelanggan (Opsional)
            </button>
            {showGuestInfo && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Nama pelanggan"
                />
                <Input
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="No. HP"
                />
              </div>
            )}

            {/* Notes Toggle */}
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showNotes ? 'rotate-180' : ''}`} />
              Tambah Catatan
            </button>
            {showNotes && (
              <Textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Catatan pesanan..."
                rows={2}
              />
            )}

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setCreateDialogOpen(false); resetCreateForm(); }}
              >
                Batal
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmitOrder}
                disabled={createOrderMutation.isPending || orderItems.length === 0}
              >
                {createOrderMutation.isPending ? "Membuat..." : "Buat Pesanan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                    onClick={() => setOptionPickerSelections((prev) => ({
                      ...prev,
                      [opt.key]: prev[opt.key] === v.label ? '' : v.label,
                    }))}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      optionPickerSelections[opt.key] === v.label
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
              value={optionPickerCustomNote}
              onChange={(e) => setOptionPickerCustomNote(e.target.value)}
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

      {/* Edit Request Dialog (Admin only) */}
      <Dialog open={!!editDialogOrder} onOpenChange={(open) => { if (!open) { setEditDialogOrder(null); setEditItems([]); setEditReason(''); setEditOptionPickerProduct(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogClose onClick={() => { setEditDialogOrder(null); setEditItems([]); setEditReason(''); setEditOptionPickerProduct(null); }} />
          <DialogHeader>
            <DialogTitle>Edit Pesanan — {editDialogOrder?.order_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-gray-500">Ubah item pesanan: tambah, kurangi, atau hapus menu. Permintaan akan dikirim ke Owner untuk diverifikasi.</p>

            {/* Current Items */}
            {editItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Item Saat Ini</p>
                <div className="space-y-2">
                  {editItems.map((item) => (
                    <div key={item.product_id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(Number(item.price) + (item.options_price || 0))}
                          {item.notes && <span className="ml-1 italic">({item.notes})</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => removeEditItem(item.product_id)}
                          className="p-1.5 rounded-full hover:bg-red-100 text-red-500 transition-colors"
                          title="Hapus item"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => updateEditItemQuantity(item.product_id, -1)}
                          className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateEditItemQuantity(item.product_id, 1)}
                          className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editItems.length === 0 && (
              <p className="text-sm text-red-500 text-center py-4">Belum ada item. Tambahkan menu di bawah.</p>
            )}

            {/* Add Products */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Tambah Menu</p>
              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y bg-white">
                {(() => {
                  const activeProducts = products?.filter((p: any) => p.is_active) || [];
                  const categories = [...new Set(activeProducts.map((p: any) => p.category_name || 'Lainnya'))];
                  return categories.map((cat) => (
                    <div key={cat}>
                      <p className="text-[11px] font-bold text-primary/70 uppercase tracking-wider px-3 py-1.5 bg-gray-50 sticky top-0">{cat}</p>
                      {activeProducts.filter((p: any) => (p.category_name || 'Lainnya') === cat).map((product: any) => {
                        const inEdit = editItems.find((item) => item.product_id === product.id);
                        return (
                          <div
                            key={product.id}
                            className={`flex items-center justify-between px-3 py-2 transition-colors ${inEdit ? 'bg-primary/5' : ''}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium truncate">{product.name}</p>
                                {product.custom_options && (
                                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium shrink-0">opsi</span>
                                )}
                              </div>
                              <p className="text-xs text-primary font-semibold">{formatCurrency(product.price)}</p>
                            </div>
                            {inEdit ? (
                              <div className="flex items-center gap-2 bg-primary/10 rounded-full px-1">
                                <button
                                  onClick={() => updateEditItemQuantity(product.id, -1)}
                                  className="p-1 hover:bg-primary/20 rounded-full transition-colors"
                                >
                                  <Minus className="h-3.5 w-3.5 text-primary" />
                                </button>
                                <span className="w-5 text-center text-sm font-bold text-primary">{inEdit.quantity}</span>
                                <button
                                  onClick={() => updateEditItemQuantity(product.id, 1)}
                                  className="p-1 hover:bg-primary/20 rounded-full transition-colors"
                                >
                                  <Plus className="h-3.5 w-3.5 text-primary" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addProductToEdit(product)}
                                className="p-1.5 rounded-full hover:bg-primary/10 text-primary transition-colors"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium mb-1">Alasan Edit (Opsional)</label>
              <Textarea
                placeholder="Jelaskan alasan perubahan..."
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                rows={2}
              />
            </div>

            {/* Total */}
            <div className="bg-primary/5 rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm font-semibold">Total Baru</span>
              <span className="font-bold text-primary">
                {formatCurrency(editItems.reduce((sum, item) => sum + (Number(item.price) + (item.options_price || 0)) * item.quantity, 0))}
              </span>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setEditDialogOrder(null); setEditItems([]); setEditReason(''); setEditOptionPickerProduct(null); }}
              >
                Batal
              </Button>
              <Button
                className="flex-1"
                onClick={submitEditRequest}
                disabled={editRequestMutation.isPending || editItems.length === 0}
              >
                {editRequestMutation.isPending ? "Mengirim..." : "Kirim Permintaan Edit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Option Picker Dialog */}
      <Dialog open={!!editOptionPickerProduct} onOpenChange={(open) => { if (!open) setEditOptionPickerProduct(null); }}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogClose onClick={() => setEditOptionPickerProduct(null)} />
          <DialogHeader>
            <DialogTitle>{editOptionPickerProduct?.name}</DialogTitle>
          </DialogHeader>
          {editOptionPickerProduct?.parsedOptions?.map((opt: any) => (
            <div key={opt.key} className="mt-3">
              <p className="text-sm font-medium mb-2">{opt.name}</p>
              <div className="flex flex-wrap gap-2">
                {opt.options.map((v: any) => (
                  <button
                    key={v.label}
                    onClick={() => setEditOptionPickerSelections((prev) => ({
                      ...prev,
                      [opt.key]: prev[opt.key] === v.label ? '' : v.label,
                    }))}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      editOptionPickerSelections[opt.key] === v.label
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
              value={editOptionPickerCustomNote}
              onChange={(e) => setEditOptionPickerCustomNote(e.target.value)}
              placeholder="Contoh: Extra pedas, kurangi minyak..."
            />
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setEditOptionPickerProduct(null)}>
              Batal
            </Button>
            <Button className="flex-1" onClick={confirmEditOptionPicker}>
              Tambah
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
