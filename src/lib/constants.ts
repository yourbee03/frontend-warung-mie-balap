export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Warung Mie Balap';

export const ORDER_STATUS = {
  pending: 'Menunggu Konfirmasi',
  processing: 'Diproses',
  ready: 'Siap Diambil',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
} as const;

export const PAYMENT_STATUS = {
  pending: 'Menunggu Pembayaran',
  paid: 'Lunas',
  rejected: 'Ditolak',
} as const;

export const PAYMENT_METHOD = {
  cash: 'Bayar di Kasir',
  bank_transfer: 'Transfer Bank',
  qris: 'QRIS',
} as const;

export const ORDER_TYPE = {
  online: 'Daring',
  qr: 'Kode QR',
  takeaway: 'Bawa Pulang',
} as const;

export const ORDER_SERVICE_TYPE = {
  takeaway: 'Bawa Pulang',
  delivery: 'Diantar',
  dine_in: 'Makan di Tempat',
} as const;

export const EDIT_REQUEST_STATUS = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
} as const;

export const BANK_INFO = [
  {
    name: 'BCA',
    account: '1234567890',
    accountName: 'Warung Mie Balap',
  },
  {
    name: 'BRI',
    account: '0987654321',
    accountName: 'Warung Mie Balap',
  },
  {
    name: 'Mandiri',
    account: '1122334455',
    accountName: 'Warung Mie Balap',
  },
];

export const PRODUCT_SORT_OPTIONS = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'price_asc', label: 'Harga Terendah' },
  { value: 'price_desc', label: 'Harga Tertinggi' },
  { value: 'name_asc', label: 'Nama A-Z' },
  { value: 'name_desc', label: 'Nama Z-A' },
];

export const ITEMS_PER_PAGE = 12;
