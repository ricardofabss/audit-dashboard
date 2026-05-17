import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ModuleTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[740px] border-collapse text-sm">
        <thead className="bg-black/20">
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-b border-white/10 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function TableCell({ className, children }: { className?: string; children: ReactNode }) {
  return <td className={cn("border-b border-white/8 px-3 py-2.5 align-top text-slate-200", className)}>{children}</td>;
}
