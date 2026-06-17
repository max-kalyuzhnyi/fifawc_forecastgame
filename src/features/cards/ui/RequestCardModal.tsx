"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerTitle,
} from "@/components/ui/drawer";
import { createCardRequest } from "@/features/cards/actions";
import { REQUEST_COOLDOWN_MS } from "@/shared/lib/cards/config";
import type { CatalogCard } from "@/shared/lib/cards/types";
import type { CardRarity } from "@/shared/types/database";
import { TeamFlag } from "@/shared/ui/TeamFlag";
import { cn } from "@/lib/utils";

const rarityStyles: Record<CardRarity, string> = {
  common:
    "ring-white/30 shadow-[0_0_40px_rgba(255,255,255,0.08)] bg-gradient-to-b from-slate-700/90 to-slate-900/95",
  rare: "ring-sky-400/50 shadow-[0_0_48px_rgba(56,189,248,0.25)] bg-gradient-to-b from-sky-800/80 to-slate-900/95",
  legendary:
    "ring-amber-400/60 shadow-[0_0_56px_rgba(251,191,36,0.3)] bg-gradient-to-b from-amber-800/70 to-slate-900/95",
};

function getMonogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function CardHeroPreview({ card }: { card: CatalogCard }) {
  const t = useTranslations("cards");
  const teamName = card.teamName ?? t("legend");

  return (
    <div
      className={cn(
        "corner-squircle relative flex aspect-[2/3] w-[min(280px,82vw)] flex-col overflow-hidden rounded-3xl ring-2",
        rarityStyles[card.rarity],
      )}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Requests should confirm the target card without spoiling its reveal art. */}
        <div className="flex size-full flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),rgba(15,23,42,0.28)_42%,rgba(2,6,23,0.78))] px-6 text-center">
          <span className="text-5xl font-black tracking-tight text-white/30">
            {getMonogram(card.displayName)}
          </span>
          <div className="space-y-2">
            <p className="text-xl font-bold leading-tight text-white">
              {card.displayName}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-white/70">
              <TeamFlag name={teamName} size={18} />
              <span>{teamName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCooldown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function useCooldownRemaining(nextRequestAt: string | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!nextRequestAt) {
      return;
    }

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [nextRequestAt]);

  if (!nextRequestAt) {
    return 0;
  }

  return Math.max(0, new Date(nextRequestAt).getTime() - now);
}

interface RequestCardModalProps {
  card: CatalogCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasOpenRequest: boolean;
  nextRequestAt: string | null;
}

export function RequestCardModal({
  card,
  open,
  onOpenChange,
  hasOpenRequest,
  nextRequestAt,
}: RequestCardModalProps) {
  const t = useTranslations("cards");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticNextRequestAt, setOptimisticNextRequestAt] = useState<
    string | null
  >(null);
  const effectiveNextRequestAt = optimisticNextRequestAt ?? nextRequestAt;
  const cooldownRemaining = useCooldownRemaining(effectiveNextRequestAt);
  const onCooldown = cooldownRemaining > 0;

  if (!card) {
    return null;
  }

  function handleRequest(): void {
    startTransition(async () => {
      const result = await createCardRequest(card!.id);
      if ("error" in result) {
        if ("nextAvailableAt" in result && result.nextAvailableAt) {
          setOptimisticNextRequestAt(result.nextAvailableAt);
        }
        return;
      }
      setOptimisticNextRequestAt(
        new Date(Date.now() + REQUEST_COOLDOWN_MS).toISOString(),
      );
      router.refresh();
      onOpenChange(false);
    });
  }

  const requestDisabled = isPending || hasOpenRequest || onCooldown;

  const actionButton = hasOpenRequest ? (
    <Button className="h-14 w-full text-base font-semibold" size="xl" variant="secondary" disabled>
      {t("requested")}
    </Button>
  ) : onCooldown ? (
    <Button className="h-14 w-full text-base font-semibold" size="xl" variant="secondary" disabled>
      {t("cooldown", { time: formatCooldown(cooldownRemaining) })}
    </Button>
  ) : (
    <Button
      className="h-14 w-full text-base font-semibold active:scale-[0.97]"
      size="xl"
      disabled={requestDisabled}
      onClick={handleRequest}
    >
      {t("requestCard")}
    </Button>
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        frameless
        hideHandle
        overlayClassName="bg-black/70 data-open:animate-none data-closed:animate-none"
        className="max-h-[88dvh] gap-4 data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-none"
      >
        <DrawerTitle className="sr-only">{card.displayName}</DrawerTitle>
        <DrawerDescription className="sr-only">
          {card.teamName ?? t("legend")} · {t(`rarity.${card.rarity}`)}
        </DrawerDescription>

        <div className="flex flex-1 flex-col items-center justify-center px-4 pt-6">
          <CardHeroPreview card={card} />
        </div>

        <DrawerFooter className="mt-auto w-full px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-2">
          {actionButton}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
