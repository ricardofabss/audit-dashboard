import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4 p-2">
      <Skeleton className="h-8 w-80" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
