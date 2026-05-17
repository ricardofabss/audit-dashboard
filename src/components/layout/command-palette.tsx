"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { commandItems } from "./navigation";

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    if (!query) return commandItems;
    return commandItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
  }, [query]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            aria-label="Close command palette"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/45"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="fixed left-1/2 top-[12%] z-[51] w-[94vw] max-w-2xl -translate-x-1/2 overflow-hidden rounded-xl border border-white/12 bg-[#0b1739]/95 shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search pages and quick actions..."
                className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
            </div>
            <div className="scrollbar-thin max-h-[52vh] overflow-y-auto p-2">
              {results.map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-white/8"
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-100">{item.label}</span>
                  </div>
                  <span className="text-[11px] text-slate-500">{item.category}</span>
                </button>
              ))}
              {!results.length ? <div className="px-2 py-8 text-center text-sm text-slate-500">No command found.</div> : null}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
