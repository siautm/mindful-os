/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional backend origin for API calls; empty means same-origin. */
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Session length before auto sign-out (ms). Min 10000. Default 3600000 (1h) when unset. */
  readonly VITE_SESSION_TTL_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
