"use client";

import Image from "next/image";
import { useState } from "react";
import { getFlagCode } from "@/shared/lib/teamFlags";
import { cn } from "@/lib/utils";

interface TeamFlagProps {
  name: string;
  size?: number;
  className?: string;
}

function getTeamMonogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function TeamFlag({ name, size = 20, className }: TeamFlagProps) {
  const code = getFlagCode(name);
  const [failed, setFailed] = useState(false);

  if (!code || failed) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-white/10 font-semibold text-foreground ring-1 ring-white/15",
          className,
        )}
        style={{ width: size, height: size, fontSize: Math.max(10, size * 0.28) }}
        aria-hidden
      >
        {getTeamMonogram(name)}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full ring-1 ring-white/20",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={`/flags/${code}.svg`}
        alt=""
        width={size}
        height={size}
        unoptimized
        onError={() => setFailed(true)}
        className="size-full object-cover"
        aria-hidden
      />
    </div>
  );
}

interface TeamNameProps {
  name: string;
  flagSize?: number;
  className?: string;
}

export function TeamName({ name, flagSize = 20, className }: TeamNameProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <TeamFlag name={name} size={flagSize} />
      <span>{name}</span>
    </span>
  );
}
