"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signInWithPassword } from "@/services/auth/auth-service";
import { useAuthContext } from "@/modules/auth/auth-context";
import { PRESET_USERS } from "@/app/api/auth/login/route";

const loginSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  rememberMe: z.boolean(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { refresh } = useAuthContext();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "admin", password: "admin123!", rememberMe: true },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setLoading(true);
    setError(null);
    const { error: loginError } = await signInWithPassword(values.username, values.password);
    setLoading(false);
    
    if (loginError) {
      setError(loginError.message);
      return;
    }

    await refresh();
    router.push("/");
  });

  const fillQuickUser = (username: string, pass: string) => {
    form.setValue("username", username);
    form.setValue("password", pass);
    setError(null);
  };

  return (
    <Card className="w-full max-w-md border-cyan-500/20 bg-[#0b1739]/90 shadow-2xl backdrop-blur-xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <CardTitle className="text-xl font-bold text-white">Sign in to AuditSphere AI</CardTitle>
        <p className="text-xs text-slate-400">Masukkan Username & Password akun audit Anda</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <form className="space-y-3" onSubmit={onSubmit}>
          <div>
            <label htmlFor="username" className="mb-1 block text-xs font-semibold text-slate-300">Username</label>
            <Input 
              id="username" 
              type="text" 
              autoComplete="username" 
              placeholder="Masukkan username"
              className="bg-black/30 text-white placeholder-slate-500 border-white/10 focus:border-cyan-500" 
              {...form.register("username")} 
            />
            <p className="mt-1 text-xs text-rose-400">{form.formState.errors.username?.message}</p>
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-semibold text-slate-300">Password</label>
            <Input 
              id="password" 
              type="password" 
              autoComplete="current-password" 
              placeholder="Masukkan password"
              className="bg-black/30 text-white placeholder-slate-500 border-white/10 focus:border-cyan-500" 
              {...form.register("password")} 
            />
            <p className="mt-1 text-xs text-rose-400">{form.formState.errors.password?.message}</p>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input type="checkbox" className="rounded border-white/20 bg-black/30 text-cyan-500" {...form.register("rememberMe")} />
            Remember me on this browser
          </label>

          {error ? <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20">{error}</p> : null}

          <Button type="submit" className="w-full bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400" disabled={loading}>
            {loading ? "Signing in..." : "Sign in to Dashboard"}
          </Button>
        </form>

        {/* Quick Credentials Switcher */}
        <div className="border-t border-white/10 pt-3">
          <p className="text-[11px] font-semibold text-slate-400 mb-2 text-center">Akun Demo Cepat (Klik untuk memilih):</p>
          <div className="grid grid-cols-1 gap-1.5">
            {PRESET_USERS.map((u) => (
              <button
                key={u.username}
                type="button"
                onClick={() => fillQuickUser(u.username, u.password)}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-3 py-1.5 text-left text-xs transition hover:bg-white/[0.08] hover:border-cyan-500/30"
              >
                <div>
                  <div className="font-semibold text-slate-200">{u.fullName}</div>
                  <div className="text-[10px] text-slate-400">{u.roleTitle}</div>
                </div>
                <span className="font-mono text-[10px] text-cyan-300">@{u.username}</span>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
