import { createSupabaseBrowserClient } from "@/lib/auth/supabase-browser";

export async function signInWithPassword(email: string, password: string) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return { data: null, error: { message: "Supabase env belum dikonfigurasi." } };
  const normalizedEmail = email.trim().toLowerCase();
  return supabase.auth.signInWithPassword({ email: normalizedEmail, password });
}

export async function signOut() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return { error: null };
  return supabase.auth.signOut();
}

export async function requestPasswordReset(email: string) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return { data: null, error: { message: "Supabase env belum dikonfigurasi." } };
  const normalizedEmail = email.trim().toLowerCase();
  return supabase.auth.resetPasswordForEmail(normalizedEmail);
}
