"use client";

import { useState } from "react";
import { Bell, Bot, Command, Globe, Moon, Search, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/hooks/use-translation";
import { BUSelector } from "@/components/layout/bu-selector";

export function Topbar() {
  const { signOut, loading } = useAuth();
  const [themeDark, setThemeDark] = useState(true);

  const { language, setLanguage } = useTranslation();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "id" : "en");
  };



  return (
    <header className="sticky top-0 z-30 h-16 border-b border-white/10 bg-[#081028]/85 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <BUSelector />
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-center px-4 md:flex">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input readOnly placeholder="Search audits, findings, evidence, controls..." className="h-9 pl-9 pr-14" />
            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">
              Ctrl K
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Command palette">
            <Command className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Theme switcher"
            onClick={() => setThemeDark((value) => !value)}
            title="Theme switcher"
          >
            {themeDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            title={language === "en" ? "Ubah ke Bahasa Indonesia" : "Switch to English"}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-slate-200 hover:bg-white/[0.08] hover:text-white"
          >
            <Globe className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-bold font-mono tracking-wider">{language.toUpperCase()}</span>
          </Button>
          <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 md:flex">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-cyan-300/20 text-xs font-semibold text-cyan-100">SJ</div>
            <div className="pr-1">
              <div className="text-xs font-medium leading-tight text-slate-100">Sarah Jenkins</div>
              <div className="text-[11px] leading-tight text-slate-500">Chief Audit Executive</div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut} disabled={loading}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
