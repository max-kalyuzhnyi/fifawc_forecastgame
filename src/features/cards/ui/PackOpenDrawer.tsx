"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { CardTile } from "@/features/cards/ui/CardTile";
import { openPack } from "@/features/cards/actions";
import type { CardPackEntry, CatalogCard } from "@/shared/lib/cards/types";

interface PackOpenDrawerProps {
  packs: CardPackEntry[];
}

const reasonLabels: Record<string, string> = {
  welcome: "packReason.welcome",
  daily_picks: "packReason.dailyPicks",
  exact_score: "packReason.exactScore",
  goalscorer: "packReason.goalscorer",
  scored: "packReason.scored",
  boost_scorer: "packReason.boostScorer",
  exchange_3: "packReason.exchange3",
  exchange_5: "packReason.exchange5",
};

export function PackOpenDrawer({ packs }: PackOpenDrawerProps) {
  const t = useTranslations("cards");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activePack, setActivePack] = useState<CardPackEntry | null>(null);
  const [revealedCards, setRevealedCards] = useState<CatalogCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const unopened = packs.filter((pack) => pack.status === "unopened");

  function handleOpenPack(pack: CardPackEntry): void {
    setActivePack(pack);
    setRevealedCards([]);
    setError(null);
    setOpen(true);

    startTransition(async () => {
      const result = await openPack(pack.id);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setRevealedCards(result.cards);
      router.refresh();
    });
  }

  if (unopened.length === 0) {
    return null;
  }

  return (
    <>
      <div className="glass corner-squircle space-y-3 rounded-2xl p-4">
        <h2 className="text-sm font-semibold">{t("unopenedPacks")}</h2>
        <div className="flex flex-wrap gap-2">
          {unopened.map((pack) => (
            <Button
              key={pack.id}
              size="sm"
              variant="secondary"
              onClick={() => handleOpenPack(pack)}
              disabled={isPending}
            >
              {t(reasonLabels[pack.reason] ?? "packReason.default", {
                count: pack.size,
              })}
            </Button>
          ))}
        </div>
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t("openingPack")}</DrawerTitle>
            <DrawerDescription>
              {activePack
                ? t(reasonLabels[activePack.reason] ?? "packReason.default", {
                    count: activePack.size,
                  })
                : ""}
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex flex-wrap justify-center gap-3 px-4 pb-4">
            {isPending && revealedCards.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("revealing")}</p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {revealedCards.map((card, index) => (
              <CardTile
                key={`${card.id}-${index}`}
                card={card}
                owned
                size="lg"
                reveal
                className="card-reveal-stagger"
                style={{ animationDelay: `${index * 120}ms` } as React.CSSProperties}
              />
            ))}
          </div>

          <DrawerFooter className="pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]">
            <Button
              className="h-14 w-full text-base font-semibold active:scale-[0.97]"
              size="xl"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              {t("close")}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
