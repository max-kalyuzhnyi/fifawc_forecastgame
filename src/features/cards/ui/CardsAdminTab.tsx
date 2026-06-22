"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createLegendCard,
  deleteLegendCard,
  resetAdminCardCollectionState,
  uploadCardPhoto,
  updateCardRarity,
  updateLegendCardName,
} from "@/features/cards/admin-actions";
import type { CardAdminStats } from "@/features/cards/admin-actions";
import type { CardRarity } from "@/shared/types/database";

interface AdminCardRow {
  id: string;
  displayName: string;
  teamName: string | null;
  rarity: CardRarity;
  imageUrl: string | null;
  isLegend: boolean;
}

interface CardsAdminTabProps {
  cards: AdminCardRow[];
  stats: CardAdminStats;
  players: {
    id: string;
    name: string;
    teamId: string;
    teamName: string;
    photoUrl: string | null;
  }[];
}

export function CardsAdminTab({ cards, stats, players }: CardsAdminTabProps) {
  const t = useTranslations("cards.admin");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [legendName, setLegendName] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const nationalCards = cards.filter((card) => !card.isLegend);
  const legendCards = cards.filter((card) => card.isLegend);

  const byTeam = new Map<string, AdminCardRow[]>();
  for (const card of nationalCards) {
    const key = card.teamName ?? "Other";
    const list = byTeam.get(key) ?? [];
    list.push(card);
    byTeam.set(key, list);
  }

  function handleRarityChange(cardId: string, rarity: CardRarity): void {
    startTransition(async () => {
      await updateCardRarity(cardId, rarity);
      router.refresh();
    });
  }

  function handleCreateLegend(): void {
    startTransition(async () => {
      await createLegendCard(legendName);
      setLegendName("");
      router.refresh();
    });
  }

  function handleLegendName(cardId: string, name: string): void {
    startTransition(async () => {
      await updateLegendCardName(cardId, name);
      router.refresh();
    });
  }

  function handleDeleteLegend(cardId: string): void {
    startTransition(async () => {
      await deleteLegendCard(cardId);
      router.refresh();
    });
  }

  function handleUpload(cardId: string, file: File): void {
    const formData = new FormData();
    formData.set("photo", file);
    startTransition(async () => {
      await uploadCardPhoto(cardId, formData);
      router.refresh();
    });
  }

  function handleResetAdminCollection(): void {
    if (!window.confirm(t("resetConfirm"))) {
      return;
    }

    startTransition(async () => {
      const result = await resetAdminCardCollectionState();
      if ("error" in result) {
        setResetMessage(result.error);
        return;
      }

      setResetMessage(
        t("resetSuccess", {
          packs: result.deletedPacks,
          cards: result.deletedCards,
        }),
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 pb-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("statsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("usersActivated", { count: stats.usersActivated })}
            {" · "}
            {t("usersRevealedDailyPack", {
              count: stats.usersRevealedDailyPack,
            })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("resetTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("resetDescription")}</p>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={handleResetAdminCollection}
          >
            {t("resetButton")}
          </Button>
          {resetMessage && (
            <p className="text-sm text-muted-foreground">{resetMessage}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("legendsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="legend-name">{t("legendName")}</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="legend-name"
                  value={legendName}
                  onChange={(event) => setLegendName(event.target.value)}
                  placeholder={t("legendNamePlaceholder")}
                />
                <Button
                  type="button"
                  disabled={isPending || !legendName.trim()}
                  onClick={handleCreateLegend}
                >
                  {t("addLegend")}
                </Button>
              </div>
            </Field>
          </FieldGroup>

          <div className="space-y-3">
            {legendCards.map((card) => (
              <div
                key={card.id}
                className="flex flex-col gap-2 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center"
              >
                <div className="relative size-16 overflow-hidden rounded-lg bg-muted">
                  {card.imageUrl ? (
                    <Image
                      src={card.imageUrl}
                      alt={card.displayName}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                      {t("noPhoto")}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <Input
                    defaultValue={card.displayName}
                    onBlur={(event) => {
                      if (event.target.value !== card.displayName) {
                        handleLegendName(card.id, event.target.value);
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={(element) => {
                        fileRefs.current[card.id] = element;
                      }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) handleUpload(card.id, file);
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={isPending}
                      onClick={() => fileRefs.current[card.id]?.click()}
                    >
                      {t("uploadPhoto")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => handleDeleteLegend(card.id)}
                    >
                      {t("remove")}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {[...byTeam.entries()].map(([teamName, teamCards]) => (
        <Card key={teamName}>
          <CardHeader>
            <CardTitle>{teamName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamCards.map((card) => (
              <div
                key={card.id}
                className="flex flex-col gap-3 rounded-lg bg-muted/40 p-3 sm:flex-row sm:items-center"
              >
                <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {card.imageUrl ? (
                    <Image
                      src={card.imageUrl}
                      alt={card.displayName}
                      fill
                      unoptimized
                      className="object-cover object-top"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                      {t("noPhoto")}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{card.displayName}</p>
                  <p className="text-xs text-muted-foreground">{teamName}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={(element) => {
                      fileRefs.current[card.id] = element;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleUpload(card.id, file);
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => fileRefs.current[card.id]?.click()}
                  >
                    {t("uploadPhoto")}
                  </Button>
                  <Select
                    value={card.rarity}
                    onValueChange={(value) =>
                      handleRarityChange(card.id, value as CardRarity)
                    }
                    disabled={isPending}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="common">{t("rarity.common")}</SelectItem>
                      <SelectItem value="rare">{t("rarity.rare")}</SelectItem>
                      <SelectItem value="legendary">
                        {t("rarity.legendary")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>{t("playersPool")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("playersPoolHint")}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {players.length} {t("playersAvailable")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
