/**
 * Express অ্যাপ (রুট, নিরাপত্তা, ভ্যালিডেশন)।
 * এটি `server.ts` (নিজের সার্ভার) এবং `api/index.ts` (Vercel) দুই জায়গা থেকেই ব্যবহার হয়।
 */
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import {
  initDatabase,
  getAllProblems,
  findProblemsByPhoneAndCode,
  consumeTrackAttempt,
  clearTrackAttempts,
  countRecentByPhone,
  insertProblem,
  updateProblemStatus,
  classifyProblem,
  deleteProblem,
  getPublicStats,
  getAllManifestoItems,
  insertManifestoItem,
  updateManifestoItem,
  deleteManifestoItem,
  deleteCompletedManifestos,
  resetManifestoItems,
  getLeaderProfile,
  updateLeaderProfile,
  getLeaderPhotoDataUrl,
  setLeaderPhoto,
  getSetting,
  setSetting,
  getDatabaseStatus,
  isDbPersistent,
  createSession,
  getSession,
  deleteSession,
  addAudit,
  listAudit,
  countAudit,
  exportBackup,
  type SessionInfo,
} from './db.js';
import {
  isAuthConfigured,
  checkPassword,
  generateTotpSecret,
  totpVerify,
  totpUri,
  newSessionId,
  hashSessionId,
  readSessionCookie,
  SESSION_MS,
  setAdminCookie,
  clearAdminCookie,
  sameOriginOnly,
  securityHeaders,
  rateLimit,
  failLimiter,
  cleanText,
  cleanPhone,
  cleanTrackCode,
  isValidTrackCode,
  ID_PATTERN,
} from './security.js';
import { seal, unseal, isEncryptionEnabled } from './crypto.js';
import { STATUS_ORDER, NOTE_REQUIRED_STATUSES } from '../src/data/statuses.js';
import { INITIAL_MANIFESTO_ITEMS, MANIFESTO_CATEGORIES_CONFIG } from '../src/data/manifestoData.js';
import { normalizeBdMobile } from '../src/services/phone.js';
import { INITIAL_AREAS, CATEGORIES } from '../src/data/mockData.js';
import type {
  ProblemReport,
  ProblemStatus,
  UrgencyLevel,
  SubmissionType,
  ManifestoItem,
  ManifestoStatus,
  ManifestoCategory,
  LeaderProfile,
} from '../src/types/index.js';

const WARD_IDS = new Set(INITIAL_AREAS.map((a) => a.wardNumber));
const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));
const URGENCY: UrgencyLevel[] = ['normal', 'high', 'critical'];
const STATUSES: ProblemStatus[] = STATUS_ORDER;
const MANIFESTO_STATUSES: ManifestoStatus[] = ['planned', 'in_progress', 'completed'];
const MANIFESTO_CATEGORY_IDS = new Set(Object.keys(MANIFESTO_CATEGORIES_CONFIG));

const ANON_NAME = 'গোপন নাগরিক';
const DEFAULT_NAME = 'এলাকাবাসী';

/**
 * নাগরিকের দেখার রূপ (শুধু মোবাইল নম্বর দিয়ে খোঁজা হয়, তাই কম তথ্য দেখানো হয়):
 * অভিযোগের শিরোনাম, লেখা ও ঠিকানা এবং নাম/নম্বর কখনোই নয়। দেখা যায় শুধু ধরন, ওয়ার্ড, তারিখ,
 * ট্র্যাকিং কোড, অবস্থা ও আপনার লেখা নোট। কর্মীর নাম লুকিয়ে "জনসেবা সেল" দেখানো হয়।
 */
function toTrackView(problem: ProblemReport): ProblemReport {
  return {
    ...problem,
    id: problem.trackingCode,
    title: '',
    description: '',
    specificLocation: '',
    phone: '',
    citizenName: DEFAULT_NAME,
    assignedOfficer: undefined,
    upvotes: 0,
    timeline: (problem.timeline || []).map((ev) => ({ ...ev, author: 'জনসেবা সেল' })),
  };
}

type NewProblemInput = {
  submissionType: SubmissionType;
  title: string;
  description: string;
  category: string;
  ward: string;
  specificLocation: string;
  citizenName: string;
  phone: string;
  isAnonymous: boolean;
  urgency: UrgencyLevel;
  consent: boolean;
};

