/**
 * সংবেদনশীল তথ্যের এনক্রিপশন (ডেটাবেসে নাম, ফোন, অভিযোগের লেখা)।
 *
 * - চাবি: environment variable `DATA_ENCRYPTION_KEY` (কমপক্ষে ৩২ অক্ষরের এলোমেলো লেখা)।
 * - পদ্ধতি: AES-256-GCM। সংরক্ষিত রূপ: `enc1:<iv>:<tag>:<ciphertext>` (সব base64url)।
 * - চাবি না থাকলে তথ্য আগের মতো সাধারণ লেখায় থাকে (সাইট বন্ধ হয় না), আর অ্যাডমিন প্যানেলে সতর্কতা দেখায়।
 * - সতর্কতা: চাবি হারালে বা বদলালে আগের এনক্রিপ্ট করা তথ্য আর পড়া যাবে না। চাবিটি নিরাপদ জায়গায়ও লিখে রাখুন।
 * - ফোন নম্বর দিয়ে খোঁজার জন্য "ব্লাইন্ড ইনডেক্স" (HMAC) আলাদা কলামে থাকে; আসল নম্বর তা থেকে বের করা যায় না।
 */
import crypto from 'node:crypto';

const PREFIX = 'enc1:';

type Keys = { enc: Buffer; index: Buffer } | null;
let cache: { raw: string; keys: Keys } | null = null;

function keys(): Keys {
  const raw = process.env.DATA_ENCRYPTION_KEY || '';
  if (cache && cache.raw === raw) return cache.keys;
  let k: Keys = null;
  if (raw.length >= 32) {
    const salt = Buffer.from('dhamti-jonoseba-v1');
    k = {
      enc: Buffer.from(crypto.hkdfSync('sha256', raw, salt, 'enc', 32)),
      index: Buffer.from(crypto.hkdfSync('sha256', raw, salt, 'phone-index', 32)),
    };
  }
  cache = { raw, keys: k };
  return k;
}

export function isEncryptionEnabled(): boolean {
  return keys() !== null;
}

export function isSealed(value: string): boolean {
  return value.startsWith(PREFIX);
}

/** এনক্রিপ্ট করে (চাবি না থাকলে হুবহু ফেরত দেয়)। ফাঁকা লেখা ফাঁকাই থাকে। */
export function seal(plain: string): string {
  const k = keys();
  if (!k || plain === '' || isSealed(plain)) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', k.enc, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64url')}:${tag.toString('base64url')}:${ct.toString('base64url')}`;
}

/** পড়ে। এনক্রিপ্ট করা না থাকলে হুবহু ফেরত। চাবি ভুল/হারানো হলে ফাঁকা লেখা (তথ্য ফাঁস হয় না)। */
export function unseal(value: string): string {
  if (!isSealed(value)) return value;
  const k = keys();
  if (!k) return '';
  try {
    const [ivB, tagB, ctB] = value.slice(PREFIX.length).split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', k.enc, Buffer.from(ivB, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ctB, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

/** স্কিম নাম: চাবি থাকলে 'hmac1', না থাকলে 'sha1' (দুর্বল, তাই চাবি দেওয়ার পর নিজে থেকে নতুন করে বানানো হয়) */
export function phoneIndexScheme(): 'hmac1' | 'sha1' {
  return keys() ? 'hmac1' : 'sha1';
}

/** স্বাভাবিকীকৃত ফোন (০১XXXXXXXXX) থেকে খোঁজার সূচক */
export function phoneBlindIndex(normalizedPhone: string): string {
  if (!normalizedPhone) return '';
  const k = keys();
  if (k) return crypto.createHmac('sha256', k.index).update(`phone:${normalizedPhone}`).digest('hex');
  return crypto.createHash('sha256').update(`dhamti-phone-v1:${normalizedPhone}`).digest('hex');
}
