"use client";

import { useTranslations } from "next-intl";

interface CollectionProgressProps {
  ownedCount: number;
  totalCount: number;
}

export function CollectionProgress({
  ownedCount,
  totalCount,
}: CollectionProgressProps) {
  const t = useTranslations("cards");
  const percent =
    totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

  return (
    <div className="glass corner-squircle rounded-2xl px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{t("collectionProgress")}</p>
        <p className="text-xs tabular-nums text-muted-foreground">
          {ownedCount}
          <span className="text-muted-foreground/80">/{totalCount}</span>
        </p>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuenow={ownedCount}
        aria-valuemin={0}
        aria-valuemax={totalCount}
        aria-label={t("collectionProgress")}
      >
        <div
          className="collection-progress-fill h-full rounded-full bg-primary"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
