export interface User {
  id: number;
  role_id: number;
  name: string;
  username: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  avatar: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: number;
  name: string;
  description: string | null;
}

export interface Product {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  description: string | null;
  custom_options: ProductOption[] | null;
  price: number;
  stock: number;
  is_active: boolean;
  category: Category;
  category_name?: string;
  category_slug?: string;
  images: ProductImage[];
  created_at: string;
  updated_at: string;
}

export interface ProductOptionValue {
  label: string;
  price: number; // harga tambahan, 0 = gratis
}

export interface ProductOption {
  name: string;
  key: string;
  options: ProductOptionValue[];
}

export interface ProductImage {
  id: number;
  product_id: number;
  image: string;
  is_primary: boolean;
  sort_order: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  is_active: boolean;
}

export interface Order {
  id: number;
  user_id: number | null;
  table_id: number | null;
  order_number: string;
  order_type: 'online' | 'qr' | 'takeaway';
  order_service_type?: 'takeaway' | 'delivery' | 'dine_in' | null;
  payment_method?: 'cash' | 'bank_transfer' | 'qris';
  status: 'pending' | 'processing' | 'ready' | 'completed' | 'cancelled';
  total_amount: number;
  guest_name: string | null;
  guest_phone: string | null;
  notes: string | null;
  shipping_address: string | null;
  shipping_cost: number;
  created_at: string;
  updated_at: string;
  user?: User;
  user_name?: string;
  table?: Table;
  table_number?: string;
  items?: OrderItem[];
  payment?: Payment;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  subtotal: number;
  notes?: string | null;
  product_name?: string;
  product_slug?: string;
  product?: Product;
}

export interface OrderEditRequest {
  id: number;
  order_id: number;
  requested_by: number;
  reason: string | null;
  old_items: OrderEditRequestItem[];
  new_items: OrderEditRequestItem[];
  status: 'pending' | 'approved' | 'rejected';
  admin_verified_by: number | null;
  admin_verified_at: string | null;
  reject_reason: string | null;
  applied_at: string | null;
  applied_by: number | null;
  created_at: string;
  updated_at: string;
  order_number?: string;
  order_type?: string;
  order_service_type?: string | null;
  total_amount?: number;
  guest_name?: string | null;
  requested_by_name?: string;
  admin_name?: string | null;
  applied_by_name?: string | null;
  order_items?: OrderItem[];
}

export interface OrderEditRequestItem {
  product_id: number;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
  notes?: string;
  options_price?: number;
}

export interface OrderAuditLog {
  id: number;
  order_id: number | null;
  edit_request_id: number | null;
  action: 'edit_requested' | 'admin_verified' | 'applied' | 'rejected';
  actor_id: number;
  actor_name: string | null;
  actor_role: string | null;
  old_data: any;
  new_data: any;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface Payment {
  id: number;
  order_id: number;
  method: 'cash' | 'bank_transfer' | 'qris';
  status: 'pending' | 'paid' | 'rejected' | 'expired';
  amount: number;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  qr_code_id: string | null;
  paid_at: string | null;
  notes: string | null;
}

export interface Table {
  id: number;
  table_number: string;
  qr_code: string;
  is_active: boolean;
}

export interface Banner {
  id: number;
  title: string;
  image: string;
  link: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Notification {
  id: number;
  user_id: number | null;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sort?: string;
  category?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
}

export interface CartItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  notes?: string;
  selected_options?: Record<string, string>;
  options_price?: number;
  selected?: boolean;
}

export interface DashboardStats {
  total_products: number;
  total_orders: number;
  total_users: number;
  total_revenue: number;
  today_orders: number;
  top_products: any[];
  sales_chart: any[];
}

export interface Setting {
  id: number;
  key: string;
  value: string | null;
  type: 'text' | 'number' | 'boolean' | 'json';
  created_at: string;
  updated_at: string;
}
