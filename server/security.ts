/**
 * সার্ভার-সাইড নিরাপত্তা: লগইন, সেশন কুকি, পাসওয়ার্ড হ্যাশ, দুই ধাপের কোড (TOTP), রেট-লিমিট, ইনপুট পরিষ্কার।
 *
 * প্রয়োজনীয় environment variable:
 *   ADMIN_PASSWORD       - মূল প্রশাসকের পাসওয়ার্ড (লম্বা রাখুন)
 *   DATA_ENCRYPTION_KEY  - (প্রস্তাবিত) ৩২+ অক্ষর; নাম/ফোন/অভিযোগ এনক্রিপ্ট করতে (দেখুন server/crypto.ts)
 *   RESET_ADMIN_2FA=true - (জরুরি) অ্যাপ হারালে দুই ধাপের লগইন সাময়িক বন্ধ করতে; কাজ শেষে মুছে ফেলুন
 * সেশন এখন ডেটাবেসে থাকে (লগআউট করলে সঙ্গে সঙ্গে বাতিল); SESSION_SECRET আর লাগে না।
 * ADMIN_PASSWORD না থাকলে অ্যাডমিন লগইন বন্ধ থাকবে (নিরাপদ ডিফল্ট)।
 */
import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export const ADMIN_COOKIE = 'dhamti_admin';
export const SESSION_MS = 8 * 60 * 60 * 1000; // ৮ ঘণ্টা

export function isAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** মূল প্রশাসকের পাসওয়ার্ড (সার্ভারের environment variable-এর সাথে মেলানো) */
export function checkPassword(input: unknown): boolean {
  if (typeof input !== 'string' || !isAuthConfigured()) return false;
  return safeEqual(input, process.env.ADMIN_PASSWORD as string);
}

// ------------------------------------------------------------
// সহকারী অ্যাডমিনের পাসওয়ার্ড হ্যাশ (scrypt, প্রতিটির আলাদা salt)
// ------------------------------------------------------------
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  // stored না থাকলেও সমান সময় খরচ করি, যেন ব্যবহারকারী আছে কিনা সময় দেখে বোঝা না যায়
  const dummy = 'scrypt$AAAAAAAAAAAAAAAAAAAAAA$' + 'A'.repeat(86);
  const [scheme, saltB, hashB] = (stored || dummy).split('$');
  if (scheme !== 'scrypt' || !saltB || !hashB) return false;
  const expected = Buffer.from(hashB, 'base64url');
  const actual = crypto.scryptSync(password, Buffer.from(saltB, 'base64url'), expected.length, { N: 16384, r: 8, p: 1 });
  const ok = crypto.timingSafeEqual(actual, expected);
  return stored ? ok : false;
}

export function validNewPassword(p: unknown): p is string {
  return typeof p === 'string' && p.length >= 10 && p.length <= 100;
}

// ------------------------------------------------------------
// দুই ধাপের লগইন (TOTP, RFC 6238; Google Authenticator ইত্যাদির সাথে চলে)
// ------------------------------------------------------------
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str: string): Buffer {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of str.replace(/=+$/g, '').toUpperCase()) {
    const idx = B32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', secret).update(buf).digest();
  const offset = h[h.length - 1] & 0xf;
  const code = ((h[offset] & 0x7f) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | h[offset + 3];
  return String(code % 1_000_000).padStart(6, '0');
}

export function totpCodeAt(secretB32: string, timeMs: number): string {
  return hotp(base32Decode(secretB32), Math.floor(timeMs / 30000));
}

/** সঠিক হলে ব্যবহৃত কাউন্টার ফেরত দেয় (একই কোড দ্বিতীয়বার চলবে না), নইলে null */
export function totpVerify(secretB32: string, input: unknown, lastCounter: number, nowMs = Date.now()): number | null {
  if (typeof input !== 'string') return null;
  const code = input.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(code)) return null;
  const secret = base32Decode(secretB32);
  const current = Math.floor(nowMs / 30000);
  for (const delta of [0, -1, 1]) {
    const counter = current + delta;
    if (counter <= lastCounter) continue;
    if (safeEqual(hotp(secret, counter), code)) return counter;
  }
  return null;
}

export function totpUri(secretB32: string, account: string): string {
  const label = encodeURIComponent(`Dhamti Jonoseba:${account}`);
  return `otpauth://totp/${label}?secret=${secretB32}&issuer=${encodeURIComponent('Dhamti Jonoseba')}&digits=6&period=30`;
}

