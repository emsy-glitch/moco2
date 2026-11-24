import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function hashPassword(plainPassword: string, existingSalt?: string): string {
  const salt = existingSalt ?? crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  const actualBuf = crypto.scryptSync(plainPassword, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

export function generateBase32Secret(byteLength = 20): string {
  const bytes = crypto.randomBytes(byteLength);
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function decodeBase32(secret: string): Buffer {
  const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function getTotpStep(nowMs = Date.now(), periodSeconds = 30): number {
  return Math.floor(nowMs / 1000 / periodSeconds);
}

export function generateTotpCode(secret: string, step = getTotpStep()): string {
  const key = decodeBase32(secret);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = crypto.createHmac('sha1', key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
}

export function verifyTotpCode(
  secret: string,
  submittedCode: string,
  lastAcceptedStep?: number
): { valid: boolean; matchedStep?: number } {
  const normalized = submittedCode.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalized)) return { valid: false };
  const currentStep = getTotpStep();
  const submittedBuf = Buffer.from(normalized, 'utf8');

  for (const offset of [-1, 0, 1]) {
    const step = currentStep + offset;
    if (lastAcceptedStep !== undefined && step <= lastAcceptedStep) {
      continue;
    }
    const candidate = generateTotpCode(secret, step);
    const candidateBuf = Buffer.from(candidate, 'utf8');
    if (
      candidateBuf.length === submittedBuf.length &&
      crypto.timingSafeEqual(candidateBuf, submittedBuf)
    ) {
      return { valid: true, matchedStep: step };
    }
  }
  return { valid: false };
}

export function buildOtpAuthUri(username: string, secret: string): string {
  const issuer = encodeURIComponent('Moco Mochi Admin');
  const label = encodeURIComponent(`Moco Mochi Admin:${username}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

export interface RateLimitEntry {
  failures: number;
  firstFailureAt: number;
  lockedUntil: number;
  lockoutCount: number;
}

const authRateLimits = new Map<string, RateLimitEntry>();
const orderRateLimits = new Map<string, { count: number; windowStart: number }>();

const MAX_AUTH_FAILURES = 5;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const BASE_LOCKOUT_MS = 60 * 1000;
const MAX_LOCKOUT_MS = 15 * 60 * 1000;

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim().slice(0, 64);
  }
  return (req.socket.remoteAddress || 'unknown').slice(0, 64);
}

export function checkAuthRateLimit(key: string): {
  allowed: boolean;
  retryAfterSeconds: number;
  remainingAttempts: number;
} {
  const now = Date.now();
  const entry = authRateLimits.get(key);
  if (!entry) {
    return { allowed: true, retryAfterSeconds: 0, remainingAttempts: MAX_AUTH_FAILURES };
  }
  if (entry.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000),
      remainingAttempts: 0,
    };
  }
  if (now - entry.firstFailureAt > AUTH_WINDOW_MS) {
    authRateLimits.delete(key);
    return { allowed: true, retryAfterSeconds: 0, remainingAttempts: MAX_AUTH_FAILURES };
  }
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remainingAttempts: Math.max(0, MAX_AUTH_FAILURES - entry.failures),
  };
}

export function recordAuthFailure(key: string): {
  locked: boolean;
  retryAfterSeconds: number;
  remainingAttempts: number;
} {
  const now = Date.now();
  const existing = authRateLimits.get(key);
  let entry: RateLimitEntry;

  if (!existing || now - existing.firstFailureAt > AUTH_WINDOW_MS) {
    entry = {
      failures: 1,
      firstFailureAt: now,
      lockedUntil: 0,
      lockoutCount: existing?.lockoutCount ?? 0,
    };
  } else {
    entry = {
      ...existing,
      failures: existing.failures + 1,
    };
  }

  if (entry.failures >= MAX_AUTH_FAILURES) {
    const lockoutCount = entry.lockoutCount + 1;
    const duration = Math.min(MAX_LOCKOUT_MS, BASE_LOCKOUT_MS * Math.pow(2, lockoutCount - 1));
    entry.lockedUntil = now + duration;
    entry.lockoutCount = lockoutCount;
    entry.failures = 0;
    authRateLimits.set(key, entry);
    return {
      locked: true,
      retryAfterSeconds: Math.ceil(duration / 1000),
      remainingAttempts: 0,
    };
  }

  authRateLimits.set(key, entry);
  return {
    locked: false,
    retryAfterSeconds: 0,
    remainingAttempts: MAX_AUTH_FAILURES - entry.failures,
  };
}

export function clearAuthFailures(key: string): void {
  authRateLimits.delete(key);
}

export function checkOrderRateLimit(ip: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxOrders = 25;
  const current = orderRateLimits.get(ip);

  if (!current || now - current.windowStart > windowMs) {
    orderRateLimits.set(ip, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= maxOrders) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((windowMs - (now - current.windowStart)) / 1000),
    };
  }
  current.count += 1;
  orderRateLimits.set(ip, current);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function securityHeadersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}
