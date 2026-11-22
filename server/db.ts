import { createClient, Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import type { ProblemReport, ManifestoItem, LeaderProfile } from '../src/types/index.js';
import { DEFAULT_PROFILE } from '../src/data/mockData.js';
import { INITIAL_MANIFESTO_ITEMS, LEGACY_DEMO_MANIFESTO } from '../src/data/manifestoData.js';
import { normalizeBdMobile } from '../src/services/phone.js';
import { seal, unseal, isSealed, isEncryptionEnabled, phoneBlindIndex, phoneIndexScheme } from './crypto.js';
import { LEGACY_STATUS_MAP } from '../src/data/statuses.js';
import { trackCodeMatches } from './security.js';
import { INITIAL_AREAS, CATEGORIES } from '../src/data/mockData.js';
import type { ProblemStatus, PublicStats, StaffRole } from '../src/types/index.js';

dotenv.config();

const rawUrl = process.env.TURSO_DATABASE_URL?.trim();
const rawToken = process.env.TURSO_AUTH_TOKEN?.trim();

export const isTursoRemote = Boolean(rawUrl && (rawUrl.startsWith('libsql://') || rawUrl.startsWith('https://') || rawUrl.startsWith('http://')));

// Vercel-এর মতো serverless পরিবেশে লোকাল ফাইল টেকে না (প্রতিবার মুছে যায়)।
// তাই সেখানে Turso ছাড়া নতুন তথ্য সংরক্ষণ করতে দেওয়া হয় না।
export const isServerless = Boolean(process.env.VERCEL);
export const isDbPersistent = isTursoRemote || !isServerless;

// লোকাল ফাইল-ডেটাবেসের ফোল্ডার (serverless-এ শুধু /tmp লেখা যায়)
const dataDir = isServerless ? '/tmp' : path.resolve(process.cwd(), 'data');
if (!isTursoRemote) {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch (err) {
    console.error('[DB] Could not prepare local data directory:', err);
  }
}

export const databaseUrl = isTursoRemote ? rawUrl! : `file:${path.join(dataDir, 'dhamti.db')}`;

export const db: Client = createClient({
  url: databaseUrl,
  authToken: rawToken || undefined,
});

/**
 * Initialize Turso database tables and initial seed data
 */
export async function initDatabase() {
  console.log(`[Turso DB] Connecting to database (${isTursoRemote ? 'Turso Cloud' : 'Local libSQL File'})...`);

  // 1. Problems table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS problems (
      id TEXT PRIMARY KEY,
      tracking_code TEXT NOT NULL UNIQUE,
      submission_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      ward TEXT NOT NULL,
      specific_location TEXT DEFAULT '',
      citizen_name TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      urgency TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'submitted',
      created_at TEXT NOT NULL,
      upvotes INTEGER NOT NULL DEFAULT 0,
      timeline TEXT NOT NULL DEFAULT '[]',
      assigned_officer TEXT DEFAULT '',
      resolution_note TEXT DEFAULT ''
    );
  `);

  // 1a. পিন অনুমান ঠেকানো: প্রতি নম্বরে ঘণ্টায় সীমিত চেষ্টা (ডেটাবেসে, তাই সার্ভারলেস ইনস্ট্যান্স বদলালেও থাকে)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS track_attempts (
      key TEXT PRIMARY KEY,
      attempts INTEGER NOT NULL DEFAULT 0,
      window_start INTEGER NOT NULL DEFAULT 0
    );
  `);
  // 1b. সেশন ও নিরীক্ষা-খাতা
  await db.execute(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id_hash TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      username TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL,
      actor TEXT NOT NULL,
      role TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL DEFAULT '',
      detail TEXT NOT NULL DEFAULT ''
    );
  `);
  // নিরীক্ষা-খাতা শুধু যোগ করা যায়; বদলানো বা মোছা ডেটাবেস নিজেই আটকায় (অ্যাডমিনও পারেন না)
  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS audit_log_no_update BEFORE UPDATE ON audit_log
    BEGIN SELECT RAISE(ABORT, 'audit log is append-only'); END;
  `);
  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS audit_log_no_delete BEFORE DELETE ON audit_log
    BEGIN SELECT RAISE(ABORT, 'audit log is append-only'); END;
  `);

  // 2. Manifesto Items table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS manifesto_items (
      id TEXT PRIMARY KEY,
      title_bn TEXT NOT NULL,
      title_en TEXT NOT NULL,
      category TEXT NOT NULL,
      summary_bn TEXT NOT NULL,
      summary_en TEXT NOT NULL,
      description_bn TEXT NOT NULL,
      description_en TEXT NOT NULL,
      progress_percentage INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'planned',
      target_year TEXT NOT NULL,
      budget_or_scope TEXT NOT NULL,
      milestones TEXT NOT NULL DEFAULT '[]',
      last_updated TEXT NOT NULL
    );
  `);

  // 3. Leader Profile table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS leader_profile (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      designation TEXT NOT NULL,
      promise TEXT NOT NULL,
      main_slogan TEXT NOT NULL,
      sub_slogan TEXT NOT NULL,
      hero_announcement TEXT NOT NULL,
      profile_image TEXT,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      office_address TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // সাইটের ছোট সেটিংস (যেমন ওয়ার্ডের গ্রামের নাম) key/value আকারে
  await db.execute(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Seed Leader Profile if empty
  const profileCountResult = await db.execute(`SELECT COUNT(*) as count FROM leader_profile WHERE id = 'current'`);
  const profileCount = Number(profileCountResult.rows[0]?.count ?? 0);
  if (profileCount === 0) {
    console.log('[Turso DB] Seeding default leader profile...');
    await db.execute({
      sql: `
        INSERT INTO leader_profile (
          id, name, designation, promise, main_slogan, sub_slogan, hero_announcement, profile_image, phone, email, office_address, updated_at
        ) VALUES (
          'current', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `,
      args: [
        DEFAULT_PROFILE.name,
        DEFAULT_PROFILE.designation,
        DEFAULT_PROFILE.promise,
        DEFAULT_PROFILE.mainSlogan,
        DEFAULT_PROFILE.subSlogan,
        DEFAULT_PROFILE.heroAnnouncement,
        DEFAULT_PROFILE.profileImage,
        DEFAULT_PROFILE.phone,
        DEFAULT_PROFILE.email,
        DEFAULT_PROFILE.officeAddress,
        new Date().toISOString(),
      ],
    });
  }

  // একবারের মাইগ্রেশন: আগের ডিফল্ট পদবি/ঠিকানা থাকলে নতুনটি বসাই (সম্পাদিত হলে ছুঁই না)।
  // বাংলা "য়" দুইভাবে লেখা যায় (U+09DF বা U+09AF+U+09BC), তাই NFC করে তুলনা করি।
  const nfc = (v: unknown) => String(v ?? '').normalize('NFC').trim();
  const OLD_DESIGNATION = nfc('ধামতী ইউনিয়ন সেবক');
  const OLD_ADDRESS = nfc('ধামতী ইউনিয়ন জনসেবা কার্যালয়, দেবিদ্বার, কুমিল্লা');
  const current = await db.execute(`SELECT designation, office_address FROM leader_profile WHERE id = 'current'`);
  if (current.rows.length > 0) {
    const row = current.rows[0];
    if (nfc(row.designation) === OLD_DESIGNATION) {
      await db.execute({
        sql: `UPDATE leader_profile SET designation = ? WHERE id = 'current'`,
        args: [DEFAULT_PROFILE.designation],
      });
    }
    if (nfc(row.office_address) === OLD_ADDRESS) {
      await db.execute({
        sql: `UPDATE leader_profile SET office_address = ? WHERE id = 'current'`,
        args: [DEFAULT_PROFILE.officeAddress],
      });
    }
  }

  // ইশতেহার এখনো প্রকাশিত হয়নি: আগের অসম্পাদিত ডেমো সারি মুছি (সম্পাদিত সারিতে last_updated বদলে যায়, তাই সেগুলো থাকে)
  for (const demo of LEGACY_DEMO_MANIFESTO) {
    await db.execute({
      sql: `DELETE FROM manifesto_items WHERE id = ? AND last_updated = ?`,
      args: [demo.id, demo.lastUpdated],
    });
  }

  // Seed Manifesto Items if empty
  const manifestoCountResult = await db.execute(`SELECT COUNT(*) as count FROM manifesto_items`);
  const manifestoCount = Number(manifestoCountResult.rows[0]?.count ?? 0);
  if (manifestoCount === 0) {
    console.log(`[Turso DB] Seeding ${INITIAL_MANIFESTO_ITEMS.length} initial manifesto items...`);
    for (const item of INITIAL_MANIFESTO_ITEMS) {
      await db.execute({
        sql: `
          INSERT INTO manifesto_items (
            id, title_bn, title_en, category, summary_bn, summary_en, description_bn, description_en, progress_percentage, status, target_year, budget_or_scope, milestones, last_updated
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          item.id,
          item.titleBn,
          item.titleEn,
          item.category,
          item.summaryBn,
          item.summaryEn,
          item.descriptionBn,
          item.descriptionEn,
          item.progressPercentage,
          item.status,
          item.targetYear,
          item.budgetOrScope,
          JSON.stringify(item.milestones || []),
          item.lastUpdated,
        ],
      });
    }
  }

  await runProblemMigrations();

  console.log('[Turso DB] Tables and seeds initialized successfully.');
}

// ==========================================
// PROBLEMS (অভিযোগ) — সংবেদনশীল ঘরগুলো এনক্রিপ্ট হয়ে থাকে (server/crypto.ts)
// ==========================================

const SENSITIVE_PROBLEM_FIELDS = ['title', 'description', 'specific_location', 'citizen_name', 'phone'] as const;

let statsCache: { at: number; value: PublicStats } | null = null;
export function invalidateStatsCache() {
  statsCache = null;
}

/** কাজের ইতিহাস (টাইমলাইন) JSON; এনক্রিপশন চালু থাকলে পুরোটা কোড করা অবস্থায় থাকে */
function readTimeline(raw: unknown): any[] {
  try {
    const text = unseal(typeof raw === 'string' ? raw : '');
    const list = text ? JSON.parse(text) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
/** এনক্রিপ্ট করা কিন্তু এখন পড়া যাচ্ছে না (চাবি নেই/ভুল)? তাহলে ইতিহাস মুছে ফেলার ঝুঁকি, তাই লিখতে দেওয়া হয় না */
function timelineUnreadable(raw: unknown): boolean {
  return typeof raw === 'string' && isSealed(raw) && unseal(raw) === '';
}
function writeTimeline(list: unknown[]): string {
  return seal(JSON.stringify(list || []));
}

function rowToProblem(row: Record<string, unknown>): ProblemReport {
  const timeline = readTimeline(row.timeline) as ProblemReport['timeline'];
  return {
    id: String(row.id),
    trackingCode: String(row.tracking_code),
    submissionType: row.submission_type as ProblemReport['submissionType'],
    title: unseal(String(row.title ?? '')),
    description: unseal(String(row.description ?? '')),
    category: String(row.category),
    ward: String(row.ward),
    specificLocation: unseal(String(row.specific_location ?? '')),
    citizenName: unseal(String(row.citizen_name ?? '')),
    phone: unseal(String(row.phone ?? '')),
    isAnonymous: Boolean(row.is_anonymous),
    urgency: row.urgency as ProblemReport['urgency'],
    status: row.status as ProblemReport['status'],
    createdAt: String(row.created_at),
    upvotes: Number(row.upvotes ?? 0),
    timeline,
    assignedOfficer: row.assigned_officer ? String(row.assigned_officer) : undefined,
    resolutionNote: row.resolution_note ? unseal(String(row.resolution_note)) : undefined,
  };
}

export async function getAllProblems(): Promise<ProblemReport[]> {
  const result = await db.execute(`SELECT * FROM problems ORDER BY created_at DESC`);
  return result.rows.map((row) => rowToProblem(row as unknown as Record<string, unknown>));
}

/** একই নম্বর থেকে গত সময়ে কতটি জমা হয়েছে (জমার সীমা ঠিক করতে) */
export async function countRecentByPhone(normalizedPhone: string, sinceIso: string): Promise<number> {
  const hash = phoneBlindIndex(normalizedPhone);
  if (!hash) return 0;
  const result = await db.execute({
    sql: `SELECT COUNT(*) AS c FROM problems WHERE phone_hash = ? AND created_at >= ?`,
    args: [hash, sinceIso],
  });
  return Number(result.rows[0]?.c ?? 0);
}

/** নম্বর + রেফারেন্স কোড দুটোই মিললে তবেই সেই অভিযোগ (সর্বোচ্চ ২০টির মধ্যে খুঁজে)। না মিললে খালি তালিকা; নম্বর আছে কিনা বোঝা যায় না। */
export async function findProblemsByPhoneAndCode(normalizedPhone: string, codeDigits: string): Promise<ProblemReport[]> {
  const hash = phoneBlindIndex(normalizedPhone);
  if (!hash) return [];
  const rows = (
    await db.execute({ sql: `SELECT * FROM problems WHERE phone_hash = ? ORDER BY created_at DESC LIMIT 20`, args: [hash] })
  ).rows;
  return rows
    .filter((row) => trackCodeMatches(codeDigits, String((row as any).tracking_code || '')))
    .map((row) => rowToProblem(row as unknown as Record<string, unknown>));
}

export const TRACK_MAX_ATTEMPTS = 5;
export const TRACK_WINDOW_MS = 60 * 60 * 1000;

/**
 * একটি চেষ্টা গোনা (যাচাইয়ের আগেই, এক নিমেষে)। প্রতি নম্বরে ঘণ্টায় ৫ বারের বেশি কোড যাচাই হয় না,
 * একসাথে অনেক অনুরোধ পাঠালেও না। সফল হলে clearTrackAttempts দিয়ে গোনা মুছে যায়।
 */
export async function consumeTrackAttempt(normalizedPhone: string): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const key = phoneBlindIndex(normalizedPhone) || 'none';
  const now = Date.now();
  await db.execute({
    sql: `INSERT INTO track_attempts (key, attempts, window_start) VALUES (?, 1, ?)
          ON CONFLICT(key) DO UPDATE SET
            attempts = CASE WHEN ? - window_start > ? THEN 1 ELSE attempts + 1 END,
            window_start = CASE WHEN ? - window_start > ? THEN ? ELSE window_start END`,
    args: [key, now, now, TRACK_WINDOW_MS, now, TRACK_WINDOW_MS, now],
  });
  const row = (await db.execute({ sql: `SELECT attempts, window_start FROM track_attempts WHERE key = ?`, args: [key] })).rows[0];
  const attempts = Number(row?.attempts ?? 1);
  const start = Number(row?.window_start ?? now);
  if (attempts <= TRACK_MAX_ATTEMPTS) return { allowed: true, retryAfterSec: 0 };
  return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((start + TRACK_WINDOW_MS - now) / 1000)) };
}

export async function clearTrackAttempts(normalizedPhone: string): Promise<void> {
  const key = phoneBlindIndex(normalizedPhone) || 'none';
  await db.execute({ sql: `DELETE FROM track_attempts WHERE key = ?`, args: [key] });
}

export async function insertProblem(problem: ProblemReport, consentAt = ''): Promise<ProblemReport> {
  await db.execute({
    sql: `
      INSERT INTO problems (
        id, tracking_code, submission_type, title, description, category, ward, specific_location, citizen_name, phone, is_anonymous, urgency, status, created_at, upvotes, timeline, assigned_officer, resolution_note, phone_hash, consent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      problem.id,
      problem.trackingCode,
      problem.submissionType,
      seal(problem.title),
      seal(problem.description),
      problem.category,
      problem.ward,
      seal(problem.specificLocation || ''),
      seal(problem.citizenName || ''),
      seal(problem.phone || ''),
      problem.isAnonymous ? 1 : 0,
      problem.urgency,
      problem.status,
      problem.createdAt,
      problem.upvotes || 0,
      writeTimeline(problem.timeline || []),
      problem.assignedOfficer || '',
      seal(problem.resolutionNote || ''),
      phoneBlindIndex(normalizeBdMobile(problem.phone) || ''),
      consentAt,
    ],
  });
  invalidateStatsCache();
  return problem;
}

const DEFAULT_STATUS_NOTE_BN: Record<ProblemStatus, string> = {
  submitted: 'আপনার অভিযোগটি গৃহীত হয়েছে।',
  under_review: 'আবেদনটি পর্যালোচনাধীন রয়েছে।',
  need_info: 'অতিরিক্ত তথ্য প্রয়োজন।',
  guidance_given: 'প্রয়োজনীয় তথ্য বা দিকনির্দেশনা দেওয়া হয়েছে।',
  contacted: 'আপনার সাথে যোগাযোগ করা হয়েছে।',
  review_done: 'পর্যালোচনা সম্পন্ন হয়েছে।',
};
const DEFAULT_STATUS_NOTE_EN: Record<ProblemStatus, string> = {
  submitted: 'Your report has been received.',
  under_review: 'The report is under review.',
  need_info: 'More information is needed.',
  guidance_given: 'Information or guidance has been provided.',
  contacted: 'You have been contacted.',
  review_done: 'Review has been completed.',
};

export async function updateProblemStatus(
  id: string,
  newStatus: ProblemStatus,
  noteText: string,
  authorName: string
): Promise<ProblemReport | null> {
  const existing = await db.execute({ sql: `SELECT * FROM problems WHERE id = ?`, args: [id] });
  if (existing.rows.length === 0) return null;

  const row = existing.rows[0];
  if (timelineUnreadable(row.timeline)) {
    throw new Error('DATA_ENCRYPTION_KEY ভুল বা নেই, তাই এই অভিযোগের ইতিহাস পড়া যাচ্ছে না। আগে সঠিক চাবি বসান।');
  }
  const timeline: any[] = readTimeline(row.timeline);

  timeline.push({
    id: `ev-${Date.now()}`,
    timestamp: new Date().toISOString(),
    status: newStatus,
    noteBn: noteText || DEFAULT_STATUS_NOTE_BN[newStatus],
    noteEn: noteText || DEFAULT_STATUS_NOTE_EN[newStatus],
    author: authorName || 'জনসেবা সেল',
  });

  await db.execute({
    sql: `UPDATE problems SET status = ?, timeline = ?, assigned_officer = ?, resolution_note = ? WHERE id = ?`,
    args: [
      newStatus,
      writeTimeline(timeline),
      authorName || (row.assigned_officer as string) || '',
      noteText ? seal(noteText) : (row.resolution_note as string) || '',
      id,
    ],
  });
  invalidateStatsCache();

  const updated = await db.execute({ sql: `SELECT * FROM problems WHERE id = ?`, args: [id] });
  return rowToProblem(updated.rows[0] as unknown as Record<string, unknown>);
}

/** শ্রেণিবিন্যাস: সমস্যার ধরন ও জরুরি মাত্রা বদল */
export async function classifyProblem(id: string, category: string, urgency: string): Promise<ProblemReport | null> {
  const res = await db.execute({ sql: `UPDATE problems SET category = ?, urgency = ? WHERE id = ?`, args: [category, urgency, id] });
  if (res.rowsAffected === 0) return null;
  invalidateStatsCache();
  const updated = await db.execute({ sql: `SELECT * FROM problems WHERE id = ?`, args: [id] });
  return rowToProblem(updated.rows[0] as unknown as Record<string, unknown>);
}

export async function deleteProblem(id: string): Promise<boolean> {
  const res = await db.execute({ sql: `DELETE FROM problems WHERE id = ?`, args: [id] });
  invalidateStatsCache();
  return res.rowsAffected > 0;
}

// ==========================================
// পাবলিক পরিসংখ্যান (ব্যক্তিগত রেকর্ড থেকে আলাদা, শুধু সমষ্টি)
// ==========================================

/** পাবলিক পরিসংখ্যান ক্যাশের সময় (মালিকের সিদ্ধান্ত ২০২৬-১১-২২: ছোট সংখ্যাও লুকানো হবে না, ০ হলে ০ দেখাবে) */
const STATS_TTL_MS = 30_000;

export async function getPublicStats(): Promise<PublicStats> {
  if (statsCache && Date.now() - statsCache.at < STATS_TTL_MS) return statsCache.value;

  const grouped = await db.execute(`SELECT ward, category, status, COUNT(*) AS c FROM problems GROUP BY ward, category, status`);
  const months = await db.execute(`SELECT SUBSTR(created_at, 1, 7) AS m, COUNT(*) AS c FROM problems GROUP BY SUBSTR(created_at, 1, 7) ORDER BY m DESC LIMIT 12`);

  const categoryIds = new Set<string>(CATEGORIES.map((c) => c.id));
  let total = 0;
  const byStatus: Record<string, number> = {};
  const byWard: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byWardCategory: Record<string, Record<string, number>> = {};
  for (const r of grouped.rows) {
    const c = Number(r.c);
    const ward = String(r.ward);
    // তালিকার বাইরের পুরনো বিষয় "অন্যান্য"-তে গোনা হয়
    const cat = categoryIds.has(String(r.category)) ? String(r.category) : 'other';
    total += c;
    byStatus[String(r.status)] = (byStatus[String(r.status)] || 0) + c;
    byWard[ward] = (byWard[ward] || 0) + c;
    byCategory[cat] = (byCategory[cat] || 0) + c;
    (byWardCategory[ward] ||= {})[cat] = ((byWardCategory[ward] || {})[cat] || 0) + c;
  }

  /** ফর্মের ড্রপডাউনের সব বিষয়, বেশি থেকে কম; সংখ্যা না থাকলে ০। সমান হলে ড্রপডাউনের ক্রম বজায় থাকে। */
  const allCategories = (counts: Record<string, number>) =>
    CATEGORIES.map((c, order) => ({ id: c.id, count: counts[c.id] || 0, order }))
      .sort((a, b) => b.count - a.count || a.order - b.order)
      .map(({ id, count }) => ({ id, count }));

  const value: PublicStats = {
    generatedAt: new Date().toISOString(),
    total,
    reviewDone: byStatus['review_done'] || 0,
    underReview:
      (byStatus['under_review'] || 0) + (byStatus['need_info'] || 0) + (byStatus['guidance_given'] || 0) + (byStatus['contacted'] || 0),
    submitted: byStatus['submitted'] || 0,
    wards: INITIAL_AREAS.map((a) => ({
      ward: a.wardNumber,
      total: byWard[a.wardNumber] || 0,
      categories: allCategories(byWardCategory[a.wardNumber] || {}),
    })),
    categories: allCategories(byCategory),
    // শুধু মাস (দিন নয়)
    monthly: months.rows.map((r) => ({ month: String(r.m), count: Number(r.c) })).reverse(),
  };
  statsCache = { at: Date.now(), value };
  return value;
}

// ==========================================
// মাইগ্রেশন: নতুন কলাম, পুরনো অবস্থা, এনক্রিপশন, ফোন-সূচক
// ==========================================

async function columnNames(table: string): Promise<Set<string>> {
  const res = await db.execute(`PRAGMA table_info(${table})`);
  return new Set(res.rows.map((r) => String(r.name)));
}

async function runProblemMigrations() {
  const cols = await columnNames('problems');
  if (!cols.has('phone_hash')) await db.execute(`ALTER TABLE problems ADD COLUMN phone_hash TEXT NOT NULL DEFAULT ''`);
  if (!cols.has('consent_at')) await db.execute(`ALTER TABLE problems ADD COLUMN consent_at TEXT NOT NULL DEFAULT ''`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_problems_phone_hash ON problems (phone_hash)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_problems_ward ON problems (ward)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_problems_created ON problems (created_at)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log (at)`);

  // পুরনো চার অবস্থা → নতুন ছয় অবস্থা (একবার)
  if ((await getSetting('mig_status_v2')) !== 'done') {
    const rows = await db.execute(`SELECT id, status, timeline FROM problems`);
    for (const r of rows.rows) {
      const oldStatus = String(r.status);
      if (timelineUnreadable(r.timeline)) continue;
      const timeline: any[] = readTimeline(r.timeline);
      let changed = false;
      for (const ev of timeline) {
        if (ev && LEGACY_STATUS_MAP[ev.status]) {
          ev.status = LEGACY_STATUS_MAP[ev.status];
          changed = true;
        }
      }
      const newStatus = LEGACY_STATUS_MAP[oldStatus] || oldStatus;
      if (changed || newStatus !== oldStatus) {
        await db.execute({
          sql: `UPDATE problems SET status = ?, timeline = ? WHERE id = ?`,
          args: [newStatus, writeTimeline(timeline), r.id as string],
        });
      }
    }
    await setSetting('mig_status_v2', 'done');
  }

  await rebuildProtectedColumns();
}

/**
 * ফোন-সূচক বানানো ও (চাবি থাকলে) নাম/ফোন/লেখা এনক্রিপ্ট করা।
 * কাজ বাকি না থাকলে শুধু একটি ছোট প্রশ্ন চালিয়ে ফিরে যায়।
 */
export async function rebuildProtectedColumns() {
  const scheme = phoneIndexScheme();
  const schemeChanged = (await getSetting('phone_index_scheme')) !== scheme;
  const encOn = isEncryptionEnabled();

  const pending = await db.execute(
    `SELECT COUNT(*) AS c FROM problems WHERE (phone_hash = '' AND phone != '')` +
      (encOn
        ? ` OR (phone != '' AND phone NOT LIKE 'enc1:%') OR (citizen_name != '' AND citizen_name NOT LIKE 'enc1:%')` +
          ` OR (description != '' AND description NOT LIKE 'enc1:%') OR (title != '' AND title NOT LIKE 'enc1:%')` +
          ` OR (timeline != '' AND timeline NOT LIKE 'enc1:%')`
        : '')
  );
  if (!schemeChanged && Number(pending.rows[0]?.c ?? 0) === 0) return;

  const rows = await db.execute(`SELECT * FROM problems`);
  for (const r of rows.rows) {
    const rec = r as unknown as Record<string, unknown>;
    const plain: Record<string, string> = {};
    let readable = true;
    for (const f of SENSITIVE_PROBLEM_FIELDS) {
      const raw = String(rec[f] ?? '');
      const v = unseal(raw);
      if (raw !== '' && isSealed(raw) && v === '') readable = false; // চাবি নেই/ভুল: ছুঁই না
      plain[f] = v;
    }
    if (!readable) continue;
    const resRaw = String(rec.resolution_note ?? '');
    const res = unseal(resRaw);
    const tlRaw = String(rec.timeline ?? '');
    const tlPlain = unseal(tlRaw);
    if (tlRaw !== '' && isSealed(tlRaw) && tlPlain === '') continue; // চাবি নেই/ভুল: ছুঁই না
    await db.execute({
      sql: `UPDATE problems SET title = ?, description = ?, specific_location = ?, citizen_name = ?, phone = ?, resolution_note = ?, timeline = ?, phone_hash = ? WHERE id = ?`,
      args: [
        seal(plain.title),
        seal(plain.description),
        seal(plain.specific_location),
        seal(plain.citizen_name),
        seal(plain.phone),
        seal(res),
        seal(tlPlain),
        phoneBlindIndex(normalizeBdMobile(plain.phone) || ''),
        String(rec.id),
      ],
    });
  }
  await setSetting('phone_index_scheme', scheme);
}

// ==========================================
// সেশন (ডেটাবেসে শুধু আইডির হ্যাশ; লগআউটে মুছে যায়)
// ==========================================

export interface SessionInfo {
  role: StaffRole;
  username: string;
  displayName: string;
}

export async function createSession(idHash: string, info: SessionInfo, expiresAt: number): Promise<void> {
  await db.execute({ sql: `DELETE FROM admin_sessions WHERE expires_at < ?`, args: [Date.now()] });
  await db.execute({
    sql: `INSERT INTO admin_sessions (id_hash, role, username, display_name, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [idHash, info.role, info.username, info.displayName, new Date().toISOString(), expiresAt],
  });
}

/** বৈধ সেশন ফেরত দেয় (মেয়াদ শেষ বা লগআউট হলে null) */
export async function getSession(idHash: string): Promise<SessionInfo | null> {
  const res = await db.execute({ sql: `SELECT role, username, display_name, expires_at FROM admin_sessions WHERE id_hash = ?`, args: [idHash] });
  if (!res.rows.length) return null;
  const r = res.rows[0];
  if (Number(r.expires_at) <= Date.now()) {
    await db.execute({ sql: `DELETE FROM admin_sessions WHERE id_hash = ?`, args: [idHash] });
    return null;
  }
  const role = String(r.role) as StaffRole;
  const username = String(r.username);
  return { role, username, displayName: String(r.display_name) };
}

export async function deleteSession(idHash: string): Promise<void> {
  await db.execute({ sql: `DELETE FROM admin_sessions WHERE id_hash = ?`, args: [idHash] });
}

// ==========================================
// নিরীক্ষা-খাতা (কে কী করেছে)। এখানে কখনো নাম, ফোন বা অভিযোগের লেখা রাখা হয় না।
// ==========================================

export interface AuditEntry {
  id: number;
  at: string;
  actor: string;
  role: string;
  action: string;
  target: string;
  detail: string;
}

export async function addAudit(entry: { actor: string; role: string; action: string; target?: string; detail?: string }): Promise<void> {
  try {
    await db.execute({
      sql: `INSERT INTO audit_log (at, actor, role, action, target, detail) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        new Date().toISOString(),
        entry.actor.slice(0, 60),
        entry.role.slice(0, 20),
        entry.action.slice(0, 40),
        (entry.target || '').slice(0, 80),
        (entry.detail || '').slice(0, 200),
      ],
    });
  } catch (err) {
    console.error('[audit] failed to write:', err);
  }
}

export async function listAudit(limit = 200): Promise<AuditEntry[]> {
  const res = await db.execute({ sql: `SELECT * FROM audit_log ORDER BY id DESC LIMIT ?`, args: [Math.max(1, Math.min(1000, limit))] });
  return res.rows.map((r) => ({
    id: Number(r.id),
    at: String(r.at),
    actor: String(r.actor),
    role: String(r.role),
    action: String(r.action),
    target: String(r.target),
    detail: String(r.detail),
  }));
}

export async function countAudit(action: string, actor: string, sinceIso: string): Promise<number> {
  const res = await db.execute({
    sql: `SELECT COUNT(*) AS c FROM audit_log WHERE action = ? AND LOWER(actor) = LOWER(?) AND at >= ?`,
    args: [action, actor, sinceIso],
  });
  return Number(res.rows[0]?.c ?? 0);
}

// ==========================================
// ব্যাকআপ ও পুনরুদ্ধার (শুধু মূল প্রশাসক; ব্যাকআপে নাম-ফোনসহ সব থাকে, তাই ফাইলটি গোপন রাখুন)
// ==========================================

export async function exportBackup() {
  const problems = await getAllProblems();
  const manifesto = await getAllManifestoItems();
  const profile = await db.execute(`SELECT * FROM leader_profile`);
  const settings = await db.execute(`SELECT key, value, updated_at FROM site_settings WHERE key NOT LIKE 'totp%'`);
  const audit = await db.execute(`SELECT * FROM audit_log ORDER BY id ASC`);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    note: 'এই ফাইলে নাগরিকের নাম ও ফোন আছে। নিরাপদ জায়গায় রাখুন, কাউকে পাঠাবেন না।',
    problems,
    manifesto,
    leader_profile: profile.rows,
    site_settings: settings.rows,
    audit_log: audit.rows,
  };
}

/**
 * ব্যাকআপ থেকে ফেরানো (মার্জ: আছে এমন সারি বদলায়, নেই এমন সারি যোগ হয়; কিছু মোছে না)।
 * নিরীক্ষা-খাতায় শুধু নতুন সারি যোগ হয়।
 */
export async function restoreBackup(data: any): Promise<{ problems: number; manifesto: number; settings: number }> {
  if (!data || data.version !== 1 || !Array.isArray(data.problems)) throw new Error('ব্যাকআপ ফাইলটি সঠিক নয়।');
  let problems = 0;
  for (const p of data.problems as ProblemReport[]) {
    await db.execute({
      sql: `
        INSERT OR REPLACE INTO problems (
          id, tracking_code, submission_type, title, description, category, ward, specific_location, citizen_name, phone, is_anonymous, urgency, status, created_at, upvotes, timeline, assigned_officer, resolution_note, phone_hash, consent_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        p.id,
        p.trackingCode,
        p.submissionType,
        seal(p.title || ''),
        seal(p.description || ''),
        p.category,
        p.ward,
        seal(p.specificLocation || ''),
        seal(p.citizenName || ''),
        seal(p.phone || ''),
        p.isAnonymous ? 1 : 0,
        p.urgency,
        LEGACY_STATUS_MAP[p.status as string] || p.status,
        p.createdAt,
        p.upvotes || 0,
        writeTimeline(p.timeline || []),
        p.assignedOfficer || '',
        seal(p.resolutionNote || ''),
        phoneBlindIndex(normalizeBdMobile(p.phone) || ''),
        '',
      ],
    });
    problems++;
  }
  let manifesto = 0;
  for (const m of (data.manifesto || []) as ManifestoItem[]) {
    const exists = await db.execute({ sql: `SELECT 1 FROM manifesto_items WHERE id = ?`, args: [m.id] });
    if (exists.rows.length) await updateManifestoItem(m);
    else await insertManifestoItem(m);
    manifesto++;
  }
  let settings = 0;
  for (const s of (data.site_settings || []) as any[]) {
    if (typeof s.key === 'string' && !s.key.startsWith('totp')) {
      await setSetting(s.key, String(s.value));
      settings++;
    }
  }
  for (const e of (data.audit_log || []) as any[]) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO audit_log (id, at, actor, role, action, target, detail) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [Number(e.id), String(e.at), String(e.actor), String(e.role), String(e.action), String(e.target ?? ''), String(e.detail ?? '')],
    });
  }
  invalidateStatsCache();
  return { problems, manifesto, settings };
}

