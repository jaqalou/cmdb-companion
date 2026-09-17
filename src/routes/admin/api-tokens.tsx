import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/cmdb/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import {
  createApiToken,
  deleteApiToken,
  listApiTokens,
  revokeApiToken,
} from "@/lib/api-tokens.functions";

export const Route = createFileRoute("/admin/api-tokens")({
  head: () => ({
    meta: [
      { title: "API Tokens — CB Assets" },
      {
        name: "description",
        content:
          "Create and revoke personal API tokens for the CB Assets CMDB REST API. Administrators can issue and revoke tokens for any account.",
      },
      { property: "og:title", content: "API Tokens — CB Assets" },
      {
        property: "og:description",
        content: "Token-based authentication for the CB Assets CMDB REST API.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ApiTokensPage,
});

function fmt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

async function copyToken(value: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      toast.success("Copied to clipboard");
      return;
    }
  } catch {
    // fall through to the legacy path below
  }
  try {
    const el = document.createElement("textarea");
    el.value = value;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    el.setSelectionRange(0, value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    if (ok) {
      toast.success("Copied to clipboard");
      return;
    }
  } catch {
    // ignore and show the manual hint
  }
  toast.error("Could not copy automatically — select the token and copy it manually");
}

function statusOf(t: { revokedAt: string | null; expiresAt: string | null }) {
  if (t.revokedAt) return { label: "Revoked", tone: "text-destructive" };
  if (t.expiresAt && new Date(t.expiresAt).getTime() < Date.now())
    return { label: "Expired", tone: "text-muted-foreground" };
  return { label: "Active", tone: "text-primary" };
}

function ApiTokensPage() {
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const fetchTokens = useServerFn(listApiTokens);
  const create = useServerFn(createApiToken);
  const revoke = useServerFn(revokeApiToken);
  const remove = useServerFn(deleteApiToken);

  const [showAll, setShowAll] = useState(false);
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [forUser, setForUser] = useState("");
  const [issued, setIssued] = useState<string | null>(null);

  const scope = showAll && isAdmin ? "all" : "mine";
  const tokens = useQuery({
    queryKey: ["api-tokens", scope],
    queryFn: () => fetchTokens({ data: { scope: scope as "mine" | "all" } }),
    enabled: !!user,
  });

  const createMut = useMutation({
    mutationFn: async () =>
      create({
        data: {
          name: name.trim(),
          expiresInDays: expiry ? Number(expiry) : null,
          ...(forUser.trim() ? { userId: forUser.trim() } : {}),
        },
      }),
    onSuccess: (res) => {
      setIssued(res.token);
      setName("");
      setExpiry("");
      setForUser("");
      toast.success("API token created — copy it now, it is shown only once");
      queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not create the token"),
  });

  const revokeMut = useMutation({
    mutationFn: async (id: string) => revoke({ data: { id } }),
    onSuccess: () => {
      toast.success("Token revoked");
      queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not revoke the token"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Token removed");
      queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not remove the token"),
  });

  if (!loading && !user) {
    return (
      <PageShell>
        <section className="mx-auto max-w-[900px] px-6 py-20 lg:px-10">
          <h1 className="font-display text-4xl text-brand">API tokens</h1>
          <p className="mt-3 text-muted-foreground">
            Sign in to create and manage the tokens your scripts use.
          </p>
          <Link to="/auth" className="btn-accent mt-6 inline-flex h-9 items-center px-4">
            Sign in
          </Link>
        </section>
      </PageShell>
    );
  }

  const rows = tokens.data?.tokens ?? [];

  return (
    <PageShell>
      <section className="surface-brand">
        <div className="mx-auto max-w-[1400px] px-6 py-12 lg:px-10">
          <p className="eyebrow text-gold">Developers</p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">API tokens</h1>
          <p className="mt-3 max-w-2xl text-brand-foreground/70">
            A token authenticates API calls as your account and carries exactly your rights:
            viewers read, editors create and amend, administrators may also delete. Send it as{" "}
            <span className="font-mono">Authorization: Bearer &lt;token&gt;</span> or as a GLPI{" "}
            <span className="font-mono">Session-Token</span>.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-10 lg:px-10">
        {issued && (
          <div className="mb-8 rounded-xl border border-gold/50 bg-gold/10 p-5">
            <p className="text-sm font-semibold text-brand">
              Copy this token now — it is never shown again.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <code className="break-all rounded bg-brand-deep px-3 py-2 font-mono text-xs text-brand-foreground">
                {issued}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToken(issued)}
              >
                Copy
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIssued(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-foreground/10 bg-card p-6">
          <h2 className="font-display text-2xl text-brand">Create a token</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr_auto] md:items-end">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nightly inventory sync"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Expires in (days, optional)
              </label>
              <Input
                type="number"
                min={1}
                max={3650}
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                placeholder="Never"
              />
            </div>
            <Button
              className="btn-accent h-10"
              disabled={!name.trim() || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? "Creating…" : "Create token"}
            </Button>
          </div>
          {isAdmin && (
            <div className="mt-4 max-w-md">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Issue for another account (user id, optional)
              </label>
              <Input
                value={forUser}
                onChange={(e) => setForUser(e.target.value)}
                placeholder="Leave empty to issue for yourself"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                User identifiers are listed under{" "}
                <Link to="/admin/users" className="underline">
                  Users &amp; permissions
                </Link>
                .
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-brand">
            {scope === "all" ? "All tokens" : "Your tokens"}
          </h2>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show only mine" : "Show all accounts"}
            </Button>
          )}
        </div>

        <div className="mt-4 overflow-x-auto border border-foreground/10 bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Token</th>
                {scope === "all" && <th className="px-4 py-3">Account</th>}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Last used</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10">
              {tokens.isLoading && (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={8}>
                    Loading…
                  </td>
                </tr>
              )}
              {!tokens.isLoading && rows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={8}>
                    No tokens yet.
                  </td>
                </tr>
              )}
              {rows.map((t) => {
                const status = statusOf(t);
                return (
                  <tr key={t.id}>
                    <td className="px-4 py-3 font-medium text-brand">{t.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      cba_{t.tokenPrefix}_…
                    </td>
                    {scope === "all" && (
                      <td className="px-4 py-3 text-muted-foreground">{t.email ?? t.userId}</td>
                    )}
                    <td className={`px-4 py-3 font-medium ${status.tone}`}>{status.label}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmt(t.createdAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmt(t.lastUsedAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmt(t.expiresAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {!t.revokedAt && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={revokeMut.isPending}
                            onClick={() => revokeMut.mutate(t.id)}
                          >
                            Revoke
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deleteMut.isPending}
                          onClick={() => deleteMut.mutate(t.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-8 max-w-3xl">
          <h2 className="font-display text-2xl text-brand">Using a token</h2>
          <pre className="mt-3 overflow-x-auto bg-brand-deep p-5 font-mono text-xs leading-relaxed text-brand-foreground">
{`curl -H "Authorization: Bearer cba_xxxxxxxx_…" \\
  "$BASE/api/public/now/table/cmdb_ci_server?sysparm_limit=10"

curl -H "Session-Token: cba_xxxxxxxx_…" \\
  "$BASE/api/public/apirest.php/Computer?range=0-9"`}
          </pre>
        </div>
      </section>
    </PageShell>
  );
}
