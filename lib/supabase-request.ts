import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { isAllowedGoogleUser } from "./auth";

const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const env = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;
const supabaseUrl = env.VITE_SUPABASE_URL ?? viteEnv.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export async function requireSupabaseUser(request: Request): Promise<{ client: SupabaseClient | null; user: User | null }> {
  const bearer = request.headers.get("authorization") ?? "";
  if (!supabaseUrl || !supabaseKey || !bearer.startsWith("Bearer ")) return { client: null, user: null };
  const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: bearer } } });
  const { data: { user } } = await client.auth.getUser();
  return { client, user: isAllowedGoogleUser(user) ? user : null };
}
