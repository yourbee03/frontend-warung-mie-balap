import api from './api';
import { ApiResponse, User } from '../types';

interface AuthResponse {
  user: User;
  token: string;
}

export const authService = {
  login: async (username: string, password: string): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  register: async (data: {
    name: string;
    username?: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  getMe: async (): Promise<ApiResponse<User>> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: async (): Promise<ApiResponse<null>> => {
    const response = await api.post('/auth/logout');
    localStorage.removeItem('token');
    return response.data;
  },

  updateProfile: async (data: { name?: string; phone?: string; address?: string; avatar?: string }): Promise<ApiResponse<User>> => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },

  changePassword: async (current_password: string, new_password: string): Promise<ApiResponse<null>> => {
    const response = await api.put('/auth/change-password', { current_password, new_password });
    return response.data;
  },

  forgotPassword: async (email: string): Promise<ApiResponse<{ message: string; resetToken?: string }>> => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, new_password: string): Promise<ApiResponse<null>> => {
    const response = await api.post('/auth/reset-password', { token, new_password });
    return response.data;
  },
};
