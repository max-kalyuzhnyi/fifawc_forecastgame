"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Match } from "@/entities/match/model/types";
import type { MatchPlayerOption } from "@/features/matches/actions";
import { getBoostUsed } from "@/features/matches/lib/predictionDetail";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import type { PredictionDetail } from "@/features/matches/lib/predictionDetail";
import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";
import { MatchDrawerSlide } from "@/features/matches/ui/MatchDrawerSlide";
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

const PRELOAD_RADIUS = 2;

function expandMountedIndices(
  indices: Set<number>,
  center: number,
  total: number,
  radius: number,
): Set<number> {
  const next = new Set(indices);
  for (let index = center - radius; index <= center + radius; index += 1) {
    if (index >= 0 && index < total) {
      next.add(index);
    }
  }
  return next;
}

interface MatchDrawerProps {
  matches: Match[];
  matchId: string | null;
  voterMap: Record<string, MatchVoterInfo>;
  predictionMap: Record<string, PredictionDetail>;
  playersByMatch: Record<string, MatchPlayerOption[]>;
  predictionsByMatch: Record<string, MatchPredictionEntry[]>;
  scorersByMatch: Record<string, string[]>;
  currentUserId: string | null;
  teamColors: Record<string, string>;
  onMatchChange: (matchId: string) => void;
  onClose: () => void;
}

export function MatchDrawer({
  matches,
  matchId,
  voterMap,
  predictionMap,
  playersByMatch,
  predictionsByMatch,
  scorersByMatch,
  currentUserId,
  teamColors,
  onMatchChange,
  onClose,
}: MatchDrawerProps) {
  const open = Boolean(matchId);
  const [contentMounted, setContentMounted] = useState(() => Boolean(matchId));
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [activeSnapPoint, setActiveSnapPoint] = useState<number | string | null>(
    open ? 1 : null,
  );

  const activeIndex = Math.max(
    0,
    matches.findIndex((match) => match.id === matchId),
  );

  const [snapIndex, setSnapIndex] = useState(activeIndex);
  const [mountedIndices, setMountedIndices] = useState<Set<number>>(() =>
    expandMountedIndices(new Set(), activeIndex, matches.length, PRELOAD_RADIUS),
  );

  const boostUsedByRound = useMemo(() => {
    const byRound = new Map<string, ReturnType<typeof getBoostUsed>>();

    for (const match of matches) {
      if (!byRound.has(match.round_key)) {
        byRound.set(match.round_key, getBoostUsed(predictionMap, match.round_key));
      }
    }

    return byRound;
  }, [matches, predictionMap]);

  useEffect(() => {
    if (open) {
      setContentMounted(true);
      setActiveSnapPoint(1);
    }
  }, [open]);

  useEffect(() => {
    if (activeIndex < 0) {
      return;
    }

    setSnapIndex(activeIndex);
    setMountedIndices((prev) =>
      expandMountedIndices(prev, activeIndex, matches.length, PRELOAD_RADIUS),
    );
  }, [activeIndex, matches.length]);

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

    const handleSnap = () => {
      const index = carouselApi.selectedScrollSnap();
      setSnapIndex(index);
      setMountedIndices((prev) =>
        expandMountedIndices(prev, index, matches.length, PRELOAD_RADIUS),
      );
    };

    const handleSettle = () => {
      const index = carouselApi.selectedScrollSnap();
      const match = matches[index];

      if (match && match.id !== matchId) {
        onMatchChange(match.id);
      }
    };

    carouselApi.on("select", handleSnap);
    carouselApi.on("settle", handleSettle);
    handleSnap();

    return () => {
      carouselApi.off("select", handleSnap);
      carouselApi.off("settle", handleSettle);
    };
  }, [carouselApi, matchId, matches, onMatchChange]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setActiveSnapPoint(null);
        onClose();
        return;
      }

      setActiveSnapPoint(1);
    },
    [onClose],
  );

  if (matches.length === 0) {
    return null;
  }

  return (
    <Drawer
      open={open}
      onOpenChange={handleOpenChange}
      modal
      snapPoints={[1]}
      activeSnapPoint={activeSnapPoint}
      setActiveSnapPoint={setActiveSnapPoint}
      shouldScaleBackground={false}
    >
      <DrawerContent
        fullscreen
        className="corner-squircle border-0 bg-transparent p-0 shadow-none before:hidden"
      >
        <DrawerTitle className="sr-only">Match details</DrawerTitle>

        {contentMounted ? (
          <div className="corner-squircle flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[24px] pt-8">
            <Carousel
              setApi={setCarouselApi}
              opts={{
                startIndex: activeIndex,
                align: "center",
                containScroll: false,
                loop: false,
                duration: 20,
              }}
              className="flex min-h-0 flex-1 flex-col [&_[data-slot=carousel-content]]:min-h-0 [&_[data-slot=carousel-content]]:flex-1"
            >
              <CarouselContent className="ml-0 h-full" data-vaul-no-drag>
                {matches.map((match, index) => (
                  <CarouselItem
                    key={match.id}
                    className="h-full basis-[90%] px-0.5"
                  >
                    <MatchDrawerSlide
                      match={match}
                      voters={voterMap[match.id] ?? { count: 0, voters: [] }}
                      prediction={predictionMap[match.id]}
                      boostUsed={
                        boostUsedByRound.get(match.round_key) ?? {
                          x2: false,
                          x3: false,
                        }
                      }
                      players={playersByMatch[match.id] ?? []}
                      matchPredictions={predictionsByMatch[match.id] ?? []}
                      matchScorers={scorersByMatch[match.id] ?? []}
                      currentUserId={currentUserId}
                      teamColors={teamColors}
                      isActive={index === snapIndex}
                      isMounted={mountedIndices.has(index)}
                      distanceFromActive={Math.abs(index - snapIndex)}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
