"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CardsHowToDrawer } from "@/features/cards/ui/CardsHowToDrawer";

interface CollectionProgressProps {
  ownedCount: number;
  totalCount: number;
}

export function CollectionProgress({
  ownedCount,
  totalCount,
}: CollectionProgressProps) {
  const t = useTranslations("cards");
  const [helpOpen, setHelpOpen] = useState(false);
  const percent =
    totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

  return (
    <>
      <div className="glass corner-squircle rounded-2xl px-4 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium">{t("collectionProgress")}</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground"
              onClick={() => setHelpOpen(true)}
            >
              {t("howToGetCards")}
            </Button>
            <p className="text-xs tabular-nums text-muted-foreground">
              {ownedCount}
              <span className="text-muted-foreground/80">/{totalCount}</span>
            </p>
          </div>
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

      <CardsHowToDrawer open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}
