# Deployment (Vercel)

## Project

- **Vercel project ID:** `prj_hp4Ko6EtjaYT1j9M0B5yZKMDhTOk`

Use this when linking via CLI (`vercel link`) or when confirming the project in the Vercel dashboard.

## Connect the repo

1. In [Vercel](https://vercel.com), open your project (or **Add New** → **Project** and import `iamgopaul/Novaryn-2.0`).
2. Vercel will detect the Vite app. Build settings from `vercel.json`:
   - **Build Command:** `bun run build`
   - **Output Directory:** `dist`
3. Add **Environment Variables** (Settings → Environment Variables) for Production (and Preview if you want 2FA there):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (for 2FA API)
   - `RESEND_API_KEY` (for 2FA emails)

## CLI link (optional)

To deploy from the CLI with this project:

```bash
vercel link
# When prompted, choose the existing project and use ID: prj_hp4Ko6EtjaYT1j9M0B5yZKMDhTOk
```

Then:

```bash
vercel --prod
```

## After deploy

- The app is a Vite SPA; all non-API routes are rewritten to `index.html`.
- 2FA is handled by Vercel serverless functions at `/api/auth/send-2fa` and `/api/auth/verify-2fa` (see `api/auth/` in the repo).
