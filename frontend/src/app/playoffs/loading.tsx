import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-2 h-10 w-48" />
      <Skeleton className="mt-2 h-4 w-80" />
      <div className="mt-8 flex gap-4 overflow-x-auto">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex min-w-44 flex-col gap-3">
            <Skeleton className="mx-auto h-3 w-20" />
            {Array.from({ length: Math.max(1, 4 - Math.abs(3 - i)) }).map((__, j) => (
              <Skeleton key={j} className="h-16 w-44" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
