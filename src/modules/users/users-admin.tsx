"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/shared/page-header";
import { ModuleTable, TableCell } from "@/components/shared/module-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppRole } from "@/types/auth";
import { businessUnits } from "@/lib/business-units";
import { Trash2 } from "lucide-react";

type UserItem = {
  profileId: string;
  authUserId: string;
  fullName: string;
  email: string;
  status: "ACTIVE" | "INVITED" | "SUSPENDED" | "DISABLED";
  branchName: string;
  divisionName: string;
  roleCodes: AppRole[];
  lastLoginAt: string | null;
};

type BranchOption = {
  id: string;
  name: string;
  divisions: { id: string; name: string }[];
};

type UsersResponse = {
  users: UserItem[];
  roleOptions: AppRole[];
  branches: BranchOption[];
};

const inviteSchema = z.object({
  fullName: z.string().trim().min(3, "Nama minimal 3 karakter"),
  email: z.string().email("Email tidak valid").transform((value) => value.toLowerCase().trim()),
  roleCode: z.enum(["OWNER", "HEAD_AUDIT", "AUDITOR", "INVESTIGATOR", "AUDITEE", "ADMIN"]),
  companyId: z.string().optional(),
  divisionId: z.string().optional(),
});

type InviteInput = z.input<typeof inviteSchema>;
type InvitePayload = z.output<typeof inviteSchema>;

function statusTone(status: UserItem["status"]) {
  if (status === "ACTIVE") return "emerald" as const;
  if (status === "INVITED") return "cyan" as const;
  if (status === "SUSPENDED") return "amber" as const;
  return "red" as const;
}

