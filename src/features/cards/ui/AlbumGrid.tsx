"use client";

import { useTranslations } from "next-intl";
import { CardTile } from "@/features/cards/ui/CardTile";
import { TeamFlag } from "@/shared/ui/TeamFlag";
import type { CatalogCard, UserCardEntry } from "@/shared/lib/cards/types";

interface AlbumGridProps {
  catalog: CatalogCard[];
  inventory: UserCardEntry[];
  onCardClick?: (card: CatalogCard) => void;
}

export function AlbumGrid({ catalog, inventory, onCardClick }: AlbumGridProps) {
  const inventoryMap = new Map(inventory.map((entry) => [entry.cardId, entry]));

  const byTeam = new Map<string, CatalogCard[]>();
  for (const card of catalog) {
    const key = card.isLegend ? "Legends OTB" : (card.teamName ?? "Other");
    const list = byTeam.get(key) ?? [];
    list.push(card);
    byTeam.set(key, list);
  }

  return (
    <div className="space-y-4">
      {[...byTeam.entries()].map(([teamName, cards]) => (
        <section
          key={teamName}
          className="glass corner-squircle space-y-3 rounded-2xl p-4"
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground/90">
            <TeamFlag name={teamName} size={20} />
            <span>{teamName}</span>
          </h2>
          <div className="grid grid-cols-3 justify-items-center gap-3">
            {cards.map((card) => {
              const entry = inventoryMap.get(card.id);
              return (
                <CardTile
                  key={card.id}
                  card={card}
                  owned={!!entry}
                  count={entry?.count ?? 0}
                  onClick={onCardClick ? () => onCardClick(card) : undefined}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
