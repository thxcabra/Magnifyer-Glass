import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-3 h-10 w-1/2" />
      <Skeleton className="mt-3 h-4 w-2/3" />

      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>

      <Skeleton className="mt-10 h-64 w-full" />
    </div>
  );
}
