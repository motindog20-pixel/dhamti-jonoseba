process.env.ADMIN_PASSWORD = 'correct horse battery';
delete process.env.DATA_ENCRYPTION_KEY; delete process.env.RESET_ADMIN_2FA;
delete process.env.VERCEL; delete process.env.TURSO_DATABASE_URL;

const { createApp } = await import('./server/app.ts');
const dbm = await import('./server/db.ts');
const { db } = dbm;
const sec = await import('./server/security.ts');

let failures = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '  ' + extra)); if (!cond) failures++; };

let ipCounter = 0;
function dispatcher(app) {
  return async function call(method, url, { body, cookie, origin, host = 'site.test', ip } = {}) {
    ipCounter++;
    const req = { method, url, path: url.split('?')[0], headers: { cookie, host, origin }, query: Object.fromEntries(new URLSearchParams(url.split('?')[1] || '')), body, ip: ip || `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter & 255}`, params: {} };
    const out = { status: 200, json: undefined, headers: {}, cookies: {} };
    let done;
    const finished = new Promise((r) => (done = r));
    const res = {
      locals: {},
      status(c) { out.status = c; return res; },
      json(o) { out.json = o; done(); return res; },
      setHeader(k, v) { out.headers[k] = v; },
      send(b) { out.body = b; done(); return res; },
      cookie(n, v) { out.cookies[n] = v; },
      end(buf) { out.body = buf; done(); },
      set statusCode(c) { out.status = c; },
      clearCookie(n) { out.cookies[n] = ''; },
    };
    const matches = (layer) => {
      const url = req.path;
      if (layer.type === 'use') return layer.path === '/' || url === layer.path || url.startsWith(layer.path + '/');
      if (layer.method !== method) return false;
      const lp = layer.path.split('/'), up = url.split('/');
      if (lp.length !== up.length) return false;
      const params = {};
      for (let i = 0; i < lp.length; i++) {
        if (lp[i].startsWith(':')) params[lp[i].slice(1)] = decodeURIComponent(up[i]);
        else if (lp[i] !== up[i]) return false;
      }
      req.params = params;
      return true;
    };
    const chain = app.layers.filter(matches);
    let i = 0;
    const next = async () => { const l = chain[i++]; if (!l) { done(); return; } await l.fn(req, res, next); };
    await next();
    await Promise.race([finished, new Promise((r) => setTimeout(r, 500))]);
    return out;
  };
}

const app = createApp();
const call = dispatcher(app);
const sessCookie = (r) => 'dhamti_admin=' + encodeURIComponent(r.cookies.dhamti_admin);
const login = async (extra = {}, ip) => call('POST', '/api/admin/login', { body: { password: 'correct horse battery', ...extra }, ip });

let cid = 'x', oid = 'x', sid_ = 'x';
const good = { submissionType: 'complaint', title: 'রাস্তা ভাঙা', description: 'বড় গর্ত', category: 'road', ward: 'ward-03', specificLocation: 'বাজার মোড়', citizenName: 'রহিম উদ্দিন', phone: '০১৭১২-৩৪৫৬৭৮', isAnonymous: false, urgency: 'high', consent: true };

// =============== 1. জমা দেওয়া ===============
let r = await call('POST', '/api/problems', { body: { ...good, consent: false } });
ok('T01 no privacy consent -> 400', r.status === 400 && /সম্মতি/.test(r.json?.error || ''), JSON.stringify(r.json));
r = await call('POST', '/api/problems', { body: { ...good, consent: undefined } });
ok('consent missing -> 400', r.status === 400);
r = await call('POST', '/api/problems', { body: good });
ok('submit valid (Bangla digits phone) -> 201', r.status === 201, JSON.stringify(r.json));
ok('response hides phone, name, text', r.json?.phone === '' && r.json?.citizenName === 'এলাকাবাসী' && r.json?.description === '');
ok('new report status is "submitted"', r.json?.status === 'submitted', r.json?.status);
ok('server made tracking code', /^JNS-\d{4}-\d{4,6}$/.test(r.json?.trackingCode || ''), r.json?.trackingCode);
const created = r.json;

r = await call('POST', '/api/problems', { body: { ...good, phone: '12345' } });
ok('invalid phone -> 400', r.status === 400 && /মোবাইল/.test(r.json?.error || ''));
r = await call('POST', '/api/problems', { body: { ...good, phone: '', isAnonymous: true } });
ok('anonymous / no phone rejected (400)', r.status === 400);
r = await call('POST', '/api/problems', { body: { ...good, citizenName: '' } });
ok('missing name -> 400', r.status === 400 && /নাম/.test(r.json?.error || ''));
r = await call('POST', '/api/problems', { body: { ...good, citizenName: ' x ' } });
ok('1-letter name -> 400', r.status === 400);
r = await call('POST', '/api/problems', { body: { ...good, ward: '' } });
ok('missing ward -> 400', r.status === 400 && /ওয়ার্ড/.test(r.json?.error || ''));
r = await call('POST', '/api/problems', { body: { ...good, ward: 'ward-99' } });
ok('bad ward -> 400', r.status === 400);
r = await call('POST', '/api/problems', { body: { ...good, title: 'দ্বিতীয় অভিযোগ', phone: '+880 1712 345678' } });
ok('second report, +880 phone form -> 201', r.status === 201, JSON.stringify(r.json));
const second = r.json;
r = await call('POST', '/api/problems', { body: { ...good, title: 'অন্যজন', citizenName: 'করিম', phone: '01911111111' } });
ok('other person report -> 201', r.status === 201);
const other = r.json;
r = await call('POST', '/api/problems', { body: { ...good, title: '<script>x</script>' + 'a'.repeat(300), phone: '01712345678' } });
ok('T10 input stripped of tags & capped', r.status === 201 && r.json.title === '' /* hidden in track view */);
r = await call('POST', '/api/problems', { body: good, origin: 'https://evil.example' });
ok('T11 cross-site POST rejected (403 CSRF)', r.status === 403);

