import { cn } from "@/lib/utils";

interface LiveMinuteIndicatorProps {
  liveMinute: string | null;
  liveLabel: string;
  className?: string;
}

export function LiveMinuteIndicator({
  liveMinute,
  liveLabel,
  className,
}: LiveMinuteIndicatorProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 tabular-nums",
        className,
      )}
    >
      <span
        className="size-1.5 shrink-0 rounded-full bg-red-400 animate-pulse"
        aria-hidden
      />
      <span>{liveMinute ?? liveLabel}</span>
    </span>
  );
}
