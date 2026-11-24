import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { MOCO_IMAGES } from '../src/data/mocoImages.ts';
import type {
  AuditLogEntry,
  BackupPayload,
  ContactInfo,
  Order,
  OrderStatus,
  Product,
} from '../src/types.ts';
import { generateBase32Secret, hashPassword } from './security.ts';

export interface AdminAccountRecord {
  username: string;
  passwordHash: string;
  isDefaultPassword: boolean;
  mfaSecret: string;
  mfaEnabled: boolean;
  lastTotpStep?: number;
  updatedAt: string;
}

export interface StoreSchema {
  schemaVersion: number;
  admin: AdminAccountRecord;
  products: Product[];
  orders: Order[];
  contact: ContactInfo;
  auditLogs: AuditLogEntry[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.resolve(DATA_DIR, 'store.json');
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

// Precomputed salted scrypt hash for prototype testing account (admib).
// Override with process.env.ADMIN_USERNAME and process.env.ADMIN_PASSWORD in production.
const PROTOTYPE_ADMIN_USERNAME = 'admib';
const PROTOTYPE_ADMIN_PASSWORD_HASH =
  '1cdd136890f522893411c4145ddd9bdc:f08c5118432833abb64281883f0654d5cac1b1e7074a79985e45a612ea2ed26310fbe4eef2c5f330ea3bfa0cdd3bc80a57895f98a366599c35753767fde5294a';

export const DEFAULT_CONTACT: ContactInfo = {
  whatsappNumber: '0812 8311 5852',
  whatsappLink: 'https://wa.me/6281283115852',
  instagramUsername: '@muhammad.syauqal',
  instagramLink: 'https://www.instagram.com/muhammad.syauqal/',
};

export function createInitialProducts(): Product[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'mango',
      name: 'Mango Cream',
      tag: 'Best Seller',
      description: 'Mochi lembut dengan isian buah mangga segar dan cream yang halus.',
      price: 10000,
      image: MOCO_IMAGES.products.mango,
      status: 'Tersedia',
      featured: true,
      createdAt: now,
      updatedAt: now,
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
      createdAt: now,
      updatedAt: now,
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
      createdAt: now,
      updatedAt: now,
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
      createdAt: now,
      updatedAt: now,
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
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function createInitialStore(): StoreSchema {
  const envUser = process.env.ADMIN_USERNAME?.trim();
  const envPass = process.env.ADMIN_PASSWORD?.trim();
  const envMfa = process.env.ADMIN_MFA_SECRET?.trim();
  const now = new Date().toISOString();

  return {
    schemaVersion: 1,
    admin: {
      username: envUser || PROTOTYPE_ADMIN_USERNAME,
      passwordHash: envPass ? hashPassword(envPass) : PROTOTYPE_ADMIN_PASSWORD_HASH,
      isDefaultPassword: !envPass,
      mfaSecret: envMfa || generateBase32Secret(20),
      mfaEnabled: true,
      updatedAt: now,
    },
    products: createInitialProducts(),
    orders: [],
    contact: { ...DEFAULT_CONTACT },
    auditLogs: [
      {
        id: `LOG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        timestamp: now,
        actor: 'system',
        action: 'SYSTEM_INIT',
        target: 'store',
        detail: 'Inisialisasi katalog Moco dan kebijakan keamanan UMKM.',
        ip: '127.0.0.1',
        severity: 'info',
      },
    ],
  };
}

function ensureStoreDirectory(): void {
  if (!STORE_PATH.startsWith(DATA_DIR + path.sep)) {
    throw new Error('Invalid store file path');
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }
}

let cachedStore: StoreSchema | null = null;

function pruneExpiredLogs(logs: AuditLogEntry[]): AuditLogEntry[] {
  const cutoff = Date.now() - NINETY_DAYS_MS;
  return logs
    .filter((entry) => {
      const ts = new Date(entry.timestamp).getTime();
      return !Number.isNaN(ts) && ts >= cutoff;
    })
    .slice(0, 1000);
}

export function loadStore(): StoreSchema {
  if (cachedStore) {
    cachedStore.auditLogs = pruneExpiredLogs(cachedStore.auditLogs);
    return cachedStore;
  }

  ensureStoreDirectory();
  if (fs.existsSync(STORE_PATH)) {
    try {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as StoreSchema;
      if (parsed && Array.isArray(parsed.products) && parsed.admin && parsed.contact) {
        parsed.auditLogs = pruneExpiredLogs(parsed.auditLogs || []);
        // Always honor explicit env overrides when configured
        const envUser = process.env.ADMIN_USERNAME?.trim();
        const envPass = process.env.ADMIN_PASSWORD?.trim();
        const envMfa = process.env.ADMIN_MFA_SECRET?.trim();
        if (envUser) parsed.admin.username = envUser;
        if (envPass) {
          parsed.admin.passwordHash = hashPassword(envPass);
          parsed.admin.isDefaultPassword = false;
        }
        if (envMfa) parsed.admin.mfaSecret = envMfa;
        cachedStore = parsed;
        return cachedStore;
      }
    } catch {
      // Fall back to fresh initial store if corrupted
    }
  }

  cachedStore = createInitialStore();
  saveStore(cachedStore);
  return cachedStore;
}

export function saveStore(store: StoreSchema): void {
  ensureStoreDirectory();
  store.auditLogs = pruneExpiredLogs(store.auditLogs);
  cachedStore = store;
  const tempPath = `${STORE_PATH}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(store, null, 2), { mode: 0o600 });
  fs.renameSync(tempPath, STORE_PATH);
}

export function appendAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
  const store = loadStore();
  // Defensive redaction: never persist passwords, secrets, or tokens in logs
  const safeDetail = entry.detail
    .replace(/password\s*[:=]\s*\S+/gi, 'password=[REDACTED]')
    .replace(/token\s*[:=]\s*\S+/gi, 'token=[REDACTED]')
    .replace(/secret\s*[:=]\s*\S+/gi, 'secret=[REDACTED]')
    .slice(0, 300);

  const record: AuditLogEntry = {
    id: `LOG-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    timestamp: new Date().toISOString(),
    actor: entry.actor.slice(0, 50),
    action: entry.action.slice(0, 60),
    target: entry.target.slice(0, 80),
    detail: safeDetail,
    ip: entry.ip.slice(0, 64),
    severity: entry.severity,
  };

  store.auditLogs = [record, ...pruneExpiredLogs(store.auditLogs)].slice(0, 1000);
  saveStore(store);
  return record;
}

export function createBackupPayload(): BackupPayload {
  const store = loadStore();
  return {
    schemaVersion: store.schemaVersion,
    exportedAt: new Date().toISOString(),
    products: store.products,
    orders: store.orders,
    contact: store.contact,
    auditLogs: store.auditLogs,
  };
}

export const ALLOWED_ORDER_STATUSES: readonly OrderStatus[] = [
  'Menunggu Konfirmasi',
  'Diproses',
  'Selesai',
  'Dibatalkan',
] as const;
