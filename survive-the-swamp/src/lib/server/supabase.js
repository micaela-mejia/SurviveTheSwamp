import "server-only";
import { createClient } from "@supabase/supabase-js";
import { BackendConfigError } from "./errors.js";

let client;

// Service-role client: server-only, bypasses RLS. Every query MUST filter by
// the signed-in user's id (see store.js). Never import this in client code.
export function getSupabase() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new BackendConfigError(
      "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
