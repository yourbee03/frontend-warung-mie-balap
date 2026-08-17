import api from './api';
import { ApiResponse, Order, PaginatedResponse } from '../types';

export const orderService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    order_type?: string;
  }): Promise<ApiResponse<PaginatedResponse<Order>>> => {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Order>> => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  create: async (data: {
    order_type: 'online' | 'qr' | 'takeaway';
    order_service_type?: 'takeaway' | 'delivery' | 'dine_in';
    payment_method?: 'cash' | 'qris';
    table_id?: number;
    items: { product_id: number; quantity: number; options_price?: number }[];
    guest_name?: string;
    guest_phone?: string;
    shipping_address?: string;
    user_latitude?: number;
    user_longitude?: number;
    notes?: string;
  }): Promise<ApiResponse<Order>> => {
    const response = await api.post('/orders', data);
    return response.data;
  },

  track: async (orderNumber: string): Promise<ApiResponse<Order>> => {
    const response = await api.get(`/orders/track/${orderNumber}`);
    return response.data;
  },

  createQrisPayment: async (orderId: number): Promise<ApiResponse<{
    payment_id: number;
    order_id: number;
    amount: number;
    qr_code_id: string;
    qr_string: string;
    external_id: string;
    status: string;
  }>> => {
    const response = await api.post('/payment-gateway/create-qris', { order_id: orderId });
    return response.data;
  },

  getQrisStatus: async (orderId: number): Promise<ApiResponse<{
    payment_id: number;
    status: string;
    method: string;
    amount: number;
    qr_code_id: string;
  }>> => {
    const response = await api.get(`/payment-gateway/status/${orderId}`);
    return response.data;
  },
};
