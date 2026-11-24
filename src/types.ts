export type ProductStatus = 'Tersedia' | 'Tidak Tersedia';

export type OrderStatus =
  | 'Menunggu Konfirmasi'
  | 'Diproses'
  | 'Selesai'
  | 'Dibatalkan';

export interface Product {
  id: string;
  name: string;
  tag: string;
  description: string;
  price: number;
  image: string;
  status: ProductStatus;
  featured: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  createdAt: string;
  items: OrderItem[];
  totalItems: number;
  totalPrice: number;
  status: OrderStatus;
  customerNote?: string;
  channel: 'WhatsApp';
}

export interface ContactInfo {
  whatsappNumber: string;
  whatsappLink: string;
  instagramUsername: string;
  instagramLink: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
  ip: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface AdminOverviewStats {
  totalProducts: number;
  availableProducts: number;
  totalOrders: number;
  totalItemsSold: number;
  totalOrderValue: number;
  pendingOrders: number;
  recentOrders: Order[];
}

export interface StorefrontData {
  products: Product[];
  contact: ContactInfo;
}

export interface AdminUserInfo {
  username: string;
  role: 'admin';
  mfaEnabled: boolean;
  isDefaultPassword: boolean;
  environment: string;
}

export interface BackupPayload {
  schemaVersion: number;
  exportedAt: string;
  products: Product[];
  orders: Order[];
  contact: ContactInfo;
  auditLogs?: AuditLogEntry[];
}
