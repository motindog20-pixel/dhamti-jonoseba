/**
 * নাগরিকের ৪ অঙ্কের পিন (অভিযোগের অবস্থা দেখার চাবি)।
 * এই নিয়মগুলো সার্ভারেও আছে (server/security.ts); এখানে শুধু আগে থেকে ভুল ধরার জন্য।
 */
import { toAsciiDigits } from './phone';

/** বাংলা/ইংরেজি অঙ্ক নিয়ে শুধু ইংরেজি অঙ্ক, সর্বোচ্চ ৪টি */
export function normalizePin(input: string): string {
  return toAsciiDigits(input || '').replace(/\D/g, '').slice(0, 4);
}

export function isFourDigitPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/** ১১১১, ১২৩৪, ৪৩২১-এর মতো সহজে অনুমান করা পিন */
export function isWeakPin(pin: string): boolean {
  if (/^(\d)\1{3}$/.test(pin)) return true;
  const d = pin.split('').map(Number);
  const up = d.every((x, i) => i === 0 || x === d[i - 1] + 1);
  const down = d.every((x, i) => i === 0 || x === d[i - 1] - 1);
  return up || down || ['0000', '1212', '2580', '1122', '2000', '2001'].includes(pin);
}