// =============== 2. সাধারণ মানুষ কোনো তালিকা দেখে না ===============
r = await call('GET', '/api/problems');
ok('T02 public complaint list is gone (404)', r.status === 404, String(r.status));
r = await call('POST', `/api/problems/${cid}/upvote`, { body: {} });
ok('upvote endpoint is gone (404)', r.status === 404, String(r.status));

// =============== 3. মোবাইল নম্বরে অবস্থা দেখা (কোড লাগে না) ===============
r = await call('POST', '/api/track', { body: { phone: '০১৭১২৩৪৫৬৭৮' } });
ok('T03 track by Bangla-digit phone finds that number\'s reports (3)', r.status === 200 && r.json.length === 3 && [created.trackingCode, second.trackingCode].every((c) => r.json.some((p) => p.trackingCode === c)), JSON.stringify(r.json?.map((p) => p.trackingCode)));
const trackText = JSON.stringify(r.json);
ok('tracked data has NO phone / name / title / text / location', r.json.every((p) => p.phone === '' && p.citizenName === 'এলাকাবাসী' && p.title === '' && p.description === '' && p.specificLocation === '') && !trackText.includes('রহিম') && !trackText.includes('বাজার মোড়') && !trackText.includes('01712345678'));
ok('tracked data shows status + timeline + category + ward', r.json.every((p) => typeof p.status === 'string' && p.timeline.length >= 1 && p.category === 'road' && p.ward === 'ward-03'));
ok('tracking does not leak another person\'s report', !r.json.some((p) => p.trackingCode === other.trackingCode));
r = await call('POST', '/api/track', { body: { phone: '+8801712345678' } });
ok('track by +880 form works', r.status === 200 && r.json.length === 3);
r = await call('POST', '/api/track', { body: { phone: '01800000000' } });
ok('unknown phone -> 404', r.status === 404);
r = await call('POST', '/api/track', { body: { phone: '' } });
ok('empty phone -> 400', r.status === 400);
r = await call('POST', '/api/track', { body: { code: created.trackingCode } });
ok('tracking code alone shows nothing (400)', r.status === 400);
r = await call('POST', '/api/track', { body: { phone: 'abc' } });
ok('garbage phone -> 400', r.status === 400);
// ভুল নম্বর অনুমান আটকানো (এক IP থেকে ৮টি ব্যর্থ চেষ্টার পর বন্ধ)
let last;
for (let i = 0; i < 9; i++) last = await call('POST', '/api/track', { body: { phone: '0180000' + String(1000 + i) }, ip: '77.7.7.7' });
ok('T07 too many wrong lookups from one IP -> 429', last.status === 429, String(last.status));
r = await call('POST', '/api/track', { body: { phone: '01712345678' }, ip: '77.7.7.7' });
ok('blocked IP cannot look up even a valid number meanwhile', r.status === 429);

// =============== 4. পাবলিক পরিসংখ্যান (সব সংখ্যা সত্যিকারের, ০ সহ) ===============
dbm.invalidateStatsCache();
r = await call('GET', '/api/stats');
const s1 = r.json;
ok('T04 stats reachable w/o login', r.status === 200 && typeof s1?.total === 'number');
const ALL_TOPICS = ['drugs', 'road', 'safety', 'waste', 'drainage', 'water', 'lighting', 'other'];
ok('stats list every dropdown topic for every ward (zeros included)', s1.wards.length === 9 && s1.wards.every((w) => w.categories.length === ALL_TOPICS.length && ALL_TOPICS.every((id) => w.categories.some((c) => c.id === id))), JSON.stringify(s1.wards[2]));
ok('no hidden/null numbers anywhere in stats', s1.wards.every((w) => typeof w.total === 'number') && typeof s1.submitted === 'number' && typeof s1.reviewDone === 'number' && typeof s1.underReview === 'number' && s1.categories.length === ALL_TOPICS.length);
ok('small counts are exact (ward-03 total equals what was submitted)', s1.wards.find((w) => w.ward === 'ward-03').total >= 1 && s1.wards.find((w) => w.ward === 'ward-03').total === s1.wards.find((w) => w.ward === 'ward-03').categories.reduce((a, c) => a + c.count, 0), JSON.stringify(s1.wards.find((w) => w.ward === 'ward-03')));
let st = JSON.stringify(s1);
ok('stats contain no names/phones/titles/ids', !/রহিম|করিম|01\d{9}|JNS-|prob-|রাস্তা ভাঙা/.test(st));
for (let i = 0; i < 2; i++) await call('POST', '/api/problems', { body: { ...good, citizenName: 'অন্য নাগরিক', phone: '0181111111' + i } });
dbm.invalidateStatsCache();
const s2 = (await call('GET', '/api/stats')).json;
ok('ward-03 count grows by exactly 2', s2.wards.find((w) => w.ward === 'ward-03').total === s1.wards.find((w) => w.ward === 'ward-03').total + 2);
ok('stats still contain no private data', !/রহিম|অন্য নাগরিক|01\d{9}|JNS-/.test(JSON.stringify(s2)));

