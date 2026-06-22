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
  size?: "sm" | "md" | "lg" | "xl";
  reveal?: boolean;
  showPhoto?: boolean;
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
  xl: "w-[min(280px,82vw)] aspect-[2/3]",
};

export function CardTile({
  card,
  owned = false,
  count = 0,
  onClick,
  size = "md",
  reveal = false,
  showPhoto = owned,
  className,
  style,
}: CardTileProps) {
  const t = useTranslations("cards");
  const [failed, setFailed] = useState(false);
  const duplicates = Math.max(0, count - 1);
  const teamName = card.teamName ?? t("legend");
  const isFullCardArt = card.isFullCardArt ?? false;
  // Keep unopened cards mysterious by not mounting the player image at all.
  const visibleImageUrl = showPhoto && !failed ? card.imageUrl : null;

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
      <div
        className={cn(
          "relative overflow-hidden",
          isFullCardArt ? "h-full" : "flex-1",
        )}
      >
        {visibleImageUrl ? (
          <Image
            src={visibleImageUrl}
            alt={card.displayName}
            fill
            unoptimized
            onError={() => setFailed(true)}
            className={cn(
              "object-top",
              isFullCardArt ? "object-contain" : "object-cover",
            )}
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),rgba(15,23,42,0.2)_45%,rgba(2,6,23,0.7))] px-2 text-center">
            <span className="line-clamp-2 text-[10px] font-semibold leading-tight text-white/80">
              {card.displayName}
            </span>
            <span className="line-clamp-1 text-[9px] text-white/50">
              {teamName}
            </span>
          </div>
        )}
        {!owned && <div className="absolute inset-0 bg-black/25" aria-hidden />}
      </div>
      {visibleImageUrl && !isFullCardArt && (
        <div className="space-y-0.5 px-1.5 py-1.5 text-left">
          <p className="truncate text-[10px] font-semibold leading-tight text-white">
            {card.displayName}
          </p>
          <p className="truncate text-[9px] text-white/60">
            {teamName}
          </p>
        </div>
      )}
      {duplicates > 0 && (
        <span className="absolute top-1 right-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
          +{duplicates}
        </span>
      )}
    </button>
  );
}
