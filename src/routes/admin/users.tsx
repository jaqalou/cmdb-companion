import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/cmdb/site-chrome";
import { useAuth } from "@/hooks/use-auth";
import {
  createUserAccount,
  deleteUserAccount,
  grantUserRole,
  listAppUsers,
  renameUser,
  revokeUserRole,
  setUserPassword,
  type AppRole,
} from "@/lib/admin-users.functions";
import { getOwnAccount, updateOwnEmail, updateOwnPassword } from "@/lib/account.functions";
import {
  useLifecycleBasis,
  useSetLifecycleBasis,
  useSetSnoozeEnabled,
  useSnoozeEnabled,
} from "@/lib/app-settings";
import type { LifecycleBasis } from "@/lib/support-status";



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

const STALE_SESSION =
  "Your sign-in session is no longer valid on this server. Sign out and sign in again.";

/** Friendly text for an error, translating signature/JWT failures. */
function errText(error: unknown, fallback: string) {
  const raw = error instanceof Error ? error.message : "";
  if (/invalid jwt|signature is invalid|jwt expired|bad_jwt/i.test(raw)) return STALE_SESSION;
  return raw || fallback;
}

function UsersAdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const { enabled: snoozeEnabled } = useSnoozeEnabled();
  const snoozeMut = useSetSnoozeEnabled();
  const { basis: lifecycleBasis } = useLifecycleBasis();
  const lifecycleMut = useSetLifecycleBasis();
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
      toast.error(errText(error, "Could not update permissions")),
  });

  const renameMut = useMutation({
    mutationFn: async (input: { userId: string; email: string }) =>
      rename({ data: input }),
    onSuccess: () => {
      toast.success("Account renamed");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error) =>
      toast.error(errText(error, "Could not rename account")),
  });

  const deleteMut = useMutation({
    mutationFn: async (input: { userId: string }) => deleteAccount({ data: input }),
    onSuccess: () => {
      toast.success("Account deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error) =>
      toast.error(errText(error, "Could not delete account")),
  });

  const changePassword = useServerFn(setUserPassword);
  const passwordMut = useMutation({
    mutationFn: async (input: { userId: string; password: string }) =>
      changePassword({ data: input }),
    onSuccess: () => toast.success("Password updated"),
    onError: (error) =>
      toast.error(errText(error, "Could not change the password")),
  });

  const createAccount = useServerFn(createUserAccount);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("viewer");

  const createMut = useMutation({
    mutationFn: async (input: { email: string; password: string; role: AppRole }) =>
      createAccount({ data: input }),
    onSuccess: () => {
      toast.success("Account created");
      setNewEmail("");
      setNewPassword("");
      setNewRole("viewer");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error) =>
      toast.error(errText(error, "Could not create account")),
  });



  function onRename(userId: string, currentEmail: string) {
    const next = window.prompt("New email address for this account", currentEmail);
    if (!next || next.trim() === currentEmail) return;
    renameMut.mutate({ userId, email: next.trim() });
  }

  function onSetPassword(userId: string, email: string) {
    const next = window.prompt(`New password for ${email} (at least 12 characters)`, "");
    if (next === null) return;
    if (next.trim().length < 12) {
      toast.error("Use at least 12 characters");
      return;
    }
    passwordMut.mutate({ userId, password: next });
  }

  function onDelete(userId: string, email: string) {
    const confirmed = window.confirm(
      `Delete ${email}? This permanently removes the account and all of its permissions. This cannot be undone.`,
    );
    if (confirmed) deleteMut.mutate({ userId });
  }

  function onToggleSnooze(next: boolean) {
    const confirmed = window.confirm(
      next
        ? "Enable snooze options? The snooze checkbox in the inventory lists and every snooze exclusion field on the item pages will become visible to all accounts again."
        : "Disable snooze options? The snooze checkbox in the inventory lists and every snooze exclusion field on the item pages will be hidden for all accounts. Snooze values already saved on items are kept and will reappear if the feature is enabled again.",
    );
    if (!confirmed) return;
    snoozeMut.mutate(next, {
      onSuccess: (result) =>
        toast.success(result ? "Snooze options enabled" : "Snooze options hidden"),
      onError: (error) =>
        toast.error(
          errText(error, "Could not update the setting"),
        ),
    });
  }

  function onChangeLifecycle(next: LifecycleBasis) {
    if (next === lifecycleBasis) return;
    const confirmed = window.confirm(
      next === "esu"
        ? "Base the lifecycle view on ESU? Support status in the lists, charts and exports will be calculated from the ESU value and ESU end date instead of the EOL date, for all accounts."
        : "Base the lifecycle view on the EOL date? Support status in the lists, charts and exports will be calculated from the EOL date again, for all accounts.",
    );
    if (!confirmed) return;
    lifecycleMut.mutate(next, {
      onSuccess: (result) =>
        toast.success(
          result === "esu" ? "Lifecycle now based on ESU" : "Lifecycle now based on EOL date",
        ),
      onError: (error) =>
        toast.error(errText(error, "Could not update the setting")),
    });
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

        {!loading && user && !isAdmin && <OwnAccountPanel />}

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

            <div className="mt-6 rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold">Platform features</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Turning the snooze feature off hides the snooze checkbox in the inventory lists and
                every snooze exclusion field on the item pages, for all accounts.
              </p>
              <label className="mt-3 inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={snoozeEnabled}
                  disabled={snoozeMut.isPending}
                  onChange={(e) => onToggleSnooze(e.target.checked)}
                />
                Snooze options enabled
              </label>

              <p className="mt-5 text-sm font-semibold">Lifecycle view</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose which attribute decides whether an item counts as out of support in the
                lists, the pie charts and the exports.
              </p>
              <select
                value={lifecycleBasis}
                disabled={lifecycleMut.isPending}
                onChange={(e) => onChangeLifecycle(e.target.value as LifecycleBasis)}
                className="mt-3 h-9 rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="eol">EOL date</option>
                <option value="esu">ESU (value and ESU end date)</option>
              </select>
            </div>


            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMut.mutate({ email: newEmail, password: newPassword, role: newRole });
              }}
              className="mt-6 rounded-xl border border-border bg-card p-4"
            >
              <p className="text-sm font-semibold">Create an account</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Provision an account directly. The email is confirmed immediately and the person can
                sign in with the password you set — ask them to change it afterwards.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                />
                <input
                  type="text"
                  required
                  minLength={12}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Temporary password (12+ characters)"
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                />
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as AppRole)}
                  className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={createMut.isPending}
                  className="btn-accent inline-flex h-9 items-center justify-center px-4 text-sm disabled:opacity-50"
                >
                  {createMut.isPending ? "Creating…" : "Create account"}
                </button>
              </div>
            </form>


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
                        {errText(users.error, "Could not load users")}
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
                            disabled={passwordMut.isPending || row.provider !== "email"}
                            onClick={() => onSetPassword(row.id, row.email)}
                            title={
                              row.provider !== "email"
                                ? "This account signs in with single sign-on and has no password"
                                : undefined
                            }
                            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted/60 disabled:opacity-50"
                          >
                            Change password
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
              through the database. Rename changes the account email address. Deleting an account
              permanently removes the sign-in identity and all of its permissions — this supports
              the GDPR right to erasure. Removing your own administrator role or deleting your own
              account while signed in is blocked to avoid locking the platform out.
            </p>
          </>
        )}
      </div>
    </PageShell>
  );
}