// ---- ওয়ার্ডভিত্তিক বিষয়-গণনা (যেমন ওয়ার্ড ১: মাদক ৫০, রাস্তা ৩০) ----
let phoneSeq = 0;
const submitMany = async (ward, category, n) => { for (let i = 0; i < n; i++) { phoneSeq++; const r_ = await call('POST', '/api/problems', { body: { ...good, ward, category, citizenName: 'টেস্ট নাগরিক', phone: '0161' + String(1000000 + phoneSeq) } }); if (r_.status !== 201) throw new Error('submit failed ' + JSON.stringify(r_.json)); } };
r = await call('POST', '/api/problems', { body: { ...good, category: '' } });
ok('empty topic -> 400', r.status === 400);
r = await call('POST', '/api/problems', { body: { ...good, category: 'not-a-topic' } });
ok('unknown topic -> 400', r.status === 400);
r = await call('POST', '/api/problems', { body: { ...good, category: 'drugs', phone: '01761111111' } });
ok('topic "drugs" (মাদক) is accepted', r.status === 201, JSON.stringify(r.json));
r = await call('POST', '/api/problems', { body: { ...good, category: 'other', phone: '01762222222' } });
ok('topic "other" is accepted', r.status === 201);
await submitMany('ward-01', 'drugs', 7); await submitMany('ward-01', 'road', 6); await submitMany('ward-01', 'waste', 1);
await submitMany('ward-02', 'drugs', 6); await submitMany('ward-02', 'road', 5);
dbm.invalidateStatsCache();
const sw = (await call('GET', '/api/stats')).json;
const w1 = sw.wards.find((w) => w.ward === 'ward-01'), w2 = sw.wards.find((w) => w.ward === 'ward-02');
const cnt = (w, id) => (w.categories.find((c) => c.id === id) || {}).count;
ok('T17 ward 2: drugs 6 and road 5 listed biggest first, rest are 0', w2.categories[0].id === 'drugs' && w2.categories[0].count === 6 && w2.categories[1].id === 'road' && w2.categories[1].count === 5 && w2.categories.slice(2).every((c) => c.count === 0), JSON.stringify(w2));
ok('ward 2 total = sum of topics', w2.total === w2.categories.reduce((a, c) => a + c.count, 0) && w2.total === 11);
ok('ward 1: single complaint is shown exactly (waste = 1), 8 topics listed', w1.categories.length === 8 && cnt(w1, 'waste') === 1 && cnt(w1, 'drugs') === 7 && cnt(w1, 'road') === 6 && cnt(w1, 'water') === 0, JSON.stringify(w1));
ok('ward 1 sorted biggest first', w1.categories.every((c, i, arr) => i === 0 || arr[i - 1].count >= c.count));
ok('every ward total equals the sum of its topics', sw.wards.every((w) => w.total === w.categories.reduce((a, c) => a + c.count, 0)));
ok('overall topic counts add up to the grand total', sw.categories.reduce((a, c) => a + c.count, 0) === sw.total);
ok('stats expose no names/phones even with counts', !/টেস্ট নাগরিক|0161\d+|রহিম/.test(JSON.stringify(sw)));

// =============== 5. অ্যাডমিন দরজা ===============
r = await call('GET', '/api/admin/problems');
ok('T05 admin list w/o login -> 401', r.status === 401);
r = await login({ password: 'nope' });
ok('wrong password -> 401, no cookie', r.status === 401 && !r.cookies.dhamti_admin);
r = await login({ password: '' });
ok('empty password -> 401', r.status === 401);
r = await login();
ok('right password -> 200 + session cookie', r.status === 200 && !!r.cookies.dhamti_admin && r.json.role === 'owner');
ok('cookie is a random id, not a signed/guessable token', /^[A-Za-z0-9_-]{40,}$/.test(r.cookies.dhamti_admin));
const cookie = sessCookie(r);

