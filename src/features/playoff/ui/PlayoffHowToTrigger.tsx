"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PlayoffHowToDrawer } from "@/features/playoff/ui/PlayoffHowToDrawer";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "playoff-howto-seen";

interface PlayoffHowToTriggerProps {
  showPlayoffUi: boolean;
}

export function PlayoffHowToTrigger({ showPlayoffUi }: PlayoffHowToTriggerProps) {
  const t = useTranslations("playoff.howTo");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!showPlayoffUi) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    if (!window.localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
  }, [showPlayoffUi]);

  if (!showPlayoffUi) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 px-2 text-[11px] text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        {t("trigger")}
      </Button>
      <PlayoffHowToDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
