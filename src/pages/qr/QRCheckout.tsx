import { useNavigate } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function QRCheckout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-sm p-6 max-w-md w-full mx-4 text-center">
        <CreditCard className="h-12 w-12 mx-auto text-primary mb-4" />
        <h1 className="text-xl font-bold mb-2">Pembayaran di Kasir</h1>
        <p className="text-gray-500 mb-6">
          Silakan tunjukkan pesanan Anda ke kasir untuk melakukan pembayaran.
        </p>
        <Button onClick={() => navigate('/')} className="w-full">
          Kembali ke Beranda
        </Button>
      </div>
    </div>
  );
}