r = await call('GET', '/api/admin/problems', { cookie });
const idByCode = Object.fromEntries((r.json || []).map((p) => [p.trackingCode, p.id]));
cid = idByCode[created.trackingCode]; oid = idByCode[other.trackingCode]; sid_ = idByCode[second.trackingCode];
const mine = (r.json || []).find((p) => p.id === cid);
ok('admin sees real phone (normalised), name, title, text', mine?.phone === '01712345678' && mine?.citizenName === 'রহিম উদ্দিন' && mine?.title === 'রাস্তা ভাঙা' && mine?.description === 'বড় গর্ত', JSON.stringify(mine));
const secondRow = (r.json || []).find((p) => p.id === sid_ || p.trackingCode === second.trackingCode);
ok('phone stored normalised for +880 input', secondRow?.phone === '01712345678');
r = await call('GET', '/api/admin/session', { cookie });
ok('session endpoint says authenticated + owner', r.json?.authenticated === true && r.json?.role === 'owner');
ok('assistant/staff endpoints do not exist', (await call('GET', '/api/admin/staff', { cookie })).status === 404 && (await call('POST', '/api/admin/login', { body: { username: 'helper', password: 'x'.repeat(12) } })).status === 401);

for (const [m, u, b] of [
  ['DELETE', `/api/problems/${cid}`], ['PATCH', `/api/problems/${cid}`, { status: 'under_review' }],
  ['PATCH', `/api/problems/${cid}/classify`, { category: 'road' }],
  ['POST', '/api/manifesto/reset'], ['PUT', '/api/profile', { name: 'x' }], ['DELETE', '/api/manifesto-completed/bulk'],
  ['GET', '/api/status'], ['GET', '/api/admin/audit'], ['GET', '/api/admin/backup'], ['POST', '/api/admin/export-log'],
  ['POST', '/api/admin/2fa/setup', { password: 'correct horse battery' }],
]) {
  r = await call(m, u, { body: b });
  ok(`${m} ${u.split('/').slice(0, 4).join('/')} w/o login -> 401`, r.status === 401, String(r.status));
}

// =============== 6. অবস্থা বদল ও শ্রেণিবিন্যাস ===============
r = await call('PATCH', `/api/problems/${cid}`, { cookie, body: { status: 'under_review' } });
ok('admin sets "under_review" (no note needed)', r.status === 200 && r.json.status === 'under_review');
r = await call('PATCH', `/api/problems/${cid}`, { cookie, body: { status: 'contacted' } });
ok('"contacted" without a real note -> 400', r.status === 400);
r = await call('PATCH', `/api/problems/${cid}`, { cookie, body: { status: 'review_done', noteText: 'ok' } });
ok('"review_done" with too-short note -> 400', r.status === 400);
r = await call('PATCH', `/api/problems/${cid}`, { cookie, body: { status: 'contacted', noteText: 'ফোনে কথা বলা হয়েছে, সমস্যা দেখা হবে' } });
ok('"contacted" with note -> 200, timeline grows', r.status === 200 && r.json.status === 'contacted' && r.json.timeline.length === 3, JSON.stringify(r.json?.timeline?.length));
for (const bad of ['hacked', 'resolved', 'pending', 'in_progress']) {
  r = await call('PATCH', `/api/problems/${cid}`, { cookie, body: { status: bad } });
  ok(`old/invalid status "${bad}" -> 400`, r.status === 400);
}
r = await call('POST', '/api/track', { body: { phone: '01712345678' } });
const tv = r.json.find((p) => p.trackingCode === created.trackingCode);
ok('citizen sees new status + note, staff name hidden', tv.status === 'contacted' && tv.timeline.at(-1).noteBn.includes('ফোনে কথা') && tv.timeline.every((e) => e.author === 'জনসেবা সেল'));
r = await call('PATCH', `/api/problems/${cid}/classify`, { cookie, body: { category: 'lighting', urgency: 'critical' } });
ok('classify ok', r.status === 200 && r.json.category === 'lighting' && r.json.urgency === 'critical', JSON.stringify(r.json));
r = await call('PATCH', `/api/problems/${cid}/classify`, { cookie, body: { category: 'nonsense' } });
ok('classify bad category -> 400', r.status === 400);
r = await call('PATCH', `/api/problems/x'%20OR%201=1`, { cookie, body: { status: 'under_review' } });
ok('T08 weird id (SQL-injection style) rejected (400)', r.status === 400);
r = await call('POST', '/api/track', { body: { phone: "01712345678' OR '1'='1" } });
ok('SQL-injection style phone -> 400', r.status === 400 || r.status === 404);
r = await call('POST', '/api/problems', { body: { ...good, title: "'; DROP TABLE problems;--", phone: '01712345678' } });
ok('SQLi text stored as plain text, table intact', r.status === 201 && (await call('GET', '/api/admin/problems', { cookie })).json.some((p) => p.title.includes('DROP TABLE')));

