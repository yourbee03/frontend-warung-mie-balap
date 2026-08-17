import api from './api';
import { ApiResponse, OrderEditRequest, OrderAuditLog, PaginatedResponse } from '../types';

export const editRequestService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    order_id?: number;
  }): Promise<ApiResponse<PaginatedResponse<OrderEditRequest>>> => {
    const response = await api.get('/edit-request/requests', { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<OrderEditRequest>> => {
    const response = await api.get(`/edit-request/requests/${id}`);
    return response.data;
  },

  create: async (
    orderId: number,
    data: {
      items: { product_id: number; quantity: number; notes?: string; options_price?: number }[];
      reason?: string;
    }
  ): Promise<ApiResponse<OrderEditRequest>> => {
    const response = await api.post(`/edit-request/orders/${orderId}/edit-request`, data);
    return response.data;
  },

  verify: async (
    requestId: number,
    data: { approve: boolean; reason?: string }
  ): Promise<ApiResponse<OrderEditRequest>> => {
    const response = await api.put(`/edit-request/requests/${requestId}/verify`, data);
    return response.data;
  },

  getLogs: async (params?: {
    page?: number;
    limit?: number;
    order_id?: number;
    status?: string;
  }): Promise<ApiResponse<PaginatedResponse<OrderAuditLog>>> => {
    const response = await api.get('/edit-request/logs', { params });
    return response.data;
  },
};