import { MOCO_IMAGES } from '../data/mocoImages.ts';
import type {
  AdminOverviewStats,
  AdminUserInfo,
  AuditLogEntry,
  BackupPayload,
  CartItem,
  ContactInfo,
  Order,
  OrderStatus,
  Product,
  ProductStatus,
  StorefrontData,
} from '../types.ts';

const CART_STORAGE_KEY = 'moco_cart_v1';
const STOREFRONT_CACHE_KEY = 'moco_storefront_cache_v1';

export class ApiError extends Error {
  status: number;
  retryAfterSeconds?: number;
  remainingAttempts?: number;
  prototypeTotpCode?: string;

  constructor(
    message: string,
    status: number,
    extra?: {
      retryAfterSeconds?: number;
      remainingAttempts?: number;
      prototypeTotpCode?: string;
    }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfterSeconds = extra?.retryAfterSeconds;
    this.remainingAttempts = extra?.remainingAttempts;
    this.prototypeTotpCode = extra?.prototypeTotpCode;
  }
}

export const FALLBACK_STOREFRONT: StorefrontData = {
  contact: {
    whatsappNumber: '0812 8311 5852',
    whatsappLink: 'https://wa.me/6281283115852',
    instagramUsername: '@muhammad.syauqal',
    instagramLink: 'https://www.instagram.com/muhammad.syauqal/',
  },
  products: [
    {
      id: 'mango',
      name: 'Mango Cream',
      tag: 'Best Seller',
      description: 'Mochi lembut dengan isian buah mangga segar dan cream yang halus.',
      price: 10000,
      image: MOCO_IMAGES.products.mango,
      status: 'Tersedia',
      featured: true,
    },
    {
      id: 'strawberry',
      name: 'Strawberry Cream',
      tag: 'Best Seller',
      description: 'Perpaduan cream lembut dan rasa strawberry yang manis serta menyegarkan.',
      price: 10000,
      image: MOCO_IMAGES.products.strawberry,
      status: 'Tersedia',
      featured: true,
    },
    {
      id: 'matcha',
      name: 'Matcha',
      tag: 'Japanese Taste',
      description: 'Mochi dengan cita rasa teh hijau khas Jepang yang harum dan seimbang.',
      price: 10000,
      image: MOCO_IMAGES.products.matcha,
      status: 'Tersedia',
      featured: false,
    },
    {
      id: 'vanilla',
      name: 'Vanilla',
      tag: 'Classic',
      description: 'Isian cream vanilla yang lembut, ringan, dan manis untuk teman santai.',
      price: 10000,
      image: MOCO_IMAGES.products.vanilla,
      status: 'Tersedia',
      featured: false,
    },
    {
      id: 'redbean',
      name: 'Red Bean',
      tag: 'Traditional',
      description: 'Mochi klasik dengan isian pasta kacang merah manis khas dessert Jepang.',
      price: 10000,
      image: MOCO_IMAGES.products.redbean,
      status: 'Tersedia',
      featured: false,
    },
  ],
};

// LocalStorage helpers for Customer Cart & Public Storefront Cache
export function loadCartFromStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is CartItem =>
          Boolean(item) &&
          typeof (item as CartItem).productId === 'string' &&
          Number.isInteger((item as CartItem).quantity) &&
          (item as CartItem).quantity > 0
      )
      .map((item) => ({
        productId: item.productId,
        quantity: Math.min(99, item.quantity),
      }));
  } catch {
    return [];
  }
}

export function saveCartToStorage(cart: CartItem[]): void {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Ignore storage quota issues gracefully
  }
}

export function loadCachedStorefront(): StorefrontData {
  try {
    const raw = window.localStorage.getItem(STOREFRONT_CACHE_KEY);
    if (!raw) return FALLBACK_STOREFRONT;
    const parsed = JSON.parse(raw) as StorefrontData;
    if (parsed && Array.isArray(parsed.products) && parsed.contact) {
      return parsed;
    }
  } catch {
    // Fall back safely
  }
  return FALLBACK_STOREFRONT;
}

export function saveCachedStorefront(data: StorefrontData): void {
  try {
    window.localStorage.setItem(STOREFRONT_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota issues gracefully
  }
}

async function requestJson<T>(
  url: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'MocoApp',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(
      typeof data.error === 'string' ? data.error : 'Terjadi kesalahan pada server.',
      res.status,
      {
        retryAfterSeconds:
          typeof data.retryAfterSeconds === 'number' ? data.retryAfterSeconds : undefined,
        remainingAttempts:
          typeof data.remainingAttempts === 'number' ? data.remainingAttempts : undefined,
        prototypeTotpCode:
          typeof data.prototypeTotpCode === 'string' ? data.prototypeTotpCode : undefined,
      }
    );
  }

  return data as T;
}

