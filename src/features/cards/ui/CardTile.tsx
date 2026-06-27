"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CardArtTemplate } from "@/features/cards/ui/CardArtTemplate";
import { CardFullArt } from "@/features/cards/ui/CardFullArt";
import { cn } from "@/lib/utils";
import type { CatalogCard } from "@/shared/lib/cards/types";

interface CardTileProps {
  card: CatalogCard;
  owned?: boolean;
  count?: number;
  onClick?: () => void;
  size?: "sm" | "md" | "lg" | "xl";
  reveal?: boolean;
  showPhoto?: boolean;
  bare?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

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
  bare = false,
  className,
  style,
}: CardTileProps) {
  const t = useTranslations("cards");
  const [failed, setFailed] = useState(false);
  const duplicates = Math.max(0, count - 1);
  const teamName = card.teamName ?? t("legend");
  const isFullCardArt = card.isFullCardArt ?? false;
  const hasArt = !!card.imageUrl && !failed;
  const showFullArt = isFullCardArt && hasArt;
  const Component = onClick ? "button" : "div";

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "relative bg-transparent transition-transform duration-150 ease-out",
        sizeStyles[size],
        bare && "overflow-visible shadow-none",
        reveal && "card-flip-reveal motion-reduce:animate-none",
        onClick && "active:scale-[0.97]",
        className,
      )}
      style={style}
    >
      <div className="relative h-full">
        {showFullArt ? (
          <CardFullArt
            src={card.imageUrl!}
            alt={card.displayName}
            owned={owned}
            onError={() => setFailed(true)}
          />
        ) : (
          <CardArtTemplate
            displayName={card.displayName}
            teamName={teamName}
            shirtNumber={card.shirtNumber}
            owned={owned}
            photoUrl={hasArt && showPhoto ? card.imageUrl : null}
            locked={!owned && hasArt && showPhoto}
            onPhotoError={() => setFailed(true)}
          />
        )}
      </div>
      {duplicates > 0 && (
        <span className="absolute top-1 right-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
          +{duplicates}
        </span>
      )}
    </Component>
  );
}
