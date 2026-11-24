import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import type {
  AdminOverviewStats,
  BackupPayload,
  Order,
  OrderItem,
  OrderStatus,
  Product,
} from './src/types.ts';
import {
  sanitizePlainText,
  validateContactInput,
  validateProductInput,
} from './src/utils/format.ts';
import {
  buildOtpAuthUri,
  checkAuthRateLimit,
  checkOrderRateLimit,
  clearAuthFailures,
  generateTotpCode,
  getClientIp,
  hashPassword,
  recordAuthFailure,
  securityHeadersMiddleware,
  verifyPassword,
  verifyTotpCode,
} from './server/security.ts';
import {
  ALLOWED_ORDER_STATUSES,
  appendAuditLog,
  createBackupPayload,
  loadStore,
  saveStore,
} from './server/store.ts';

dotenv.config();

const PORT = 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

interface PendingMfaChallenge {
  username: string;
  ip: string;
  expiresAt: number;
}

interface AdminSession {
  token: string;
  username: string;
  role: 'admin';
  ip: string;
  createdAt: number;
  expiresAt: number;
}

const pendingChallenges = new Map<string, PendingMfaChallenge>();
const activeSessions = new Map<string, AdminSession>();
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const MFA_CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cleanupExpiredAuthState(): void {
  const now = Date.now();
  for (const [key, challenge] of pendingChallenges.entries()) {
    if (challenge.expiresAt <= now) pendingChallenges.delete(key);
  }
  for (const [token, session] of activeSessions.entries()) {
    if (session.expiresAt <= now) activeSessions.delete(token);
  }
}

interface AuthenticatedRequest extends Request {
  adminSession?: AdminSession;
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  cleanupExpiredAuthState();
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Autentikasi admin diperlukan.' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const session = activeSessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    if (session) activeSessions.delete(token);
    res.status(401).json({ error: 'Sesi admin tidak valid atau telah berakhir. Silakan login kembali.' });
    return;
  }

  req.adminSession = session;
  next();
}

function createOrderId(): string {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randPart = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `MOCO-${datePart}-${randPart}`;
}

