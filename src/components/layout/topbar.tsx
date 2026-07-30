"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldAlert,
  Moon,
  Sun,
  Globe,
  Command,
  ChevronDown,
  LogOut,
  Sparkles,
  KeyRound,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/hooks/use-translation";
import { BUSelector } from "./bu-selector";
import { useThemeStore } from "@/hooks/use-theme";

type NotificationItem = {
  id: string;
  type: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  desc: string;
  time: string;
  read: boolean;
};

const initialNotifications: NotificationItem[] = [
  {
    id: "n1",
    type: "CRITICAL",
    title: "High Risk Anomaly Detected",
    desc: "A01 (Pelunasan Dipercepat) di GMN Medan mencatatkan lonjakan 42% hari ini.",
    time: "10 menit lalu",
    read: false,
  },
  {
    id: "n2",
    type: "WARNING",
    title: "SLA Follow-up Overdue",
    desc: "3 Temuan Audit pada SMF Bandung telah melewati batas SLA 14 hari.",
    time: "1 jam lalu",
    read: false,
  },
  {
    id: "n3",
    type: "INFO",
    title: "AI Risk Assessment Updated",
    desc: "Model Anomali Otomotif memperbarui risk score 16 cabang GMA.",
    time: "3 jam lalu",
    read: true,
  },
];

export function Topbar() {
  const router = useRouter();
  const { identity, signOut, loading } = useAuth();
  const { language, setLanguage } = useTranslation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const { theme, toggleTheme } = useThemeStore();
  const themeDark = theme === "dark";

  const userName = identity?.fullName || "System Administrator";
  const userRole = identity?.roles && identity.roles.length > 0 ? identity.roles.join(", ").replace(/_/g, " ") : "Super Admin";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "id" : "en");
  };

  const openCommandPalette = () => {
    const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true });
    document.dispatchEvent(event);
  };

  return (
    <header className={`sticky top-0 z-30 h-16 border-b transition-colors duration-200 backdrop-blur-xl ${
      themeDark
        ? "border-white/10 bg-[#081028]/85 text-slate-100"
        : "border-slate-200 bg-white/90 text-slate-800 shadow-sm"
    }`}>
      <div className="flex h-full items-center justify-between gap-3 px-4 md:px-6">
        {/* Left: BU Selector */}
        <div className="flex items-center gap-3">
          <BUSelector />
        </div>

        {/* Center: Interactive Global Search (Ctrl K) */}
        <div className="hidden min-w-0 flex-1 items-center justify-center px-4 md:flex">
          <div
            onClick={openCommandPalette}
            className="relative w-full max-w-xl cursor-pointer group"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 group-hover:text-cyan-400 transition" />
            <Input
              readOnly
              suppressHydrationWarning
              placeholder="Search audits, findings, evidence, controls... (Ctrl K)"
              className="h-9 pl-9 pr-14 cursor-pointer bg-black/20 group-hover:bg-black/40 group-hover:border-cyan-500/40 transition"
            />
            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 group-hover:text-cyan-300">
              Ctrl K
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 relative">
          {/* Command Palette Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={openCommandPalette}
            aria-label="Command palette"
            title="Command Palette (Ctrl K)"
            className="hover:text-cyan-300 hover:bg-white/5"
          >
            <Command className="h-4 w-4" />
          </Button>

          {/* Live Notification Bell & Dropdown */}
          <div ref={notifRef} className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setNotifOpen((v) => !v)}
              aria-label="Notifications"
              title="Notifikasi Sistem Audit"
              className="hover:text-cyan-300 hover:bg-white/5 relative"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-cyan-400 animate-pulse ring-2 ring-slate-900" />
              )}
            </Button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-white/15 bg-[#0b1739]/98 shadow-2xl backdrop-blur-xl overflow-hidden p-3 text-xs"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <Bell className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Notifikasi Sistem ({unreadCount})</span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                      >
                        Tandai semua dibaca
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`rounded-lg border p-2.5 transition cursor-pointer ${
                          !n.read
                            ? "border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10"
                            : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {n.type === "CRITICAL" ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                            ) : n.type === "WARNING" ? (
                              <ShieldAlert className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            ) : (
                              <FileText className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                            )}
                            <span className="text-xs font-semibold text-white">{n.title}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 shrink-0 font-mono">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 leading-snug">{n.desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-white/10 bg-black/20 p-2 text-center">
                    <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      <span>Sistem Risk Engine & Database Connected</span>
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme Switcher */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Theme switcher"
            onClick={toggleTheme}
            title={themeDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="hover:text-cyan-300 hover:bg-white/5"
          >
            {themeDark ? <Moon className="h-4 w-4 text-cyan-300" /> : <Sun className="h-4 w-4 text-amber-300" />}
          </Button>

          {/* Language Switcher */}
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

          {/* User Profile Menu */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-left transition hover:bg-white/[0.08] hover:border-white/20 md:flex group"
            >
              <div className="grid h-7 w-7 place-items-center rounded-md bg-cyan-300/20 text-xs font-semibold text-cyan-100 group-hover:bg-cyan-300/30">
                {initials}
              </div>
              <div className="pr-1">
                <div className="text-xs font-medium leading-tight text-slate-100">{userName}</div>
                <div className="text-[11px] leading-tight text-slate-400 capitalize">{userRole}</div>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition ${profileOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-white/15 bg-[#0b1739]/98 shadow-2xl backdrop-blur-xl overflow-hidden p-2 text-xs"
                >
                  <div className="px-3 py-2 border-b border-white/10 mb-1">
                    <div className="font-bold text-white text-xs">{userName}</div>
                    <div className="text-[10px] text-cyan-300 capitalize flex items-center gap-1 mt-0.5">
                      <Sparkles className="h-3 w-3" />
                      <span>{userRole}</span>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <button
                      onClick={() => { router.push("/settings"); setProfileOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10 transition"
                    >
                      <KeyRound className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Ganti Password & Profile</span>
                    </button>
                    <button
                      onClick={() => { openCommandPalette(); setProfileOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10 transition"
                    >
                      <Search className="h-3.5 w-3.5 text-slate-400" />
                      <span>Command Search (Ctrl K)</span>
                    </button>
                  </div>

                  <div className="border-t border-white/10 my-1.5" />

                  <button
                    onClick={() => { setProfileOpen(false); signOut(); }}
                    disabled={loading}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-rose-400 hover:bg-rose-500/10 transition font-semibold"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Keluar / Logout</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Standalone Mobile Logout Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              disabled={loading}
              title="Keluar"
              className="text-rose-400 hover:bg-rose-500/10"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
