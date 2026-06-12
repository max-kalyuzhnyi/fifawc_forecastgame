import { Skeleton } from "@/components/ui/skeleton";

function LeaderboardRowSkeleton() {
  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)_4rem_3rem] items-center gap-x-3 border-t border-white/[0.08] px-3 py-2.5">
      <Skeleton className="mx-auto size-5 rounded-md" />
      <div className="flex min-w-0 items-center gap-2">
        <Skeleton className="size-6 shrink-0 rounded-full" />
        <Skeleton className="h-4 flex-1 rounded-md" />
      </div>
      <Skeleton className="ml-auto h-5 w-8 rounded-md" />
      <Skeleton className="ml-auto h-4 w-6 rounded-md" />
    </div>
  );
}

export function LeaderboardPanelSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="sports-panel corner-squircle flex flex-col">
        <div className="shrink-0 border-b border-white/[0.08] px-4 py-3">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="mt-2 h-3 w-full max-w-xs rounded-md" />
        </div>

        <div className="overflow-hidden">
          <div className="grid grid-cols-[2rem_minmax(0,1fr)_4rem_3rem] items-center gap-x-3 px-3 py-2">
            <Skeleton className="mx-auto h-3 w-3 rounded-md" />
            <Skeleton className="h-3 w-12 rounded-md" />
            <Skeleton className="ml-auto h-3 w-10 rounded-md" />
            <Skeleton className="ml-auto h-3 w-8 rounded-md" />
          </div>
          {Array.from({ length: 8 }).map((_, index) => (
            <LeaderboardRowSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
