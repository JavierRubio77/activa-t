"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Download, LogOut } from "lucide-react";
import { isAllowedGoogleUser } from "@/lib/auth";
import { supabase, supabaseConfigured } from "@/lib/supabase-browser";

function googleAvatar(user: User | null) {
  if (!user) return null;
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const value = metadata?.avatar_url ?? metadata?.picture;
  return typeof value === "string" && value.startsWith("http") ? value : null;
}

function backupFilename() {
  return `activa-t-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

export default function GoogleAccount() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const acceptSession = async (session: Awaited<ReturnType<typeof client.auth.getSession>>["data"]["session"]) => {
      if (session && isAllowedGoogleUser(session.user)) setUser(session.user);
      else {
        setUser(null);
        if (session) await client.auth.signOut({ scope: "local" });
      }
      window.dispatchEvent(new Event("activa-t-auth-ready"));
    };
    void client.auth.getSession().then(({ data }) => acceptSession(data.session));
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (session && isAllowedGoogleUser(session.user)) setUser(session.user);
      else {
        setUser(null);
        if (session) window.setTimeout(() => void client.auth.signOut({ scope: "local" }), 0);
      }
      window.dispatchEvent(new Event("activa-t-auth-ready"));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  if (!supabaseConfigured) return <span className="account-note">Google pendent de configurar</span>;

  const avatar = googleAvatar(user);
  const signIn = async () => {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: new URL("/", window.location.origin).href } });
    if (error) {
      window.alert(error.message);
      setBusy(false);
    }
  };
  const downloadBackup = async () => {
    if (!supabase) return;
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Cal iniciar sessió amb Google.");
      const response = await fetch("/api/data", { headers: { Authorization: `Bearer ${data.session.access_token}` } });
      const payload = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "No s’ha pogut crear la còpia.");
      const backup = { app: "Activa’t", format: "activa-t-backup-v1", exportedAt: new Date().toISOString(), data: payload };
      const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = backupFilename();
      link.click();
      URL.revokeObjectURL(blobUrl);
      setMenuOpen(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No s’ha pogut crear la còpia.");
    } finally {
      setBusy(false);
    }
  };
  const signOut = async () => {
    setBusy(true);
    await supabase?.auth.signOut({ scope: "local" });
    setMenuOpen(false);
    setBusy(false);
  };

  return (
    <div className="account-menu" ref={menuRef}>
      <button className="google-avatar-button" type="button" disabled={busy} aria-label={user ? "Obrir opcions del compte de Google" : "Entrar amb Google"} title={user ? "Compte de Google" : "Entrar amb Google"} onClick={() => user ? setMenuOpen((open) => !open) : void signIn()}>
        {avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <span className="google-avatar-fallback" aria-hidden="true">G</span>}
      </button>
      {user && menuOpen ? (
        <div className="account-popover" role="menu">
          <div className="account-popover-user"><strong>{user.email}</strong><span>Compte de Google connectat</span></div>
          <button type="button" role="menuitem" disabled={busy} onClick={() => void downloadBackup()}><Download /> Guardar còpia de seguretat</button>
          <button type="button" role="menuitem" disabled={busy} onClick={() => void signOut()}><LogOut /> Desconnectar</button>
        </div>
      ) : null}
    </div>
  );
}
