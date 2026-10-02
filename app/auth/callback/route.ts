import { createClient } from "@supabase/supabase-js";
import { isAllowedGoogleUser } from "@/lib/auth";

const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const env = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const projectUrl = env.VITE_SUPABASE_URL ?? viteEnv.VITE_SUPABASE_URL;
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!code || !projectUrl || !publishableKey) return Response.redirect(new URL("/?auth=not-configured", url.origin));
  const supabase = createClient(projectUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session || !isAllowedGoogleUser(data.session.user)) return Response.redirect(new URL("/?auth=unauthorized", url.origin));
  const response = Response.redirect(new URL("/", url.origin));
  const secure = url.protocol === "https:" ? "; Secure" : "";
  response.headers.append("Set-Cookie", `activa_t_access_token=${data.session.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${data.session.expires_in}${secure}`);
  response.headers.append("Set-Cookie", `activa_t_refresh_token=${data.session.refresh_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`);
  return response;
}
