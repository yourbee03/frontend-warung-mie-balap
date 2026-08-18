import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { authService } from '../../services/auth.service';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [success, setSuccess] = useState(false);

  const resetMutation = useMutation({
    mutationFn: () => authService.resetPassword(token, newPassword),
    onSuccess: () => {
      setSuccess(true);
      toast.success('Kata sandi berhasil diatur ulang!');
    },
    onError: () => {
      toast.error('Token tidak valid atau sudah kedaluwarsa');
    },
  });

  const validate = () => {
    const newErrors: { newPassword?: string; confirmPassword?: string } = {};
    if (!newPassword) {
      newErrors.newPassword = 'Kata sandi baru wajib diisi';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Kata sandi minimal 6 karakter';
    }
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Konfirmasi kata sandi tidak cocok';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) resetMutation.mutate();
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Link to="/" className="text-center">
            <h1 className="text-3xl font-bold text-primary">🍜 Warung Mie Balap</h1>
          </Link>
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Token Tidak Ditemukan</h2>
              <p className="text-sm text-gray-600 mb-6">
                Silakan minta tautan atur ulang kata sandi baru.
              </p>
              <Link to="/forgot-password">
                <Button className="w-full">Minta Atur Ulang Kata Sandi</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Link to="/" className="text-center">
            <h1 className="text-3xl font-bold text-primary">🍜 Warung Mie Balap</h1>
          </Link>
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Kata Sandi Berhasil Diatur Ulang!</h2>
              <p className="text-sm text-gray-600 mb-6">
                Anda sudah bisa masuk dengan kata sandi baru Anda.
              </p>
              <Button className="w-full" onClick={() => navigate('/login')}>
                Masuk Sekarang
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="text-center">
          <h1 className="text-3xl font-bold text-primary">🍜 Warung Mie Balap</h1>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Atur Ulang Kata Sandi
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Masukkan kata sandi baru Anda di bawah ini.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                Kata Sandi Baru
              </label>
              <div className="mt-1 relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setErrors((p) => ({ ...p, newPassword: undefined })); }}
                  placeholder="Masukkan kata sandi baru"
                  className={errors.newPassword ? 'border-red-500 pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword && <p className="mt-1 text-xs text-red-500">{errors.newPassword}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Konfirmasi Kata Sandi
              </label>
              <div className="mt-1 relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: undefined })); }}
                  placeholder="Konfirmasi kata sandi baru"
                  className={errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mereset...
                </>
              ) : (
                'Atur Ulang Kata Sandi'
              )}
            </Button>

            <Link to="/login" className="block text-center text-sm text-primary hover:underline">
              Kembali ke Masuk
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
