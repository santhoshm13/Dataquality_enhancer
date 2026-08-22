import { createClient } from '@supabase/supabase-js';

// These values MUST be set as env vars in Vercel project settings:
//   VITE_SUPABASE_URL  → https://your-project.supabase.co
//   VITE_SUPABASE_ANON_KEY → your-anon-key
//
// No hardcoded fallback values — rotating keys requires only an env var update,
// and the repo doesn't leak project-specific identifiers.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // In dev mode, warn but don't crash — Supabase features will simply not work
  // until the developer adds the env vars to their local .env file.
  console.warn(
    '[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. ' +
    'Copy frontend/.env.example to frontend/.env and fill in your Supabase credentials.'
  );
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-key'
);