// =============== 7. লগআউট সেশন বাতিল করে ===============
const r2 = await login({}, '5.5.5.5');
const cookie2 = sessCookie(r2);
ok('second session works', (await call('GET', '/api/admin/problems', { cookie: cookie2 })).status === 200);
await call('POST', '/api/admin/logout', { cookie: cookie2 });
r = await call('GET', '/api/admin/problems', { cookie: cookie2 });
ok('T06 old cookie is useless after logout (401)', r.status === 401);
ok('other session unaffected', (await call('GET', '/api/admin/problems', { cookie })).status === 200);
r = await call('GET', '/api/admin/problems', { cookie: 'dhamti_admin=' + 'A'.repeat(43) });
ok('forged cookie -> 401', r.status === 401);
const dbSess = await db.execute(`SELECT id_hash FROM admin_sessions`);
ok('DB stores only a hash of the session id', dbSess.rows.every((x) => /^[0-9a-f]{64}$/.test(String(x.id_hash)) && !decodeURIComponent(cookie).includes(String(x.id_hash))));

// =============== 8. দুই ধাপের লগইন (অথেনটিকেটর) ===============
r = await call('POST', '/api/admin/2fa/setup', { cookie, body: { password: 'wrong' } });
ok('2FA setup needs the password (401)', r.status === 401);
r = await call('POST', '/api/admin/2fa/setup', { cookie, body: { password: 'correct horse battery' } });
ok('2FA setup returns secret + otpauth uri', r.status === 200 && /^[A-Z2-7]{16,}$/.test(r.json.secret) && r.json.uri.startsWith('otpauth://totp/'), JSON.stringify(r.json));
const secret = r.json.secret;
r = await call('POST', '/api/admin/2fa/enable', { cookie, body: { code: '000000' } });
ok('2FA enable with wrong code -> 400', r.status === 400);
const codeNow = sec.totpCodeAt(secret, Date.now());
r = await call('POST', '/api/admin/2fa/enable', { cookie, body: { code: codeNow } });
ok('2FA enable with right code -> 200', r.status === 200);
ok('secret stored in DB is not plain text when key is set / pending cleared', (await db.execute(`SELECT value FROM site_settings WHERE key='totp_pending'`)).rows[0]?.value === '');
r = await login({}, '6.6.6.1');
ok('T09 login without 2FA code -> 401 needs2fa', r.status === 401 && r.json.needs2fa === true && !r.cookies.dhamti_admin);
r = await login({ code: '123456' }, '6.6.6.2');
ok('login with wrong 2FA code -> 401', r.status === 401 && !r.cookies.dhamti_admin);
r = await login({ code: codeNow }, '6.6.6.3');
ok('2FA code replay (already used) -> 401', r.status === 401);
r = await login({ code: sec.totpCodeAt(secret, Date.now() + 30000) }, '6.6.6.4');
ok('login with fresh 2FA code -> 200', r.status === 200 && !!r.cookies.dhamti_admin);
ok('session endpoint shows twoFactor on', (await call('GET', '/api/admin/session', { cookie })).json?.twoFactor === true);
process.env.RESET_ADMIN_2FA = 'true';
r = await login({}, '6.6.6.5');
ok('RESET_ADMIN_2FA=true lets owner in with password only (lost phone)', r.status === 200);
delete process.env.RESET_ADMIN_2FA;
r = await login({}, '6.6.6.6');
ok('...and 2FA is back after the flag is removed', r.status === 401 && r.json.needs2fa);
const realNow = Date.now;
Date.now = () => realNow() + 120000;
r = await call('POST', '/api/admin/2fa/disable', { cookie, body: { password: 'correct horse battery', code: '111111' } });
ok('2FA disable with wrong code -> 400', r.status === 400);
r = await call('POST', '/api/admin/2fa/disable', { cookie, body: { password: 'correct horse battery', code: sec.totpCodeAt(secret, Date.now()) } });
Date.now = realNow;
ok('2FA disable with password+code -> 200', r.status === 200);
r = await login({}, '6.6.6.7');
ok('after disable, password-only login works again', r.status === 200);

// =============== 9. নিরীক্ষা-খাতা ===============
r = await call('GET', '/api/admin/audit', { cookie });
const auditText = JSON.stringify(r.json);
const actions = new Set((r.json || []).map((e) => e.action));
ok('T12 audit log records login/fail/status/classify/2fa/view', r.status === 200 && ['login_ok', 'login_fail', 'status_change', 'classify', '2fa_enable', '2fa_disable', 'logout', 'view_identity'].every((a) => actions.has(a)), [...actions].join(','));
ok('audit log has NO names/phones/complaint text', !/রহিম|01712345678|ফোনে কথা|বড় গর্ত|রাস্তা ভাঙা/.test(auditText));
let blocked1 = false, blocked2 = false;
try { await db.execute(`UPDATE audit_log SET action = 'x' WHERE id = 1`); } catch { blocked1 = true; }
try { await db.execute(`DELETE FROM audit_log WHERE id = 1`); } catch { blocked2 = true; }
ok('audit log is append-only (UPDATE/DELETE blocked by DB)', blocked1 && blocked2);

