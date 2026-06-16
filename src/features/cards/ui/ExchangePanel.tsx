"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { exchangeDuplicates } from "@/features/cards/actions";
import { EXCHANGE_TIERS } from "@/shared/lib/cards/config";
import { countTotalDuplicates } from "@/shared/lib/cards/earnPacks";
import type { UserCardEntry } from "@/shared/lib/cards/types";

interface ExchangePanelProps {
  inventory: UserCardEntry[];
}

export function ExchangePanel({ inventory }: ExchangePanelProps) {
  const t = useTranslations("cards");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const duplicates = countTotalDuplicates(inventory);

  if (duplicates === 0) {
    return null;
  }

  function handleExchange(tier: "exchange_3" | "exchange_5"): void {
    startTransition(async () => {
      await exchangeDuplicates(tier);
      router.refresh();
    });
  }

  return (
    <div className="glass corner-squircle space-y-3 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{t("exchangeTitle")}</h2>
        <span className="text-xs text-muted-foreground">
          {t("duplicatesCount", { count: duplicates })}
        </span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="secondary"
          disabled={
            isPending ||
            duplicates < EXCHANGE_TIERS.exchange_3.duplicatesRequired
          }
          onClick={() => handleExchange("exchange_3")}
        >
          {t("exchange3", { cards: EXCHANGE_TIERS.exchange_3.packSize })}
        </Button>
        <Button
          variant="secondary"
          disabled={
            isPending ||
            duplicates < EXCHANGE_TIERS.exchange_5.duplicatesRequired
          }
          onClick={() => handleExchange("exchange_5")}
        >
          {t("exchange5", { cards: EXCHANGE_TIERS.exchange_5.packSize })}
        </Button>
      </div>
    </div>
  );
}
