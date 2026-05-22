import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-2 h-10 w-52" />
      <Skeleton className="mt-2 h-4 w-80" />
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Skeleton className="h-[560px] w-full" />
        <Skeleton className="h-[560px] w-full" />
      </div>
    </div>
  );
}
