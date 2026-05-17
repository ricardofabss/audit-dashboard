"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AIInsightPanel } from "@/components/layout/ai-insight-panel";
import { CommandPalette } from "@/components/layout/command-palette";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const publicOnlyLayout = ["/login", "/403", "/unauthorized"].includes(pathname);

  if (publicOnlyLayout) return <>{children}</>;

  return (
    <div className="flex h-screen overflow-hidden bg-[#081028] text-slate-100">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((value) => !value)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onToggleAI={() => setAiOpen((value) => !value)} />
        <main className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
          <div className="mx-auto w-full max-w-[1500px]">{children}</div>
        </main>
      </div>
      <AIInsightPanel open={aiOpen} onClose={() => setAiOpen(false)} />
      <CommandPalette />
    </div>
  );
}
