"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requestPasswordReset, signInWithPassword } from "@/services/auth/auth-service";
import { hasSupabasePublicEnv } from "@/lib/auth/env";

const loginSchema = z.object({
  email: z.string().email("Provide a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const envReady = hasSupabasePublicEnv();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: true },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error: loginError } = await signInWithPassword(values.email, values.password);
    setLoading(false);
    if (loginError) {
      if (typeof loginError.message === "string" && loginError.message.includes("Invalid login credentials")) {
        setError("Email atau password tidak cocok. Coba lagi atau gunakan Forgot password.");
      } else {
        setError(loginError.message);
      }
      return;
    }
    router.push("/dashboard");
  });

  const forgotPassword = async () => {
    const email = form.getValues("email");
    if (!email) {
      setError("Provide your email first to receive a reset link.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: resetError } = await requestPasswordReset(email);
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setMessage("Reset link sent. Check your inbox.");
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in to AuditSphere AI</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div>
            <label htmlFor="email" className="mb-1 block text-xs text-slate-400">Work email</label>
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
            <p className="mt-1 text-xs text-rose-300">{form.formState.errors.email?.message}</p>
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-xs text-slate-400">Password</label>
            <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
            <p className="mt-1 text-xs text-rose-300">{form.formState.errors.password?.message}</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" {...form.register("rememberMe")} />
            Remember me
          </label>
          {!envReady ? <p className="text-xs text-amber-300">Supabase belum dikonfigurasi. Isi `.env.local` dulu.</p> : null}
          {error ? <p className="text-xs text-rose-300">{error}</p> : null}
          {message ? <p className="text-xs text-emerald-300">{message}</p> : null}
          <Button type="submit" className="w-full" disabled={loading || !envReady}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={forgotPassword} disabled={loading || !envReady}>
            Forgot password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
