import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/15",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full resize-none rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/15",
        className,
      )}
      {...props}
    />
  );
}
