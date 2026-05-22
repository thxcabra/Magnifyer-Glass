import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-10 w-72" />
      <Skeleton className="mt-3 h-4 w-1/2" />

      <div className="mt-10 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 30 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
