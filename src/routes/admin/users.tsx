import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PageShell } from "@/components/cmdb/site-chrome";
import { useAuth } from "@/hooks/use-auth";
import {
  deleteUserAccount,
  grantUserRole,
  listAppUsers,
  renameUser,
  revokeUserRole,
  type AppRole,
} from "@/lib/admin-users.functions";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Users & Permissions — CB Assets" },
      {
        name: "description",
        content:
          "Administer CB Assets accounts, federated sign-in identities and role-based permissions for the configuration management database.",
      },
      { property: "og:title", content: "Users & Permissions — CB Assets" },
      {
        property: "og:description",
        content: "Role-based access administration for the CB Assets CMDB.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UsersAdminPage,
});

const ROLES: { role: AppRole; label: string; detail: string }[] = [
  { role: "admin", label: "Admin", detail: "Full access, deletions, audit log and role grants" },
  { role: "editor", label: "Editor", detail: "Create and amend configuration items" },
  { role: "viewer", label: "Viewer", detail: "Read-only access" },
];

function fmt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function UsersAdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const fetchUsers = useServerFn(listAppUsers);
  const grant = useServerFn(grantUserRole);
  const revoke = useServerFn(revokeUserRole);
  const rename = useServerFn(renameUser);
  const deleteAccount = useServerFn(deleteUserAccount);

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers(),
    enabled: !!user && isAdmin,
  });

  const mutate = useMutation({
    mutationFn: async (input: { userId: string; role: AppRole; next: boolean }) =>
      input.next
        ? grant({ data: { userId: input.userId, role: input.role } })
        : revoke({ data: { userId: input.userId, role: input.role } }),
    onSuccess: () => {
      toast.success("Permissions updated");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not update permissions"),
  });

  const renameMut = useMutation({
    mutationFn: async (input: { userId: string; email: string }) =>
      rename({ data: input }),
    onSuccess: () => {
      toast.success("Account renamed");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not rename account"),
  });

  const deleteMut = useMutation({
    mutationFn: async (input: { userId: string }) => deleteAccount({ data: input }),
    onSuccess: () => {
      toast.success("Account deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not delete account"),
  });

  function onRename(userId: string, currentEmail: string) {
    const next = window.prompt("New email address for this account", currentEmail);
    if (!next || next.trim() === currentEmail) return;
    renameMut.mutate({ userId, email: next.trim() });
  }

  function onDelete(userId: string, email: string) {
    const confirmed = window.confirm(
      `Delete ${email}? This permanently removes the account and all of its permissions. This cannot be undone.`,
    );
    if (confirmed) deleteMut.mutate({ userId });
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6">
        <nav className="mb-2 text-[11px] text-muted-foreground">
          <Link to="/security" className="hover:text-primary">
            Security
          </Link>
          <span className="px-1.5">/</span>
          Users &amp; permissions
        </nav>
        <h1 className="text-xl font-semibold tracking-tight">Users &amp; permissions</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Accounts that have signed in through password or federated single sign-on. Roles are
          stored separately from the account and enforced in the database by row-level security,
          so a permission change takes effect for the API dialects as well as the web interface.
        </p>

        {!loading && !user && (
          <div className="mt-6 rounded-xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">
              Sign in with an administrator account to manage users.
            </p>
            <Link to="/auth" className="btn-accent mt-4 inline-flex h-9 px-4">
              Sign in
            </Link>
          </div>
        )}

        {!loading && user && !isAdmin && (
          <div className="mt-6 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Administrator access required. Ask an existing administrator to grant your account the
            admin role.
          </div>
        )}

        {isAdmin && (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {ROLES.map((r) => (
                <div key={r.role} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold">{r.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{r.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    <th className="px-4 py-2.5 font-semibold">Account</th>
                    <th className="px-4 py-2.5 font-semibold">Sign-in method</th>
                    <th className="px-4 py-2.5 font-semibold">Created</th>
                    <th className="px-4 py-2.5 font-semibold">Last sign-in</th>
                    <th className="px-4 py-2.5 font-semibold">Permissions</th>
                    <th className="px-4 py-2.5 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.isLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-muted-foreground">
                        Loading accounts…
                      </td>
                    </tr>
                  )}
                  {users.isError && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-destructive">
                        {users.error instanceof Error ? users.error.message : "Could not load users"}
                      </td>
                    </tr>
                  )}
                  {users.data?.map((row, i) => (
                    <tr key={row.id} className={i % 2 ? "bg-muted/20" : undefined}>
                      <td className="px-4 py-2.5">
                        <span className="font-medium">{row.email}</span>
                        <span className="block font-mono text-[11px] text-muted-foreground">
                          {row.id}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="chip capitalize">{row.provider}</span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{fmt(row.createdAt)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{fmt(row.lastSignInAt)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-3">
                          {ROLES.map((r) => {
                            const checked = row.roles.includes(r.role);
                            return (
                              <label key={r.role} className="flex items-center gap-1.5 text-xs">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={mutate.isPending}
                                  onChange={() =>
                                    mutate.mutate({
                                      userId: row.id,
                                      role: r.role,
                                      next: !checked,
                                    })
                                  }
                                />
                                {r.label}
                              </label>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={renameMut.isPending || deleteMut.isPending}
                            onClick={() => onRename(row.id, row.email)}
                            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted/60 disabled:opacity-50"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            disabled={
                              renameMut.isPending || deleteMut.isPending || row.id === user?.id
                            }
                            onClick={() => onDelete(row.id, row.email)}
                            title={
                              row.id === user?.id
                                ? "You cannot delete your own account while signed in"
                                : undefined
                            }
                            className="rounded-md border border-destructive/40 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.data?.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-muted-foreground">
                        No accounts yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="mt-4 max-w-3xl text-xs text-muted-foreground">
              Role changes are applied immediately and are written to the append-only audit trail
              through the database. Removing your own administrator role is blocked to avoid
              locking the platform out.
            </p>
          </>
        )}
      </div>
    </PageShell>
  );
}
