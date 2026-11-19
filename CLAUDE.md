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
- `server/security.ts` admin auth (HMAC cookie `dhamti_admin`, 8h), CSRF same-origin check, headers, login rate-limit, sanitizers.
- `server/db.ts` schema, migrations, CRUD. Tables: `problems`, `manifesto_items`, `leader_profile` (id='current'), `site_settings` (key/value).
- `src/App.tsx` state + server-first handlers; `src/components/*`; `src/services/api.ts` client API; `src/services/phone.ts` shared BD-phone normaliser; `src/services/myReports.ts` device memory; `src/services/photo.ts` client image resize.
- `public/`: keep tiny (leader.jpg, favicons, `og-image-v3.jpg`). `dev-tools/`: local test runner.

## 3. Environment (Vercel → Settings → Environment Variables)
`ADMIN_PASSWORD` (admin login), `SESSION_SECRET` (32+ random chars), `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`. All set (Nov 2026). **Changing any needs a Redeploy.**
Without Turso on Vercel all writes return 503 (`isDbPersistent`). Admin password change = edit `ADMIN_PASSWORD` + redeploy (no UI for it, by design).

## 4. Decisions made by the owner (do not reverse without asking)
- Complaint requires **name + BD mobile + ward** (no anonymous option). Server enforces it too.
- **Name/phone are never public.** All public API responses go through `toPublic()` (phone '' and name 'এলাকাবাসী'). Only `GET /api/admin/problems` returns full data.
- No login/OTP for citizens. Status check: `POST /api/track` by phone (any BD format, Bangla digits ok) or tracking code `JNS-/ADV-YYYY-####`; returns public objects only. Accepted risk: anyone who knows a number can see that number's complaint progress.
- **No spam/rate limits** on submit/upvote/track (owner's choice). Only admin-login attempts are limited.
- Designation: "চেয়ারম্যান পদপ্রার্থী, ১৩ নং ধামতী ইউনিয়ন পরিষদ". Wards `ward-01..09` named "ওয়ার্ড নং ০১..০৯"; villages are entered by admin (site_settings `wardVillages`).
- **Manifesto not released yet** → "coming soon" state (`ManifestoSection`). Admin adds pledges later; the full layout then appears automatically. Never invent demo numbers/progress.
- Admin can edit from the "পেজের তথ্য" tab: photo (client-resized JPEG ≤~300KB stored as data URL in DB, served at `/api/profile/photo?v=…`), name, designation, promise, slogans, homepage headline (`heroAnnouncement`), phone, email, address, ward villages.
- Link-preview image: `public/og-image-v3.jpg` (white background, photo + slogan + name + designation + URL). **Change the filename (v4…) whenever it changes** so Facebook/WhatsApp refetch; update `index.html` (3 refs).
- Election-law compliance (campaign identity, data collection) is the owner's job with his legal adviser. Don't give legal advice.

## 5. Capacity notes (Turso free: 5GB, 500M row-reads/mo, 10M row-writes/mo)
Storage/writes are effectively unlimited. **Row reads are the bottleneck**: `getAllProblems()` is `SELECT *` with no limit and `findProblemsByPhone()` scans all rows. Fine to a few thousand complaints; before heavy traffic implement pagination (50/page), a DB-side phone lookup, and caching headers.

## 6. Testing & deploy workflow
- Syntax check (no installs needed): `tsc --ignoreConfig --noEmit --noResolve --skipLibCheck --jsx react-jsx --target ES2022 --module ESNext --moduleResolution bundler --allowImportingTsExtensions --types "" <files>` and grep `TS1xxx`. (With `--noResolve`, TS18046 on `err instanceof ApiError` is a resolution artifact, not a bug.)
- Server integration tests (63 checks: privacy, admin gate, validation, tracking, photo, settings, migrations): `bash dev-tools/run-itest.sh` (needs Node 22 + tsx; no network). **Add a test for every new endpoint.**
- Claude's cloud sandbox cannot reach the live site, npm, or Vercel. A full `vite build` / real-browser run is not possible there: always ask the owner to verify on his phone and send screenshots. Check deploy status with `gh api repos/motindog20-pixel/dhamti-jonoseba/commits/<sha>/status`.
- Push: owner authorised pushing straight to `main` of his repo (Vercel auto-deploys in ~1–2 min). Commit trailers: `Co-Authored-By: Claude …` + session link as instructed by the harness.
- Production smoke test after each deploy: `/api/manifesto` returns JSON · admin login works · test complaint from another phone shows tracking code · `/api/problems` has no name/phone · track by number works · delete test data.

## 7. Pitfalls
- **Bengali Unicode:** "য়", "ড়", "ঢ়" may be precomposed (U+09DF/U+09DC/U+09DD) or base+nukta. Compare with `.normalize('NFC')`; in scripted edits anchor on ASCII (e.g. `value={editSubSlogan}`) and assert the match count, otherwise replacements silently fail.
- Cached public data in the browser (localStorage keys `dhamti_*_v1/v2`) must never contain phone/name; bump the key version when the cached shape changes (manifesto is `…_v2`).
- Don't put secrets in the repo or chat. `.env.example` lists names only.
- Image fonts in this sandbox: no Hind Siliguri; only FreeSans/FreeSerif have Bengali. Social images are rendered with Playwright from HTML.

## 8. Open items / ideas (owner's backlog, roughly by priority)
1. Owner to enter: 9 wards' village names, real office address, test complaint flow (pending his report).
2. Email/Telegram alert to the owner on every new complaint (needs his email + a free Resend/Telegram bot).
3. Pagination + DB-side phone lookup (see §5).
4. "কাজের হিসাব" section (before/after photos of resolved work), "আমার সম্পর্কে" page, QR code + WhatsApp/Facebook share buttons, thank-you screen with big tracking code.
5. Custom domain (then update `index.html` canonical/og:url/og:image and JSON-LD).
6. Weekly CSV backup; optional SMS OTP for tracking (costs money).
7. Run `bun install` locally once and commit `bun.lock` (tsx was moved to dependencies; firebase/@google/genai/playwright are unused and can be removed).
8. Optional: auto-refresh of open pages (poll every N minutes).

## 9. Roadmap
Six-month plan toward the public release on **1 April 2027** is in `ROADMAP-bn.md` (phases Dec–Mar, launch checklist, risks). Election day per owner: **27 May 2027** (an Oct-2026 news item listed 27 May as UP phase 7, not final) — owner must confirm the official schedule with the district election officer. Freeze code 22 Mar; no code changes in the vote week (16–26 May) except critical fixes. When a phase item ships, tick it off there.

## 10. Log (newest first)
- 2026-11-19: roadmap written (ROADMAP-bn.md); CLAUDE.md memory added; link-preview image v3 (white bg); admin tab renamed "পেজের তথ্য"; tsconfig `types` fix; admin editing of photo/headline/villages shipped; first live deploy on owner's fork; env vars set; admin login confirmed working.
- 2026-11-18: privacy model, mandatory fields, phone/code tracking, coming-soon manifesto, mobile action bar, server-side admin auth.
