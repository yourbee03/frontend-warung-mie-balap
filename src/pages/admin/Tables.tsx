import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, QrCode, Link as LinkIcon, Download } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "../../components/ui/Dialog";
import api from "../../services/api";
import { useAutoRefreshAdmin } from "../../services/socket.service";
import type { Table, Product } from "../../types";

interface TableFormData {
  table_number: string;
  is_active: boolean;
}

interface AssignProductsForm {
  table_id: number;
  product_ids: number[];
}

const defaultForm: TableFormData = {
  table_number: "",
  is_active: true,
};

function TableQRImage({ tableId }: { tableId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["table-qr", tableId],
    queryFn: async () => {
      const res = await api.get(`/tables/${tableId}/qr`);
      return res.data.data.qr_code as string;
    },
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="h-32 w-32 border rounded flex items-center justify-center bg-gray-50">
        <span className="text-xs text-gray-400">Memuat...</span>
      </div>
    );
  }

  if (!data) return null;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = data;
    link.download = `qr-meja-${tableId}.png`;
    link.click();
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-center">
        <img
          src={data}
          alt={`QR Meja ${tableId}`}
          className="h-32 w-32 object-contain border rounded"
        />
      </div>
      <div className="flex justify-center">
        <Button variant="outline" size="sm" onClick={handleDownload} className="flex items-center gap-1">
          <Download className="h-3 w-3" />
          Unduh QR
        </Button>
      </div>
    </div>
  );
}

export default function AdminTables() {
  const queryClient = useQueryClient();
  useAutoRefreshAdmin();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [form, setForm] = useState<TableFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [assignForm, setAssignForm] = useState<AssignProductsForm>({ table_id: 0, product_ids: [] });

  const { data: tables, isLoading } = useQuery({
    queryKey: ["admin-tables"],
    queryFn: async () => {
      const res = await api.get("/tables");
      return res.data.data as Table[];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products-list"],
    queryFn: async () => {
      const res = await api.get("/products", { params: { limit: 200 } });
      return res.data.data.items as Product[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TableFormData) => {
      const res = await api.post("/tables", data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Meja berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["admin-tables"] });
      setDialogOpen(false);
      setForm(defaultForm);
    },
    onError: () => toast.error("Gagal menambahkan meja"),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TableFormData) => {
      if (!editingTable) return;
      const res = await api.put(`/tables/${editingTable.id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Meja berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ["admin-tables"] });
      setDialogOpen(false);
      setEditingTable(null);
      setForm(defaultForm);
    },
    onError: () => toast.error("Gagal memperbarui meja"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/tables/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Meja berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["admin-tables"] });
      setDeleteConfirm(null);
    },
    onError: () => toast.error("Gagal menghapus meja"),
  });

  const assignMutation = useMutation({
    mutationFn: async (data: AssignProductsForm) => {
      const res = await api.put(`/tables/${data.table_id}/products`, { product_ids: data.product_ids });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Produk berhasil di-assign ke meja");
      setAssignDialogOpen(false);
      setAssignForm({ table_id: 0, product_ids: [] });
    },
    onError: () => toast.error("Gagal assign produk"),
  });

  const openAdd = () => {
    setEditingTable(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (table: Table) => {
    setEditingTable(table);
    setForm({
      table_number: table.table_number,
      is_active: table.is_active,
    });
    setDialogOpen(true);
  };

  const openAssign = (tableId: number) => {
    setAssignForm({ table_id: tableId, product_ids: [] });
    setAssignDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.table_number) {
      toast.error("Nomor meja wajib diisi");
      return;
    }
    if (editingTable) {
      updateMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  };

  const toggleProduct = (productId: number) => {
    setAssignForm((prev) => ({
      ...prev,
      product_ids: prev.product_ids.includes(productId)
        ? prev.product_ids.filter((id) => id !== productId)
        : [...prev.product_ids, productId],
    }));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Meja & Kode QR</h2>
          <Button onClick={openAdd} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Tambah Meja
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Meja</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Memuat data...</p>
            ) : !tables || tables.length === 0 ? (
              <p className="text-muted-foreground text-sm">Belum ada meja</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tables.map((table) => (
                  <div
                    key={table.id}
                    className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <QrCode className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-lg">Meja {table.table_number}</span>
                      </div>
                      <Badge variant={table.is_active ? "success" : "secondary"}>
                        {table.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>

                    <TableQRImage tableId={table.id} />

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 flex items-center gap-1"
                        onClick={() => openAssign(table.id)}
                      >
                        <LinkIcon className="h-3 w-3" />
                        Tetapkan Produk
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(table)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {deleteConfirm === table.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteMutation.mutate(table.id)}
                          >
                            Ya
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>
                            Batal
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(table.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Table Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogClose onClick={() => setDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>{editingTable ? "Ubah Meja" : "Tambah Meja"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Nomor Meja *</label>
              <Input
                value={form.table_number}
                onChange={(e) => setForm({ ...form, table_number: e.target.value })}
                placeholder="Contoh: 1, A1, VIP-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4"
              />
              <label htmlFor="is_active" className="text-sm font-medium">
                Aktif
              </label>
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Menyimpan..." : editingTable ? "Simpan Perubahan" : "Tambah Meja"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Products Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogClose onClick={() => setAssignDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Tetapkan Produk ke Meja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {!products || products.length === 0 ? (
              <p className="text-muted-foreground text-sm">Tidak ada produk tersedia</p>
            ) : (
              <div className="space-y-2">
                {products.filter((p) => p.is_active).map((product) => (
                  <label
                    key={product.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={assignForm.product_ids.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{product.name}</span>
                  </label>
                ))}
              </div>
            )}
            <Button
              className="w-full"
              onClick={() => assignMutation.mutate(assignForm)}
              disabled={assignMutation.isPending || assignForm.product_ids.length === 0}
            >
              {assignMutation.isPending ? "Menyimpan..." : `Tetapkan ${assignForm.product_ids.length} Produk`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
