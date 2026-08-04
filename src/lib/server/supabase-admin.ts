import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client.
 *
 * ONLY import this from server-only code (API routes in `src/routes/api.*`).
 * It bypasses Row Level Security and must never be bundled into the client.
 */
let _admin: SupabaseClient | undefined;

function resolveUrl(): string {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
}

function resolveKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    ""
  );
}

export function supabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = resolveUrl();
  const key = resolveKey();
  if (!url || !key) {
    throw new Error(
      "[push] Missing Supabase admin credentials. Set SUPABASE_SERVICE_ROLE_KEY (and SUPABASE_URL).",
    );
  }
  _admin = createClient(url, key, { auth: { persistSession: false } });
  return _admin;
}
