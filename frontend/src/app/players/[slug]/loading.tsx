import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-start gap-6">
        <Skeleton className="h-32 w-32 rounded-full" />
        <div className="flex-1 min-w-0 space-y-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-2/3" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
        <div className="w-64 space-y-2">
          <Skeleton className="h-3 w-24 ml-auto" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>

      <Skeleton className="mt-6 h-80 w-full" />
    </div>
  );
}