/** Non-administrators see and manage only their own account. */
function OwnAccountPanel() {
  const queryClient = useQueryClient();
  const fetchMe = useServerFn(getOwnAccount);
  const changeEmail = useServerFn(updateOwnEmail);
  const changePassword = useServerFn(updateOwnPassword);

  const me = useQuery({ queryKey: ["own-account"], queryFn: () => fetchMe() });

  const emailMut = useMutation({
    mutationFn: async (email: string) => changeEmail({ data: { email } }),
    onSuccess: () => {
      toast.success("Email address updated");
      queryClient.invalidateQueries({ queryKey: ["own-account"] });
    },
    onError: (error) =>
      toast.error(errText(error, "Could not update the email address")),
  });

  const passwordMut = useMutation({
    mutationFn: async (password: string) => changePassword({ data: { password } }),
    onSuccess: () => toast.success("Password updated"),
    onError: (error) =>
      toast.error(errText(error, "Could not change the password")),
  });

  if (me.isLoading) {
    return (
      <div className="mt-6 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading your account…
      </div>
    );
  }
  if (me.isError || !me.data) {
    return (
      <div className="mt-6 rounded-xl border border-border bg-card p-6 text-sm text-destructive">
        {errText(me.error, "Could not load your account")}
      </div>
    );
  }

  const row = me.data;
  const isSso = row.provider !== "email";

  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-6">
      <p className="text-sm font-semibold">Your account</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Only administrators can see other accounts. You can view and manage your own details here.
      </p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Email</dt>
          <dd className="font-medium">{row.email}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Sign-in method</dt>
          <dd className="chip capitalize">{row.provider}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Created</dt>
          <dd className="text-muted-foreground">{fmt(row.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Last sign-in</dt>
          <dd className="text-muted-foreground">{fmt(row.lastSignInAt)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-muted-foreground">Permissions</dt>
          <dd className="mt-1 flex flex-wrap gap-2">
            {row.roles.length === 0 && <span className="text-muted-foreground">None assigned</span>}
            {row.roles.map((r) => (
              <span key={r} className="chip capitalize">
                {r}
              </span>
            ))}
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={emailMut.isPending}
          onClick={() => {
            const next = window.prompt("New email address for your account", row.email);
            if (!next || next.trim() === row.email) return;
            emailMut.mutate(next.trim());
          }}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted/60 disabled:opacity-50"
        >
          Change email
        </button>
        <button
          type="button"
          disabled={passwordMut.isPending || isSso}
          title={isSso ? "You sign in with single sign-on, so there is no password" : undefined}
          onClick={() => {
            const next = window.prompt("New password (at least 12 characters)", "");
            if (next === null) return;
            if (next.trim().length < 12) {
              toast.error("Use at least 12 characters");
              return;
            }
            passwordMut.mutate(next);
          }}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted/60 disabled:opacity-50"
        >
          Change password
        </button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Your role can only be changed by an administrator.
      </p>
    </div>
  );
}