// =========================================================================
// PUBLIC API
// =========================================================================

export async function fetchStorefront(): Promise<StorefrontData> {
  const data = await requestJson<StorefrontData>('/api/storefront');
  saveCachedStorefront(data);
  return data;
}

export async function createCustomerOrder(
  items: CartItem[],
  customerNote?: string
): Promise<Order> {
  const data = await requestJson<{ order: Order }>('/api/orders', {
    method: 'POST',
    body: JSON.stringify({ items, customerNote }),
  });
  return data.order;
}

// =========================================================================
// ADMIN AUTH API
// =========================================================================

export interface LoginStep1Response {
  mfaRequired: boolean;
  challengeToken: string;
  expiresInSeconds: number;
  mode: 'production' | 'prototype';
  prototypeTotpCode?: string;
}

export async function adminLoginStep1(
  username: string,
  password: string
): Promise<LoginStep1Response> {
  return requestJson<LoginStep1Response>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function adminVerifyMfa(
  challengeToken: string,
  code: string
): Promise<{ token: string; user: AdminUserInfo }> {
  return requestJson<{ token: string; user: AdminUserInfo }>('/api/auth/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ challengeToken, code }),
  });
}

export async function adminLogout(token: string): Promise<void> {
  await requestJson<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }, token);
}

export async function adminChangePassword(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean; isDefaultPassword: boolean }> {
  return requestJson(
    '/api/auth/change-password',
    {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    },
    token
  );
}

// =========================================================================
// PROTECTED ADMIN DATA API
// =========================================================================

export async function fetchAdminDashboard(token: string): Promise<AdminOverviewStats> {
  const data = await requestJson<{ stats: AdminOverviewStats }>(
    '/api/admin/dashboard',
    {},
    token
  );
  return data.stats;
}

export async function fetchAdminProducts(token: string): Promise<Product[]> {
  const data = await requestJson<{ products: Product[] }>('/api/admin/products', {}, token);
  return data.products;
}

export interface ProductPayload {
  name: string;
  tag: string;
  description: string;
  price: number;
  image: string;
  status: ProductStatus;
  featured: boolean;
}

export async function createAdminProduct(
  token: string,
  payload: ProductPayload
): Promise<Product> {
  const data = await requestJson<{ product: Product }>(
    '/api/admin/products',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token
  );
  return data.product;
}

export async function updateAdminProduct(
  token: string,
  id: string,
  payload: ProductPayload
): Promise<Product> {
  const data = await requestJson<{ product: Product }>(
    `/api/admin/products/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    token
  );
  return data.product;
}

export async function deleteAdminProduct(token: string, id: string): Promise<void> {
  await requestJson<{ ok: boolean }>(
    `/api/admin/products/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    token
  );
}

export async function fetchAdminOrders(token: string): Promise<Order[]> {
  const data = await requestJson<{ orders: Order[] }>('/api/admin/orders', {}, token);
  return data.orders;
}

export async function updateAdminOrderStatus(
  token: string,
  orderId: string,
  status: OrderStatus
): Promise<Order> {
  const data = await requestJson<{ order: Order }>(
    `/api/admin/orders/${encodeURIComponent(orderId)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
    token
  );
  return data.order;
}

export async function updateAdminContact(
  token: string,
  contact: ContactInfo
): Promise<ContactInfo> {
  const data = await requestJson<{ contact: ContactInfo }>(
    '/api/admin/contact',
    {
      method: 'PUT',
      body: JSON.stringify(contact),
    },
    token
  );
  return data.contact;
}

export async function fetchAdminAuditLogs(
  token: string
): Promise<{ logs: AuditLogEntry[]; retentionDays: number }> {
  return requestJson<{ logs: AuditLogEntry[]; retentionDays: number }>(
    '/api/admin/audit-logs',
    {},
    token
  );
}

export interface MfaSetupInfo {
  enabled: boolean;
  issuer: string;
  accountName: string;
  otpAuthUri: string;
  secretMasked: string;
  secretForPrototype?: string;
}

export async function fetchAdminMfaSetup(token: string): Promise<MfaSetupInfo> {
  return requestJson<MfaSetupInfo>('/api/admin/mfa-setup', {}, token);
}

export async function exportAdminBackup(token: string): Promise<BackupPayload> {
  const data = await requestJson<{ backup: BackupPayload }>('/api/admin/backup', {}, token);
  return data.backup;
}

export async function restoreAdminBackup(
  token: string,
  backup: BackupPayload
): Promise<{ ok: boolean; restoredProducts: number; restoredOrders: number }> {
  return requestJson(
    '/api/admin/restore',
    {
      method: 'POST',
      body: JSON.stringify({ backup }),
    },
    token
  );
}
