import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Save, Loader2, MapPin, Store, CreditCard } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import api from "../../services/api";
import { useAutoRefreshAdmin } from "../../services/socket.service";
import type { Setting } from "../../types";

interface SettingsForm {
  [key: string]: string;
}

export default function AdminSettings() {
  const queryClient = useQueryClient();
  useAutoRefreshAdmin();
  const [form, setForm] = useState<SettingsForm>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await api.get("/settings");
      return res.data.data as Setting[];
    },
  });

  useEffect(() => {
    if (settings) {
      const formMap: SettingsForm = {};
      settings.forEach((s) => {
        formMap[s.key] = s.value || "";
      });
      setForm(formMap);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: SettingsForm) => {
      const settingsPayload = Object.entries(data).map(([key, value]) => ({
        key,
        value,
      }));
      const res = await api.put("/settings", { settings: settingsPayload });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Pengaturan berhasil disimpan");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: () => {
      toast.error("Gagal menyimpan pengaturan");
    },
  });

  const handleSubmit = () => {
    updateMutation.mutate(form);
  };

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Pengaturan</h2>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Simpan
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Memuat data...</p>
        ) : (
          <div className="grid gap-6">
            {/* Store Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Informasi Toko
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Nama Toko</label>
                  <Input
                    value={form.store_name || ""}
                    onChange={(e) => handleChange("store_name", e.target.value)}
                    placeholder="Nama toko"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Alamat Toko</label>
                  <Textarea
                    value={form.store_address || ""}
                    onChange={(e) => handleChange("store_address", e.target.value)}
                    placeholder="Alamat lengkap toko"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Telepon</label>
                    <Input
                      value={form.store_phone || ""}
                      onChange={(e) => handleChange("store_phone", e.target.value)}
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      value={form.store_email || ""}
                      onChange={(e) => handleChange("store_email", e.target.value)}
                      placeholder="email@toko.com"
                      type="email"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Informasi Pembayaran
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Bank</label>
                    <Input
                      value={form.bank_name || ""}
                      onChange={(e) => handleChange("bank_name", e.target.value)}
                      placeholder="BCA, Mandiri, dll"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Nomor Rekening</label>
                    <Input
                      value={form.bank_account || ""}
                      onChange={(e) => handleChange("bank_account", e.target.value)}
                      placeholder="1234567890"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Nama Pemilik Rekening</label>
                  <Input
                    value={form.bank_account_name || ""}
                    onChange={(e) => handleChange("bank_account_name", e.target.value)}
                    placeholder="Nama pemilik rekening"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Shipping Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Pengaturan Pengiriman
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Latitude Toko</label>
                    <Input
                      value={form.shop_latitude || ""}
                      onChange={(e) => handleChange("shop_latitude", e.target.value)}
                      placeholder="-7.2575"
                      type="number"
                      step="any"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Longitude Toko</label>
                    <Input
                      value={form.shop_longitude || ""}
                      onChange={(e) => handleChange("shop_longitude", e.target.value)}
                      placeholder="112.7521"
                      type="number"
                      step="any"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Harga per KM (Rp)</label>
                    <Input
                      value={form.shipping_cost_per_km || ""}
                      onChange={(e) => handleChange("shipping_cost_per_km", e.target.value)}
                      placeholder="3000"
                      type="number"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Minimum KM</label>
                    <Input
                      value={form.minimum_shipping_km || ""}
                      onChange={(e) => handleChange("minimum_shipping_km", e.target.value)}
                      placeholder="1"
                      type="number"
                    />
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">
                    <strong>Cara kerja:</strong> Sistem akan menghitung jarak dari koordinat toko ke lokasi pelanggan menggunakan GPS. Ongkir = Jarak (km) x Harga per KM. Jarak minimum dibulatkan ke {form.minimum_shipping_km || 1} km.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
