"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Match } from "@/entities/match/model/types";
import type { MatchPlayerOption } from "@/features/matches/actions";
import type { PredictionDetail } from "@/features/matches/lib/predictionDetail";
import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";
import { MatchDetailContent } from "@/features/matches/ui/MatchDetailContent";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";

const RENDER_WINDOW = 1;

interface MatchDrawerProps {
  matches: Match[];
  matchId: string | null;
  voterMap: Record<string, MatchVoterInfo>;
  predictionMap: Record<string, PredictionDetail>;
  playersByMatch: Record<string, MatchPlayerOption[]>;
}

export function MatchDrawer({
  matches,
  matchId,
  voterMap,
  predictionMap,
  playersByMatch,
}: MatchDrawerProps) {
  const router = useRouter();
  const open = Boolean(matchId);
  const [contentMounted, setContentMounted] = useState(() => Boolean(matchId));
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  const startIndex = Math.max(
    0,
    matches.findIndex((match) => match.id === matchId),
  );
  const activeIndex = Math.max(
    0,
    matches.findIndex((match) => match.id === matchId),
  );

  useEffect(() => {
    if (open) {
      setContentMounted(true);
    }
  }, [open]);

  useEffect(() => {
    if (!carouselApi || !matchId) {
      return;
    }

    const index = matches.findIndex((match) => match.id === matchId);
    if (index >= 0 && carouselApi.selectedScrollSnap() !== index) {
      carouselApi.scrollTo(index, true);
    }
  }, [carouselApi, matchId, matches]);

  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    const handleSelect = () => {
      const index = carouselApi.selectedScrollSnap();
      const match = matches[index];

      if (match && match.id !== matchId) {
        router.replace(`/matches?match=${match.id}`, { scroll: false });
      }
    };

    carouselApi.on("select", handleSelect);
    return () => {
      carouselApi.off("select", handleSelect);
    };
  }, [carouselApi, matchId, matches, router]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      router.replace("/matches", { scroll: false });
    }
  };

  if (matches.length === 0) {
    return null;
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} modal>
      <DrawerContent className="corner-squircle max-h-[96dvh] border-0 bg-transparent p-0 shadow-none before:hidden data-[vaul-drawer-direction=bottom]:mt-8">
        <DrawerTitle className="sr-only">Match details</DrawerTitle>

        {contentMounted ? (
          <div className="corner-squircle flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[24px]">
            <Carousel
              setApi={setCarouselApi}
              opts={{
                startIndex,
                align: "center",
                containScroll: false,
                loop: false,
              }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <CarouselContent className="ml-0" data-vaul-no-drag>
                {matches.map((match, index) => {
                  const inWindow =
                    Math.abs(index - activeIndex) <= RENDER_WINDOW;
                  const voters = voterMap[match.id] ?? { count: 0, voters: [] };
                  const prediction = predictionMap[match.id];
                  const players = playersByMatch[match.id] ?? [];

                  return (
                    <CarouselItem
                      key={match.id}
                      className="basis-[92%] px-2"
                    >
                      <div className="h-[calc(96dvh-2rem)] overflow-y-auto overscroll-contain px-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
                        {inWindow ? (
                          <MatchDetailContent
                            match={match}
                            voters={voters}
                            prediction={prediction}
                            predictionMap={predictionMap}
                            players={players}
                          />
                        ) : null}
                      </div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
            </Carousel>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
