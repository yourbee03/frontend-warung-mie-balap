import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { User, Mail, Phone, AtSign, Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const passwordChecks = {
    length: formData.password.length >= 6,
    hasLetter: /[a-zA-Z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password),
  };

  const registerMutation = useMutation({
    mutationFn: () =>
      register({
        name: formData.name,
        username: formData.username || undefined,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
      }),
    onSuccess: () => {
      toast.success('Registrasi berhasil!');
      navigate('/');
    },
    onError: () => {
      toast.error('Gagal melakukan registrasi');
    },
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = 'Nama wajib diisi';
    if (!formData.email.trim()) e.email = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Email tidak valid';
    if (!formData.password) e.password = 'Password wajib diisi';
    else if (formData.password.length < 6) e.password = 'Password minimal 6 karakter';
    if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Password tidak cocok';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) registerMutation.mutate();
  };

  const set = (field: string, value: string) => {
    setFormData((p) => ({ ...p, [field]: value }));
    setErrors((p) => { const next = { ...p }; delete next[field]; return next; });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="text-center">
          <h1 className="text-3xl font-bold text-primary">🍜 Warung Mie Balap</h1>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Daftar Akun Baru
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sudah punya akun?{' '}
          <Link to="/login" className="font-medium text-primary hover:text-red-700">
            Masuk
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nama Lengkap *</label>
              <div className="mt-1 relative">
                <Input id="name" type="text" value={formData.name} onChange={(e) => set('name', e.target.value)}
                  placeholder="Masukkan nama lengkap" className={errors.name ? 'border-red-500 pr-10' : 'pr-10'} />
                <User className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              </div>
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username (Opsional)</label>
              <div className="mt-1 relative">
                <Input id="username" type="text" value={formData.username} onChange={(e) => set('username', e.target.value)}
                  placeholder="Masukkan username" className="pr-10" />
                <AtSign className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email *</label>
              <div className="mt-1 relative">
                <Input id="email" type="email" value={formData.email} onChange={(e) => set('email', e.target.value)}
                  placeholder="Masukkan email" className={errors.email ? 'border-red-500 pr-10' : 'pr-10'} />
                <Mail className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Nomor Telepon (Opsional)</label>
              <div className="mt-1 relative">
                <Input id="phone" type="tel" value={formData.phone} onChange={(e) => set('phone', e.target.value)}
                  placeholder="Masukkan nomor telepon" className="pr-10" />
                <Phone className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password *</label>
              <div className="mt-1 relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} value={formData.password}
                  onChange={(e) => set('password', e.target.value)} placeholder="Masukkan password"
                  className={errors.password ? 'border-red-500 pr-10' : 'pr-10'} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                  {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}

              {/* Password strength */}
              {formData.password.length > 0 && (
                <div className="mt-2 space-y-1">
                  {Object.entries(passwordChecks).map(([key, passed]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <Check className={`h-3 w-3 ${passed ? 'text-green-500' : 'text-gray-300'}`} />
                      <span className={`text-xs ${passed ? 'text-green-600' : 'text-gray-400'}`}>
                        {key === 'length' ? 'Minimal 6 karakter' : key === 'hasLetter' ? 'Mengandung huruf' : 'Mengandung angka'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Konfirmasi Password *</label>
              <div className="mt-1 relative">
                <Input id="confirmPassword" type={showConfirm ? 'text' : 'password'} value={formData.confirmPassword}
                  onChange={(e) => set('confirmPassword', e.target.value)} placeholder="Konfirmasi password"
                  className={errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'} autoComplete="new-password" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                  {showConfirm ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mendaftar...
                </>
              ) : (
                'Daftar'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
