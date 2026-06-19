# Deployment Guide

## Push to Git remote

This repo has no remote configured yet. Create one on GitHub (or GitLab), then:

```powershell
cd D:\sak\Asvini\payoutstand-dashboard\mycitymyduty\mycitymyduty-application

# After creating an empty repo on GitHub (private recommended):
& "C:\Program Files\Git\cmd\git.exe" remote add origin https://github.com/YOUR_ORG/mycitymyduty.git
& "C:\Program Files\Git\cmd\git.exe" push -u origin master
```

### GitHub CLI (optional)

If you install [GitHub CLI](https://cli.github.com/):

```powershell
gh auth login
gh repo create mycitymyduty --private --source=. --remote=origin --push
```

Do **not** commit `.env.local` or any secrets. `.env*` is already in `.gitignore`.

---

## Hostinger (Next.js + Supabase)

MyCityMyDuty uses the Next.js App Router with SSR middleware and Supabase auth. It **requires Node.js hosting** — static export alone is not sufficient.

### Plan requirement

Use one of:

- **Hostinger Node.js Web App** (Business / Cloud / VPS with Node support) — preferred for client demos
- **VPS** with Node 20+ and a process manager (PM2)

Shared hosting without Node.js will **not** run this app.

### Connect repository

1. In hPanel → **Websites** → your site → **Node.js** (or **Deploy** / Git integration).
2. Connect the GitHub/GitLab repo (`mycitymyduty-application` root).
3. Set branch: `master`.
4. Set **Node.js version**: **20.x LTS** (minimum 20.9+ for Next.js 16).

### Build and start commands

| Setting        | Value                          |
|----------------|--------------------------------|
| Install        | `npm ci`                       |
| Build command  | `npm ci && npm run build`      |
| Start command  | `npm start`                    |
| Output / root  | Repository root (default)      |
| Port           | Use Hostinger default (`PORT` env is set by platform) |

`package.json` scripts:

- `build` → `next build`
- `start` → `next start`

### Environment variables (Hostinger panel)

Set these in the Hostinger environment / secrets UI:

**Required at runtime:**

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |

Copy values from your local `.env.local` (never commit them).

**Optional (local/scripts only — not needed for production runtime):**

| Variable | Description |
|----------|-------------|
| `SUPABASE_ACCESS_TOKEN` | Used by `scripts/run-migration.mjs` and admin scripts only |

### Supabase setup for production

1. Use the same Supabase project or create a dedicated production project.
2. Run migrations from `supabase/migrations/` in the Supabase SQL Editor (or use `npm run db:migrate` locally with `SUPABASE_ACCESS_TOKEN`).
3. In Supabase → **Authentication** → **URL configuration**, add your Hostinger domain to **Site URL** and **Redirect URLs**.

### Domain

Point your Hostinger domain or subdomain to the Node.js app in hPanel after deploy succeeds.

### Verify deployment

1. Open the deployed URL.
2. Sign up / log in (ensure Supabase redirect URLs include the Hostinger domain).
3. Check dashboard loads and data reads from Supabase.

### Troubleshooting

- **Build fails on Node version** — switch to Node 20 LTS in Hostinger settings.
- **Auth redirect loops** — add production URL to Supabase Auth redirect allow list.
- **Missing env vars** — both `NEXT_PUBLIC_*` vars must be set before build (they are inlined at build time).

---

## Why not `output: 'standalone'`?

The default `next build` + `npm start` flow works on Hostinger Node.js Web Apps without extra config. Standalone output is useful for Docker/minimal VPS bundles; it is not required here unless you move to a container-based deploy.
