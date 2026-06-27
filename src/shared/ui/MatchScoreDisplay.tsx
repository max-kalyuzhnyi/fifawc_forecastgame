import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const DIGIT_HEIGHT_RATIO = 0.72;

export function MatchScoreDigit({
  value,
  size,
  className,
}: {
  value: number;
  size: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-score inline-flex items-center leading-none tabular-nums",
        className,
      )}
      style={{
        fontSize: `${Math.round(size / DIGIT_HEIGHT_RATIO)}px`,
        height: `${size}px`,
      }}
    >
      {value}
    </span>
  );
}

export function MatchScoreStatus({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-[10px] font-semibold uppercase leading-none tracking-wide text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
