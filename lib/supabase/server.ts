import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Server-only — never import this from a
 * client component. RLS is enabled with zero anon/authenticated grants on
 * every table, so only this service-role client can read/write at all.
 */
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.example)"
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
