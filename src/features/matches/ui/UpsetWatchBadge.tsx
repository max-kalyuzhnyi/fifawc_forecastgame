"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UpsetWatchBadgeProps {
  label: string;
  className?: string;
}

export function UpsetWatchBadge({ label, className }: UpsetWatchBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-white/15 bg-white/10 text-[10px] font-semibold uppercase tracking-wide text-white/70",
        className,
      )}
    >
      {label}
    </Badge>
  );
}
