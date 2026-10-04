import { createClient } from "@supabase/supabase-js";

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const url = env.VITE_SUPABASE_URL ?? "";
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
export const supabaseConfigured = Boolean(url && key);
export const supabase = supabaseConfigured
  ? createClient(url, key, { auth: { storageKey: "activa_t_auth", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
