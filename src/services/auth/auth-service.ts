export async function signInWithPassword(username: string, password: string) {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { data: null, error: { message: data.error || "Gagal login" } };
    }

    return { data: data.identity, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err.message || "Gagal menghubungkan ke server login" } };
  }
}

export async function signOut() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
    return { error: null };
  } catch (err: any) {
    return { error: { message: err.message || "Gagal logout" } };
  }
}

export async function requestPasswordReset(email: string) {
  return { data: true, error: null };
}