async function startServer(): Promise<void> {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(securityHeadersMiddleware);
  app.use(express.json({ limit: '3mb' }));

  // Ensure initial store is ready at boot
  loadStore();

  // =========================================================================
  // PUBLIC CUSTOMER STOREFRONT API
  // =========================================================================

  app.get('/api/storefront', (_req: Request, res: Response) => {
    const store = loadStore();
    res.json({
      products: store.products,
      contact: store.contact,
    });
  });

  app.post('/api/orders', (req: Request, res: Response) => {
    const ip = getClientIp(req);
    const rate = checkOrderRateLimit(ip);
    if (!rate.allowed) {
      res.status(429).json({
        error: `Terlalu banyak permintaan pesanan. Silakan coba lagi dalam ${rate.retryAfterSeconds} detik.`,
        retryAfterSeconds: rate.retryAfterSeconds,
      });
      return;
    }

    const body = req.body as {
      items?: Array<{ productId?: unknown; quantity?: unknown }>;
      customerNote?: unknown;
    };

    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      res.status(400).json({ error: 'Keranjang pesanan tidak boleh kosong.' });
      return;
    }
    if (body.items.length > 30) {
      res.status(400).json({ error: 'Jumlah jenis item dalam satu pesanan melebihi batas.' });
      return;
    }

    const store = loadStore();
    const orderItems: OrderItem[] = [];

    for (const rawItem of body.items) {
      if (typeof rawItem?.productId !== 'string') {
        res.status(400).json({ error: 'ID produk tidak valid.' });
        return;
      }
      const qty = Number(rawItem.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
        res.status(400).json({ error: 'Jumlah produk harus bilangan bulat antara 1 dan 99.' });
        return;
      }

      const product = store.products.find((p) => p.id === rawItem.productId);
      if (!product) {
        res.status(404).json({ error: 'Salah satu produk di keranjang tidak ditemukan.' });
        return;
      }
      if (product.status !== 'Tersedia') {
        res.status(400).json({ error: `Produk "${product.name}" sedang tidak tersedia.` });
        return;
      }

      // Always calculate prices on server, never trust client prices
      const subtotal = product.price * qty;
      orderItems.push({
        productId: product.id,
        name: product.name,
        unitPrice: product.price,
        quantity: qty,
        subtotal,
      });
    }

    const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const customerNote =
      typeof body.customerNote === 'string'
        ? sanitizePlainText(body.customerNote, 200)
        : undefined;

    const newOrder: Order = {
      id: createOrderId(),
      createdAt: new Date().toISOString(),
      items: orderItems,
      totalItems,
      totalPrice,
      status: 'Menunggu Konfirmasi',
      customerNote: customerNote || undefined,
      channel: 'WhatsApp',
    };

    store.orders = [newOrder, ...store.orders];
    saveStore(store);

    appendAuditLog({
      actor: 'customer',
      action: 'ORDER_CREATED',
      target: newOrder.id,
      detail: `Pesanan baru dicatat (${totalItems} item, Rp${totalPrice.toLocaleString('id-ID')}) menunggu konfirmasi WhatsApp.`,
      ip,
      severity: 'info',
    });

    res.status(201).json({ order: newOrder });
  });

  // =========================================================================
  // ADMIN AUTHENTICATION (PASSWORD HASH + RATE LIMIT + MFA TOTP)
  // =========================================================================

  app.post('/api/auth/login', (req: Request, res: Response) => {
    cleanupExpiredAuthState();
    const ip = getClientIp(req);
    const body = req.body as { username?: unknown; password?: unknown };

    const username =
      typeof body?.username === 'string' ? sanitizePlainText(body.username, 50) : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!username || !password || password.length > 128) {
      res.status(400).json({ error: 'Username dan password wajib diisi dengan format valid.' });
      return;
    }

    const rateKey = `login:${ip}:${username.toLowerCase()}`;
    const rateCheck = checkAuthRateLimit(rateKey);
    if (!rateCheck.allowed) {
      appendAuditLog({
        actor: username,
        action: 'LOGIN_BLOCKED_RATE_LIMIT',
        target: 'admin-auth',
        detail: `Percobaan login diblokir sementara (${rateCheck.retryAfterSeconds}s tersisa).`,
        ip,
        severity: 'warning',
      });
      res.status(429).json({
        error: `Terlalu banyak percobaan login gagal. Akun dikunci sementara selama ${rateCheck.retryAfterSeconds} detik.`,
        retryAfterSeconds: rateCheck.retryAfterSeconds,
      });
      return;
    }

    const store = loadStore();
    const isUsernameMatch =
      username.length === store.admin.username.length &&
      crypto.timingSafeEqual(
        Buffer.from(username, 'utf8'),
        Buffer.from(store.admin.username, 'utf8')
      );
    const isPasswordMatch = verifyPassword(password, store.admin.passwordHash);

    if (!isUsernameMatch || !isPasswordMatch) {
      const failState = recordAuthFailure(rateKey);
      appendAuditLog({
        actor: username,
        action: failState.locked ? 'LOGIN_LOCKED' : 'LOGIN_FAILED',
        target: 'admin-auth',
        detail: failState.locked
          ? `Akun terkunci sementara ${failState.retryAfterSeconds} detik setelah beberapa percobaan gagal.`
          : `Login gagal. Sisa percobaan: ${failState.remainingAttempts}.`,
        ip,
        severity: failState.locked ? 'critical' : 'warning',
      });

      if (failState.locked) {
        res.status(429).json({
          error: `Terlalu banyak percobaan gagal. Silakan tunggu ${failState.retryAfterSeconds} detik sebelum mencoba kembali.`,
          retryAfterSeconds: failState.retryAfterSeconds,
        });
        return;
      }

      res.status(401).json({
        error: `Username atau password salah. Sisa percobaan sebelum jeda penguncian: ${failState.remainingAttempts}.`,
        remainingAttempts: failState.remainingAttempts,
      });
      return;
    }

    // Step 1 passed -> Issue MFA Challenge
    const challengeToken = crypto.randomBytes(32).toString('hex');
    pendingChallenges.set(challengeToken, {
      username: store.admin.username,
      ip,
      expiresAt: Date.now() + MFA_CHALLENGE_TTL_MS,
    });

    appendAuditLog({
      actor: store.admin.username,
      action: 'LOGIN_PASSWORD_VERIFIED',
      target: 'admin-auth',
      detail: 'Password terverifikasi. Menunggu verifikasi kode MFA 6 digit.',
      ip,
      severity: 'info',
    });

    const responsePayload: Record<string, unknown> = {
      mfaRequired: true,
      challengeToken,
      expiresInSeconds: Math.floor(MFA_CHALLENGE_TTL_MS / 1000),
      mode: IS_PRODUCTION ? 'production' : 'prototype',
    };

    // In prototype/dev preview only, provide the live TOTP code so testers can complete MFA
    // without pairing an external mobile authenticator first.
    if (!IS_PRODUCTION) {
      responsePayload.prototypeTotpCode = generateTotpCode(store.admin.mfaSecret);
    }

    res.json(responsePayload);
  });

  app.post('/api/auth/mfa/verify', (req: Request, res: Response) => {
    cleanupExpiredAuthState();
    const ip = getClientIp(req);
    const body = req.body as { challengeToken?: unknown; code?: unknown };

    const challengeToken = typeof body?.challengeToken === 'string' ? body.challengeToken.trim() : '';
    const code = typeof body?.code === 'string' ? body.code.trim() : '';

    if (!challengeToken || !/^\d{6}$/.test(code)) {
      res.status(400).json({ error: 'Kode MFA harus berupa 6 digit angka.' });
      return;
    }

    const challenge = pendingChallenges.get(challengeToken);
    if (!challenge || challenge.expiresAt <= Date.now()) {
      pendingChallenges.delete(challengeToken);
      res.status(401).json({ error: 'Sesi verifikasi MFA telah kedaluwarsa. Silakan login ulang.' });
      return;
    }

    const rateKey = `login:${ip}:${challenge.username.toLowerCase()}`;
    const rateCheck = checkAuthRateLimit(rateKey);
    if (!rateCheck.allowed) {
      pendingChallenges.delete(challengeToken);
      res.status(429).json({
        error: `Terlalu banyak percobaan gagal. Silakan tunggu ${rateCheck.retryAfterSeconds} detik.`,
        retryAfterSeconds: rateCheck.retryAfterSeconds,
      });
      return;
    }

    const store = loadStore();
    const verification = verifyTotpCode(store.admin.mfaSecret, code, store.admin.lastTotpStep);

    if (!verification.valid) {
      const failState = recordAuthFailure(rateKey);
      appendAuditLog({
        actor: challenge.username,
        action: 'MFA_FAILED',
        target: 'admin-auth',
        detail: `Kode MFA tidak valid. Sisa percobaan: ${failState.remainingAttempts}.`,
        ip,
        severity: failState.locked ? 'critical' : 'warning',
      });

      if (failState.locked) {
        pendingChallenges.delete(challengeToken);
        res.status(429).json({
          error: `Akun dikunci sementara selama ${failState.retryAfterSeconds} detik karena kegagalan verifikasi MFA berulang.`,
          retryAfterSeconds: failState.retryAfterSeconds,
        });
        return;
      }

      res.status(401).json({
        error: `Kode MFA salah atau sudah digunakan. Sisa percobaan: ${failState.remainingAttempts}.`,
        remainingAttempts: failState.remainingAttempts,
        ...(IS_PRODUCTION ? {} : { prototypeTotpCode: generateTotpCode(store.admin.mfaSecret) }),
      });
      return;
    }

    // Success: consume challenge, clear rate limits, record TOTP step, issue session token
    pendingChallenges.delete(challengeToken);
    clearAuthFailures(rateKey);
    store.admin.lastTotpStep = verification.matchedStep;
    saveStore(store);

    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    activeSessions.set(token, {
      token,
      username: store.admin.username,
      role: 'admin',
      ip,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
    });

    appendAuditLog({
      actor: store.admin.username,
      action: 'LOGIN_SUCCESS',
      target: 'admin-dashboard',
      detail: 'Admin berhasil login dengan verifikasi Password + MFA TOTP.',
      ip,
      severity: 'info',
    });

    res.json({
      token,
      user: {
        username: store.admin.username,
        role: 'admin',
        mfaEnabled: store.admin.mfaEnabled,
        isDefaultPassword: store.admin.isDefaultPassword,
        environment: IS_PRODUCTION ? 'production' : 'development',
      },
    });
  });

  app.post('/api/auth/logout', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const session = req.adminSession!;
    activeSessions.delete(session.token);
    appendAuditLog({
      actor: session.username,
      action: 'LOGOUT',
      target: 'admin-auth',
      detail: 'Sesi admin diakhiri secara aman melalui tombol Logout.',
      ip: getClientIp(req),
      severity: 'info',
    });
    res.json({ ok: true });
  });

  app.get('/api/auth/me', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const store = loadStore();
    res.json({
      user: {
        username: req.adminSession!.username,
        role: 'admin',
        mfaEnabled: store.admin.mfaEnabled,
        isDefaultPassword: store.admin.isDefaultPassword,
        environment: IS_PRODUCTION ? 'production' : 'development',
      },
    });
  });

  app.post('/api/auth/change-password', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const ip = getClientIp(req);
    const body = req.body as { currentPassword?: unknown; newPassword?: unknown };
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

    if (newPassword.length < 8 || newPassword.length > 128) {
      res.status(400).json({ error: 'Password baru minimal 8 karakter.' });
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      res.status(400).json({ error: 'Password baru harus mengandung kombinasi huruf dan angka.' });
      return;
    }

    const store = loadStore();
    if (!verifyPassword(currentPassword, store.admin.passwordHash)) {
      appendAuditLog({
        actor: req.adminSession!.username,
        action: 'PASSWORD_CHANGE_FAILED',
        target: 'admin-auth',
        detail: 'Percobaan ganti password gagal karena password saat ini tidak sesuai.',
        ip,
        severity: 'warning',
      });
      res.status(401).json({ error: 'Password saat ini salah.' });
      return;
    }

    store.admin.passwordHash = hashPassword(newPassword);
    store.admin.isDefaultPassword = false;
    store.admin.updatedAt = new Date().toISOString();
    saveStore(store);

    appendAuditLog({
      actor: req.adminSession!.username,
      action: 'PASSWORD_CHANGED',
      target: 'admin-auth',
      detail: 'Password admin berhasil diperbarui menggunakan hash scrypt tersalt.',
      ip,
      severity: 'critical',
    });

    res.json({ ok: true, isDefaultPassword: false });
  });

  // =========================================================================
  // PROTECTED ADMIN DASHBOARD API
  // =========================================================================

  app.get('/api/admin/dashboard', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    const store = loadStore();
    const activeOrders = store.orders.filter((o) => o.status !== 'Dibatalkan');
    const stats: AdminOverviewStats = {
      totalProducts: store.products.length,
      availableProducts: store.products.filter((p) => p.status === 'Tersedia').length,
      totalOrders: store.orders.length,
      totalItemsSold: activeOrders.reduce((sum, o) => sum + o.totalItems, 0),
      totalOrderValue: activeOrders.reduce((sum, o) => sum + o.totalPrice, 0),
      pendingOrders: store.orders.filter((o) => o.status === 'Menunggu Konfirmasi').length,
      recentOrders: store.orders.slice(0, 8),
    };
    res.json({ stats });
  });

  app.get('/api/admin/products', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    const store = loadStore();
    res.json({ products: store.products });
  });

  app.post('/api/admin/products', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const validation = validateProductInput(req.body);
    if (!validation.valid || !validation.data) {
      res.status(400).json({ error: validation.error || 'Data produk tidak valid.' });
      return;
    }

    const store = loadStore();
    const now = new Date().toISOString();
    const slugBase = validation.data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 28);
    const id = `${slugBase || 'mochi'}-${crypto.randomBytes(2).toString('hex')}`;

    const product: Product = {
      id,
      ...validation.data,
      createdAt: now,
      updatedAt: now,
    };

    store.products = [...store.products, product];
    saveStore(store);

    appendAuditLog({
      actor: req.adminSession!.username,
      action: 'PRODUCT_CREATED',
      target: product.id,
      detail: `Menambahkan produk "${product.name}" (Rp${product.price.toLocaleString('id-ID')}, ${product.status}).`,
      ip: getClientIp(req),
      severity: 'info',
    });

    res.status(201).json({ product });
  });

  app.put('/api/admin/products/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const productId = sanitizePlainText(String(req.params.id ?? ''), 60);
    const validation = validateProductInput(req.body);
    if (!validation.valid || !validation.data) {
      res.status(400).json({ error: validation.error || 'Data produk tidak valid.' });
      return;
    }

    const store = loadStore();
    const idx = store.products.findIndex((p) => p.id === productId);
    if (idx === -1) {
      res.status(404).json({ error: 'Produk tidak ditemukan.' });
      return;
    }

    const updated: Product = {
      ...store.products[idx],
      ...validation.data,
      updatedAt: new Date().toISOString(),
    };
    store.products[idx] = updated;
    saveStore(store);

    appendAuditLog({
      actor: req.adminSession!.username,
      action: 'PRODUCT_UPDATED',
      target: updated.id,
      detail: `Memperbarui produk "${updated.name}" (Rp${updated.price.toLocaleString('id-ID')}, ${updated.status}).`,
      ip: getClientIp(req),
      severity: 'info',
    });

    res.json({ product: updated });
  });

  app.delete('/api/admin/products/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const productId = sanitizePlainText(String(req.params.id ?? ''), 60);
    const store = loadStore();
    const target = store.products.find((p) => p.id === productId);
    if (!target) {
      res.status(404).json({ error: 'Produk tidak ditemukan.' });
      return;
    }

    store.products = store.products.filter((p) => p.id !== productId);
    saveStore(store);

    appendAuditLog({
      actor: req.adminSession!.username,
      action: 'PRODUCT_DELETED',
      target: productId,
      detail: `Menghapus produk "${target.name}" dari katalog.`,
      ip: getClientIp(req),
      severity: 'warning',
    });

    res.json({ ok: true });
  });

  app.get('/api/admin/orders', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    const store = loadStore();
    res.json({ orders: store.orders });
  });

  app.patch(
    '/api/admin/orders/:id/status',
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const orderId = sanitizePlainText(String(req.params.id ?? ''), 60);
      const nextStatus = (req.body as { status?: unknown })?.status as OrderStatus;

      if (!ALLOWED_ORDER_STATUSES.includes(nextStatus)) {
        res.status(400).json({ error: 'Status pesanan tidak valid.' });
        return;
      }

      const store = loadStore();
      const idx = store.orders.findIndex((o) => o.id === orderId);
      if (idx === -1) {
        res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
        return;
      }

      const prevStatus = store.orders[idx].status;
      store.orders[idx] = { ...store.orders[idx], status: nextStatus };
      saveStore(store);

      appendAuditLog({
        actor: req.adminSession!.username,
        action: 'ORDER_STATUS_UPDATED',
        target: orderId,
        detail: `Status pesanan diubah dari "${prevStatus}" menjadi "${nextStatus}".`,
        ip: getClientIp(req),
        severity: 'info',
      });

      res.json({ order: store.orders[idx] });
    }
  );

  app.get('/api/admin/contact', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    const store = loadStore();
    res.json({ contact: store.contact });
  });

  app.put('/api/admin/contact', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const validation = validateContactInput(req.body);
    if (!validation.valid || !validation.data) {
      res.status(400).json({ error: validation.error || 'Data kontak tidak valid.' });
      return;
    }

    const store = loadStore();
    store.contact = validation.data;
    saveStore(store);

    appendAuditLog({
      actor: req.adminSession!.username,
      action: 'CONTACT_UPDATED',
      target: 'contact-settings',
      detail: `Informasi kontak diperbarui (WA: ${store.contact.whatsappNumber}, IG: ${store.contact.instagramUsername}).`,
      ip: getClientIp(req),
      severity: 'info',
    });

    res.json({ contact: store.contact });
  });

  app.get('/api/admin/audit-logs', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    const store = loadStore();
    res.json({
      logs: store.auditLogs,
      retentionDays: 90,
    });
  });

  app.get('/api/admin/mfa-setup', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    const store = loadStore();
    res.json({
      enabled: store.admin.mfaEnabled,
      issuer: 'Moco Mochi Admin',
      accountName: store.admin.username,
      otpAuthUri: buildOtpAuthUri(store.admin.username, store.admin.mfaSecret),
      secretMasked: `${store.admin.mfaSecret.slice(0, 4)}••••••${store.admin.mfaSecret.slice(-4)}`,
      ...(IS_PRODUCTION ? {} : { secretForPrototype: store.admin.mfaSecret }),
    });
  });

  app.get('/api/admin/backup', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const backup = createBackupPayload();
    appendAuditLog({
      actor: req.adminSession!.username,
      action: 'BACKUP_EXPORTED',
      target: 'store-backup',
      detail: `Mengekspor cadangan data (${backup.products.length} produk, ${backup.orders.length} pesanan).`,
      ip: getClientIp(req),
      severity: 'info',
    });
    res.json({ backup });
  });

  app.post('/api/admin/restore', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const payload = (req.body as { backup?: BackupPayload })?.backup;
    if (!payload || !Array.isArray(payload.products) || !Array.isArray(payload.orders) || !payload.contact) {
      res.status(400).json({ error: 'Format file backup tidak valid.' });
      return;
    }

    const contactCheck = validateContactInput(payload.contact);
    if (!contactCheck.valid || !contactCheck.data) {
      res.status(400).json({ error: `Data kontak pada backup tidak valid: ${contactCheck.error}` });
      return;
    }

    const validatedProducts: Product[] = [];
    for (const p of payload.products) {
      const check = validateProductInput(p);
      if (!check.valid || !check.data) {
        res.status(400).json({ error: `Produk pada backup tidak valid: ${check.error}` });
        return;
      }
      validatedProducts.push({
        id: sanitizePlainText(String(p.id || ''), 60) || `mochi-${crypto.randomBytes(2).toString('hex')}`,
        ...check.data,
        createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const validatedOrders: Order[] = [];
    for (const o of payload.orders) {
      if (!o || typeof o.id !== 'string' || !Array.isArray(o.items)) {
        res.status(400).json({ error: 'Struktur pesanan pada backup tidak valid.' });
        return;
      }
      const status: OrderStatus = ALLOWED_ORDER_STATUSES.includes(o.status)
        ? o.status
        : 'Menunggu Konfirmasi';
      const items: OrderItem[] = o.items.map((item) => ({
        productId: sanitizePlainText(String(item.productId || ''), 60),
        name: sanitizePlainText(String(item.name || ''), 80),
        unitPrice: Math.max(0, Math.round(Number(item.unitPrice) || 0)),
        quantity: Math.max(1, Math.min(99, Math.round(Number(item.quantity) || 1))),
        subtotal: Math.max(0, Math.round(Number(item.subtotal) || 0)),
      }));
      validatedOrders.push({
        id: sanitizePlainText(o.id, 60),
        createdAt: typeof o.createdAt === 'string' ? o.createdAt : new Date().toISOString(),
        items,
        totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
        totalPrice: items.reduce((sum, item) => sum + item.subtotal, 0),
        status,
        customerNote: typeof o.customerNote === 'string' ? sanitizePlainText(o.customerNote, 200) : undefined,
        channel: 'WhatsApp',
      });
    }

    const store = loadStore();
    store.products = validatedProducts;
    store.orders = validatedOrders;
    store.contact = contactCheck.data;
    saveStore(store);

    appendAuditLog({
      actor: req.adminSession!.username,
      action: 'BACKUP_RESTORED',
      target: 'store-restore',
      detail: `Memulihkan data dari backup (${validatedProducts.length} produk, ${validatedOrders.length} pesanan).`,
      ip: getClientIp(req),
      severity: 'critical',
    });

    res.json({
      ok: true,
      restoredProducts: validatedProducts.length,
      restoredOrders: validatedOrders.length,
    });
  });

  // Return clean 404 JSON for unknown /api/* routes
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
  });

  // =========================================================================
  // VITE MIDDLEWARE (DEV) OR STATIC BUILD SERVING (PROD)
  // =========================================================================
  const distDir = path.resolve(process.cwd(), 'dist');
  if (IS_PRODUCTION && fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Moco server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Moco server:', err);
  process.exit(1);
});
