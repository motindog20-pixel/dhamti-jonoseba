import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, KeyRound, Download, ScrollText, CheckCircle2 } from 'lucide-react';
import { api, ApiError, AdminSessionInfo, AuditEntry } from '../services/api';
import { Language } from '../types';

interface Props {
  language: Language;
  session: AdminSessionInfo | null;
  onSessionChanged: () => void;
}

const ACTION_BN: Record<string, string> = {
  login_ok: 'লগইন সফল',
  login_fail: 'ভুল লগইন চেষ্টা',
  logout: 'লগআউট',
  status_change: 'অবস্থা বদল',
  classify: 'ধরন বদল',
  delete_problem: 'অভিযোগ মোছা',
  view_identity: 'নাম-ফোন সহ তালিকা দেখা',
  export_csv: 'CSV নামানো',
  backup_download: 'ব্যাকআপ নামানো',
  '2fa_enable': '২-ধাপ চালু',
  '2fa_disable': '২-ধাপ বন্ধ',
};

/** নিরাপত্তা ট্যাব: এনক্রিপশনের অবস্থা, ২-ধাপের লগইন, ব্যাকআপ, কার্যকলাপের খাতা */
export const AdminSecurityPanel: React.FC<Props> = ({ language, session, onSessionChanged }) => {
  const bn = language === 'bn';
  const errText = (err: unknown) => (err instanceof ApiError ? err.message : bn ? 'ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।' : 'Network problem.');

  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [audit, setAudit] = useState<AuditEntry[] | null>(null);
  const [auditError, setAuditError] = useState('');

  const loadAudit = () =>
    api
      .getAudit()
      .then((list) => {
        setAudit(list);
        setAuditError('');
      })
      .catch((e) => setAuditError(errText(e)));
  useEffect(() => {
    loadAudit();
  }, []);

  const run = async (fn: () => Promise<void>, okText: string) => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: okText });
      onSessionChanged();
      loadAudit();
    } catch (e) {
      setMsg({ ok: false, text: errText(e) });
    } finally {
      setBusy(false);
    }
  };

  const startSetup = () =>
    run(async () => {
      setSetup(await api.twoFactorSetup(password));
      setPassword('');
    }, bn ? 'নিচের গোপন চাবিটি আপনার অথেনটিকেটর অ্যাপে যোগ করুন, তারপর অ্যাপের ৬ অঙ্ক লিখুন।' : 'Add the secret below to your authenticator app, then enter the 6-digit code.');

  const enable = () =>
    run(async () => {
      await api.twoFactorEnable(code);
      setSetup(null);
      setCode('');
    }, bn ? 'দুই ধাপের লগইন চালু হয়েছে। এখন থেকে লগইনে অ্যাপের কোড লাগবে।' : 'Two-step login is on.');

  const disable = () =>
    run(async () => {
      await api.twoFactorDisable(password, code);
      setPassword('');
      setCode('');
    }, bn ? 'দুই ধাপের লগইন বন্ধ হয়েছে।' : 'Two-step login is off.');

  const input = 'w-full px-4 py-3 text-base bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white';
  const btn = 'px-5 py-3 rounded-xl font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 cursor-pointer';

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {msg && (
        <div role="status" className={`p-3 rounded-xl text-sm font-semibold border ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {msg.text}
        </div>
      )}

      {/* ১. এনক্রিপশন */}
      <section className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-base font-bold text-neutral-900 mb-2">
          {session?.encryption ? <ShieldCheck className="w-5 h-5 text-emerald-700" /> : <ShieldAlert className="w-5 h-5 text-red-600" />}
          {bn ? 'তথ্য এনক্রিপশন' : 'Data encryption'}
        </h3>
        {session?.encryption ? (
          <p className="text-sm text-neutral-700 leading-relaxed">
            {bn
              ? 'চালু আছে। নাম, ফোন ও অভিযোগের লেখা কোড করা অবস্থায় ডেটাবেসে থাকে। ভুলেও DATA_ENCRYPTION_KEY বদলাবেন না বা মুছবেন না, নইলে পুরনো তথ্য আর পড়া যাবে না।'
              : 'On. Name, phone and report text are stored encrypted. Never change or delete DATA_ENCRYPTION_KEY or old data becomes unreadable.'}
          </p>
        ) : (
          <p className="text-sm text-red-800 leading-relaxed font-semibold">
            {bn
              ? 'বন্ধ আছে! এখন নাগরিকের তথ্য সাধারণ লেখায় জমা হচ্ছে। Vercel-এ DATA_ENCRYPTION_KEY নামে ৩২+ অক্ষরের গোপন চাবি বসিয়ে Redeploy করুন (SETUP-bn.md দেখুন)।'
              : 'Off! Citizen data is stored as plain text. Set DATA_ENCRYPTION_KEY (32+ chars) on Vercel and redeploy.'}
          </p>
        )}
      </section>

      {/* ২. দুই ধাপের লগইন */}
      <section className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-5 space-y-3">
        <h3 className="flex items-center gap-2 text-base font-bold text-neutral-900">
          <KeyRound className="w-5 h-5 text-emerald-700" />
          {bn ? 'দুই ধাপের লগইন (অথেনটিকেটর অ্যাপ)' : 'Two-step login (authenticator app)'}
          {session?.twoFactor && <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-label="on" />}
        </h3>
        {!session?.twoFactor && !setup && (
          <>
            <p className="text-sm text-neutral-700 leading-relaxed">
              {bn
                ? 'চালু করলে পাসওয়ার্ডের পাশাপাশি আপনার ফোনের Google Authenticator বা Microsoft Authenticator অ্যাপের ৬ অঙ্কের কোড লাগবে। কেউ পাসওয়ার্ড জেনে গেলেও ঢুকতে পারবে না। জরুরি।'
                : 'When on, login also needs the 6-digit code from your authenticator app, so a leaked password alone is not enough.'}
            </p>
            <input type="password" autoComplete="current-password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={bn ? 'এখনকার পাসওয়ার্ড লিখুন' : 'Current password'} />
            <button type="button" disabled={busy || !password} onClick={startSetup} className={btn}>
              {bn ? 'চালু করুন' : 'Turn on'}
            </button>
          </>
        )}
        {setup && (
          <div className="space-y-3">
            <ol className="list-decimal pl-5 text-sm text-neutral-800 space-y-1.5 leading-relaxed">
              <li>{bn ? 'ফোনে Google Authenticator (বা Microsoft Authenticator) অ্যাপ খুলুন।' : 'Open your authenticator app.'}</li>
              <li>{bn ? '"+" চেপে "সেটআপ কী লিখুন" (Enter a setup key) বেছে নিন। নাম: ধামতী। কী: নিচের লেখাটি।' : 'Choose "Enter a setup key", name it Dhamti, key: the text below.'}</li>
              <li>{bn ? 'অ্যাপে যে ৬ অঙ্ক দেখাচ্ছে তা নিচে লিখে "নিশ্চিত করুন" চাপুন।' : 'Type the 6 digits shown and press Confirm.'}</li>
            </ol>
            <div className="p-3 rounded-xl bg-neutral-100 font-mono text-base sm:text-lg tracking-widest break-all select-all text-center">{setup.secret}</div>
            <p className="text-xs text-red-700 font-semibold">{bn ? 'এই চাবিটি অন্য কাউকে দেবেন না, চ্যাটে পাঠাবেন না।' : 'Never share this key.'}</p>
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={input + ' text-center text-2xl tracking-widest'} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" />
            <button type="button" disabled={busy || code.length !== 6} onClick={enable} className={btn}>
              {bn ? 'নিশ্চিত করুন' : 'Confirm'}
            </button>
          </div>
        )}
        {session?.twoFactor && (
          <div className="space-y-3">
            <p className="text-sm text-emerald-900 font-semibold">{bn ? 'চালু আছে।' : 'On.'}</p>
            <p className="text-xs text-neutral-600 leading-relaxed">
              {bn
                ? 'ফোন হারালে: Vercel-এ RESET_ADMIN_2FA = true বসিয়ে Redeploy করলে শুধু পাসওয়ার্ডে ঢোকা যাবে; ঢুকে নতুন করে চালু করে ওই ভেরিয়েবলটি মুছে দিন।'
                : 'Lost phone: set RESET_ADMIN_2FA=true on Vercel and redeploy, log in with the password, re-enable, then remove the variable.'}
            </p>
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold text-neutral-700">{bn ? 'বন্ধ করতে চান?' : 'Turn off?'}</summary>
              <div className="mt-3 space-y-3">
                <input type="password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={bn ? 'পাসওয়ার্ড' : 'Password'} />
                <input inputMode="numeric" maxLength={6} className={input} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder={bn ? 'অ্যাপের ৬ অঙ্ক' : '6-digit code'} />
                <button type="button" disabled={busy || !password || code.length !== 6} onClick={disable} className="px-5 py-3 rounded-xl font-bold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 cursor-pointer">
                  {bn ? 'বন্ধ করুন' : 'Turn off'}
                </button>
              </div>
            </details>
          </div>
        )}
      </section>

      {/* ৩. ব্যাকআপ */}
      <section className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-5 space-y-3">
        <h3 className="flex items-center gap-2 text-base font-bold text-neutral-900">
          <Download className="w-5 h-5 text-emerald-700" /> {bn ? 'ব্যাকআপ' : 'Backup'}
        </h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          {bn
            ? 'সব অভিযোগ, ইশতেহার ও সেটিংসের একটি ফাইল নামান। ফাইলে নাগরিকের নাম-ফোন থাকে (পড়ার মতো অবস্থায়), তাই ফোন/পিসির নিরাপদ জায়গায় রাখুন, কাউকে পাঠাবেন না। সপ্তাহে একবার নেওয়া ভালো।'
            : 'Download one file with all reports, manifesto and settings. It contains names and phones in readable form, so keep it safe.'}
        </p>
        <button type="button" disabled={busy} onClick={() => run(() => api.downloadBackup(), bn ? 'ব্যাকআপ ফাইল নামানো হয়েছে।' : 'Backup downloaded.')} className={btn}>
          {bn ? 'ব্যাকআপ নামান' : 'Download backup'}
        </button>
      </section>

      {/* ৪. কার্যকলাপের খাতা */}
      <section className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-base font-bold text-neutral-900 mb-1">
          <ScrollText className="w-5 h-5 text-emerald-700" /> {bn ? 'কার্যকলাপের খাতা' : 'Activity log'}
        </h3>
        <p className="text-xs text-neutral-500 mb-3">
          {bn ? 'কে কখন কী করেছে তার খাতা। এটি মোছা বা বদলানো যায় না। এতে কোনো নাম, ফোন বা অভিযোগের লেখা থাকে না।' : 'Who did what and when. It cannot be edited or deleted and holds no names, phones or report text.'}
        </p>
        {auditError && <p className="text-sm text-red-700">{auditError}</p>}
        {!audit && !auditError && <p className="text-sm text-neutral-500">{bn ? 'লোড হচ্ছে…' : 'Loading…'}</p>}
        {audit && (
          <ul className="divide-y divide-neutral-100 max-h-80 overflow-y-auto text-sm">
            {audit.length === 0 && <li className="py-2 text-neutral-500">{bn ? 'এখনো কিছু নেই।' : 'Nothing yet.'}</li>}
            {audit.map((e) => (
              <li key={e.id} className="py-2 flex items-start justify-between gap-3">
                <span className={`font-semibold ${e.action === 'login_fail' ? 'text-red-700' : 'text-neutral-800'}`}>
                  {bn ? ACTION_BN[e.action] || e.action : e.action}
                  {e.detail && <span className="font-normal text-neutral-500"> · {e.detail}</span>}
                </span>
                <span className="text-xs text-neutral-500 shrink-0">{new Date(e.at).toLocaleString(bn ? 'bn-BD' : 'en-US')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