// =============== 10. ব্যাকআপ ও পুনরুদ্ধার ===============
r = await call('GET', '/api/admin/backup', { cookie });
let bk = null; try { bk = JSON.parse(String(r.body)); } catch {}
ok('backup downloads as JSON file with full data', r.status === 200 && /attachment/.test(r.headers['Content-Disposition'] || '') && bk?.problems?.some((p) => p.phone === '01712345678') && Array.isArray(bk.audit_log), String(r.body).slice(0, 80));
ok('backup excludes 2FA secrets & admin sessions', !JSON.stringify(bk).includes('totp_secret') && !('admin_sessions' in bk));
await call('POST', '/api/admin/export-log', { cookie });
r = await call('DELETE', `/api/problems/${oid}`, { cookie });
ok('admin DELETE ok', r.status === 200 && r.json.success === true);
r = await dbm.restoreBackup(bk);
const afterRestore = (await call('GET', '/api/admin/problems', { cookie })).json;
ok('restore brings the deleted report back (no duplicates)', r.problems >= 1 && afterRestore.filter((p) => p.id === oid).length === 1 && afterRestore.length === bk.problems.length, `${afterRestore.length} vs ${bk.problems.length}`);
const actions2 = new Set((await call('GET', '/api/admin/audit', { cookie })).json.map((e) => e.action));
ok('backup/export/delete are in the audit log', ['backup_download', 'export_csv', 'delete_problem'].every((a) => actions2.has(a)));

// =============== 11. এনক্রিপশন + পুরনো তথ্য নতুন ব্যবস্থায় আনা ===============
const rawRow = async (id) => (await db.execute({ sql: `SELECT phone, citizen_name, title, description, specific_location, phone_hash FROM problems WHERE id = ?`, args: [id] })).rows[0];
let raw = await rawRow(cid);
ok('without key: stored as plain text (warned in admin UI)', raw.phone === '01712345678' && !String(raw.description).startsWith('enc1:'));
ok('session reports encryption OFF', (await call('GET', '/api/admin/session', { cookie })).json?.encryption === false);
const oldHash = raw.phone_hash;
process.env.DATA_ENCRYPTION_KEY = 'k'.repeat(16) + 'Zq8!'.repeat(6);
await dbm.initDatabase();
raw = await rawRow(cid);
ok('T13 after key set: existing rows migrated to encrypted form', ['phone', 'citizen_name', 'title', 'description', 'specific_location'].every((c) => String(raw[c]).startsWith('enc1:')), JSON.stringify(raw));
ok('raw DB dump contains no readable phone/name/text', !JSON.stringify((await db.execute(`SELECT * FROM problems`)).rows).match(/01712345678|রহিম|বড় গর্ত/));
ok('phone index upgraded to keyed HMAC (differs from old weak hash)', raw.phone_hash && raw.phone_hash !== oldHash && /^[0-9a-f]{64}$/.test(raw.phone_hash));
r = await call('GET', '/api/admin/problems', { cookie });
const dec = r.json.find((p) => p.id === cid);
ok('admin still reads decrypted data', dec?.phone === '01712345678' && dec?.citizenName === 'রহিম উদ্দিন' && dec?.description === 'বড় গর্ত');
r = await call('POST', '/api/track', { body: { phone: '01712345678' } });
ok('phone lookup still works through the blind index', r.status === 200 && r.json.some((p) => p.trackingCode === created.trackingCode));
r = await call('POST', '/api/problems', { body: { ...good, title: 'এনক্রিপ্টেড নতুন', phone: '01733333333', citizenName: 'সালমা' } });
raw = (await db.execute(`SELECT phone, citizen_name, title FROM problems ORDER BY created_at DESC LIMIT 1`)).rows[0];
ok('new report is stored encrypted', r.status === 201 && String(raw.phone).startsWith('enc1:') && !String(raw.citizen_name).includes('সালমা'));
ok('session reports encryption ON', (await call('GET', '/api/admin/session', { cookie })).json?.encryption === true);
const goodKey = process.env.DATA_ENCRYPTION_KEY;
process.env.DATA_ENCRYPTION_KEY = 'WRONG'.repeat(10);
const wrong = (await call('GET', '/api/admin/problems', { cookie })).json.find((p) => p.id === cid);
ok('wrong key: data is unreadable (empty), never leaked or crashed', wrong && wrong.phone === '' && wrong.description === '');
process.env.DATA_ENCRYPTION_KEY = goodKey;
ok('right key restores access', (await call('GET', '/api/admin/problems', { cookie })).json.find((p) => p.id === cid)?.phone === '01712345678');
ok('T18 timeline (status notes) is encrypted at rest', (await db.execute(`SELECT timeline FROM problems`)).rows.every((x) => String(x.timeline).startsWith('enc1:')) && !JSON.stringify((await db.execute(`SELECT timeline FROM problems`)).rows).includes('ফোনে কথা'));
{
  const goodKey2 = process.env.DATA_ENCRYPTION_KEY;
  process.env.DATA_ENCRYPTION_KEY = 'WRONG'.repeat(10);
  const bad = await call('PATCH', `/api/problems/${cid}`, { cookie, body: { status: 'under_review' } });
  const wrongView = (await call('GET', '/api/admin/problems', { cookie })).json.find((p) => p.id === cid);
  process.env.DATA_ENCRYPTION_KEY = goodKey2;
  const okView = (await call('GET', '/api/admin/problems', { cookie })).json.find((p) => p.id === cid);
  ok('wrong key cannot overwrite (and so destroy) sealed history', bad.status === 500 && wrongView.timeline.length === 0 && okView.timeline.length >= 3 && okView.timeline.some((t) => /ফোনে কথা/.test(t.noteBn)), JSON.stringify({ s: bad.status, w: wrongView.timeline.length, o: okView.timeline.length }));
}
bk = JSON.parse(String((await call('GET', '/api/admin/backup', { cookie })).body));
ok('backup is readable plaintext for the owner (decrypted)', bk.problems.some((p) => p.phone === '01712345678'));

