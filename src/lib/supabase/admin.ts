import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Uses the service role key — bypasses RLS entirely. Only ever import this
// from server-only code (server actions, route handlers), never from a
// client component, and never expose SUPABASE_SERVICE_ROLE_KEY with the
// NEXT_PUBLIC_ prefix.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