export function UsersAdmin() {
  const [data, setData] = useState<UserItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [draftRoles, setDraftRoles] = useState<Record<string, AppRole>>({});
  const [roleOptions, setRoleOptions] = useState<AppRole[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);

  const inviteForm = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      fullName: "",
      email: "",
      roleCode: "AUDITEE",
      companyId: "",
      divisionId: "",
    },
  });

  const selectedBranchId = useWatch({ control: inviteForm.control, name: "companyId" });

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/users", { cache: "no-store" });
    if (!res.ok) {
      setLoading(false);
      setError("Gagal mengambil data user.");
      return;
    }
    const payload = (await res.json()) as UsersResponse;
    setData(payload.users);
    setRoleOptions(payload.roleOptions);
    setBranches(payload.branches);

    const initial: Record<string, AppRole> = {};
    for (const user of payload.users) {
      initial[user.profileId] = user.roleCodes[0] ?? "AUDITEE";
    }
    setDraftRoles(initial);
    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const onSaveRole = async (profileId: string) => {
    const role = draftRoles[profileId];
    if (!role) return;

    setSavingId(profileId);
    setError(null);
    setSuccess(null);
    const res = await fetch(`/api/users/${profileId}/roles`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleCodes: [role] }),
    });

    if (!res.ok) {
      setSavingId(null);
      setError("Update role gagal. Coba ulangi.");
      return;
    }

    setData((prev) =>
      (prev ?? []).map((user) =>
        user.profileId === profileId ? { ...user, roleCodes: [role] } : user,
      ),
    );
    setSavingId(null);
    setSuccess("Role berhasil diperbarui.");
  };

  const onSubmitInvite = inviteForm.handleSubmit(async (values) => {
    const parsed = inviteSchema.parse(values) as InvitePayload;
    setSubmittingInvite(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: parsed.fullName,
        email: parsed.email,
        roleCode: parsed.roleCode,
        branchId: parsed.companyId || null,
        divisionId: parsed.divisionId || null,
      }),
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      setSubmittingInvite(false);
      setError(payload.error ?? "Gagal invite user.");
      return;
    }

    inviteForm.reset({
      fullName: "",
      email: "",
      roleCode: "AUDITEE",
      companyId: "",
      divisionId: "",
    });
    setSubmittingInvite(false);
    setSuccess("User baru berhasil ditambahkan!");
    await load();
  });

  const onDeleteUser = async (profileId: string, fullName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus user '${fullName}'?`)) return;

    setActionId(profileId);
    setError(null);
    setSuccess(null);
    const res = await fetch(`/api/users?profileId=${profileId}`, { method: "DELETE" });
    
    if (!res.ok) {
      setActionId(null);
      setError("Gagal menghapus user.");
      return;
    }

    setActionId(null);
    setSuccess(`User '${fullName}' berhasil dihapus.`);
    await load();
  };

  const onToggleStatus = async (profileId: string, currentStatus: UserItem["status"]) => {
    const nextStatus = currentStatus === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    setActionId(profileId);
    setError(null);
    setSuccess(null);
    const res = await fetch(`/api/users/${profileId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      setActionId(null);
      setError(payload.error ?? "Gagal mengubah status user.");
      return;
    }
    setData((prev) =>
      (prev ?? []).map((user) =>
        user.profileId === profileId ? { ...user, status: nextStatus } : user,
      ),
    );
    setActionId(null);
    setSuccess(`Status user berhasil diubah ke ${nextStatus}.`);
  };

  return (
    <div className="space-y-4 pb-10">
      <PageHeader
        title="User Management"
        subtitle="Kelola akses pengguna, undangan, dan assignment role aplikasi."
      />

      <Card>
        <CardHeader>
          <CardTitle>Invite User Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmitInvite} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <label htmlFor="invite-full-name" className="text-xs text-slate-400">
                Nama Lengkap
              </label>
              <Input id="invite-full-name" placeholder="Nama lengkap user" {...inviteForm.register("fullName")} />
              <p className="text-xs text-rose-300">{inviteForm.formState.errors.fullName?.message}</p>
            </div>

            <div className="space-y-1">
              <label htmlFor="invite-email" className="text-xs text-slate-400">
                Email / Username Korporat
              </label>
              <Input id="invite-email" type="email" placeholder="user@auditsphere.ai" {...inviteForm.register("email")} />
              <p className="text-xs text-rose-300">{inviteForm.formState.errors.email?.message}</p>
            </div>

            <div className="space-y-1">
              <label htmlFor="invite-role" className="text-xs text-slate-400">
                Role Akses
              </label>
              <select
                id="invite-role"
                {...inviteForm.register("roleCode")}
                className="h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/50"
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role} className="bg-slate-900 text-slate-100">
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="invite-company" className="text-xs text-slate-400">
                Perusahaan / Unit Bisnis (Holding)
              </label>
              <select
                id="invite-company"
                {...inviteForm.register("companyId")}
                className="h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/50"
              >
                <option value="" className="bg-slate-900 text-slate-100">
                  Seluruh Perusahaan / Holding Level
                </option>
                {businessUnits.map((bu) => (
                  <option key={bu.id} value={bu.id} className="bg-slate-900 text-slate-100">
                    [{bu.code}] {bu.name} ({bu.sector})
                  </option>
                ))}
              </select>
            </div>

            <div className="xl:col-span-4">
              <Button type="submit" disabled={submittingInvite}>
                {submittingInvite ? "Mengirim Undangan..." : "Invite User Baru"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Directory & Role Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? <div className="text-sm text-rose-300 bg-rose-500/10 p-2.5 rounded border border-rose-500/20">{error}</div> : null}
          {success ? <div className="text-sm text-emerald-300 bg-emerald-500/10 p-2.5 rounded border border-emerald-500/20">{success}</div> : null}
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <ModuleTable
              headers={[
                "User",
                "Status",
                "Perusahaan / Scope",
                "Current Roles",
                "Assign Role",
                "Actions",
                "Last Login",
              ]}
            >
              {(data ?? []).map((user) => (
                <tr key={user.profileId} className="hover:bg-white/[0.03]">
                  <TableCell>
                    <div className="text-sm font-semibold text-slate-100">{user.fullName}</div>
                    <div className="text-xs text-slate-400">{user.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge tone={statusTone(user.status)}>{user.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-300">
                    {user.branchName}
                  </TableCell>
                  <TableCell className="text-xs text-slate-300">
                    {user.roleCodes.join(", ")}
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-[200px] items-center gap-2">
                      <select
                        value={draftRoles[user.profileId] ?? "AUDITEE"}
                        onChange={(event) =>
                          setDraftRoles((prev) => ({
                            ...prev,
                            [user.profileId]: event.target.value as AppRole,
                          }))
                        }
                        className="h-9 w-full rounded-lg border border-white/10 bg-black/20 px-2.5 text-sm text-slate-100 outline-none focus:border-cyan-300/50"
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role} className="bg-slate-900 text-slate-100">
                            {role}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={savingId === user.profileId}
                        onClick={() => onSaveRole(user.profileId)}
                      >
                        {savingId === user.profileId ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={user.status === "SUSPENDED" ? "secondary" : "outline"}
                        disabled={actionId === user.profileId}
                        onClick={() => onToggleStatus(user.profileId, user.status)}
                      >
                        {actionId === user.profileId
                          ? "Processing..."
                          : user.status === "SUSPENDED"
                            ? "Activate"
                            : "Suspend"}
                      </Button>

                      {/* Delete User Button */}
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={actionId === user.profileId}
                        onClick={() => onDeleteUser(user.profileId, user.fullName)}
                        title="Hapus User"
                        className="bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border-rose-500/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Hapus</span>
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleString("id-ID")
                      : "Belum pernah login"}
                  </TableCell>
                </tr>
              ))}
            </ModuleTable>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
