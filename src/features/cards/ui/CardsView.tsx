"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlbumGrid } from "@/features/cards/ui/AlbumGrid";
import { CardTile } from "@/features/cards/ui/CardTile";
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
  openRequestCount: number;
  maxOpenRequests: number;
}

export function CardsView({
  catalog,
  inventory,
  packs,
  requests,
  unseenGifts,
  currentUserId,
  openRequestCardIds,
  openRequestCount,
  maxOpenRequests,
}: CardsViewProps) {
  const t = useTranslations("cards");
  const [requestCard, setRequestCard] = useState<CatalogCard | null>(null);
  const [previewCard, setPreviewCard] = useState<CatalogCard | null>(null);
  const [showOnlyRevealed, setShowOnlyRevealed] = useState(false);
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
          <label className="glass corner-squircle flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={showOnlyRevealed}
              onChange={(event) => setShowOnlyRevealed(event.target.checked)}
              className="size-4 rounded border-white/30 accent-primary"
            />
            <span>{t("showOnlyRevealed")}</span>
          </label>
          <AlbumGrid
            catalog={catalog}
            inventory={inventory}
            showOnlyRevealed={showOnlyRevealed}
            onCardClick={(card) => {
              // Missing cards open the request flow; owned cards open a larger reveal.
              if (inventoryMap.has(card.id)) {
                setPreviewCard(card);
              } else {
                setRequestCard(card);
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
        card={requestCard}
        open={requestCard != null}
        onOpenChange={(open) => {
          if (!open) setRequestCard(null);
        }}
        hasOpenRequest={
          requestCard != null && openRequestSet.has(requestCard.id)
        }
        openRequestCount={openRequestCount}
        maxOpenRequests={maxOpenRequests}
      />

      <Drawer
        open={previewCard != null}
        onOpenChange={(open) => {
          if (!open) setPreviewCard(null);
        }}
      >
        <DrawerContent
          frameless
          hideHandle
          overlayClassName="bg-black/75"
          className="items-center justify-center data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-none"
        >
          {previewCard && (
            <>
              <DrawerTitle className="sr-only">
                {previewCard.displayName}
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                {previewCard.teamName ?? t("legend")} ·{" "}
                {t(`rarity.${previewCard.rarity}`)}
              </DrawerDescription>
              <div className="flex min-h-[70dvh] items-center justify-center px-4 py-8">
                <CardTile card={previewCard} owned size="xl" />
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
