"use client";

import { useEffect, useState } from "react";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { isAllowedGoogleUser } from "@/lib/auth";
import { supabase, supabaseConfigured } from "@/lib/supabase-browser";

export default function GoogleAccount() {
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const acceptAllowedSession = async (session: Awaited<ReturnType<typeof client.auth.getSession>>["data"]["session"]) => {
      if (session && isAllowedGoogleUser(session.user)) {
        setEmail(session.user.email ?? null);
      } else {
        setEmail(null);
        if (session) await client.auth.signOut({ scope: "local" });
      }
      window.dispatchEvent(new Event("activa-t-auth-ready"));
    };
    void client.auth.getSession().then(({ data }) => acceptAllowedSession(data.session));
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (session && !isAllowedGoogleUser(session.user)) {
        setEmail(null);
        window.setTimeout(() => void client.auth.signOut({ scope: "local" }), 0);
      } else {
        setEmail(session?.user.email ?? null);
      }
      window.dispatchEvent(new Event("activa-t-auth-ready"));
    });
    return () => data.subscription.unsubscribe();
  }, []);
  if (!supabaseConfigured) return <span className="account-note">Google pendent de configurar</span>;
  if (!email) return <button className="account-button" type="button" disabled={busy} onClick={async () => { if (!supabase) return; setBusy(true); const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: new URL("/", window.location.origin).href } }); if (error) { window.alert(error.message); setBusy(false); } }}><LogIn /> Entrar amb Google</button>;
  return <div className="account-user"><UserRound /><span>{email}</span><button type="button" aria-label="Sortir" onClick={() => void supabase?.auth.signOut({ scope: "local" })}><LogOut /></button></div>;
}
