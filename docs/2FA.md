# Two-Factor Authentication (2FA)

Novaryn uses **both Supabase and Resend** for 2FA:

| Responsibility | Service | What it does |
|----------------|---------|--------------|
| **Store 2FA state** | **Supabase** | `profiles.two_factor_enabled` – whether the user has 2FA on |
| **Store one-time codes** | **Supabase** | `two_factor_codes` table – 6-digit code, expiry, `used` flag |
| **Send the code by email** | **Resend** | Sends the 6-digit verification code to the user’s email |

## Flow

1. **Enable 2FA** (Settings → Security): User toggles 2FA on → app updates `profiles.two_factor_enabled` in **Supabase**.
2. **Login with 2FA**:
   - User signs in with email/password (Supabase Auth).
   - App checks `profiles.two_factor_enabled` in **Supabase**.
   - If enabled, app calls your API server `POST /api/auth/send-2fa` with `userId` and `email`.
   - **API server**: generates a 6-digit code, stores it in **Supabase** (`two_factor_codes`), then sends the code via **Resend**.
   - User enters the code; app calls `POST /api/auth/verify-2fa`.
   - **API server**: checks the code in **Supabase** (valid, not expired, not used), marks it used, returns success.
   - User is considered fully logged in.

## Environment variables

- **Supabase** (required for 2FA):
  - `NEXT_PUBLIC_SUPABASE_URL` – Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` – used by the frontend
  - `SUPABASE_SERVICE_ROLE_KEY` – used by the API server so it can read/update `two_factor_codes` (bypasses RLS)
- **Resend** (required to send the code email):
  - `RESEND_API_KEY` – from [Resend](https://resend.com)

## Database

Ensure your Supabase project has:

- **profiles**: column `two_factor_enabled` (boolean, default `false`).
- **two_factor_codes** table (see `scripts/001_core_tables.sql`):
  - `id`, `user_id`, `code`, `expires_at`, `used`, `created_at`

Run the migrations in `scripts/` if you haven’t already.

## Running the API server

2FA endpoints live on the Bun API server. Start it so the app can send and verify codes:

```bash
bun run server
```

Keep it running while using 2FA (e.g. on port 5001). The Vite dev server proxies `/api/*` to it when you run `bun run dev`.

## Summary

- **Supabase**: who has 2FA on, and storage/validation of one-time codes.
- **Resend**: delivery of the 6-digit code by email.

Both are required for 2FA to work.
