"use client";

import { useEffect, useState, useTransition } from "react";
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
import { markGiftSeen } from "@/features/cards/actions";
import type { UnseenGiftEntry } from "@/shared/lib/cards/types";

interface GiftRevealModalProps {
  gifts: UnseenGiftEntry[];
}

export function GiftRevealModal({ gifts }: GiftRevealModalProps) {
  const t = useTranslations("cards");
  const [queue, setQueue] = useState(gifts);
  const [open, setOpen] = useState(gifts.length > 0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setQueue(gifts);
    setOpen(gifts.length > 0);
  }, [gifts]);

  const current = queue[0];

  function handleDismiss(): void {
    if (!current) {
      setOpen(false);
      return;
    }

    startTransition(async () => {
      await markGiftSeen(current.id);
      const next = queue.slice(1);
      setQueue(next);
      if (next.length === 0) {
        setOpen(false);
      }
    });
  }

  if (!current) {
    return null;
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t("giftReceived")}</DrawerTitle>
          <DrawerDescription>
            {t("giftFrom", { name: current.fromUserName })}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex justify-center py-4">
          <CardTile card={current.card} owned size="lg" reveal />
        </div>

        <DrawerFooter className="pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]">
          <Button
            className="h-14 w-full text-base font-semibold active:scale-[0.97]"
            size="xl"
            onClick={handleDismiss}
            disabled={isPending}
          >
            {t("awesome")}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
