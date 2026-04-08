# Mindful OS Backend + DB Setup (Vercel + Supabase)

This project now includes backend routes in `api/` for:

- `GET /api/health`
- `GET /api/sounds?type=rain`
- `GET|POST /api/state`
- `GET|POST|PATCH|DELETE /api/tasks`
- `GET|POST /api/focus-sessions`
- `GET|POST /api/checkins`

## 1) Supabase project

1. Create a new Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. Run `supabase/rls_policies.sql` in the same SQL Editor (enables Row Level Security so tables are not publicly readable/writable with the anon key). Serverless routes using the **service_role** key are unaffected.
4. In project settings, copy:
   - `Project URL` -> `SUPABASE_URL`
   - `service_role key` -> `SUPABASE_SERVICE_ROLE_KEY`

## 2) Freesound key

1. Create API app at <https://freesound.org/apiv2/apply/>.
2. Copy the API token (Client secret / API key column) as:
   - `FREESOUND_API_KEY`

## 3) Deploy to Vercel

1. Push this repo to GitHub.
2. Import the project in Vercel.
3. Set environment variables in Vercel:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `FREESOUND_API_KEY`
4. Deploy.

The same Vercel project serves static frontend and `/api/*` serverless routes.

## 4) Local development

Use `.env.local` for Vite UI variables (optional):

```env
VITE_API_BASE_URL=
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Leave it empty for same-origin in production.
For local frontend + remote backend, set:

```env
VITE_API_BASE_URL=https://YOUR-VERCEL-APP.vercel.app
```

## 5) Auth flow

Frontend uses Supabase Auth (email/password) and sends bearer tokens to `/api/*`.
Backend verifies bearer tokens server-side before DB operations.

