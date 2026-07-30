"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { KeyRound, ShieldCheck, User } from "lucide-react";

export default function SettingsPage() {
  const { identity } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("Seluruh kolom password wajib diisi.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password baru minimal 6 karakter.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Gagal mengubah password.");
        return;
      }

      setSuccess("Password berhasil diubah!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setLoading(false);
      setError("Terjadi kesalahan koneksi server.");
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Settings & Profile"
        subtitle="Pengaturan akun pengguna, keamanan password, dan preferensi workspace."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Profile Summary Card */}
        <Card className="xl:col-span-1 border-cyan-500/20 bg-[#0b1739]/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <User className="h-5 w-5 text-cyan-400" />
              <span>Profil Pengguna Active</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-cyan-500/20 font-bold text-cyan-200 text-lg">
                {identity?.email ? identity.email[0].toUpperCase() : "U"}
              </div>
              <div>
                <div className="font-bold text-white text-sm">{identity?.email || "User Audit"}</div>
                <div className="text-xs text-cyan-300 capitalize">{identity?.roles?.join(", ") || "User"}</div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">ID Pengguna</span>
                <span className="font-mono text-cyan-300">{identity?.userId || "-"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">Hak Akses Modul</span>
                <span className="font-mono text-emerald-400">{identity?.permissions?.length || 0} Izin</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Status Autentikasi</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" /> Active Session
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Form */}
        <Card className="xl:col-span-2 border-cyan-500/20 bg-[#0b1739]/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <KeyRound className="h-5 w-5 text-cyan-400" />
              <span>Ganti Password / Ubah Kata Sandi</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
              {error ? (
                <div className="text-xs text-rose-300 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                  {error}
                </div>
              ) : null}
              
              {success ? (
                <div className="text-xs text-emerald-300 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                  {success}
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Password Lama</label>
                <Input
                  type="password"
                  placeholder="Masukkan password saat ini"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="bg-black/30 text-white placeholder-slate-500 border-white/10 focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Password Baru</label>
                <Input
                  type="password"
                  placeholder="Masukkan password baru (min. 6 karakter)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-black/30 text-white placeholder-slate-500 border-white/10 focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Konfirmasi Password Baru</label>
                <Input
                  type="password"
                  placeholder="Ulangi password baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-black/30 text-white placeholder-slate-500 border-white/10 focus:border-cyan-500"
                />
              </div>

              <Button type="submit" disabled={loading} className="bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400">
                {loading ? "Memperbarui Password..." : "Simpan Password Baru"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Global Workspace Preferences */}
      <Card className="border-white/10">
        <CardHeader>
          <CardTitle>Global Workspace Preferences</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Critical SLA (Jam)</label>
            <Input defaultValue="24" className="bg-black/20" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Fraud Escalation Score Threshold</label>
            <Input defaultValue="85" className="bg-black/20" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Nama Workspace</label>
            <Input defaultValue="AuditSphere AI Holding Workspace" className="bg-black/20" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Email Notifikasi Compliance</label>
            <Input defaultValue="compliance@auditsphere.ai" className="bg-black/20" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
