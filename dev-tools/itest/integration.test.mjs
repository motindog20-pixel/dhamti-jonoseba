process.env.ADMIN_PASSWORD = 'correct horse battery';
process.env.SESSION_SECRET = 's'.repeat(40);
delete process.env.VERCEL; delete process.env.TURSO_DATABASE_URL;

const { createApp } = await import('./server/app.ts');
const { db } = await import('./server/db.ts');

let failures = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '  ' + extra)); if (!cond) failures++; };

function dispatcher(app) {
  return async function call(method, url, { body, cookie, origin, host = 'site.test' } = {}) {
    const req = { method, url: url, path: url.split('?')[0], headers: { cookie, host, origin }, query: Object.fromEntries(new URLSearchParams(url.split('?')[1] || '')), body, ip: '9.9.9.9', params: {} };
    const out = { status: 200, json: undefined, headers: {}, cookies: {} };
    let done;
    const finished = new Promise((r) => (done = r));
    const res = {
      status(c) { out.status = c; return res; },
      json(o) { out.json = o; done(); return res; },
      setHeader(k, v) { out.headers[k] = v; },
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

const good = { submissionType: 'complaint', title: 'রাস্তা ভাঙা', description: 'বড় গর্ত', category: 'road', ward: 'ward-03', specificLocation: 'বাজার মোড়', citizenName: 'রহিম উদ্দিন', phone: '০১৭১২-৩৪৫৬৭৮', isAnonymous: false, urgency: 'high' };

// ---- submit ----
let r = await call('POST', '/api/problems', { body: good });
ok('submit valid (Bangla digits phone) -> 201', r.status === 201, JSON.stringify(r.json));
ok('response hides phone & name', r.json?.phone === '' && r.json?.citizenName === 'এলাকাবাসী');
ok('server made tracking code', /^JNS-\d{4}-\d{4,6}$/.test(r.json?.trackingCode || ''), r.json?.trackingCode);
const created = r.json;

r = await call('POST', '/api/problems', { body: { ...good, phone: '12345' } });
ok('invalid phone -> 400', r.status === 400 && /মোবাইল/.test(r.json?.error || ''), JSON.stringify(r));
r = await call('POST', '/api/problems', { body: { ...good, phone: '', isAnonymous: true } });
ok('anonymous / no phone now rejected (400)', r.status === 400);
r = await call('POST', '/api/problems', { body: { ...good, citizenName: '' } });
ok('missing name -> 400', r.status === 400 && /নাম/.test(r.json?.error || ''), JSON.stringify(r.json));
r = await call('POST', '/api/problems', { body: { ...good, citizenName: ' x ' } });
ok('1-letter name -> 400', r.status === 400);
r = await call('POST', '/api/problems', { body: { ...good, ward: '' } });
ok('missing ward -> 400', r.status === 400 && /ওয়ার্ড/.test(r.json?.error || ''), JSON.stringify(r.json));
r = await call('POST', '/api/problems', { body: { ...good, title: 'দ্বিতীয় অভিযোগ', phone: '+880 1712 345678' } });
ok('second report, +880 phone form -> 201', r.status === 201, JSON.stringify(r.json));
const second = r.json;
r = await call('POST', '/api/problems', { body: { ...good, title: 'অন্যজন', citizenName: 'করিম', phone: '01911111111' } });
ok('other person report -> 201', r.status === 201);
const other = r.json;
r = await call('POST', '/api/problems', { body: { ...good, ward: 'ward-99' } });
ok('bad ward -> 400', r.status === 400);
r = await call('POST', '/api/problems', { body: { ...good, title: '<script>x</script>' + 'a'.repeat(300) } });
ok('title stripped of tags & capped (120)', r.status === 201 && !/[<>]/.test(r.json.title) && r.json.title.length <= 120, r.json?.title?.length);
r = await call('POST', '/api/problems', { body: good, origin: 'https://evil.example' });
ok('cross-site POST rejected (403)', r.status === 403);

// ---- public list never leaks ----
r = await call('GET', '/api/problems');
const pubText = JSON.stringify(r.json);
ok('public list returns items', Array.isArray(r.json) && r.json.length >= 3);
ok('public list has NO phone digits', !/01712[- ]?345678/.test(pubText) && !pubText.includes('"phone":"0'));
ok('public list has NO citizen name', !pubText.includes('রহিম'));

// ---- tracking by phone / code (no login, no OTP) ----
r = await call('POST', '/api/track', { body: { query: '০১৭১২৩৪৫৬৭৮' } });
ok('track by Bangla-digit phone finds ALL reports of that number (3 so far)', r.status === 200 && r.json.length === 3 && [created.id, second.id].every((id) => r.json.some((p) => p.id === id)), JSON.stringify(r.json?.map((p) => p.title)));
ok('tracked data has no phone/name', r.json.every((p) => p.phone === '' && p.citizenName === 'এলাকাবাসী'));
ok('tracked data shows status + timeline', r.json.every((p) => typeof p.status === 'string' && Array.isArray(p.timeline) && p.timeline.length >= 1));
ok('tracking does not leak another person\'s report', !r.json.some((p) => p.id === other.id));
r = await call('POST', '/api/track', { body: { query: '+8801712345678' } });
ok('track by +880 form works (same 3)', r.status === 200 && r.json.length === 3);
r = await call('POST', '/api/track', { body: { query: created.trackingCode.toLowerCase() } });
ok('track by code (any case)', r.status === 200 && r.json.length === 1 && r.json[0].id === created.id);
r = await call('POST', '/api/track', { body: { query: '01800000000' } });
ok('unknown phone -> 404', r.status === 404);
r = await call('POST', '/api/track', { body: { query: 'JNS-2026-0000000' } });
ok('unknown code -> 404', r.status === 404);
r = await call('POST', '/api/track', { body: { query: '' } });
ok('empty query -> 400', r.status === 400);

// ---- admin gate ----
r = await call('GET', '/api/admin/problems');
ok('admin list w/o login -> 401', r.status === 401);
r = await call('POST', '/api/admin/login', { body: { password: 'nope' } });
ok('wrong password -> 401, no cookie', r.status === 401 && !r.cookies.dhamti_admin);
r = await call('POST', '/api/admin/login', { body: { password: 'correct horse battery' } });
ok('right password -> 200 + cookie', r.status === 200 && !!r.cookies.dhamti_admin);
const cookie = 'dhamti_admin=' + encodeURIComponent(r.cookies.dhamti_admin);

r = await call('GET', '/api/admin/problems', { cookie });
const mine = (r.json || []).find((p) => p.id === created.id);
ok('admin sees real phone (normalised) & name', mine?.phone === '01712345678' && mine?.citizenName === 'রহিম উদ্দিন', JSON.stringify(mine));
const secondRow = (r.json || []).find((p) => p.id === second.id);
ok('phone stored normalised for +880 input', secondRow?.phone === '01712345678', JSON.stringify(secondRow?.phone));
r = await call('GET', '/api/admin/session', { cookie });
ok('session endpoint says authenticated', r.json?.authenticated === true);

// ---- admin-only mutations ----
for (const [m, u, b] of [
  ['DELETE', `/api/problems/${created.id}`], ['PATCH', `/api/problems/${created.id}`, { status: 'resolved' }],
  ['POST', '/api/manifesto/reset'], ['PUT', '/api/profile', { name: 'x' }], ['DELETE', '/api/manifesto-completed/bulk'],
  ['GET', '/api/status'],
]) {
  r = await call(m, u, { body: b });
  ok(`${m} ${u.split('/').slice(0, 3).join('/')} w/o login -> 401`, r.status === 401, String(r.status));
}
r = await call('PATCH', `/api/problems/${created.id}`, { cookie, body: { status: 'in_progress', noteText: 'কাজ শুরু', officerName: 'টিম' } });
ok('admin PATCH ok & response hides phone', r.status === 200 && r.json.status === 'in_progress' && r.json.phone === '' && r.json.timeline.length === 2, JSON.stringify(r.json));
r = await call('PATCH', `/api/problems/${created.id}`, { cookie, body: { status: 'hacked' } });
ok('invalid status -> 400', r.status === 400);

// ---- upvote clamp ----
const before = (await call('GET', '/api/problems')).json.find((p) => p.id === created.id).upvotes;
r = await call('POST', `/api/problems/${created.id}/upvote`, { body: { delta: 999999 } });
ok('upvote delta clamped to +1', r.json?.upvotes === before + 1, JSON.stringify(r.json));
r = await call('POST', `/api/problems/x'%20OR%201=1/upvote`, { body: {} });
ok('weird id rejected (400)', r.status === 400);

// ---- delete ----
r = await call('DELETE', `/api/problems/${other.id}`, { cookie });
ok('admin DELETE ok', r.status === 200 && r.json.success === true);

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

console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
