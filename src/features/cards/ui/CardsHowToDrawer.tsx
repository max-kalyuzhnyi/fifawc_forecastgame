"use client";

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
import {
  EXCHANGE_TIERS,
  MAX_OPEN_CARD_REQUESTS,
  PACK_SIZES,
} from "@/shared/lib/cards/config";

interface CardsHowToDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CardsHowToDrawer({ open, onOpenChange }: CardsHowToDrawerProps) {
  const t = useTranslations("cards.howTo");

  const rules = [
    {
      key: "welcome",
      text: t("welcome", { count: PACK_SIZES.welcome }),
    },
    {
      key: "daily",
      text: t("daily", { count: PACK_SIZES.daily_picks }),
    },
    {
      key: "exactScore",
      text: t("exactScore", { count: PACK_SIZES.exact_score }),
    },
    {
      key: "goalscorer",
      text: t("goalscorer", { count: PACK_SIZES.goalscorer }),
    },
    {
      key: "exchange3",
      text: t("exchange3", {
        duplicates: EXCHANGE_TIERS.exchange_3.duplicatesRequired,
        count: EXCHANGE_TIERS.exchange_3.packSize,
      }),
    },
    {
      key: "exchange5",
      text: t("exchange5", {
        duplicates: EXCHANGE_TIERS.exchange_5.duplicatesRequired,
        count: EXCHANGE_TIERS.exchange_5.packSize,
      }),
    },
    {
      key: "requests",
      text: t("requests", { max: MAX_OPEN_CARD_REQUESTS }),
    },
    {
      key: "gifts",
      text: t("gifts"),
    },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t("title")}</DrawerTitle>
          <DrawerDescription>{t("description")}</DrawerDescription>
        </DrawerHeader>

        <ul className="max-h-[50dvh] space-y-3 overflow-y-auto px-4 pb-2 text-sm">
          {rules.map((rule) => (
            <li key={rule.key} className="rounded-xl bg-white/5 px-3 py-2">
              {rule.text}
            </li>
          ))}
        </ul>

        <DrawerFooter className="pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]">
          <Button
            className="h-14 w-full text-base font-semibold"
            size="xl"
            onClick={() => onOpenChange(false)}
          >
            {t("close")}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
