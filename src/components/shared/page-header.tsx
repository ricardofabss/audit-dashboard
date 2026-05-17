import { Button } from "@/components/ui/button";

type Action = { label: string; variant?: "default" | "secondary" | "outline" | "ghost" | "danger" };

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: Action[];
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      </div>
      {actions?.length ? (
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((item) => (
            <Button key={item.label} variant={item.variant ?? "outline"}>
              {item.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
