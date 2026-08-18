import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import MainLayout from '../../components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Badge } from '../../components/ui/Badge';
import { User, LogOut, Lock, Eye, EyeOff, Loader2, Package, Save } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { ORDER_STATUS } from '../../lib/constants';
import api from '../../services/api';
import toast from 'react-hot-toast';
import type { Order, PaginatedResponse } from '../../types';

type Tab = 'profile' | 'password' | 'orders';

export default function Profile() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  if (!auth.isAuthenticated) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-gray-500 mb-4">Silakan masuk untuk melihat profil</p>
          <a href="/login">
            <Button>Masuk</Button>
          </a>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Profil Saya</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 flex-nowrap scrollbar-hide">
          {([
            { key: 'profile', label: 'Profil', icon: User },
            { key: 'password', label: 'Ubah Kata Sandi', icon: Lock },
            { key: 'orders', label: 'Riwayat Pesanan', icon: Package },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.key
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'profile' && <ProfileTab auth={auth} />}
        {activeTab === 'password' && <PasswordTab auth={auth} />}
        {activeTab === 'orders' && <OrdersTab />}
      </div>
    </MainLayout>
  );
}

function ProfileTab({ auth }: { auth: ReturnType<typeof useAuth> }) {
  const { user, updateProfile, logout } = auth;
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Nama wajib diisi');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success('Profil berhasil diupdate');
      setIsEditing(false);
    } catch {
      toast.error('Gagal mengupdate profil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      {/* Avatar & Name */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{user?.name}</h2>
              <p className="text-gray-500 text-sm">{user?.email}</p>
              {user?.username && <p className="text-gray-400 text-xs">@{user.username}</p>}
            </div>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} className="w-full">
              Ubah Profil
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Edit Form */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>Ubah Profil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nama Lengkap</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input value={user?.email || ''} disabled className="mt-1 bg-gray-50" />
              <p className="text-xs text-gray-400 mt-1">Email tidak dapat diubah</p>
            </div>
            <div>
              <label className="text-sm font-medium">Nomor Telepon</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Nomor telepon" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Alamat</label>
              <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Alamat lengkap" className="mt-1" rows={3} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                Batal
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Simpan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{user?.role_id === 3 ? 'Pemilik' : user?.role_id === 2 ? 'Admin' : 'Pelanggan'}</p>
            <p className="text-xs text-gray-500 mt-1">Peran Akun</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{user?.is_active ? 'Aktif' : 'Nonaktif'}</p>
            <p className="text-xs text-gray-500 mt-1">Status Akun</p>
          </CardContent>
        </Card>
      </div>

      <Button onClick={logout} variant="outline" className="w-full text-red-600 border-red-600 hover:bg-red-50">
        <LogOut className="h-4 w-4 mr-2" />
        Keluar
      </Button>
    </div>
  );
}

function PasswordTab({ auth }: { auth: ReturnType<typeof useAuth> }) {
  const { changePassword } = auth;
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const passwordChecks = {
    length: form.newPass.length >= 6,
    hasLetter: /[a-zA-Z]/.test(form.newPass),
    hasNumber: /[0-9]/.test(form.newPass),
  };

  const handleSave = async () => {
    if (!form.current) { toast.error('Kata sandi lama wajib diisi'); return; }
    if (!form.newPass) { toast.error('Kata sandi baru wajib diisi'); return; }
    if (form.newPass.length < 6) { toast.error('Kata sandi baru minimal 6 karakter'); return; }
    if (form.newPass !== form.confirm) { toast.error('Konfirmasi kata sandi tidak cocok'); return; }
    setSaving(true);
    try {
      await changePassword(form.current, form.newPass);
      toast.success('Kata sandi berhasil diubah');
      setForm({ current: '', newPass: '', confirm: '' });
    } catch {
      toast.error('Kata sandi lama salah');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Ubah Kata Sandi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Kata Sandi Lama</label>
            <div className="mt-1 relative">
              <Input type={showCurrent ? 'text' : 'password'} value={form.current}
                onChange={(e) => setForm({ ...form, current: e.target.value })} placeholder="Masukkan kata sandi lama" className="pr-10" />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                {showCurrent ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Kata Sandi Baru</label>
            <div className="mt-1 relative">
              <Input type={showNew ? 'text' : 'password'} value={form.newPass}
                onChange={(e) => setForm({ ...form, newPass: e.target.value })} placeholder="Masukkan kata sandi baru" className="pr-10" />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                {showNew ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
            {form.newPass.length > 0 && (
              <div className="mt-2 space-y-1">
                {Object.entries(passwordChecks).map(([key, passed]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${passed ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={`text-xs ${passed ? 'text-green-600' : 'text-gray-400'}`}>
                      {key === 'length' ? 'Minimal 6 karakter' : key === 'hasLetter' ? 'Mengandung huruf' : 'Mengandung angka'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Konfirmasi Kata Sandi Baru</label>
            <Input type="password" value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })} placeholder="Ulangi kata sandi baru" className="mt-1" />
            {form.confirm && form.newPass !== form.confirm && (
              <p className="mt-1 text-xs text-red-500">Kata Sandi tidak cocok</p>
            )}
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
            Ubah Kata Sandi
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function OrdersTab() {
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const res = await api.get('/orders', { params: { limit: 50 } });
      return res.data.data as PaginatedResponse<Order>;
    },
  });

  const orders = ordersData?.items ?? [];

  const getStatusBadge = (status: Order['status']) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
      pending: 'warning', processing: 'default', ready: 'success', completed: 'success', cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{ORDER_STATUS[status]}</Badge>;
  };

  if (isLoading) {
    return <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 mb-4">Belum ada pesanan</p>
        <Link to="/products"><Button>Lihat Menu</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Link key={order.id} to={`/orders/${order.id}`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm font-semibold">{order.order_number}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(order.created_at)}</p>
                  <p className="text-sm mt-1">{order.items?.length ?? 0} item</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{formatCurrency(order.total_amount)}</p>
                  {getStatusBadge(order.status)}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
