"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  cancelCardRequest,
  fulfillCardRequest,
} from "@/features/cards/actions";
import { CardTile } from "@/features/cards/ui/CardTile";
import type {
  CatalogCard,
  GiftRequestEntry,
  UserCardEntry,
} from "@/shared/lib/cards/types";

interface RequestBoardProps {
  requests: GiftRequestEntry[];
  catalog: CatalogCard[];
  inventory: UserCardEntry[];
  currentUserId: string;
}

export function RequestBoard({
  requests,
  catalog,
  inventory,
  currentUserId,
}: RequestBoardProps) {
  const t = useTranslations("cards");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const catalogById = new Map(catalog.map((card) => [card.id, card]));
  const inventoryMap = new Map(inventory.map((entry) => [entry.cardId, entry]));

  const ownRequests = requests.filter(
    (request) => request.requesterUserId === currentUserId,
  );
  const othersRequests = requests.filter(
    (request) => request.requesterUserId !== currentUserId,
  );

  function handleFulfill(requestId: string): void {
    startTransition(async () => {
      await fulfillCardRequest(requestId);
      router.refresh();
    });
  }

  function handleCancel(requestId: string): void {
    startTransition(async () => {
      await cancelCardRequest(requestId);
      router.refresh();
    });
  }

  if (requests.length === 0) {
    return (
      <div className="glass corner-squircle rounded-2xl p-6 text-center">
        <p className="text-sm font-medium">{t("requestBoard")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("noRequests")}</p>
        <p className="mt-3 text-xs text-muted-foreground">{t("requestHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {ownRequests.length > 0 && (
        <section className="glass corner-squircle space-y-3 rounded-2xl p-4">
          <h2 className="text-sm font-semibold">{t("yourRequestsTitle")}</h2>
          <ul className="space-y-2">
            {ownRequests.map((request) => {
              const card = catalogById.get(request.cardId);
              return (
                <li
                  key={request.id}
                  className="flex items-center gap-3 rounded-xl bg-white/5 p-2"
                >
                  {card && (
                    <CardTile
                      card={card}
                      owned={false}
                      showPhoto={false}
                      size="sm"
                      className="pointer-events-none shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {card?.displayName ?? t("unknownCard")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("yourRequest")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => handleCancel(request.id)}
                  >
                    {t("cancel")}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="glass corner-squircle space-y-3 rounded-2xl p-4">
        <h2 className="text-sm font-semibold">{t("othersRequestsTitle")}</h2>
        {othersRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noOthersRequests")}</p>
        ) : (
          <ul className="space-y-2">
            {othersRequests.map((request) => {
              const card = catalogById.get(request.cardId);
              const canFulfill =
                (inventoryMap.get(request.cardId)?.count ?? 0) >= 2;

              return (
                <li
                  key={request.id}
                  className="flex items-center gap-3 rounded-xl bg-white/5 p-2"
                >
                  {card && (
                    <CardTile
                      card={card}
                      owned
                      showPhoto={false}
                      size="sm"
                      className="pointer-events-none shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {card?.displayName ?? t("unknownCard")}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t("requestedBy", { name: request.requesterName })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={isPending || !canFulfill}
                    onClick={() => handleFulfill(request.id)}
                  >
                    {t("gift")}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
