import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-2 h-10 w-56" />
      <Skeleton className="mt-2 h-4 w-80" />
      <div className="mt-6 flex items-center justify-between">
        <Skeleton className="size-10" />
        <Skeleton className="h-6 w-56" />
        <Skeleton className="size-10" />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}
