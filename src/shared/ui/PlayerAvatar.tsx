"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface PlayerAvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: number;
  className?: string;
}

function getPlayerMonogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function PlayerAvatar({
  name,
  photoUrl,
  size = 20,
  className,
}: PlayerAvatarProps) {
  const [failed, setFailed] = useState(false);

  if (!photoUrl || failed) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-white/10 font-semibold text-white/70 ring-1 ring-white/15",
          className,
        )}
        style={{ width: size, height: size, fontSize: Math.max(8, size * 0.32) }}
        aria-hidden
      >
        {getPlayerMonogram(name)}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full ring-1 ring-white/15",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={photoUrl}
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