function parseNewProblem(body: any): { ok: true; value: NewProblemInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'তথ্য সঠিক নয়।' };

  if (body.consent !== true) return { ok: false, error: 'গোপনীয়তা নীতি দেখে সম্মতি দিন।' };
  const submissionType: SubmissionType = body.submissionType === 'advice' ? 'advice' : 'complaint';
  const title = cleanText(body.title, 120);
  const description = cleanText(body.description, 1000);
  const specificLocation = cleanText(body.specificLocation, 150);
  // নাম, মোবাইল নম্বর ও ওয়ার্ড সবসময় বাধ্যতামূলক (বেনামী জমা নেই)
  const citizenName = cleanText(body.citizenName, 60);
  if (citizenName.length < 2) return { ok: false, error: 'আপনার নাম লিখুন।' };
  if (!WARD_IDS.has(body.ward)) return { ok: false, error: 'আপনার ওয়ার্ড বেছে নিন।' };
  const phone = normalizeBdMobile(typeof body.phone === 'string' ? body.phone : '');
  if (!phone) {
    return { ok: false, error: 'মোবাইল নম্বরটি সঠিক নয়। ১১ অঙ্কের নম্বর দিন (যেমন ০১৭XXXXXXXX)।' };
  }

  if (!title) return { ok: false, error: 'শিরোনাম লিখুন।' };
  if (!description) return { ok: false, error: 'বিবরণ লিখুন।' };
  if (!specificLocation) return { ok: false, error: 'নির্দিষ্ট স্থান বা এলাকার বিবরণ লিখুন।' };
  if (!CATEGORY_IDS.has(body.category)) return { ok: false, error: 'সমস্যার ধরন নির্বাচন করুন।' };

  const urgency: UrgencyLevel = URGENCY.includes(body.urgency) ? body.urgency : 'normal';

  return {
    ok: true,
    value: {
      submissionType,
      title,
      description,
      category: body.category,
      ward: body.ward,
      specificLocation,
      citizenName,
      phone,
      isAnonymous: false,
      urgency,
      consent: true,
    },
  };
}

