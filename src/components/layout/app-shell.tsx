"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AIInsightPanel } from "@/components/layout/ai-insight-panel";
import { CommandPalette } from "@/components/layout/command-palette";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useBusinessUnitStore } from "@/hooks/use-business-unit";
import { useAuditStore } from "@/hooks/use-audit-store";
import { useThemeStore } from "@/hooks/use-theme";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    useBusinessUnitStore.persist.rehydrate();
    useAuditStore.getState().fetchInitialData();
  }, []);

  // Synchronize HTML element class with theme state
  useEffect(() => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (theme === "light") {
        root.classList.add("light");
        root.classList.remove("dark");
        root.style.colorScheme = "light";
      } else {
        root.classList.add("dark");
        root.classList.remove("light");
        root.style.colorScheme = "dark";
      }
    }
  }, [theme]);

  const publicOnlyLayout = ["/login", "/403", "/unauthorized"].includes(pathname);

  if (publicOnlyLayout) return <>{children}</>;

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-200 ${
      theme === "light" ? "bg-slate-100 text-slate-900" : "bg-[#081028] text-slate-100"
    }`}>
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((value) => !value)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
          <div className="mx-auto w-full max-w-[1500px]">{children}</div>
        </main>
      </div>
      <AIInsightPanel open={aiOpen} onClose={() => setAiOpen(false)} />
      <CommandPalette />
    </div>
  );
}
