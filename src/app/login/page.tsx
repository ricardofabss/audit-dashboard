import { LoginForm } from "@/modules/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.2),transparent_25rem),radial-gradient(circle_at_80%_10%,rgba(129,140,248,0.15),transparent_20rem)]" />
      <div className="relative z-10">
        <LoginForm />
      </div>
    </div>
  );
}