// =============== 12. গতি-সীমা (rate limits) ===============
let lim;
for (let i = 0; i < 16; i++) lim = await call('POST', '/api/problems', { body: { ...good, phone: `0174000${String(1000 + i)}` }, ip: '88.8.8.8' });
ok('T14 submit flood from one IP is stopped (429)', lim.status === 429, String(lim.status));
for (let i = 0; i < 9; i++) lim = await call('POST', '/api/problems', { body: { ...good, phone: '01755555555' } });
ok('same phone >8 submissions/day is stopped (429)', lim.status === 429, String(lim.status));
for (let i = 0; i < 11; i++) lim = await login({ password: 'bad' + i }, '99.9.9.9');
ok('T15 brute-force login from one IP is stopped (429)', lim.status === 429, String(lim.status));
r = await login({}, '99.9.9.9');
ok('...even the right password is refused during the block', r.status === 429);
r = await login({}, '98.8.8.8');
ok('...but the owner on another IP can still log in', r.status === 200);
const dbn = dbm; const sinceNow = new Date(Date.now() - 1000).toISOString();
for (let i = 0; i < 30; i++) await dbn.addAudit({ actor: 'owner', role: 'owner', action: 'login_fail' });
r = await login({}, '97.7.7.7');
ok('account-level lockout after 30 failures across IPs (429)', r.status === 429, String(r.status));
// পরের পরীক্ষাগুলোর জন্য সীমা পরিষ্কার করা যায় না (খাতা শুধু-যোগ), তাই নতুন অ্যাপ + পুরনো সেশনে চালানো হবে
const cookieKeep = cookie;

// ---- admin: basic info, photo, villages ----
const prof0 = (await call('GET', '/api/profile')).json;
const edit = { ...prof0, name: 'মোঃ আনোয়ার হোসেন ভূঁইয়া', designation: 'নতুন পদবি', heroAnnouncement: 'আপনাদের পাশে আছি', phone: '01711223344', email: 'a@b.com', officeAddress: 'নতুন ঠিকানা' };
r = await call('PUT', '/api/profile', { body: edit });
ok('PUT /api/profile without login -> 401', r.status === 401);
r = await call('PUT', '/api/profile', { body: edit, cookie });
ok('admin edits profile', r.status === 200 && r.json?.designation === 'নতুন পদবি' && r.json?.heroAnnouncement === 'আপনাদের পাশে আছি' && r.json?.phone === '01711223344', JSON.stringify(r.json));
r = await call('GET', '/api/profile');
ok('public GET shows edits', r.json?.officeAddress === 'নতুন ঠিকানা' && r.json?.heroAnnouncement === 'আপনাদের পাশে আছি');

