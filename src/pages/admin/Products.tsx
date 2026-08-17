import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Search, X, PackageCheck, PackageX, Image as ImageIcon, Upload } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "../../components/ui/Dialog";
import { Textarea } from "../../components/ui/Textarea";
import { formatCurrency } from "../../lib/utils";
import api from "../../services/api";
import { useAutoRefreshAdmin } from "../../services/socket.service";
import type { Product, Category, PaginatedResponse, ProductOption } from "../../types";

interface ProductFormData {
  name: string;
  category_id: number;
  price: number;
  stock: number;
  description: string;
  custom_options: ProductOption[];
  is_active: boolean;
}

const defaultForm: ProductFormData = {
  name: "",
  category_id: 0,
  price: 0,
  stock: 0,
  description: "",
  custom_options: [],
  is_active: true,
};

export default function AdminProducts() {
  const queryClient = useQueryClient();
  useAutoRefreshAdmin();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Option form state
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionValues, setNewOptionValues] = useState<{ label: string; price: number }[]>([]);
  const [newValueLabel, setNewValueLabel] = useState("");
  const [newValuePrice, setNewValuePrice] = useState(0);

  // Edit option state
  const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(null);
  const [editOptionName, setEditOptionName] = useState("");
  const [editOptionValues, setEditOptionValues] = useState<{ label: string; price: number }[]>([]);
  const [editValueLabel, setEditValueLabel] = useState("");
  const [editValuePrice, setEditValuePrice] = useState(0);

  // Image upload state
  const [pendingImage, setPendingImage] = useState<File | null>(null);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["admin-products", search],
    queryFn: async () => {
      const res = await api.get("/products/admin/all", { params: { search, limit: 100 } });
      return res.data.data as PaginatedResponse<Product>;
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/categories");
      return res.data.data as Category[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const payload: any = {
        name: data.name,
        category_id: Number(data.category_id),
        price: Number(data.price) || 0,
        stock: Number(data.stock) || 0,
        is_active: !!data.is_active,
      };
      if (data.description) payload.description = data.description;
      if (data.custom_options.length > 0) {
        payload.custom_options = data.custom_options.map((opt) => ({
          name: opt.name,
          key: opt.key,
          options: opt.options.map((v) => ({
            label: v.label,
            price: typeof v.price === 'number' ? v.price : 0,
          })),
        }));
      }
      const res = await api.post("/products", payload);
      return res.data;
    },
    onSuccess: async (data) => {
      const productId = data.data?.id;
      if (pendingImage && productId) {
        const formData = new FormData();
        formData.append('image', pendingImage);
        await api.post(`/products/${productId}/images/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      toast.success("Produk berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setDialogOpen(false);
      setForm(defaultForm);
      setPendingImage(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || "Gagal menambahkan produk";
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      if (!editingProduct) return;
      const payload: any = {
        name: data.name,
        category_id: Number(data.category_id),
        price: Number(data.price) || 0,
        stock: Number(data.stock) || 0,
        is_active: !!data.is_active,
      };
      if (data.description) payload.description = data.description;
      if (data.custom_options.length > 0) {
        payload.custom_options = data.custom_options.map((opt) => ({
          name: opt.name,
          key: opt.key,
          options: opt.options.map((v) => ({
            label: v.label,
            price: typeof v.price === 'number' ? v.price : 0,
          })),
        }));
      }
      const res = await api.put(`/products/${editingProduct.id}`, payload);
      return res.data;
    },
    onSuccess: async () => {
      if (pendingImage && editingProduct) {
        const formData = new FormData();
        formData.append('image', pendingImage);
        await api.post(`/products/${editingProduct.id}/images/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      toast.success("Produk berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setDialogOpen(false);
      setEditingProduct(null);
      setForm(defaultForm);
      setPendingImage(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || "Gagal memperbarui produk";
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/products/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Produk berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setDeleteConfirm(null);
    },
    onError: () => toast.error("Gagal menghapus produk"),
  });

  const toggleStockMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.put(`/products/${id}/toggle-stock`);
      return res.data;
    },
    onSuccess: (data) => {
      const stock = data.data?.stock ?? 0;
      toast.success(stock > 0 ? "Stok tersedia" : "Stok habis");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: () => toast.error("Gagal mengubah stok"),
  });

  const uploadImageMutation = useMutation({
    mutationFn: async ({ productId, file }: { productId: number; file: File }) => {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post(`/products/${productId}/images/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Gambar berhasil diupload");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: () => {
      toast.error("Gagal upload gambar");
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async ({ productId, imageId }: { productId: number; imageId: number }) => {
      const res = await api.delete(`/products/${productId}/images/${imageId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Gambar berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: () => toast.error("Gagal menghapus gambar"),
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, productId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error("File harus berupa gambar");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }
    uploadImageMutation.mutate({ productId, file });
    e.target.value = '';
  };

  const products = productsData?.items ?? [];
  const categories = categoriesData ?? [];

  const openAdd = () => {
    setEditingProduct(null);
    setForm(defaultForm);
    setPendingImage(null);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setPendingImage(null);
    let options: ProductOption[] = [];
    if (product.custom_options) {
      try {
        let raw = typeof product.custom_options === 'string'
          ? JSON.parse(product.custom_options as string)
          : product.custom_options;
        if (typeof raw === 'string') raw = JSON.parse(raw);
        options = Array.isArray(raw) ? raw.map((opt: any) => ({
          name: opt.name,
          key: opt.key,
          options: (opt.options || []).map((v: any) =>
            typeof v === 'string' ? { label: v, price: 0 } : v
          ),
        })) : [];
      } catch { options = []; }
    }
    setForm({
      name: product.name,
      category_id: product.category_id,
      price: product.price,
      stock: product.stock,
      description: product.description ?? "",
      custom_options: options,
      is_active: product.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.category_id) {
      toast.error("Nama dan kategori wajib diisi");
      return;
    }
    if (editingProduct) {
      updateMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  };

  const addValueToNewOption = () => {
    if (!newValueLabel.trim()) {
      toast.error("Nama nilai wajib diisi");
      return;
    }
    setNewOptionValues([...newOptionValues, { label: newValueLabel.trim(), price: newValuePrice || 0 }]);
    setNewValueLabel("");
    setNewValuePrice(0);
  };

  const removeValueFromNewOption = (index: number) => {
    setNewOptionValues(newOptionValues.filter((_, i) => i !== index));
  };

  const addOption = () => {
    if (!newOptionName.trim()) {
      toast.error("Nama opsi wajib diisi");
      return;
    }
    if (newOptionValues.length === 0) {
      toast.error("Masukkan minimal 1 nilai opsi");
      return;
    }
    const key = newOptionName.toLowerCase().replace(/\s+/g, "_");
    setForm({
      ...form,
      custom_options: [
        ...form.custom_options,
        { name: newOptionName.trim(), key, options: newOptionValues },
      ],
    });
    setNewOptionName("");
    setNewOptionValues([]);
  };

  const removeOption = (index: number) => {
    setForm({
      ...form,
      custom_options: form.custom_options.filter((_, i) => i !== index),
    });
  };

  const startEditOption = (index: number) => {
    const opt = form.custom_options[index];
    setEditingOptionIndex(index);
    setEditOptionName(opt.name);
    setEditOptionValues([...opt.options]);
    setEditValueLabel("");
    setEditValuePrice(0);
  };

  const cancelEditOption = () => {
    setEditingOptionIndex(null);
    setEditOptionName("");
    setEditOptionValues([]);
    setEditValueLabel("");
    setEditValuePrice(0);
  };

  const saveEditOption = () => {
    if (editingOptionIndex === null) return;
    if (!editOptionName.trim()) {
      toast.error("Nama opsi wajib diisi");
      return;
    }
    if (editOptionValues.length === 0) {
      toast.error("Minimal 1 nilai opsi");
      return;
    }
    const updated = [...form.custom_options];
    updated[editingOptionIndex] = {
      ...updated[editingOptionIndex],
      name: editOptionName.trim(),
      key: editOptionName.toLowerCase().replace(/\s+/g, "_"),
      options: editOptionValues,
    };
    setForm({ ...form, custom_options: updated });
    cancelEditOption();
  };

  const addValueToEditOption = () => {
    if (!editValueLabel.trim()) {
      toast.error("Nama nilai wajib diisi");
      return;
    }
    setEditOptionValues([...editOptionValues, { label: editValueLabel.trim(), price: editValuePrice || 0 }]);
    setEditValueLabel("");
    setEditValuePrice(0);
  };

  const removeValueFromEditOption = (index: number) => {
    setEditOptionValues(editOptionValues.filter((_, i) => i !== index));
  };

  const getPrimaryImage = (product: Product) => {
    const primary = product.images?.find((img) => img.is_primary);
    return primary?.image ?? product.images?.[0]?.image ?? null;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Produk</h2>
          <Button onClick={openAdd} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Tambah Produk
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari produk..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Memuat data...</p>
            ) : products.length === 0 ? (
              <p className="text-muted-foreground text-sm">Tidak ada produk ditemukan</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Gambar</th>
                      <th className="text-left py-3 px-2 font-medium">Nama</th>
                      <th className="text-left py-3 px-2 font-medium">Kategori</th>
                      <th className="text-left py-3 px-2 font-medium">Harga</th>
                      <th className="text-left py-3 px-2 font-medium">Stok</th>
                      <th className="text-left py-3 px-2 font-medium">Opsi</th>
                      <th className="text-left py-3 px-2 font-medium">Status</th>
                      <th className="text-right py-3 px-2 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-b last:border-b-0 hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1">
                            {getPrimaryImage(product) ? (
                              <div className="relative group">
                                <img
                                  src={getPrimaryImage(product)!}
                                  alt={product.name}
                                  className="h-10 w-10 rounded-md object-cover"
                                />
                                {product.images && product.images.length > 0 && (
                                  <button
                                    onClick={() => {
                                      const img = product.images!.find((i) => i.is_primary) || product.images![0];
                                      if (img) deleteImageMutation.mutate({ productId: product.id, imageId: img.id });
                                    }}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Hapus gambar"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="h-10 w-10 rounded-md bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                                <ImageIcon className="h-4 w-4" />
                              </div>
                            )}
                            <button
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e) => handleImageUpload(e as any, product.id);
                                input.click();
                              }}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-primary"
                              title="Upload gambar"
                            >
                              <Upload className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-2 font-medium">{product.name}</td>
                        <td className="py-3 px-2">{product.category_name ?? "-"}</td>
                        <td className="py-3 px-2">{formatCurrency(product.price)}</td>
                        <td className="py-3 px-2">
                          <button
                            onClick={() => toggleStockMutation.mutate(product.id)}
                            className="flex items-center gap-1.5 group"
                            title={product.stock > 0 ? "Klik untuk tandai stok habis" : "Klik untuk tandai tersedia"}
                          >
                            {product.stock > 0 ? (
                              <>
                                <PackageCheck className="h-4 w-4 text-green-500 group-hover:text-red-500 transition-colors" />
                                <span className="text-sm font-medium group-hover:text-red-500 transition-colors">{product.stock}</span>
                              </>
                            ) : (
                              <>
                                <PackageX className="h-4 w-4 text-red-500 group-hover:text-green-500 transition-colors" />
                                <span className="text-sm font-medium text-red-500 group-hover:text-green-500 transition-colors">Habis</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-2">
                          {product.custom_options && (() => {
                            let opts: ProductOption[] = [];
                            try {
                              let raw = typeof product.custom_options === 'string'
                                ? JSON.parse(product.custom_options)
                                : product.custom_options;
                              if (typeof raw === 'string') raw = JSON.parse(raw);
                              opts = Array.isArray(raw) ? raw : [];
                            } catch { opts = []; }
                            return opts.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {opts.slice(0, 2).map((opt: ProductOption) => (
                                  <Badge key={opt.key} variant="outline" className="text-xs">
                                    {opt.name}
                                  </Badge>
                                ))}
                                {opts.length > 2 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{opts.length - 2}
                                  </Badge>
                                )}
                              </div>
                            ) : null;
                          })()}
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant={product.is_active ? "success" : "secondary"}>
                            {product.is_active ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {deleteConfirm === product.id ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteMutation.mutate(product.id)}
                                >
                                  Ya
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>
                                  Batal
                                </Button>
                              </div>
                            ) : (
                              <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(product.id)}>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogClose onClick={() => setDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Nama Produk *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nama produk"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Kategori *</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}
              >
                <option value={0} disabled>
                  Pilih kategori
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Harga (IDR) *</label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value.replace(',', '.')) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Stok *</label>
                <Input
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: Number(e.target.value.replace(',', '.')) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Deskripsi</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Deskripsi produk"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="text-sm font-medium">Gambar Produk</label>
              <p className="text-xs text-gray-500 mb-2">Upload gambar produk (maks 5MB)</p>
              <div className="flex items-center gap-3">
                {editingProduct && getPrimaryImage(editingProduct) ? (
                  <img
                    src={getPrimaryImage(editingProduct)!}
                    alt={editingProduct.name}
                    className="h-16 w-16 rounded-md object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-md bg-gray-200 flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    id="product-image"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!file.type.startsWith('image/')) {
                        toast.error("File harus berupa gambar");
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error("Ukuran file maksimal 5MB");
                        return;
                      }
                      setPendingImage(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('product-image')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Pilih Gambar
                  </Button>
                  {pendingImage && (
                    <p className="text-xs text-green-600 mt-1">{pendingImage.name}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Custom Options */}
            <div>
              <label className="text-sm font-medium">Opsi Produk</label>
              <p className="text-xs text-gray-500 mb-2">
                Tambahkan opsi seperti level kepedasan, es, dll
              </p>

              {/* Existing options */}
              {form.custom_options.length > 0 && (
                <div className="space-y-2 mb-3">
                  {form.custom_options.map((opt, index) => (
                    <div key={index} className="bg-gray-50 rounded-md p-2">
                      {editingOptionIndex === index ? (
                        /* Edit mode */
                        <div className="space-y-2">
                          <Input
                            value={editOptionName}
                            onChange={(e) => setEditOptionName(e.target.value)}
                            placeholder="Nama opsi"
                            className="text-sm"
                          />
                          {editOptionValues.map((v, vi) => (
                            <div key={vi} className="flex items-center gap-2 bg-white rounded px-2 py-1">
                              <span className="text-sm flex-1">{v.label}</span>
                              {v.price > 0 && <span className="text-xs text-primary font-medium">+{formatCurrency(v.price)}</span>}
                              <button type="button" onClick={() => removeValueFromEditOption(vi)} className="text-red-400 hover:text-red-600">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          <div className="flex gap-2">
                            <Input
                              value={editValueLabel}
                              onChange={(e) => setEditValueLabel(e.target.value)}
                              placeholder="Tambah nilai..."
                              className="flex-1 text-sm"
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addValueToEditOption(); } }}
                            />
                            <Input
                              type="number"
                              value={editValuePrice || ''}
                              onChange={(e) => setEditValuePrice(Number(e.target.value.replace(',', '.')) || 0)}
                              placeholder="Harga"
                              className="w-20 text-sm"
                              min={0}
                            />
                            <Button type="button" variant="outline" size="sm" onClick={addValueToEditOption}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" size="sm" onClick={saveEditOption} className="flex-1">
                              Simpan
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={cancelEditOption} className="flex-1">
                              Batal
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* View mode */
                        <>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{opt.name}</p>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => startEditOption(index)}
                                className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                title="Edit opsi"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeOption(index)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-1 space-y-0.5">
                            {opt.options.map((v, vi) => (
                              <p key={vi} className="text-xs text-gray-500 pl-2">
                                {v.label} {v.price > 0 && <span className="text-primary font-medium">+{formatCurrency(v.price)}</span>}
                              </p>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add new option */}
              <div className="border rounded-md p-3 space-y-2">
                <Input
                  value={newOptionName}
                  onChange={(e) => setNewOptionName(e.target.value)}
                  placeholder="Nama opsi (contoh: Telur, Level Pedas)"
                />

                {/* Values list */}
                {newOptionValues.length > 0 && (
                  <div className="space-y-1">
                    {newOptionValues.map((v, i) => (
                      <div key={i} className="flex items-center justify-between bg-primary/5 rounded px-2 py-1">
                        <span className="text-sm">{v.label} {v.price > 0 && <span className="text-primary font-medium">+{formatCurrency(v.price)}</span>}</span>
                        <button type="button" onClick={() => removeValueFromNewOption(i)} className="text-red-400 hover:text-red-600">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add value input */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={newValueLabel}
                    onChange={(e) => setNewValueLabel(e.target.value)}
                    placeholder="Nama nilai (contoh: Dadar)"
                    className="flex-1"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addValueToNewOption(); } }}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={newValuePrice || ''}
                      onChange={(e) => setNewValuePrice(Number(e.target.value.replace(',', '.')) || 0)}
                      placeholder="Harga"
                      className="w-28"
                      min={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addValueToNewOption(); } }}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addValueToNewOption}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="w-full"
                  disabled={newOptionValues.length === 0}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Simpan Opsi
                </Button>
              </div>
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
              {createMutation.isPending || updateMutation.isPending ? "Menyimpan..." : editingProduct ? "Simpan Perubahan" : "Tambah Produk"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
