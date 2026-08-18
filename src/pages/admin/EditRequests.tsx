import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  ShieldCheck,
  History,
  Pencil,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "../../components/ui/Dialog";
import { Textarea } from "../../components/ui/Textarea";
import { formatCurrency, formatDateTime } from "../../lib/utils";
import { EDIT_REQUEST_STATUS, ORDER_SERVICE_TYPE } from "../../lib/constants";
import { editRequestService } from "../../services/edit-request.service";
import { useAutoRefreshAdmin } from "../../services/socket.service";
import { useAuth } from "../../contexts/AuthContext";
import type { OrderEditRequest, OrderAuditLog, PaginatedResponse } from "../../types";

const STATUS_FILTER = [
  { value: "", label: "Semua Status" },
  { value: "pending", label: "Menunggu" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
];

const getStatusBadge = (status: string) => {
  const variants: Record<string, "warning" | "success" | "destructive"> = {
    pending: "warning",
    approved: "success",
    rejected: "destructive",
  };
  return <Badge variant={variants[status] || "secondary"}>{EDIT_REQUEST_STATUS[status as keyof typeof EDIT_REQUEST_STATUS] || status}</Badge>;
};

const getServiceLabel = (order: any) => {
  if (order?.order_service_type) {
    return ORDER_SERVICE_TYPE[order.order_service_type as keyof typeof ORDER_SERVICE_TYPE] || order.order_service_type;
  }
  return order?.order_type || '-';
};

export default function AdminEditRequests() {
  const queryClient = useQueryClient();
  useAutoRefreshAdmin();
  const { user } = useAuth();
  const isAdmin = user?.role_id === 2;
  const isOwner = user?.role_id === 3;
  const [statusFilter, setStatusFilter] = useState("");
  const [detail, setDetail] = useState<OrderEditRequest | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<OrderEditRequest | null>(null);
  const [verifyApprove, setVerifyApprove] = useState<boolean>(true);
  const [verifyReason, setVerifyReason] = useState("");

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ["edit-requests", statusFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      const res = await editRequestService.getAll(params);
      return res.data as PaginatedResponse<OrderEditRequest>;
    },
    enabled: isAdmin || isOwner,
  });

  const { data: logsData } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const res = await editRequestService.getLogs({ limit: 100 });
      return res.data as PaginatedResponse<OrderAuditLog>;
    },
    enabled: isAdmin || isOwner,
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, approve, reason }: { id: number; approve: boolean; reason?: string }) => {
      const res = await editRequestService.verify(id, { approve, reason });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Verifikasi berhasil disimpan");
      queryClient.invalidateQueries({ queryKey: ["edit-requests"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      setVerifyTarget(null);
      setVerifyReason("");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal memverifikasi"),
  });

  const requests = requestsData?.items ?? [];
  const logs = logsData?.items ?? [];

  const openDetail = async (id: number) => {
    const res = await editRequestService.getById(id);
    setDetail(res.data || null);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Ubah Pesanan & Verifikasi</h2>
          <span className="text-sm text-gray-500">{requests.length} permintaan</span>
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTER.map((opt) => (
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

        {/* Requests List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Daftar Permintaan Ubah
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Memuat data...</p>
            ) : requests.length === 0 ? (
              <p className="text-muted-foreground">Belum ada permintaan edit</p>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div key={req.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold">{req.order_number}</p>
                        <p className="text-xs text-gray-500">
                          Jenis: {getServiceLabel(req)} • Total: {formatCurrency(req.total_amount || 0)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Diajukan oleh: <span className="font-medium">{req.requested_by_name}</span> • {formatDateTime(req.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(req.status)}
                        <Button variant="outline" size="sm" onClick={() => openDetail(req.id)}>
                          <Eye className="h-4 w-4 mr-1" /> Detail
                        </Button>
                        {isOwner && req.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => { setVerifyTarget(req); setVerifyApprove(true); }}
                          >
                            <ShieldCheck className="h-4 w-4 mr-1" /> Verifikasi
                          </Button>
                        )}
                      </div>
                    </div>
                    {req.reason && (
                      <p className="text-sm text-gray-600 mt-2">Alasan: {req.reason}</p>
                    )}
                    {req.status !== "pending" && (
                      <p className="text-xs text-gray-500 mt-2">
                        Diverifikasi Admin: {req.admin_name || '-'} • {req.admin_verified_at ? formatDateTime(req.admin_verified_at) : '-'}
                        {req.reject_reason ? ` • Ditolak: ${req.reject_reason}` : ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audit Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Log Perubahan (Audit Trail)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-muted-foreground">Belum ada log</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-sm">
                        <span className="font-semibold">{log.actor_name || `User #${log.actor_id}`}</span>
                        <span className="text-gray-500"> ({log.actor_role === 'owner' ? 'Pemilik/Super Admin' : 'Admin'})</span>
                        {" "}—{" "}
                        <span className="text-gray-700">{log.description || log.action}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(log.status)}
                        <span className="text-xs text-gray-400">{formatDateTime(log.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogClose onClick={() => setDetail(null)} />
          <DialogHeader>
            <DialogTitle>Detail Permintaan Ubah — {detail?.order_number}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p>Status: {getStatusBadge(detail.status)}</p>
                <p>Diajukan: {formatDateTime(detail.created_at)}</p>
                <p>Jenis Pesanan: {getServiceLabel(detail)}</p>
                <p>Total: {formatCurrency(detail.total_amount || 0)}</p>
              </div>
              {detail.reason && (
                <p className="text-sm">Alasan: <span className="font-medium">{detail.reason}</span></p>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold mb-2">Sebelum Perubahan</p>
                  <div className="space-y-1">
                    {(detail.old_items || []).map((item) => (
                      <p key={item.product_id} className="text-xs text-gray-600">
                        {item.name} x{item.quantity} — {formatCurrency(item.subtotal)}
                      </p>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">Setelah Perubahan</p>
                  <div className="space-y-1">
                    {(detail.new_items || []).map((item) => (
                      <p key={item.product_id} className="text-xs text-gray-600">
                        {item.name} x{item.quantity} — {formatCurrency(item.subtotal)}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
              {detail.admin_verified_at && (
                <p className="text-sm text-gray-600">
                  Diverifikasi Admin: {detail.admin_name} • {formatDateTime(detail.admin_verified_at)}
                </p>
              )}
              {detail.reject_reason && (
                <p className="text-sm text-red-600">Catatan Penolakan: {detail.reject_reason}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Verify Dialog (Admin only) */}
      <Dialog open={!!verifyTarget} onOpenChange={() => { setVerifyTarget(null); setVerifyReason(""); }}>
        <DialogContent>
          <DialogClose onClick={() => { setVerifyTarget(null); setVerifyReason(""); }} />
          <DialogHeader>
            <DialogTitle>Verifikasi Permintaan Ubah — {verifyTarget?.order_number}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm mr-2 font-medium">Keputusan:</span>
              <Button
                variant={verifyApprove ? "default" : "outline"}
                size="sm"
                className={verifyApprove ? "bg-green-600 hover:bg-green-700" : ""}
                onClick={() => setVerifyApprove(true)}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> Setujui & Terapkan
              </Button>
              <Button
                variant={!verifyApprove ? "destructive" : "outline"}
                size="sm"
                onClick={() => setVerifyApprove(false)}
              >
                <XCircle className="h-4 w-4 mr-1" /> Tolak
              </Button>
            </div>
            {!verifyApprove && (
              <div>
                <label className="block text-sm font-medium mb-1">Alasan Penolakan</label>
                <Textarea
                  placeholder="Jelaskan alasan penolakan..."
                  value={verifyReason}
                  onChange={(e) => setVerifyReason(e.target.value)}
                  rows={2}
                />
              </div>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setVerifyTarget(null)}>Batal</Button>
              <Button
                disabled={verifyMutation.isPending}
                onClick={() => verifyMutation.mutate({ id: verifyTarget!.id, approve: verifyApprove, reason: verifyReason || undefined })}
              >
                <Clock className="h-4 w-4 mr-1" />
                {verifyMutation.isPending ? "Memproses..." : "Simpan Verifikasi"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}