// ------------------------------------------------------------
// সেশন কুকি (মানটি এলোমেলো আইডি; ডেটাবেসে শুধু তার হ্যাশ থাকে)
// ------------------------------------------------------------
export function newSessionId(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashSessionId(id: string): string {
  return crypto.createHash('sha256').update(id).digest('hex');
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(idx + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function readSessionCookie(req: Request): string | undefined {
  const v = readCookie(req, ADMIN_COOKIE);
  return v && /^[A-Za-z0-9_-]{20,100}$/.test(v) ? v : undefined;
}

export function setAdminCookie(res: Response, sessionId: string): void {
  res.cookie(ADMIN_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL),
    maxAge: SESSION_MS,
    path: '/',
  });
}

export function clearAdminCookie(res: Response): void {
  res.clearCookie(ADMIN_COOKIE, { path: '/' });
}

/** অন্য সাইট থেকে আসা পরিবর্তনমূলক রিকোয়েস্ট আটকায় */
export function sameOriginOnly(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const origin = req.headers.origin;
  if (origin) {
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
    try {
      if (new URL(origin).host !== host) {
        return res.status(403).json({ error: 'অনুমোদিত নয়।' });
      }
    } catch {
      return res.status(403).json({ error: 'অনুমোদিত নয়।' });
    }
  }
  next();
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

// ------------------------------------------------------------
// রেট-লিমিট (মেমরিতে; একটি সার্ভার ইনস্ট্যান্সের জন্য কার্যকর। ফোন নম্বর ভিত্তিক সীমা ডেটাবেসে আলাদা)
// ------------------------------------------------------------
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function bump(key: string, windowMs: number): { bucket: Bucket; now: number } {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return { bucket, now };
}

export function rateLimit(name: string, max: number, windowMs: number, message: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { bucket, now } = bump(`${name}:${req.ip}`, windowMs);
    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

/** শুধু ব্যর্থ চেষ্টা গোনে (যেমন ভুল ট্র্যাকিং কোড অনুমান করা আটকাতে) */
export function failLimiter(name: string, max: number, windowMs: number) {
  return {
    blocked(req: Request): number {
      const b = buckets.get(`${name}:${req.ip}`);
      const now = Date.now();
      return b && b.resetAt > now && b.count >= max ? Math.ceil((b.resetAt - now) / 1000) : 0;
    },
    fail(req: Request) {
      bump(`${name}:${req.ip}`, windowMs);
    },
  };
}

// ------------------------------------------------------------
// ইনপুট পরিষ্কার করা
// ------------------------------------------------------------
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);
}

export function cleanPhone(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[^0-9+\s-]/g, '').trim().slice(0, 20);
}

/** ফোন মেলানোর জন্য শেষ ১০ অঙ্ক (+880 / 0 উপসর্গের পার্থক্য উপেক্ষা করে) */
export function phoneKey(value: string): string {
  return value.replace(/\D/g, '').slice(-10);
}

// ------------------------------------------------------------
// নাগরিকের ৪ অঙ্কের পিন (অভিযোগের অবস্থা দেখার চাবি)
// ------------------------------------------------------------
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** বাংলা/ইংরেজি অঙ্ক নিয়ে শুধু ইংরেজি অঙ্কের স্ট্রিং (স্পেস/চিহ্ন বাদ) */
export function cleanPin(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value)
    .replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)))
    .replace(/\D/g, '')
    .slice(0, 12);
}

export function isFourDigitPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/** ১১১১, ১২৩৪, ৪৩২১-এর মতো সহজে অনুমান করা পিন নেওয়া হয় না */
export function isWeakPin(pin: string): boolean {
  if (/^(\d)\1{3}$/.test(pin)) return true;
  const d = pin.split('').map(Number);
  const up = d.every((x, i) => i === 0 || x === d[i - 1] + 1);
  const down = d.every((x, i) => i === 0 || x === d[i - 1] - 1);
  return up || down || ['0000', '1212', '2580', '1122', '2000', '2001'].includes(pin);
}

export const hashPin = (pin: string): string => hashPassword(pin);
export const verifyPin = (pin: string, stored: string | null): boolean => verifyPassword(pin, stored);

export const ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
