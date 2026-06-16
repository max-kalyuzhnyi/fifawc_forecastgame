"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlbumGrid } from "@/features/cards/ui/AlbumGrid";
import { CollectionProgress } from "@/features/cards/ui/CollectionProgress";
import { ExchangePanel } from "@/features/cards/ui/ExchangePanel";
import { GiftRevealModal } from "@/features/cards/ui/GiftRevealModal";
import { PackOpenDrawer } from "@/features/cards/ui/PackOpenDrawer";
import { RequestBoard } from "@/features/cards/ui/RequestBoard";
import { RequestCardModal } from "@/features/cards/ui/RequestCardModal";
import type {
  CardPackEntry,
  CatalogCard,
  GiftRequestEntry,
  UnseenGiftEntry,
  UserCardEntry,
} from "@/shared/lib/cards/types";

interface CardsViewProps {
  catalog: CatalogCard[];
  inventory: UserCardEntry[];
  packs: CardPackEntry[];
  requests: GiftRequestEntry[];
  unseenGifts: UnseenGiftEntry[];
  currentUserId: string;
  openRequestCardIds: string[];
  nextRequestAt: string | null;
}

export function CardsView({
  catalog,
  inventory,
  packs,
  requests,
  unseenGifts,
  currentUserId,
  openRequestCardIds,
  nextRequestAt,
}: CardsViewProps) {
  const t = useTranslations("cards");
  const [selectedCard, setSelectedCard] = useState<CatalogCard | null>(null);
  const inventoryMap = new Map(inventory.map((entry) => [entry.cardId, entry]));
  const openRequestSet = new Set(openRequestCardIds);
  const ownedCount = inventory.length;
  const totalCount = catalog.length;
  const othersRequests = requests.filter(
    (request) => request.requesterUserId !== currentUserId,
  );

  return (
    <div className="flex flex-col gap-4 pb-4">
      <GiftRevealModal gifts={unseenGifts} />

      <Tabs defaultValue="collection" className="flex flex-col gap-4">
        <TabsList className="w-full">
          <TabsTrigger value="collection" className="flex-1">
            {t("tabs.collection")}
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex-1">
            {t("tabs.requests")}
            {othersRequests.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                {othersRequests.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="collection" className="tab-panel-enter space-y-4">
          <CollectionProgress ownedCount={ownedCount} totalCount={totalCount} />
          <PackOpenDrawer packs={packs} />
          <ExchangePanel inventory={inventory} />
          <AlbumGrid
            catalog={catalog}
            inventory={inventory}
            onCardClick={(card) => {
              if (!inventoryMap.has(card.id)) {
                setSelectedCard(card);
              }
            }}
          />
        </TabsContent>

        <TabsContent value="requests" className="tab-panel-enter">
          <RequestBoard
            requests={requests}
            catalog={catalog}
            inventory={inventory}
            currentUserId={currentUserId}
          />
        </TabsContent>
      </Tabs>

      <RequestCardModal
        card={selectedCard}
        open={selectedCard != null}
        onOpenChange={(open) => {
          if (!open) setSelectedCard(null);
        }}
        hasOpenRequest={
          selectedCard != null && openRequestSet.has(selectedCard.id)
        }
        nextRequestAt={nextRequestAt}
      />
    </div>
  );
}
