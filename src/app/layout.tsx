import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/modules/auth/auth-context";

export const metadata: Metadata = {
  title: "AuditSphere AI",
  description: "AI-powered internal audit, investigation, risk, compliance, and evidence management workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