// ==========================================
// MANIFESTO CRUD OPERATIONS
// ==========================================

export async function getAllManifestoItems(): Promise<ManifestoItem[]> {
  const result = await db.execute(`SELECT * FROM manifesto_items ORDER BY id ASC`);
  return result.rows.map((row) => {
    let milestones = [];
    try {
      milestones = typeof row.milestones === 'string' ? JSON.parse(row.milestones) : [];
    } catch {
      milestones = [];
    }
    return {
      id: String(row.id),
      titleBn: String(row.title_bn),
      titleEn: String(row.title_en),
      category: row.category as ManifestoItem['category'],
      summaryBn: String(row.summary_bn),
      summaryEn: String(row.summary_en),
      descriptionBn: String(row.description_bn),
      descriptionEn: String(row.description_en),
      progressPercentage: Number(row.progress_percentage ?? 0),
      status: row.status as ManifestoItem['status'],
      targetYear: String(row.target_year),
      budgetOrScope: String(row.budget_or_scope),
      milestones,
      lastUpdated: String(row.last_updated),
    };
  });
}

export async function insertManifestoItem(item: ManifestoItem): Promise<ManifestoItem> {
  await db.execute({
    sql: `
      INSERT INTO manifesto_items (
        id, title_bn, title_en, category, summary_bn, summary_en, description_bn, description_en, progress_percentage, status, target_year, budget_or_scope, milestones, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      item.id,
      item.titleBn,
      item.titleEn,
      item.category,
      item.summaryBn,
      item.summaryEn,
      item.descriptionBn,
      item.descriptionEn,
      item.progressPercentage,
      item.status,
      item.targetYear,
      item.budgetOrScope,
      JSON.stringify(item.milestones || []),
      item.lastUpdated || new Date().toISOString(),
    ],
  });
  return item;
}

export async function updateManifestoItem(item: ManifestoItem): Promise<ManifestoItem> {
  await db.execute({
    sql: `
      UPDATE manifesto_items
      SET title_bn = ?, title_en = ?, category = ?, summary_bn = ?, summary_en = ?, description_bn = ?, description_en = ?, progress_percentage = ?, status = ?, target_year = ?, budget_or_scope = ?, milestones = ?, last_updated = ?
      WHERE id = ?
    `,
    args: [
      item.titleBn,
      item.titleEn,
      item.category,
      item.summaryBn,
      item.summaryEn,
      item.descriptionBn,
      item.descriptionEn,
      item.progressPercentage,
      item.status,
      item.targetYear,
      item.budgetOrScope,
      JSON.stringify(item.milestones || []),
      new Date().toISOString(),
      item.id,
    ],
  });
  return item;
}

export async function deleteManifestoItem(id: string): Promise<boolean> {
  const res = await db.execute({
    sql: `DELETE FROM manifesto_items WHERE id = ?`,
    args: [id],
  });
  return res.rowsAffected > 0;
}

export async function deleteCompletedManifestos(): Promise<number> {
  const res = await db.execute(`DELETE FROM manifesto_items WHERE status = 'completed'`);
  return res.rowsAffected;
}

export async function resetManifestoItems(initialItems: ManifestoItem[]): Promise<ManifestoItem[]> {
  await db.execute(`DELETE FROM manifesto_items`);
  for (const item of initialItems) {
    await insertManifestoItem(item);
  }
  return initialItems;
}

// ==========================================
// LEADER PROFILE CRUD OPERATIONS
// ==========================================

const DATA_URL_IMAGE = /^data:image\/(jpeg|png|webp);base64,/;

export async function getLeaderProfile(): Promise<LeaderProfile> {
  const res = await db.execute(`SELECT * FROM leader_profile WHERE id = 'current'`);
  if (res.rows.length === 0) {
    return DEFAULT_PROFILE;
  }
  const row = res.rows[0];
  const stored = row.profile_image ? String(row.profile_image) : '';
  // অ্যাডমিনের আপলোড করা ছবি ডেটাবেসে থাকে; পাবলিক URL-এ ভার্সন যোগ করি যেন নতুন ছবি সঙ্গে সঙ্গে দেখা যায়
  const profileImage = DATA_URL_IMAGE.test(stored)
    ? `/api/profile/photo?v=${encodeURIComponent(String(row.updated_at || '1'))}`
    : stored || '/leader.jpg';
  return {
    name: String(row.name),
    designation: String(row.designation),
    promise: String(row.promise),
    mainSlogan: String(row.main_slogan),
    subSlogan: String(row.sub_slogan),
    heroAnnouncement: String(row.hero_announcement),
    profileImage,
    phone: String(row.phone || DEFAULT_PROFILE.phone),
    email: String(row.email || DEFAULT_PROFILE.email),
    officeAddress: String(row.office_address || DEFAULT_PROFILE.officeAddress),
  };
}

/** প্রোফাইলের লেখা তথ্য হালনাগাদ। ছবি এখানে বদলায় না (ছবির জন্য আলাদা ফাংশন)। */
export async function updateLeaderProfile(profile: LeaderProfile): Promise<LeaderProfile> {
  const now = new Date().toISOString();
  await db.execute({
    sql: `
      INSERT INTO leader_profile (
        id, name, designation, promise, main_slogan, sub_slogan, hero_announcement, profile_image, phone, email, office_address, updated_at
      ) VALUES ('current', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        designation = excluded.designation,
        promise = excluded.promise,
        main_slogan = excluded.main_slogan,
        sub_slogan = excluded.sub_slogan,
        hero_announcement = excluded.hero_announcement,
        phone = excluded.phone,
        email = excluded.email,
        office_address = excluded.office_address,
        updated_at = excluded.updated_at
    `,
    args: [
      profile.name,
      profile.designation,
      profile.promise,
      profile.mainSlogan,
      profile.subSlogan,
      profile.heroAnnouncement,
      '/leader.jpg',
      profile.phone || DEFAULT_PROFILE.phone,
      profile.email || DEFAULT_PROFILE.email,
      profile.officeAddress || DEFAULT_PROFILE.officeAddress,
      now,
    ],
  });
  return getLeaderProfile();
}

/** আপলোড করা ছবির ডেটা (data URL) — না থাকলে null */
export async function getLeaderPhotoDataUrl(): Promise<string | null> {
  const res = await db.execute(`SELECT profile_image FROM leader_profile WHERE id = 'current'`);
  const v = res.rows[0]?.profile_image ? String(res.rows[0].profile_image) : '';
  return DATA_URL_IMAGE.test(v) ? v : null;
}

/** ছবি বসাই (dataUrl) অথবা মুছে ডিফল্টে ফিরি (null) */
export async function setLeaderPhoto(dataUrl: string | null): Promise<LeaderProfile> {
  // প্রোফাইল সারি না থাকলে আগে ডিফল্ট বসাই
  const existing = await db.execute(`SELECT 1 FROM leader_profile WHERE id = 'current'`);
  if (existing.rows.length === 0) await updateLeaderProfile(DEFAULT_PROFILE);
  await db.execute({
    sql: `UPDATE leader_profile SET profile_image = ?, updated_at = ? WHERE id = 'current'`,
    args: [dataUrl ?? '/leader.jpg', new Date().toISOString()],
  });
  return getLeaderProfile();
}

// ==========================================
// SITE SETTINGS (key/value)
// ==========================================

export async function getSetting(key: string): Promise<string | null> {
  const res = await db.execute({ sql: `SELECT value FROM site_settings WHERE key = ?`, args: [key] });
  return res.rows[0] ? String(res.rows[0].value) : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.execute({
    sql: `
      INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `,
    args: [key, value, new Date().toISOString()],
  });
}

// ==========================================
// DB STATUS INFO
// ==========================================

export async function getDatabaseStatus() {
  try {
    const pCountRes = await db.execute(`SELECT COUNT(*) as count FROM problems`);
    const mCountRes = await db.execute(`SELECT COUNT(*) as count FROM manifesto_items`);

    let safeUrl = 'Local libSQL (dhamti.db)';
    if (isTursoRemote) {
      try {
        const parsed = new URL(databaseUrl.replace('libsql://', 'https://'));
        safeUrl = `Turso Cloud (${parsed.hostname})`;
      } catch {
        safeUrl = 'Turso Cloud (libSQL Remote)';
      }
    }

    return {
      connected: true,
      provider: 'turso',
      mode: isTursoRemote ? 'turso-cloud' : 'turso-libsql-local',
      isRemote: isTursoRemote,
      persistent: isDbPersistent,
      databaseUrl: safeUrl,
      problemsCount: Number(pCountRes.rows[0]?.count ?? 0),
      encryption: isEncryptionEnabled(),
      manifestoCount: Number(mCountRes.rows[0]?.count ?? 0),
    };
  } catch (error: any) {
    return {
      connected: false,
      provider: 'turso',
      mode: isTursoRemote ? 'turso-cloud' : 'turso-libsql-local',
      isRemote: isTursoRemote,
      error: error?.message || 'Failed to query database',
    };
  }
}
