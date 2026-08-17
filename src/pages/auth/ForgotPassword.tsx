import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { authService } from '../../services/auth.service';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const forgotMutation = useMutation({
    mutationFn: () => authService.forgotPassword(email),
    onSuccess: (response) => {
      setSent(true);
      if (response.data?.resetToken) {
        setResetToken(response.data.resetToken);
      }
      toast.success('Link reset password telah dikirim!');
    },
    onError: () => {
      toast.error('Gagal mengirim link reset password');
    },
  });

  const validate = () => {
    if (!email.trim()) {
      setError('Email wajib diisi');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email tidak valid');
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) forgotMutation.mutate();
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Link to="/" className="text-center">
            <h1 className="text-3xl font-bold text-primary">🍜 Warung Mie Balap</h1>
          </Link>
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Email Terkirim!</h2>
              <p className="text-sm text-gray-600 mb-6">
                Kami telah mengirim link reset password ke <strong>{email}</strong>.
                Silakan cek email Anda.
              </p>

              {resetToken && (
                <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-700 font-medium mb-1">Demo Mode - Token Reset:</p>
                  <p className="text-xs text-yellow-600 break-all font-mono">{resetToken}</p>
                  <Link
                    to={`/reset-password?token=${resetToken}`}
                    className="mt-2 inline-block text-xs text-primary hover:underline"
                  >
                    Klik di sini untuk reset password
                  </Link>
                </div>
              )}

              <Link to="/login">
                <Button className="w-full" variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Kembali ke Login
                </Button>
              </Link>
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
          Lupa Password?
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Masukkan email Anda dan kami akan mengirim link untuk reset password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1 relative">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="Masukkan email Anda"
                  className={error ? 'border-red-500 pr-10' : 'pr-10'}
                  autoComplete="email"
                />
                <Mail className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              </div>
              {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={forgotMutation.isPending}
            >
              {forgotMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mengirim...
                </>
              ) : (
                'Kirim Link Reset Password'
              )}
            </Button>

            <Link to="/login" className="block text-center text-sm text-primary hover:underline">
              <ArrowLeft className="h-4 w-4 inline mr-1" />
              Kembali ke Login
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
