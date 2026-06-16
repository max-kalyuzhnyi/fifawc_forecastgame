"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { CatalogCard } from "@/shared/lib/cards/types";
import type { CardRarity } from "@/shared/types/database";

interface CardTileProps {
  card: CatalogCard;
  owned?: boolean;
  count?: number;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  reveal?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const rarityStyles: Record<CardRarity, string> = {
  common: "ring-white/20 bg-gradient-to-b from-slate-800/90 to-slate-900/95",
  rare: "ring-sky-400/40 bg-gradient-to-b from-sky-900/80 to-slate-900/95 shadow-[0_0_20px_rgba(56,189,248,0.15)]",
  legendary:
    "ring-amber-400/50 bg-gradient-to-b from-amber-900/70 to-slate-900/95 shadow-[0_0_24px_rgba(251,191,36,0.2)]",
};

const sizeStyles = {
  sm: "w-[72px] aspect-[2/3]",
  md: "w-[96px] aspect-[2/3]",
  lg: "w-[140px] aspect-[2/3]",
};

function getMonogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function CardTile({
  card,
  owned = false,
  count = 0,
  onClick,
  size = "md",
  reveal = false,
  className,
  style,
}: CardTileProps) {
  const t = useTranslations("cards");
  const [failed, setFailed] = useState(false);
  const duplicates = Math.max(0, count - 1);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "corner-squircle relative flex flex-col overflow-hidden rounded-2xl ring-2 transition-transform duration-150 ease-out",
        sizeStyles[size],
        owned ? rarityStyles[card.rarity] : "ring-white/10 bg-slate-950/80 opacity-50 grayscale",
        reveal && "card-flip-reveal motion-reduce:animate-none",
        onClick && "active:scale-[0.97]",
        className,
      )}
      style={style}
    >
      <div className="relative flex-1 overflow-hidden">
        {card.imageUrl && !failed ? (
          <Image
            src={card.imageUrl}
            alt={card.displayName}
            fill
            unoptimized
            onError={() => setFailed(true)}
            className="object-cover object-top"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-white/5 text-lg font-bold text-white/50">
            {getMonogram(card.displayName)}
          </div>
        )}
        {!owned && <div className="absolute inset-0 bg-black/25" aria-hidden />}
      </div>
      <div className="space-y-0.5 px-1.5 py-1.5 text-left">
        <p className="truncate text-[10px] font-semibold leading-tight text-white">
          {card.displayName}
        </p>
        <p className="truncate text-[9px] text-white/60">
          {card.teamName ?? t("legend")}
        </p>
      </div>
      {duplicates > 0 && (
        <span className="absolute top-1 right-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
          +{duplicates}
        </span>
      )}
    </button>
  );
}
