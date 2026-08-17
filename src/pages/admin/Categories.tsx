import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "../../components/ui/Dialog";
import { Textarea } from "../../components/ui/Textarea";
import api from "../../services/api";
import { useAutoRefreshAdmin } from "../../services/socket.service";
import type { Category } from "../../types";

interface CategoryFormData {
  name: string;
  description: string;
  is_active: boolean;
}

const defaultForm: CategoryFormData = {
  name: "",
  description: "",
  is_active: true,
};

export default function AdminCategories() {
  const queryClient = useQueryClient();
  useAutoRefreshAdmin();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await api.get("/categories");
      return res.data.data as Category[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const res = await api.post("/categories", data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Kategori berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setDialogOpen(false);
      setForm(defaultForm);
    },
    onError: () => toast.error("Gagal menambahkan kategori"),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      if (!editingCategory) return;
      const res = await api.put(`/categories/${editingCategory.id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Kategori berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setDialogOpen(false);
      setEditingCategory(null);
      setForm(defaultForm);
    },
    onError: () => toast.error("Gagal memperbarui kategori"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/categories/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Kategori berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setDeleteConfirm(null);
    },
    onError: () => toast.error("Gagal menghapus kategori"),
  });

  const openAdd = () => {
    setEditingCategory(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      description: category.description ?? "",
      is_active: category.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name) {
      toast.error("Nama kategori wajib diisi");
      return;
    }
    if (editingCategory) {
      updateMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Kategori</h2>
          <Button onClick={openAdd} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Tambah Kategori
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Memuat data...</p>
            ) : !categories || categories.length === 0 ? (
              <p className="text-muted-foreground text-sm">Tidak ada kategori</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Nama</th>
                      <th className="text-left py-3 px-2 font-medium">Deskripsi</th>
                      <th className="text-left py-3 px-2 font-medium">Status</th>
                      <th className="text-right py-3 px-2 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr key={category.id} className="border-b last:border-b-0 hover:bg-gray-50">
                        <td className="py-3 px-2 font-medium">{category.name}</td>
                        <td className="py-3 px-2 text-muted-foreground">{category.description ?? "-"}</td>
                        <td className="py-3 px-2">
                          <Badge variant={category.is_active ? "success" : "secondary"}>
                            {category.is_active ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(category)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {deleteConfirm === category.id ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteMutation.mutate(category.id)}
                                >
                                  Ya
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>
                                  Batal
                                </Button>
                              </div>
                            ) : (
                              <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(category.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogClose onClick={() => setDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Nama Kategori *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nama kategori"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Deskripsi</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Deskripsi kategori"
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
              {createMutation.isPending || updateMutation.isPending ? "Menyimpan..." : editingCategory ? "Simpan Perubahan" : "Tambah Kategori"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