async function createProblemRecord(input: NewProblemInput): Promise<ProblemReport> {
  const isAdvice = input.submissionType === 'advice';
  const prefix = isAdvice ? 'ADV' : 'JNS';
  const year = new Date().getFullYear();
  const nowIso = new Date().toISOString();

  for (let attempt = 0; attempt < 8; attempt++) {
    // ৬ অঙ্কের এলোমেলো সংখ্যা: এটিই অবস্থা দেখার দ্বিতীয় চাবি, তাই অনুমান করা কঠিন রাখা হয়েছে
    const num = crypto.randomInt(100000, 1000000);
    const trackingCode = `${prefix}-${year}-${num}`;
    const id = `${isAdvice ? 'adv' : 'prob'}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    const problem: ProblemReport = {
      id,
      trackingCode,
      submissionType: input.submissionType,
      title: input.title,
      description: input.description,
      category: input.category,
      ward: input.ward,
      specificLocation: input.specificLocation,
      citizenName: input.isAnonymous ? ANON_NAME : input.citizenName || DEFAULT_NAME,
      phone: input.phone,
      isAnonymous: input.isAnonymous,
      urgency: input.urgency,
      status: 'submitted',
      createdAt: nowIso,
      upvotes: 0,
      timeline: [
        {
          id: `t-${Date.now()}-1`,
          timestamp: nowIso,
          status: 'submitted',
          noteBn: isAdvice
            ? 'নাগরিকের মূল্যবান উপদেশ ও পরামর্শ গৃহীত হয়েছে। পর্যালোচনার অপেক্ষায়।'
            : 'নাগরিকের অভিযোগটি গৃহীত হয়েছে। প্রাথমিক পর্যালোচনার অপেক্ষায়।',
          noteEn: isAdvice
            ? 'Citizen advice registered. Awaiting review.'
            : 'Grievance received. Awaiting initial inspection.',
          author: 'জনসেবা সিস্টেম',
        },
      ],
    };

    try {
      return await insertProblem(problem, nowIso);
    } catch (err: any) {
      if (/UNIQUE|constraint/i.test(String(err?.message))) continue; // কোড মিলে গেলে আবার চেষ্টা
      throw err;
    }
  }
  throw new Error('Could not generate a unique tracking code');
}

function parseManifestoItem(body: any, forcedId?: string): ManifestoItem | null {
  if (!body || typeof body !== 'object') return null;
  const id = forcedId ?? (typeof body.id === 'string' ? body.id : '');
  if (!ID_PATTERN.test(id)) return null;

  const titleBn = cleanText(body.titleBn, 200);
  if (!titleBn) return null;

  const category: ManifestoCategory = MANIFESTO_CATEGORY_IDS.has(body.category)
    ? body.category
    : 'roads_infrastructure';
  const status: ManifestoStatus = MANIFESTO_STATUSES.includes(body.status) ? body.status : 'planned';
  const progress = Math.max(0, Math.min(100, Math.round(Number(body.progressPercentage) || 0)));

  const milestones = Array.isArray(body.milestones)
    ? body.milestones.slice(0, 30).map((m: any, i: number) => ({
        id: ID_PATTERN.test(String(m?.id)) ? String(m.id) : `m-${Date.now()}-${i}`,
        textBn: cleanText(m?.textBn, 300),
        textEn: cleanText(m?.textEn, 300),
        isDone: m?.isDone === true,
      }))
    : [];

  return {
    id,
    titleBn,
    titleEn: cleanText(body.titleEn, 200),
    category,
    summaryBn: cleanText(body.summaryBn, 500),
    summaryEn: cleanText(body.summaryEn, 500),
    descriptionBn: cleanText(body.descriptionBn, 3000),
    descriptionEn: cleanText(body.descriptionEn, 3000),
    progressPercentage: progress,
    status,
    targetYear: cleanText(body.targetYear, 40),
    budgetOrScope: cleanText(body.budgetOrScope, 300),
    milestones,
    lastUpdated: new Date().toISOString(),
  };
}

function parseProfile(body: any): LeaderProfile | null {
  if (!body || typeof body !== 'object') return null;
  const name = cleanText(body.name, 80);
  if (!name) return null;
  return {
    name,
    designation: cleanText(body.designation, 120),
    promise: cleanText(body.promise, 150),
    mainSlogan: cleanText(body.mainSlogan, 150),
    subSlogan: cleanText(body.subSlogan, 150),
    heroAnnouncement: cleanText(body.heroAnnouncement, 200),
    profileImage: '/leader.jpg', // ছবি আলাদা পথে বদলায় (PUT /api/profile/photo)
    phone: cleanPhone(body.phone) || '',
    email: cleanText(body.email, 80),
    officeAddress: cleanText(body.officeAddress, 200),
  };
}

const MAX_PHOTO_BYTES = 400 * 1024;
const PHOTO_DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

/** ছবির data URL যাচাই: ধরন, আকার ও ফাইলের আসল শুরুর বাইট (magic bytes) মেলে কিনা */
function parsePhotoDataUrl(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > Math.ceil(MAX_PHOTO_BYTES * 1.4) + 64) return null;
  const m = PHOTO_DATA_URL.exec(input);
  if (!m) return null;
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length < 12 || buf.length > MAX_PHOTO_BYTES) return null;
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isWebp = buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  const kind = m[1];
  if ((kind === 'jpeg' && !isJpeg) || (kind === 'png' && !isPng) || (kind === 'webp' && !isWebp)) return null;
  return input;
}

const WARD_VILLAGES_KEY = 'wardVillages';

function parseWardVillages(body: any): Record<string, string> | null {
  if (!body || typeof body !== 'object' || typeof body.wardVillages !== 'object' || body.wardVillages === null) return null;
  const out: Record<string, string> = {};
  for (const id of WARD_IDS) {
    const v = cleanText((body.wardVillages as Record<string, unknown>)[id], 80);
    if (v) out[id] = v;
  }
  return out;
}

async function readWardVillages(): Promise<Record<string, string>> {
  try {
    const raw = await getSetting(WARD_VILLAGES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const out: Record<string, string> = {};
    for (const id of WARD_IDS) {
      if (typeof parsed?.[id] === 'string') out[id] = parsed[id];
    }
    return out;
  } catch {
    return {};
  }
}

// জরুরি সেবার নম্বর (সবার জন্য খোলা)। জাতীয় নম্বরগুলো ডিফল্ট; থানা/হেলথ ডেস্কের নম্বর অ্যাডমিন বসান।
// (এই ডিফল্ট src/data/emergencyData.ts-এও আছে; দুই জায়গায় মিলিয়ে রাখুন)
const EMERGENCY_KEY = 'emergencyContacts';
const EMERGENCY_FIELDS = ['national', 'fire', 'police', 'health'] as const;
type EmergencyField = (typeof EMERGENCY_FIELDS)[number];
type EmergencyContacts = Record<EmergencyField, string>;
const DEFAULT_EMERGENCY: EmergencyContacts = { national: '999', fire: '102', police: '', health: '16263' };

// নম্বরে শুধু অঙ্ক, +, -, ফাঁকা থাকতে পারে (বাংলা অঙ্ক ইংরেজিতে বদলে নিই), সর্বোচ্চ ২০ অক্ষর
function cleanPhoneNumber(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)))
    .replace(/[^0-9+\- ]/g, '')
    .trim()
    .slice(0, 20);
}

function parseEmergency(body: any): EmergencyContacts | null {
  const raw = body?.emergencyContacts;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = { ...DEFAULT_EMERGENCY };
  for (const f of EMERGENCY_FIELDS) {
    if (f in raw) out[f] = cleanPhoneNumber((raw as Record<string, unknown>)[f]);
  }
  return out;
}

async function readEmergency(): Promise<EmergencyContacts> {
  try {
    const raw = await getSetting(EMERGENCY_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const out = { ...DEFAULT_EMERGENCY };
    for (const f of EMERGENCY_FIELDS) {
      if (typeof parsed?.[f] === 'string') out[f] = cleanPhoneNumber(parsed[f]);
    }
    return out;
  } catch {
    return { ...DEFAULT_EMERGENCY };
  }
}

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(securityHeaders);
  // সাধারণ রিকোয়েস্ট ১০০KB; শুধু লগইন-করা অ্যাডমিনের ছবি আপলোডে বেশি
  const smallJson = express.json({ limit: '100kb' });
  const photoJson = express.json({ limit: '700kb' });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/api/profile/photo' && req.method === 'PUT' && readSessionCookie(req)) return photoJson(req, res, next);
    return smallJson(req, res, next);
  });
  app.use('/api', sameOriginOnly);

  // ডেটাবেস একবারই প্রস্তুত করা হয় (serverless-এও কাজ করে)
  let dbReady: Promise<void> | null = null;
  const ensureDb = () => {
    if (!dbReady) {
      dbReady = initDatabase().catch((err) => {
        dbReady = null;
        throw err;
      });
    }
    return dbReady;
  };

  const needsDb = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await ensureDb();
      next();
    } catch (err) {
      console.error('[DB] init failed:', err);
      res.status(503).json({ error: 'ডেটাবেস এই মুহূর্তে প্রস্তুত নয়। একটু পরে আবার চেষ্টা করুন।' });
    }
  };

  /** Turso ছাড়া Vercel-এ লেখা হলে তথ্য হারিয়ে যায়; তাই লেখা বন্ধ */
  const needsPersistentDb = (_req: Request, res: Response, next: NextFunction) => {
    if (!isDbPersistent) {
      return res.status(503).json({
        error: 'সার্ভারে স্থায়ী ডেটাবেস (Turso) সেট করা নেই, তাই এখন তথ্য জমা নেওয়া যাচ্ছে না।',
      });
    }
    next();
  };

  // ডেটাবেস লাগে এমন সব রুট (লগইন-সেশনও ডেটাবেসে থাকে)
  app.use('/api', needsDb);

  // সব API-তে মোটা সীমা (অতিরিক্ত অনুরোধ আটকাতে; গ্রামের শেয়ার-করা নেটওয়ার্কের কথা ভেবে উদার)
  app.use('/api', rateLimit('api', 600, 10 * 60 * 1000, 'অনেক বেশি অনুরোধ হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।'));

  // ==========================================
  // লগইন ও সেশন
  // ==========================================
  type Staff = SessionInfo;

  async function loadStaff(req: Request): Promise<Staff | null> {
    const sid = readSessionCookie(req);
    if (!sid) return null;
    return getSession(hashSessionId(sid));
  }

  /** শুধু মূল প্রশাসক (আপনি) */
  const requireOwner = async (req: Request, res: Response, next: NextFunction) => {
    if (!isAuthConfigured()) {
      return res.status(503).json({ error: 'অ্যাডমিন লগইন এখনো সেটআপ করা হয়নি (ADMIN_PASSWORD দিন)।' });
    }
    try {
      const staff = await loadStaff(req);
      if (!staff || staff.role !== 'owner') return res.status(401).json({ error: 'অ্যাডমিন লগইন প্রয়োজন।' });
      res.locals.staff = staff;
      next();
    } catch (err) {
      console.error('Session check failed:', err);
      res.status(500).json({ error: 'যাচাই করা যায়নি।' });
    }
  };

  const staffOf = (res: Response) => res.locals.staff as Staff;
  const audit = (res: Response, action: string, target = '', detail = '') => {
    const st = staffOf(res);
    return addAudit({ actor: st.username, role: st.role, action, target, detail });
  };

  // দুই ধাপের গোপন চাবি: ফাঁকা বা RESET_ADMIN_2FA=true হলে বন্ধ। (null = বন্ধ)
  async function getTotpSecret(): Promise<string | null> {
    if (process.env.RESET_ADMIN_2FA === 'true') return null;
    const v = await getSetting('totp_secret');
    if (!v) return null;
    return unseal(v); // চাবি হারালে '' ফেরে; তখনো কোড চাওয়া হয় (নিরাপদ দিক)
  }
  const TOTP_LAST = 'totp_last';

  app.post(
    '/api/admin/login',
    rateLimit('login', 10, 15 * 60 * 1000, 'অনেকবার ভুল চেষ্টা হয়েছে। ১৫ মিনিট পরে আবার চেষ্টা করুন।'),
    async (req: Request, res: Response) => {
      try {
        if (!isAuthConfigured()) {
          return res.status(503).json({ error: 'অ্যাডমিন লগইন এখনো সেটআপ করা হয়নি।' });
        }
        const password = typeof req.body?.password === 'string' ? req.body.password.slice(0, 200) : '';
        const actor = 'owner';

        // সব IP মিলিয়ে ১৫ মিনিটে ৩০টি ভুল হলে সাময়িক বন্ধ (একই IP থেকে ১০টিতেই আলাদা সীমা আছে)।
        // সীমা বেশি রাখা হয়েছে যেন অন্য কেউ ইচ্ছে করে ভুল দিয়ে আপনাকে ঢুকতে বাধা দিতে না পারে।
        const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        if ((await countAudit('login_fail', actor, since)) >= 30) {
          return res.status(429).json({ error: 'অনেকবার ভুল চেষ্টা হয়েছে। ১৫ মিনিট পরে আবার চেষ্টা করুন।' });
        }
        const fail = async (message: string, extra: Record<string, unknown> = {}) => {
          await addAudit({ actor, role: 'owner', action: 'login_fail' });
          return res.status(401).json({ error: message, ...extra });
        };

        if (!checkPassword(password)) return fail('পাসওয়ার্ড সঠিক নয়।');
        const secret = await getTotpSecret();
        if (secret !== null) {
          if (!req.body?.code) {
            return res.status(401).json({ error: 'দুই ধাপের কোড দিন (অথেনটিকেটর অ্যাপ থেকে ৬ অঙ্ক)।', needs2fa: true });
          }
          const last = Number((await getSetting(TOTP_LAST)) || 0);
          const counter = secret ? totpVerify(secret, req.body.code, last) : null;
          if (counter === null) return fail('কোডটি সঠিক নয় বা মেয়াদ শেষ।', { needs2fa: true });
          await setSetting(TOTP_LAST, String(counter));
        }
        const info: SessionInfo = { role: 'owner', username: 'owner', displayName: 'মূল প্রশাসক' };

        const sid = newSessionId();
        const expires = Date.now() + SESSION_MS;
        await createSession(hashSessionId(sid), info, expires);
        setAdminCookie(res, sid);
        await addAudit({ actor: info.username, role: info.role, action: 'login_ok' });
        res.json({ success: true, expires, role: info.role, displayName: info.displayName });
      } catch (err) {
        console.error('Login failed:', err);
        res.status(500).json({ error: 'লগইন করা যায়নি। আবার চেষ্টা করুন।' });
      }
    }
  );

  app.post('/api/admin/logout', async (req: Request, res: Response) => {
    try {
      const sid = readSessionCookie(req);
      if (sid) {
        const hash = hashSessionId(sid);
        const staff = await getSession(hash);
        await deleteSession(hash); // সার্ভারে সেশন মুছে যায়, তাই পুরনো কুকি আর চলবে না
        if (staff) await addAudit({ actor: staff.username, role: staff.role, action: 'logout' });
      }
    } catch (err) {
      console.error('Logout cleanup failed:', err);
    }
    clearAdminCookie(res);
    res.json({ success: true });
  });

  app.get('/api/admin/session', async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    let staff: Staff | null = null;
    try {
      staff = await loadStaff(req);
    } catch {
      staff = null;
    }
    const owner = staff?.role === 'owner';
    res.json({
      authenticated: Boolean(staff),
      configured: isAuthConfigured(),
      role: staff?.role,
      displayName: staff?.displayName,
      ...(owner ? { twoFactor: (await getTotpSecret()) !== null, encryption: isEncryptionEnabled() } : {}),
    });
  });

  // ==========================================
  // সবার জন্য (পাবলিক)
  // ==========================================

  // শুধু সমষ্টিগত পরিসংখ্যান (ব্যক্তিগত রেকর্ড নয়)
  app.get('/api/stats', async (_req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'public, max-age=30');
      res.json(await getPublicStats());
    } catch (err) {
      console.error('Failed to get stats:', err);
      res.status(500).json({ error: 'পরিসংখ্যান আনা যায়নি।' });
    }
  });

  app.post(
    '/api/problems',
    rateLimit('submit', 15, 60 * 60 * 1000, 'অল্প সময়ে অনেকগুলো জমা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।'),
    needsPersistentDb,
    async (req: Request, res: Response) => {
      try {
        const parsed = parseNewProblem(req.body);
        if (!parsed.ok) return res.status(400).json({ error: parsed.error });
        // একই নম্বর থেকে ২৪ ঘণ্টায় ৮টির বেশি নয় (ভুলবশত বা অপব্যবহারে বারবার জমা ঠেকাতে)
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        if ((await countRecentByPhone(parsed.value.phone, since)) >= 8) {
          return res.status(429).json({ error: 'এই নম্বর থেকে আজ অনেকগুলো জমা হয়েছে। আগামীকাল আবার চেষ্টা করুন।' });
        }
        const created = await createProblemRecord(parsed.value);
        res.status(201).json(toTrackView(created));
      } catch (err) {
        console.error('Failed to create problem:', err);
        res.status(500).json({ error: 'জমা নেওয়া যায়নি। একটু পরে আবার চেষ্টা করুন।' });
      }
    }
  );

  // অভিযোগের অবস্থা: মোবাইল নম্বর + রেফারেন্স কোড (যেমন JNS-2026-483627)। নম্বর ভুল না কোড ভুল, তা বলা হয় না।
  // প্রতি নম্বরে ঘণ্টায় ৫ বারের বেশি কোড যাচাই হয় না (ডেটাবেসে গোনা); এক IP থেকে ভুল চেষ্টাও সীমিত।
  const trackFails = failLimiter('trackfail', 8, 15 * 60 * 1000);
  app.post(
    '/api/track',
    rateLimit('track', 30, 10 * 60 * 1000, 'অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।'),
    async (req: Request, res: Response) => {
      try {
        res.setHeader('Cache-Control', 'no-store');
        const wait = trackFails.blocked(req);
        if (wait) {
          res.setHeader('Retry-After', String(wait));
          return res.status(429).json({ error: 'অনেকবার চেষ্টা হয়েছে। ১৫ মিনিট পরে আবার চেষ্টা করুন।' });
        }
        const phone = normalizeBdMobile(typeof req.body?.phone === 'string' ? req.body.phone : '');
        if (!phone) return res.status(400).json({ error: 'সঠিক মোবাইল নম্বর লিখুন (যেমন ০১৭XXXXXXXX)।' });
        const code = cleanTrackCode(req.body?.code);
        if (!isValidTrackCode(code)) return res.status(400).json({ error: 'আপনার রেফারেন্স কোড লিখুন (যেমন JNS-2026-483627)।' });

        const gate = await consumeTrackAttempt(phone);
        if (!gate.allowed) {
          res.setHeader('Retry-After', String(gate.retryAfterSec));
          return res.status(429).json({
            error: 'এই নম্বরে অনেকবার ভুল কোড দেওয়া হয়েছে। এক ঘণ্টা পরে আবার চেষ্টা করুন, অথবা অফিসে ফোন করুন।',
          });
        }
        const found = await findProblemsByPhoneAndCode(phone, code);
        if (!found.length) {
          trackFails.fail(req);
          return res.status(404).json({ error: 'not_found' });
        }
        await clearTrackAttempts(phone);
        res.json(found.map(toTrackView));
      } catch (err) {
        console.error('Track failed:', err);
        res.status(500).json({ error: 'অনুসন্ধান করা যায়নি। আবার চেষ্টা করুন।' });
      }
    }
  );

  app.get('/api/manifesto', async (_req: Request, res: Response) => {
    try {
      res.json(await getAllManifestoItems());
    } catch (err) {
      console.error('Failed to get manifesto items:', err);
      res.status(500).json({ error: 'ইশতেহার আনা যায়নি।' });
    }
  });

  app.get('/api/profile', async (_req: Request, res: Response) => {
    try {
      res.json(await getLeaderProfile());
    } catch (err) {
      console.error('Failed to get leader profile:', err);
      res.status(500).json({ error: 'প্রোফাইল আনা যায়নি।' });
    }
  });

  // অ্যাডমিনের আপলোড করা ছবি (না থাকলে ডিফল্ট ছবিতে পাঠাই)
  app.get('/api/profile/photo', async (req: Request, res: Response) => {
    try {
      const dataUrl = await getLeaderPhotoDataUrl();
      const m = dataUrl ? PHOTO_DATA_URL.exec(dataUrl) : null;
      if (!dataUrl || !m) {
        res.statusCode = 302;
        res.setHeader('Location', '/leader.jpg');
        res.end();
        return;
      }
      res.setHeader('Content-Type', `image/${m[1]}`);
      // URL-এ ?v=... থাকে, ছবি বদলালে URL বদলায়, তাই লম্বা ক্যাশ নিরাপদ
      res.setHeader('Cache-Control', req.query?.v ? 'public, max-age=31536000, immutable' : 'no-cache');
      res.end(Buffer.from(m[2], 'base64'));
    } catch (err) {
      console.error('Failed to serve leader photo:', err);
      res.status(500).json({ error: 'ছবি আনা যায়নি।' });
    }
  });

  // সাইটের পাবলিক সেটিংস (ওয়ার্ডের গ্রামের নাম + জরুরি সেবার নম্বর)
  app.get('/api/settings', async (_req: Request, res: Response) => {
    try {
      res.json({ wardVillages: await readWardVillages(), emergencyContacts: await readEmergency() });
    } catch (err) {
      console.error('Failed to get settings:', err);
      res.status(500).json({ error: 'সেটিংস আনা যায়নি।' });
    }
  });

  // ==========================================
  // অভিযোগ পরিচালনা (শুধু আপনি)
  // ==========================================

  // নাম-ফোনসহ পূর্ণ তালিকা
  app.get('/api/admin/problems', requireOwner, async (_req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const all = await getAllProblems();
      // ব্যক্তিগত তথ্য দেখার রেকর্ড (৫ মিনিটে একবার; গোনা-সংখ্যা ছাড়া কিছু লেখা হয় না)
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      if ((await countAudit('view_identity', 'owner', since)) === 0) {
        await audit(res, 'view_identity', '', `${all.length}টি অভিযোগ`);
      }
      res.json(all);
    } catch (err) {
      console.error('Failed to get admin problems:', err);
      res.status(500).json({ error: 'তথ্য আনা যায়নি।' });
    }
  });

  app.patch('/api/problems/:id', requireOwner, needsPersistentDb, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!ID_PATTERN.test(id)) return res.status(400).json({ error: 'ভুল আইডি।' });
      const status = req.body?.status as ProblemStatus;
      if (!STATUSES.includes(status)) return res.status(400).json({ error: 'অবস্থা সঠিক নয়।' });
      const noteText = cleanText(req.body?.noteText, 500);
      // যোগাযোগ বা সম্পন্ন দাবি করতে হলে বাস্তব ব্যাখ্যা লিখতেই হবে
      if (NOTE_REQUIRED_STATUSES.includes(status) && noteText.length < 5) {
        return res.status(400).json({ error: 'এই অবস্থার জন্য সংক্ষেপে কী করা হয়েছে তা লিখুন (কমপক্ষে ৫ অক্ষর)।' });
      }
      const updated = await updateProblemStatus(id, status, noteText, 'মূল প্রশাসক');
      if (!updated) return res.status(404).json({ error: 'অভিযোগ পাওয়া যায়নি।' });
      await audit(res, 'status_change', id, `অবস্থা: ${status}`);
      res.json(updated);
    } catch (err) {
      console.error('Failed to update problem status:', err);
      res.status(500).json({ error: 'হালনাগাদ করা যায়নি।' });
    }
  });

  // শ্রেণিবিন্যাস: সমস্যার ধরন ও জরুরি মাত্রা
  app.patch('/api/problems/:id/classify', requireOwner, needsPersistentDb, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!ID_PATTERN.test(id)) return res.status(400).json({ error: 'ভুল আইডি।' });
      if (!CATEGORY_IDS.has(req.body?.category)) return res.status(400).json({ error: 'সমস্যার ধরন সঠিক নয়।' });
      const urgency: UrgencyLevel = URGENCY.includes(req.body?.urgency) ? req.body.urgency : 'normal';
      const updated = await classifyProblem(id, req.body.category, urgency);
      if (!updated) return res.status(404).json({ error: 'অভিযোগ পাওয়া যায়নি।' });
      await audit(res, 'classify', id, `${req.body.category}/${urgency}`);
      res.json(updated);
    } catch (err) {
      console.error('Failed to classify problem:', err);
      res.status(500).json({ error: 'হালনাগাদ করা যায়নি।' });
    }
  });

  // ==========================================
  // শুধু মূল প্রশাসক
  // ==========================================
  app.get('/api/status', requireOwner, async (_req: Request, res: Response) => {
    try {
      res.json(await getDatabaseStatus());
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Internal database error' });
    }
  });

  app.delete('/api/problems/:id', requireOwner, needsPersistentDb, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!ID_PATTERN.test(id)) return res.status(400).json({ error: 'ভুল আইডি।' });
      const success = await deleteProblem(id);
      if (!success) return res.status(404).json({ error: 'অভিযোগ পাওয়া যায়নি।' });
      await audit(res, 'delete_problem', id);
      res.json({ success: true, id });
    } catch (err) {
      console.error('Failed to delete problem:', err);
      res.status(500).json({ error: 'মোছা যায়নি।' });
    }
  });

  // --- মূল প্রশাসকের দুই ধাপের লগইন (অথেনটিকেটর অ্যাপ) ---
  app.post('/api/admin/2fa/setup', requireOwner, needsPersistentDb, async (req: Request, res: Response) => {
    try {
      if (!checkPassword(req.body?.password)) return res.status(401).json({ error: 'পাসওয়ার্ড সঠিক নয়।' });
      if ((await getTotpSecret()) !== null) return res.status(400).json({ error: 'দুই ধাপের লগইন আগেই চালু আছে।' });
      const secret = generateTotpSecret();
      await setSetting('totp_pending', seal(secret));
      res.json({ secret, uri: totpUri(secret, 'owner') });
    } catch (err) {
      console.error('2FA setup failed:', err);
      res.status(500).json({ error: 'চালু করা যায়নি।' });
    }
  });

  app.post('/api/admin/2fa/enable', requireOwner, needsPersistentDb, async (req: Request, res: Response) => {
    try {
      const pending = unseal((await getSetting('totp_pending')) || '');
      if (!pending) return res.status(400).json({ error: 'আগে "চালু করুন" চাপুন।' });
      const counter = totpVerify(pending, req.body?.code, 0);
      if (counter === null) return res.status(400).json({ error: 'কোডটি সঠিক নয়। অ্যাপের বর্তমান ৬ অঙ্ক দিন।' });
      await setSetting('totp_secret', seal(pending));
      await setSetting('totp_pending', '');
      await setSetting(TOTP_LAST, String(counter));
      await audit(res, '2fa_enable');
      res.json({ success: true });
    } catch (err) {
      console.error('2FA enable failed:', err);
      res.status(500).json({ error: 'চালু করা যায়নি।' });
    }
  });

  app.post('/api/admin/2fa/disable', requireOwner, needsPersistentDb, async (req: Request, res: Response) => {
    try {
      if (!checkPassword(req.body?.password)) return res.status(401).json({ error: 'পাসওয়ার্ড সঠিক নয়।' });
      const secret = await getTotpSecret();
      if (secret === null) return res.status(400).json({ error: 'দুই ধাপের লগইন চালু নেই।' });
      const last = Number((await getSetting(TOTP_LAST)) || 0);
      if (!secret || totpVerify(secret, req.body?.code, last) === null) {
        return res.status(400).json({ error: 'কোডটি সঠিক নয়।' });
      }
      await setSetting('totp_secret', '');
      await audit(res, '2fa_disable');
      res.json({ success: true });
    } catch (err) {
      console.error('2FA disable failed:', err);
      res.status(500).json({ error: 'বন্ধ করা যায়নি।' });
    }
  });

  // --- নিরীক্ষা-খাতা (শুধু পড়া যায়) ---
  app.get('/api/admin/audit', requireOwner, async (req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      res.json(await listAudit(Number(req.query?.limit) || 200));
    } catch (err) {
      console.error('Failed to read audit log:', err);
      res.status(500).json({ error: 'খাতা আনা যায়নি।' });
    }
  });

  // CSV নামানোর আগে ফ্রন্টএন্ড এটি ডাকে, যেন "কে কখন নামাল" খাতায় থাকে
  app.post('/api/admin/export-log', requireOwner, async (_req: Request, res: Response) => {
    await audit(res, 'export_csv');
    res.json({ success: true });
  });

  // --- ব্যাকআপ (নাম-ফোনসহ সব; শুধু মূল প্রশাসক) ---
  app.get('/api/admin/backup', requireOwner, async (_req: Request, res: Response) => {
    try {
      const data = await exportBackup();
      await audit(res, 'backup_download', '', `${data.problems.length}টি অভিযোগ`);
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="dhamti-backup-${new Date().toISOString().slice(0, 10)}.json"`);
      res.send(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Backup failed:', err);
      res.status(500).json({ error: 'ব্যাকআপ নেওয়া যায়নি।' });
    }
  });

  app.post('/api/manifesto', requireOwner, needsPersistentDb, async (req: Request, res: Response) => {
    try {
      const item = parseManifestoItem(req.body);
      if (!item) return res.status(400).json({ error: 'ইশতেহারের তথ্য সঠিক নয়।' });
      res.status(201).json(await insertManifestoItem(item));
    } catch (err) {
      console.error('Failed to create manifesto item:', err);
      res.status(500).json({ error: 'সংরক্ষণ করা যায়নি।' });
    }
  });

  app.put('/api/manifesto/:id', requireOwner, needsPersistentDb, async (req: Request, res: Response) => {
    try {
      const item = parseManifestoItem(req.body, req.params.id);
      if (!item) return res.status(400).json({ error: 'ইশতেহারের তথ্য সঠিক নয়।' });
      res.json(await updateManifestoItem(item));
    } catch (err) {
      console.error('Failed to update manifesto item:', err);
      res.status(500).json({ error: 'হালনাগাদ করা যায়নি।' });
    }
  });

  app.delete('/api/manifesto/:id', requireOwner, needsPersistentDb, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!ID_PATTERN.test(id)) return res.status(400).json({ error: 'ভুল আইডি।' });
      const success = await deleteManifestoItem(id);
      if (!success) return res.status(404).json({ error: 'পাওয়া যায়নি।' });
      res.json({ success: true, id });
    } catch (err) {
      console.error('Failed to delete manifesto item:', err);
      res.status(500).json({ error: 'মোছা যায়নি।' });
    }
  });

  app.delete('/api/manifesto-completed/bulk', requireOwner, needsPersistentDb, async (_req: Request, res: Response) => {
    try {
      res.json({ success: true, deletedCount: await deleteCompletedManifestos() });
    } catch (err) {
      console.error('Failed to delete completed manifestos:', err);
      res.status(500).json({ error: 'মোছা যায়নি।' });
    }
  });

  app.post('/api/manifesto/reset', requireOwner, needsPersistentDb, async (_req: Request, res: Response) => {
    try {
      res.json(await resetManifestoItems(INITIAL_MANIFESTO_ITEMS));
    } catch (err) {
      console.error('Failed to reset manifesto:', err);
      res.status(500).json({ error: 'রিসেট করা যায়নি।' });
    }
  });

  app.put('/api/profile', requireOwner, needsPersistentDb, async (req: Request, res: Response) => {
    try {
      const profile = parseProfile(req.body);
      if (!profile) return res.status(400).json({ error: 'প্রোফাইলের তথ্য সঠিক নয়।' });
      res.json(await updateLeaderProfile(profile));
    } catch (err) {
      console.error('Failed to update leader profile:', err);
      res.status(500).json({ error: 'হালনাগাদ করা যায়নি।' });
    }
  });

  app.put('/api/profile/photo', requireOwner, needsPersistentDb, async (req: Request, res: Response) => {
    try {
      const dataUrl = parsePhotoDataUrl(req.body?.image);
      if (!dataUrl) {
        return res.status(400).json({ error: 'ছবিটি সঠিক নয়। JPG, PNG বা WEBP ছবি দিন (সর্বোচ্চ ৪০০ কিলোবাইট)।' });
      }
      res.json(await setLeaderPhoto(dataUrl));
    } catch (err) {
      console.error('Failed to save leader photo:', err);
      res.status(500).json({ error: 'ছবি সংরক্ষণ করা যায়নি।' });
    }
  });

  app.delete('/api/profile/photo', requireOwner, needsPersistentDb, async (_req: Request, res: Response) => {
    try {
      res.json(await setLeaderPhoto(null));
    } catch (err) {
      console.error('Failed to reset leader photo:', err);
      res.status(500).json({ error: 'ছবি বদলানো যায়নি।' });
    }
  });

  app.put('/api/settings', requireOwner, needsPersistentDb, async (req: Request, res: Response) => {
    try {
      const hasVillages = req.body && typeof req.body === 'object' && 'wardVillages' in req.body;
      const hasEmergency = req.body && typeof req.body === 'object' && 'emergencyContacts' in req.body;
      if (!hasVillages && !hasEmergency) return res.status(400).json({ error: 'সেটিংসের তথ্য সঠিক নয়।' });
      const villages = hasVillages ? parseWardVillages(req.body) : null;
      const emergency = hasEmergency ? parseEmergency(req.body) : null;
      if ((hasVillages && !villages) || (hasEmergency && !emergency)) {
        return res.status(400).json({ error: 'সেটিংসের তথ্য সঠিক নয়।' });
      }
      if (villages) await setSetting(WARD_VILLAGES_KEY, JSON.stringify(villages));
      if (emergency) await setSetting(EMERGENCY_KEY, JSON.stringify(emergency));
      res.json({ wardVillages: await readWardVillages(), emergencyContacts: await readEmergency() });
    } catch (err) {
      console.error('Failed to save settings:', err);
      res.status(500).json({ error: 'সংরক্ষণ করা যায়নি।' });
    }
  });

  // অজানা /api পথ
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'পথ পাওয়া যায়নি।' });
  });

  return app;
}
