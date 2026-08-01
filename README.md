# SAP Controls Mastery — Console

Standalone self-study LMS console for TIB Systems LLC's "SAP Controls Mastery" programme.

**Live production URL:** https://tib-sap-controls-tutor.vercel.app
**Vercel project:** `tib-sap-controls-tutor` (`prj_906eDyCL7oTFlhBhCbGgL2hzqN4P`, team `team_TveFDNLf8fJgQ9i0Dw9lKORH`)

## What's in this repo

Three files, pulled directly from the live production deployment on 2026-08-01 (verified via
`node -e "require('./content-parser.js')"` and HTML tag-balance checks — all clean):

| File | What it is |
|---|---|
| `index.html` | The trainee-facing console — sign-in, curriculum sidebar, day/session content, labs, templates, case studies, interview simulation, course materials, and the "How This Course Works" explainer. |
| `content-parser.js` | Shared markdown-to-block parser. Converts the `body_markdown` field from Supabase into typed content blocks (paragraphs, tables, callouts, case study titles, bullet lists, week/phase headers) that `index.html` renders. Also usable server-side (Node/CommonJS) — it's the same parser the Word-manual generator uses, kept in sync so the console and the downloadable manuals never drift apart. |
| `cohort-dashboard.html` | Staff-only dashboard — enrollment stats, at-risk/not-started learner filters, sortable progress table. Requires the signed-in account to be listed in the `staff_users` Supabase table (checked via the `is_staff` RPC function). |

No build step, no framework, no `package.json` — plain static HTML/JS. Vercel serves these three
files as-is.

## Backend dependencies (not in this repo)

- **Supabase** (`blfgwysgekfqhcafofhe`) — all content and progress data. Tables used: `selfstudy_days`,
  `selfstudy_labs`, `selfstudy_templates`, `selfstudy_case_studies`, `selfstudy_interview_rounds`,
  `selfstudy_enrollments`, `selfstudy_progress`, `staff_users`. The anon key embedded in both HTML
  files is intentionally public (client-side Supabase anon keys are meant to be exposed) — real
  access control is enforced by Row-Level Security policies on the Supabase side, not by hiding this key.
- **Backblaze B2** (`kabo-training-docs` bucket, `course-materials/` prefix) — the original PDF/Word
  manuals linked from the "Course Materials" tab.

## Deploying to GitHub

```bash
cd tib-sap-controls-tutor-repo
git init
git add .
git commit -m "Import live production files from Vercel"
git branch -M main
git remote add origin https://github.com/isaac-gethub/tib-sap-controls-tutor.git
git push -u origin main
```

(Adjust the remote URL if you want a different repo name — this project has no existing GitHub
repo today; it was deployed directly to Vercel via API, bypassing Git entirely.)

## Connecting Vercel to the new GitHub repo

The project is currently deployed via direct file upload (no Git integration). To switch it to
deploy automatically from GitHub on every push:

1. In the Vercel dashboard, open the `tib-sap-controls-tutor` project → **Settings → Git**.
2. Click **Connect Git Repository** and select the `isaac-gethub/tib-sap-controls-tutor` repo you
   just pushed.
3. Leave build settings as-is — no framework, no build command, no output directory (root = static
   files served directly).
4. Future deploys happen automatically on push to `main`. The direct-upload deployment history stays
   intact; this just adds Git as a new deployment trigger going forward.

## Important: Deployment Protection

As of 2026-08-01, this project's **Vercel Deployment Protection (SSO) was disabled** after being
found ON with no custom domain attached — which meant every real trainee was hitting a Vercel login
wall before ever reaching the sign-in screen. If protection ever gets re-enabled (e.g. by a Vercel
plan/team policy change), check **Settings → Deployment Protection** and either turn it off or
attach a custom domain, which exempts it under the current `all_except_custom_domains` policy.

## File integrity (as pulled from production)

```
index.html            877 lines   sha256: ea81d30a6a5e6e7e008d81fe960253b32ed9ba2e0f2938eab89b18967e3f4cc8
content-parser.js     197 lines   sha256: 77ff46c4f5ac129b87d2f9af0e663629a694963afb69ebae0673bb2979545697
cohort-dashboard.html 382 lines   sha256: aaddecfa20e432a923d3b7154e497df6a56822bf51465e93bdae136de7a3edca
```
