export const ALLOWED_EMAILS = [
  "javier.rubio.martinez@gmail.com",
  "anna.batet.soler@gmail.com",
  "eva.rubio.batet@gmail.com",
] as const;

export function normalizeEmail(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

export function isAllowedEmail(value: string | null | undefined) {
  return (ALLOWED_EMAILS as readonly string[]).includes(normalizeEmail(value));
}

export function isAllowedGoogleUser(user: { email?: string | null; app_metadata?: { provider?: unknown; providers?: unknown } } | null | undefined) {
  if (!user || !isAllowedEmail(user.email)) return false;
  const providers = Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : [user.app_metadata?.provider];
  return providers.some(provider => String(provider ?? "").toLowerCase() === "google");
}
