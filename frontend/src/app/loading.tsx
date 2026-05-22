import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-3 h-12 w-2/3" />
      <Skeleton className="mt-3 h-4 w-1/2" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}
