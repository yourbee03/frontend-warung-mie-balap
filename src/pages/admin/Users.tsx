import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Search, Users as UsersIcon, Eye, EyeOff, Key } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "../../components/ui/Dialog";
import { formatDateTime } from "../../lib/utils";
import api from "../../services/api";
import { useAutoRefreshAdmin } from "../../services/socket.service";
import type { User, PaginatedResponse } from "../../types";

interface UserFormData {
  name: string;
  username: string;
  email: string;
  password: string;
  phone: string;
  role_id: number;
}

const defaultForm: UserFormData = {
  name: "",
  username: "",
  email: "",
  password: "",
  phone: "",
  role_id: 1,
};

const ROLE_MAP: Record<number, { label: string; variant: "default" | "success" | "secondary" | "destructive" | "outline" | "warning" }> = {
  1: { label: "Pelanggan", variant: "default" },
  2: { label: "Admin", variant: "success" },
  3: { label: "Pemilik", variant: "warning" },
};

export default function AdminUsers() {
  const queryClient = useQueryClient();
  useAutoRefreshAdmin();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormData>(defaultForm);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [passwordDialog, setPasswordDialog] = useState<{ userId: number; userName: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: async () => {
      const res = await api.get("/users", { params: { search, limit: 100 } });
      return res.data.data as PaginatedResponse<User>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const res = await api.post("/users", data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Pengguna berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDialogOpen(false);
      setForm(defaultForm);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menambahkan pengguna"),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      if (!editingUser) return;
      const payload: any = { name: data.name, username: data.username, email: data.email, phone: data.phone };
      const res = await api.put(`/users/${editingUser.id}`, payload);
      if (data.role_id !== editingUser.role_id) {
        await api.put(`/users/${editingUser.id}/role`, { role_id: data.role_id });
      }
      return res.data;
    },
    onSuccess: () => {
      toast.success("Pengguna berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDialogOpen(false);
      setEditingUser(null);
      setForm(defaultForm);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal memperbarui pengguna"),
  });

  const roleMutation = useMutation({
    mutationFn: async ({ id, roleId }: { id: number; roleId: number }) => {
      const res = await api.put(`/users/${id}/role`, { role_id: roleId });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Peran berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal mengubah peran"),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.put(`/users/${id}/toggle-active`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Status berhasil diupdate");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal mengubah status"),
  });

  const passwordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      const res = await api.put(`/users/${id}/password`, { password });
      return res.data;
    },
    onSuccess: () => {
                          toast.success("Kata Sandi berhasil diperbarui");
      setPasswordDialog(null);
      setNewPassword("");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal mengubah kata sandi"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/users/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Pengguna berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDeleteConfirm(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menghapus pengguna"),
  });

  const users = usersData?.items ?? [];
  const ownerCount = users.filter((u: User) => u.role_id === 3).length;

  const openAdd = () => {
    setEditingUser(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      username: user.username || "",
      email: user.email,
      password: "",
      phone: user.phone || "",
      role_id: user.role_id,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.email) {
      toast.error("Nama dan email wajib diisi");
      return;
    }
    if (!editingUser && !form.password) {
      toast.error("Kata sandi wajib diisi untuk pengguna baru");
      return;
    }
    if (editingUser) {
      updateMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  };

  const cycleRole = (user: User) => {
    if (user.role_id === 3 && ownerCount <= 1) return;
    const nextRole = user.role_id === 1 ? 2 : user.role_id === 2 ? 1 : 3;
    roleMutation.mutate({ id: user.id, roleId: nextRole });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Pengguna</h2>
          <Button onClick={openAdd} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Tambah Pengguna
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Cari nama, email, atau nama pengguna..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Memuat data...</p>
            ) : users.length === 0 ? (
              <p className="text-muted-foreground text-sm">Tidak ada pengguna ditemukan</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Nama</th>
                        <th className="text-left py-3 px-2 font-medium">Nama Pengguna</th>
                      <th className="text-left py-3 px-2 font-medium">Email</th>
                      <th className="text-left py-3 px-2 font-medium">Telepon</th>
                        <th className="text-left py-3 px-2 font-medium">Peran</th>
                      <th className="text-left py-3 px-2 font-medium">Bergabung</th>
                      <th className="text-left py-3 px-2 font-medium">Status</th>
                      <th className="text-right py-3 px-2 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b last:border-b-0 hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-3">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <UsersIcon className="h-4 w-4 text-gray-500" />
                              </div>
                            )}
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">{user.username ?? "-"}</td>
                        <td className="py-3 px-2 text-muted-foreground">{user.email}</td>
                        <td className="py-3 px-2">{user.phone ?? "-"}</td>
                        <td className="py-3 px-2">
                          <button onClick={() => cycleRole(user)} disabled={user.role_id === 3 && ownerCount <= 1} title={user.role_id === 3 && ownerCount <= 1 ? "Satu-satunya owner tidak bisa diubah" : "Klik untuk mengubah role"}>
                            <Badge variant={ROLE_MAP[user.role_id]?.variant || "default"} className={user.role_id !== 3 || ownerCount > 1 ? "cursor-pointer hover:opacity-80" : ""}>
                              {ROLE_MAP[user.role_id]?.label || "Tidak Diketahui"}
                            </Badge>
                          </button>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">{formatDateTime(user.created_at)}</td>
                        <td className="py-3 px-2">
                          <button onClick={() => toggleActiveMutation.mutate(user.id)} title="Klik untuk mengubah status">
                            <Badge variant={user.is_active ? "success" : "destructive"} className="cursor-pointer hover:opacity-80">
                              {user.is_active ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </button>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(user)} title="Ubah">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setPasswordDialog({ userId: user.id, userName: user.name })} title="Ubah Kata Sandi">
                              <Key className="h-4 w-4" />
                            </Button>
                            {user.role_id === 3 && ownerCount <= 1 ? null : deleteConfirm === user.id ? (
                              <div className="flex items-center gap-1">
                                <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(user.id)}>Ya</Button>
                                <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>Batal</Button>
                              </div>
                            ) : (
                              <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(user.id)} title="Hapus">
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
            <DialogTitle>{editingUser ? "Ubah Pengguna" : "Tambah Pengguna"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Nama Lengkap *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" />
            </div>
            <div>
              <label className="text-sm font-medium">Nama Pengguna</label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Nama Pengguna (opsional)" />
            </div>
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" />
            </div>
            <div>
              <label className="text-sm font-medium">Telepon</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Nomor telepon" />
            </div>
            {!editingUser && (
              <div>
                <label className="text-sm font-medium">Kata Sandi *</label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Kata Sandi" className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                    {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Peran</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.role_id} onChange={(e) => setForm({ ...form, role_id: Number(e.target.value) })}>
                <option value={1}>Pelanggan</option>
                <option value={2}>Admin</option>
                <option value={3}>Pemilik</option>
              </select>
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Menyimpan..." : editingUser ? "Simpan Perubahan" : "Tambah Pengguna"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Kata Sandi */}
      <Dialog open={!!passwordDialog} onOpenChange={() => { setPasswordDialog(null); setNewPassword(""); }}>
        <DialogContent className="max-w-sm">
          <DialogClose onClick={() => { setPasswordDialog(null); setNewPassword(""); }} />
          <DialogHeader>
            <DialogTitle>Ubah Kata Sandi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-gray-600">Ubah kata sandi untuk <strong>{passwordDialog?.userName}</strong></p>
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Kata Sandi baru (min. 6 karakter)" className="pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
            <Button className="w-full" onClick={() => {
              if (!newPassword || newPassword.length < 6) { toast.error("Kata sandi minimal 6 karakter"); return; }
              passwordMutation.mutate({ id: passwordDialog!.userId, password: newPassword });
            }} disabled={passwordMutation.isPending || newPassword.length < 6}>
              {passwordMutation.isPending ? "Menyimpan..." : "Ubah Kata Sandi"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
