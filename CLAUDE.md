# CLAUDE.md — ধামতী জনসেবা (project memory)

Read this first in every new session. It is the long-term memory of the project. Keep it short and current:
when a decision changes or a feature ships, update the relevant section in the same commit.

## 1. What this is
Political service portal for **মোঃ আনোয়ার হোসেন ভূঁইয়া**, chairman candidate, **১৩ নং ধামতী ইউনিয়ন পরিষদ, দেবিদ্বার, কুমিল্লা**.
Citizens file complaints/suggestions, track their status, see work and (later) the manifesto.
Live: https://dhamti-jonoseba.vercel.app/ · Repo: `motindog20-pixel/dhamti-jonoseba` (fork), deploys from `main` on Vercel (team `dhamti-jonosheba`).

**The owner is not a developer.** Reply in simple Bangla (he also writes Banglish). Mobile-first, rural-user-friendly.
Give step-by-step instructions; ask him for screenshots instead of assuming. Never ask him to paste passwords/tokens in chat.

## 2. Stack & layout
React 19 + Vite + Tailwind 4 SPA · Express API (`server/app.ts`, `createApp()`) · libSQL/Turso · Vercel serverless (`api/index.ts`, `vercel.json` rewrites `/api/*`) · bun.lock · TypeScript.
- `server/security.ts` owner auth (password from env, scrypt/TOTP helpers), DB-backed sessions (cookie = random id, DB keeps sha256), CSRF same-origin check, headers, rate limits (`rateLimit`, `failLimiter`), sanitizers.
- `server/crypto.ts` AES-256-GCM sealing + HMAC blind index for phone lookup (`DATA_ENCRYPTION_KEY`).
- `server/db.ts` schema, migrations, CRUD, `getPublicStats()` (exact counts, all topics incl. zeros), append-only `audit_log` (SQLite triggers), backup/restore. Tables: `problems`, `manifesto_items`, `leader_profile` (id='current'), `site_settings`, `admin_sessions`, `audit_log`.
- `src/data/statuses.ts` the 6 statuses + labels; `src/App.tsx` state; `src/components/*` (`StatisticsSection`, `TrackProblemModal`, `SubmitProblemModal`, `PrivacyPolicyModal`, `AdminSectionModal`, `AdminSecurityPanel`); `src/services/api.ts` client API; `phone.ts` BD-phone normaliser; `myReports.ts` remembers name/phone on the device only; `photo.ts` image resize.
- `public/`: keep tiny (leader.jpg, favicons, `og-image-v3.jpg`). `dev-tools/`: local test runner.

## 3. Environment (Vercel → Settings → Environment Variables)
`ADMIN_PASSWORD` (owner login), `DATA_ENCRYPTION_KEY` (32+ chars; **never change/lose, keep an offline copy** — sealed data becomes unreadable), `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`. Optional emergency: `RESET_ADMIN_2FA=true` (lets owner in with password only; remove after). `SESSION_SECRET` is no longer used. **Changing any needs a Redeploy.**
Without Turso on Vercel all writes return 503 (`isDbPersistent`). Without `DATA_ENCRYPTION_KEY` data is stored plain and the admin "নিরাপত্তা" tab shows a red warning (as of 2026-11-20 the owner still has to set it). Admin password change = edit `ADMIN_PASSWORD` + redeploy.

