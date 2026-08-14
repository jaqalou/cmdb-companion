import { useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageShell } from "@/components/cmdb/site-chrome";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

type AuthSearch = { redirect?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    redirect: typeof search["redirect"] === "string" ? (search["redirect"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Nordbryg CMDB" },
      {
        name: "description",
        content:
          "Authenticate to access the configuration management database. Access is restricted to authorised Nordbryg personnel.",
      },
      { property: "og:title", content: "Sign in — Nordbryg CMDB" },
      { property: "og:description", content: "Restricted access to the Nordbryg CMDB." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function safePath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/servers";
  return value;
}

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const destination = safePath(search.redirect);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (password.length < 12) {
          toast.error("Password must be at least 12 characters.");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}${destination}` },
        });
        if (error) throw error;
        toast.success("Account created. Check your inbox to confirm your address.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: destination });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    try {
      sessionStorage.setItem("cmdb.redirect", destination);
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google sign-in failed");
        return;
      }
      if (result.redirected) return;
      navigate({ to: destination });
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <section className="mx-auto flex max-w-md flex-col px-6 py-24">
        <p className="eyebrow text-muted-foreground">Restricted system</p>
        <h1 className="mt-4 font-display text-4xl text-brand">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The CMDB contains asset and personal data. Access is logged and limited to authorised
          personnel.
        </p>

        <form onSubmit={submit} className="mt-10 space-y-4">
          <label className="block">
            <span className="eyebrow text-muted-foreground">Work email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full border border-border bg-card px-4 py-3 text-sm outline-none focus:border-gold"
            />
          </label>
          <label className="block">
            <span className="eyebrow text-muted-foreground">Password</span>
            <input
              type="password"
              required
              minLength={mode === "signup" ? 12 : 1}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full border border-border bg-card px-4 py-3 text-sm outline-none focus:border-gold"
            />
            {mode === "signup" && (
              <span className="mt-2 block text-xs text-muted-foreground">
                Minimum 12 characters. Passwords are checked against known breach corpora.
              </span>
            )}
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-brand px-6 py-4 text-xs uppercase tracking-[0.2em] text-brand-foreground disabled:opacity-60"
          >
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="my-8 flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={google}
          disabled={busy}
          className="w-full border border-border px-6 py-4 text-xs uppercase tracking-[0.2em] text-brand transition-colors hover:border-gold disabled:opacity-60"
        >
          Continue with Google
        </button>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-8 text-sm text-muted-foreground underline underline-offset-4 hover:text-brand"
        >
          {mode === "signin" ? "Need an account? Register" : "Already registered? Sign in"}
        </button>
      </section>
    </PageShell>
  );
}