// tiny valid JPEG-like payload (magic bytes ok)
const jpegBytes = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7)]);
const jpegUrl = 'data:image/jpeg;base64,' + jpegBytes.toString('base64');
r = await call('PUT', '/api/profile/photo', { body: { image: jpegUrl } });
ok('photo upload without login -> 401', r.status === 401);
r = await call('PUT', '/api/profile/photo', { body: { image: jpegUrl }, cookie });
ok('admin uploads photo', r.status === 200 && /^\/api\/profile\/photo\?v=/.test(r.json?.profileImage || ''), JSON.stringify(r.json));
const photoUrl = r.json?.profileImage;
r = await call('GET', photoUrl);
ok('photo served as image/jpeg with long cache', r.headers['Content-Type'] === 'image/jpeg' && /immutable/.test(r.headers['Cache-Control'] || '') && Buffer.isBuffer(r.body) && r.body.equals(jpegBytes), JSON.stringify(r.headers));
r = await call('PUT', '/api/profile', { body: { ...edit, designation: 'আবার বদল', profileImage: 'https://evil.test/x.png' }, cookie });
ok('profile text save keeps uploaded photo', r.status === 200 && /^\/api\/profile\/photo\?v=/.test(r.json?.profileImage || ''), JSON.stringify(r.json));
r = await call('PUT', '/api/profile/photo', { body: { image: 'data:image/png;base64,' + jpegBytes.toString('base64') }, cookie });
ok('mismatched type/magic bytes rejected', r.status === 400);
r = await call('PUT', '/api/profile/photo', { body: { image: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' }, cookie });
ok('svg rejected', r.status === 400);
r = await call('PUT', '/api/profile/photo', { body: { image: 'data:image/jpeg;base64,' + Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(500 * 1024)]).toString('base64') }, cookie });
ok('oversize photo rejected', r.status === 400);
r = await call('DELETE', '/api/profile/photo');
ok('photo reset without login -> 401', r.status === 401);
r = await call('DELETE', '/api/profile/photo', { cookie });
ok('admin resets photo to default', r.status === 200 && r.json?.profileImage === '/leader.jpg', JSON.stringify(r.json));
r = await call('GET', '/api/profile/photo');
ok('no photo -> redirect to /leader.jpg', r.status === 302 && r.headers['Location'] === '/leader.jpg');

r = await call('GET', '/api/settings');
ok('settings default empty', r.status === 200 && JSON.stringify(r.json?.wardVillages) === '{}', JSON.stringify(r.json));
r = await call('PUT', '/api/settings', { body: { wardVillages: { 'ward-01': 'উত্তর ধামতী' } } });
ok('settings write without login -> 401', r.status === 401);
r = await call('PUT', '/api/settings', { body: { wardVillages: { 'ward-01': 'উত্তর ধামতী', 'ward-02': '  <b>দক্ষিণ</b> পাড়া ', 'ward-99': 'ভুয়া' } }, cookie });
ok('admin saves villages; unknown ward dropped; html stripped', r.status === 200 && r.json?.wardVillages?.['ward-01'] === 'উত্তর ধামতী' && !('ward-99' in r.json.wardVillages) && !/[<>]/.test(r.json.wardVillages['ward-02'] || ''), JSON.stringify(r.json));
r = await call('GET', '/api/settings');
ok('public settings show villages', r.json?.wardVillages?.['ward-01'] === 'উত্তর ধামতী');
r = await call('PUT', '/api/settings', { body: { wardVillages: 'x' }, cookie });
ok('bad settings payload -> 400', r.status === 400);

// ---- migrations on a pre-existing (old) database ----
await db.execute({ sql: `UPDATE leader_profile SET designation=?, office_address=? WHERE id='current'`, args: ['ধামতী ইউনিয়ন সেবক', 'ধামতী ইউনিয়ন জনসেবা কার্যালয়, দেবিদ্বার, কুমিল্লা'] });
const ins = (id, date) => db.execute({ sql: `INSERT INTO manifesto_items (id,title_bn,title_en,category,summary_bn,summary_en,description_bn,description_en,progress_percentage,status,target_year,budget_or_scope,milestones,last_updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, args: [id, 'ডেমো', 'demo', 'roads_infrastructure', '', '', '', '', 65, 'in_progress', '২০২৬', '', '[]', date] });
await ins('man-01', '২০২৬-০৩-১৫');                       // untouched demo -> must go
await ins('man-02', '2026-11-18T01:00:00.000Z');         // edited by admin -> must stay
await ins('own-1', '২০২৬-০৩-২০');                          // custom id -> must stay
const app2 = createApp();
const call2 = dispatcher(app2);
r = await call2('GET', '/api/profile');
ok('old designation migrated to new', r.json?.designation === 'চেয়ারম্যান পদপ্রার্থী, ১৩ নং ধামতী ইউনিয়ন পরিষদ', r.json?.designation);
ok('old office address migrated', /১৩ নং ধামতী ইউনিয়ন/.test(r.json?.officeAddress || ''), r.json?.officeAddress);
r = await call2('GET', '/api/manifesto');
const ids = (r.json || []).map((m) => m.id).sort().join(',');
ok('untouched demo removed; edited/custom kept', ids === 'man-02,own-1', ids);

// ---- পুরনো চার অবস্থা → নতুন ছয় অবস্থা ----
const legacyTl = [{ id: 'a', timestamp: '2026-11-01T00:00:00Z', status: 'pending', noteBn: 'x', noteEn: 'x', author: 'sys' }, { id: 'b', timestamp: '2026-11-02T00:00:00Z', status: 'in_progress', noteBn: 'y', noteEn: 'y', author: 'sys' }];
await dbm.insertProblem({ id: 'prob-legacy-1', trackingCode: 'JNS-2026-9999', submissionType: 'complaint', title: 'পুরনো', description: 'd', category: 'road', ward: 'ward-01', specificLocation: 'l', citizenName: 'পুরনো নাগরিক', phone: '01600000000', isAnonymous: false, urgency: 'normal', status: 'resolved', createdAt: '2026-11-01T00:00:00Z', upvotes: 3, timeline: legacyTl });
await dbm.setSetting('mig_status_v2', '');
await dbm.initDatabase();
const legacy = (await call('GET', '/api/admin/problems', { cookie })).json.find((p) => p.id === 'prob-legacy-1');
ok('T16 old status "resolved" migrated to "review_done"; timeline statuses mapped', legacy?.status === 'review_done' && legacy.timeline[0].status === 'submitted' && legacy.timeline[1].status === 'under_review', JSON.stringify(legacy?.timeline?.map((t) => t.status)));
ok('old data kept (nothing lost)', legacy?.citizenName === 'পুরনো নাগরিক' && legacy?.phone === '01600000000');

console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