## 4. Decisions made by the owner (do not reverse without asking)
- Complaint requires **name + BD mobile + ward + privacy-policy consent** (no anonymous option). Server enforces it too.
- **How the owner wants topics/stats to work (2026-11-20, his own words, keep following):** the citizen first picks a **topic from a dropdown** (≈5–8 topics: মাদক, সড়ক, নিরাপত্তা, পরিষ্কার-পরিচ্ছন্নতা, ড্রেনেজ, পানি, বিদ্যুৎ/বাতি, অন্যান্য; list lives in `CATEGORIES`, `src/data/mockData.ts`), then writes the problem. The public sees per-ward **topic counts, biggest first** (e.g. ওয়ার্ড ১: মাদক ৫০, রাস্তা ৩০) but never who complained or what exactly they wrote. **UPDATE 2026-11-22 (owner, after seeing the preview, overrides the old k<5 rule):** never show "৫-এর কম"; each ward row shows just the ward + exact total; tapping a ward shows the **top 5 topics** (count + % of that ward's total) with a "সব বিষয় দেখুন" button for the rest (all 8, zeros as ০/০%), biggest first. Accepted privacy trade-off (he decided): tiny exact counts are public; names/text still never. **The owner wants Claude to ask him questions often** to make the system precise and user-friendly.
- **Public sees only aggregate stats** (`GET /api/stats`: totals, status, ward, category, month; **exact numbers, no hiding**). No public complaint list, no upvotes (endpoints removed). Never add them back.
- **Only the owner** has an admin account. **No assistant admins** (owner's decision 2026-11-20; code removed). Owner sees full data via `GET /api/admin/problems`.
- **Status check = mobile number + reference code** (`POST /api/track {phone, code}`). History: first phone-only (owner declined tracking codes as a burden), then a citizen-chosen 4-digit PIN (built 2026-11-22), then the owner preferred the professional-looking reference code, so PIN code was REMOVED (still in git history, commit 6d6ae8a). Code = `JNS-2026-483627` (6 random digits, server-made; ADV for advice). Citizen may type the full code or just the last number, Bangla or English digits (`cleanTrackCode`). Wrong number and wrong code give the identical 404 `not_found`. Max 5 code checks per number per hour, counted in DB table `track_attempts` *before* matching (safe under parallel requests); success clears it; also 8 failures/15 min per IP. Lost code → citizen phones the office → owner reads it in admin (shown on each complaint) after confirming identity by phone; no reset feature. Response shows only category/ward/date/reference code/status/owner's notes; never title, text, location, name, phone. Old rows with 4-digit codes still work. Known trade-offs: someone can lock a number for an hour with wrong guesses; whoever has the code can see status + notes (owner must not put private details in notes). No SMS OTP (costs money; revisit after the pilot).
- 6 statuses: submitted, under_review, need_info, guidance_given, contacted, review_done; the last four need a note (≥5 chars). Old 4 statuses are migrated automatically.
- Rate limits are on (generous: submit 15/h per IP, 8/day per phone, login 10/15 min per IP + 30/15 min account-wide, global 600/10 min per IP). The account-wide login lockout is deliberately high so a rival can't lock the owner out.
- Optional TOTP 2FA for the owner (Authenticator app). Audit log is append-only and never contains names/phones/complaint text. Backup download = full data (owner only).
- Data retention stated in the privacy policy: about 1 year after the election result, then delete personal data. Policy text is the owner's/legal adviser's to approve.
- Designation: "চেয়ারম্যান পদপ্রার্থী, ১৩ নং ধামতী ইউনিয়ন পরিষদ". Wards `ward-01..09` named "ওয়ার্ড নং ০১..০৯"; villages are entered by admin (site_settings `wardVillages`).
- **Manifesto not released yet** → "coming soon" state (`ManifestoSection`). Admin adds pledges later; the full layout then appears automatically. Never invent demo numbers/progress.
- Admin can edit from the "পেজের তথ্য" tab: photo (client-resized JPEG ≤~300KB stored as data URL in DB, served at `/api/profile/photo?v=…`), name, designation, promise, slogans, homepage headline (`heroAnnouncement`), phone, email, address, ward villages.
- Link-preview image: `public/og-image-v3.jpg` (white background, photo + slogan + name + designation + URL). **Change the filename (v4…) whenever it changes** so Facebook/WhatsApp refetch; update `index.html` (3 refs).
- Election-law compliance (campaign identity, data collection) is the owner's job with his legal adviser. Don't give legal advice.

## 5. Capacity notes (Turso free: 5GB, 500M row-reads/mo, 10M row-writes/mo)
Storage/writes are effectively unlimited. **Row reads are the bottleneck**: the admin list `getAllProblems()` is `SELECT *` with no limit (fine to a few thousand; add pagination before heavy use). Phone lookup is already DB-side via the indexed blind index (max 20 rows). `getPublicStats()` is two GROUP BY queries, cached 30 s in memory per serverless instance.

## 6. Testing & deploy workflow
- Syntax check (no installs needed): `tsc --ignoreConfig --noEmit --noResolve --skipLibCheck --jsx react-jsx --target ES2022 --module ESNext --moduleResolution bundler --allowImportingTsExtensions --types "" <files>` and grep `TS1xxx`. (With `--noResolve`, TS18046/TS2538/TS7053 are resolution artifacts, not bugs.)
- Server integration tests (172 checks: privacy, consent, phone+code tracking, full-count stats (all topics, zeros), admin gate, sessions/logout, 2FA incl. replay, audit append-only, backup/restore, encryption + key migration, rate limits, legacy-status migration, photo, settings): `PATH=$PATH:/opt/npm-tools/node_modules/.bin bash dev-tools/run-itest.sh` (Node 22 + tsx; no network; stubs for express/@libsql/dotenv). **Add a test for every new endpoint.** UI smoke check: bundle components with esbuild and `renderToString` (lucide-react stubbed) to catch render crashes; `esbuild --bundle --packages=external src/main.tsx` catches missing exports.
- Claude's cloud sandbox cannot reach the live site, npm, or Vercel. A full `vite build` / real-browser run is not possible there: always ask the owner to verify on his phone and send screenshots. Check deploy status with `gh api repos/motindog20-pixel/dhamti-jonoseba/commits/<sha>/status`.
- Push: owner authorised pushing straight to `main` of his repo (Vercel auto-deploys in ~1–2 min). Commit trailers: `Co-Authored-By: Claude …` + session link as instructed by the harness.
- Production smoke test after each deploy: `/api/manifesto` returns JSON · `/api/stats` has numbers only · `/api/problems` is 404 · admin login (+2FA code if on) works · test complaint from another phone · track by number shows status but no text · admin "নিরাপত্তা" tab shows encryption ON · delete test data.

## 7. Pitfalls
- **Hooks:** in `AdminSectionModal` all `useState` must stay above the `if (!isOpen) return null`.
- **Bengali Unicode:** "য়", "ড়", "ঢ়" may be precomposed (U+09DF/U+09DC/U+09DD) or base+nukta. Compare with `.normalize('NFC')`; in scripted edits anchor on ASCII (e.g. `value={editSubSlogan}`) and assert the match count, otherwise replacements silently fail.
- The browser may cache only public data (profile, villages, manifesto `…_v2`) and the user's own name/phone (`dhamti_contact_v1`); never complaint lists. `App.tsx` deletes the legacy keys `dhamti_real_problems_v1` and `dhamti_my_reports_v1`.
- The `timeline` JSON (status notes) is sealed too; with a wrong/missing key it reads as empty and `updateProblemStatus` refuses to write (so history can't be wiped). Never change `DATA_ENCRYPTION_KEY` once real data exists.
- Don't put secrets in the repo or chat. `.env.example` lists names only.
- Image fonts in this sandbox: no Hind Siliguri; only FreeSans/FreeSerif have Bengali. Social images are rendered with Playwright from HTML.

- **`.gitignore` must say `/data/` (root only), never `data/`:** `data/` also hides `src/data/*` so new files there silently never reach GitHub/Vercel (2026-11-22: `statuses.ts` missing → Vercel build "Could not resolve ../data/statuses"). After adding files, run `git status --ignored` and test a clean `git checkout-index -a --prefix=<dir>/` bundle with esbuild.

## 8. Open items / ideas (owner's backlog, roughly by priority)
1. **Before launch (owner):** set `DATA_ENCRYPTION_KEY` on Vercel + keep an offline copy; turn on 2FA; take first backup; legal adviser reviews privacy policy text; confirm election/launch dates with the election officer; enter 9 wards' villages + real office address; run the smoke test on his phone.
2. (done 2026-11-21) timeline notes are now sealed.
3. Email/Telegram alert to the owner on every new complaint (needs his email + a free Resend/Telegram bot).
4. Admin list pagination (50/page) before heavy traffic.
5. "কাজের হিসাব" section, "আমার সম্পর্কে" page, QR code + WhatsApp/Facebook share buttons, bigger thank-you screen.
6. Custom domain (then update `index.html` canonical/og:url/og:image and JSON-LD).
7. Weekly backup habit; data deletion ~1 year after the result (no automatic job yet — manual or build one).
8. Run `bun install` locally once and commit `bun.lock` (tsx moved to dependencies; firebase/@google/genai/playwright unused).
9. Optional: auto-refresh of open pages; SMS OTP for tracking (costs money; owner declined for now).

## 9. Roadmap
Six-month plan toward the public release on **1 April 2027** is in `ROADMAP-bn.md` (phases Dec–Mar, launch checklist, risks). Election day per owner: **27 May 2027** (an Oct-2026 news item listed 27 May as UP phase 7, not final) — owner must confirm the official schedule with the district election officer. Freeze code 22 Mar; no code changes in the vote week (16–26 May) except critical fixes. When a phase item ships, tick it off there.

## 10. Log (newest first)
- 2026-11-22 (late): PIN replaced by reference code (owner: more professional; admin can just read the code, no reset UI). Codes now 6 random digits. 172 checks. The owner twice tested an OLD deployment (no PIN field) — make sure he opens the branch preview URL via Vercel *Visit*, never `dhamti-jonoseba.vercel.app`/`anwarfordhamti.vercel.app` (still old `main`).
- 2026-11-22: PIN system shipped on the branch (see §4 status check): server + submit form PIN field + track form + admin PIN reset; 190 checks. Owner chose it over "fewer details" and SMS OTP (no cost for the pilot; domain/paid options later depending on response).
- 2026-11-22: ward panel shows top 5 topics + expand-all button (owner, from mobile screenshot of the OLD live site's ward cards). Owner wants link `anwarfordhamti.vercel.app` (add under project Settings → Domains; he saw 404 DEPLOYMENT_NOT_FOUND until added); old URL keeps working. Update `index.html` canonical/og:url/og:image/JSON-LD to the new URL only after he confirms it opens.
- 2026-11-22: stats changed per owner: no suppression, all 8 topics per ward with count + %, zeros shown (server `getPublicStats`, `StatisticsSection`, privacy text, tests 152). Preview env: `DATA_ENCRYPTION_KEY` added as Vercel *Shared* variable linked to the project (Production+Preview), preview showed encryption ON. Preview and live share ONE Turso DB.
- 2026-11-22: found the Vercel preview failure: `.gitignore` `data/` hid `src/data/statuses.ts`. Fixed (`/data/`), file committed; clean-checkout bundle OK, 148 checks pass.
- 2026-11-21: timeline (status notes) sealed at rest + write-guard for wrong key; 148 checks. Branch preview deploy FAILED (cause found 2026-11-22, see above).
- 2026-11-20: topic dropdown first in the complaint form (+ `drugs`, `other` topics); per-ward topic counts in public stats.
- 2026-11-20: security overhaul (branch `claude/security-overhaul`): public stats only (k<5), phone-only tracking, 6 statuses, privacy policy + consent, owner-only admin with DB sessions, optional TOTP 2FA, AES-GCM encryption + blind index, append-only audit log, backup/restore, rate limits, "নিরাপত্তা" admin tab; assistants/upvotes/public list removed; 138 integration checks.
- 2026-11-19: roadmap written (ROADMAP-bn.md); CLAUDE.md memory added; link-preview image v3 (white bg); admin tab renamed "পেজের তথ্য"; tsconfig `types` fix; admin editing of photo/headline/villages shipped; first live deploy on owner's fork; env vars set; admin login confirmed working.
- 2026-11-18: privacy model, mandatory fields, phone/code tracking, coming-soon manifesto, mobile action bar, server-side admin auth.
