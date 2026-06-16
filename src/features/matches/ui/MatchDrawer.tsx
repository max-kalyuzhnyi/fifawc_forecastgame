"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import type {
  GroupStanding,
  LiveScoreByTeam,
} from "@/entities/match/lib/standings";
import type { Match, MatchEvent } from "@/entities/match/model/types";
import type { MatchPlayerOption } from "@/features/matches/actions";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import type { PredictionDetail } from "@/features/matches/lib/predictionDetail";
import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";
import type { PlayerPhotosByTeam } from "@/features/matches/lib/playerPhotos";
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
import { cn } from "@/lib/utils";

const PRELOAD_RADIUS = 1;
// First snap reveals header + prediction + tab bar; second is full-screen scroll.
const COLLAPSED_SNAP = 0.72;
const EXPANDED_SNAP = 1;
const SNAP_POINTS = [COLLAPSED_SNAP, EXPANDED_SNAP] as const;

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
  scorerPlayerIdsByMatch: Record<string, string[]>;
  eventsByMatch: Record<string, MatchEvent[]>;
  currentUserId: string | null;
  teamColors: Record<string, string>;
  playerPhotosByTeam: PlayerPhotosByTeam;
  groupStandingsByName: Record<string, GroupStanding>;
  liveScoreByTeam: LiveScoreByTeam;
  upsetMatchIds?: string[];
  onMatchChange: (matchId: string) => void;
  onClose: () => void;
  onPredictionSaved?: (matchId: string, prediction: PredictionDetail) => void;
}

export function MatchDrawer({
  matches,
  matchId,
  voterMap,
  predictionMap,
  playersByMatch,
  predictionsByMatch,
  scorersByMatch,
  scorerPlayerIdsByMatch,
  eventsByMatch,
  currentUserId,
  teamColors,
  playerPhotosByTeam,
  groupStandingsByName,
  liveScoreByTeam,
  upsetMatchIds = [],
  onMatchChange,
  onClose,
  onPredictionSaved,
}: MatchDrawerProps) {
  const open = Boolean(matchId);
  const [contentMounted, setContentMounted] = useState(() => Boolean(matchId));
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [snap, setSnap] = useState<number | string>(COLLAPSED_SNAP);
  const [frozenExpanded, setFrozenExpanded] = useState(false);
  const isClosingRef = useRef(false);
  const dragStartedExpandedRef = useRef(false);
  const maxExpandedDragRef = useRef(0);
  const snapRef = useRef(snap);
  const expanded = snap === EXPANDED_SNAP;
  const visualExpanded = expanded || frozenExpanded;

  useEffect(() => {
    snapRef.current = snap;
  }, [snap]);

  const activeIndex = Math.max(
    0,
    matches.findIndex((match) => match.id === matchId),
  );

  const [snapIndex, setSnapIndex] = useState(activeIndex);
  const [mountedIndices, setMountedIndices] = useState<Set<number>>(() =>
    expandMountedIndices(new Set(), activeIndex, matches.length, PRELOAD_RADIUS),
  );

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lazy-mount drawer content after first open
      setContentMounted(true);
      setSnap(COLLAPSED_SNAP);
      setFrozenExpanded(false);
      isClosingRef.current = false;
      dragStartedExpandedRef.current = false;
      maxExpandedDragRef.current = 0;
    }
  }, [open]);

  const handleRequestExpand = useCallback(() => {
    setSnap(EXPANDED_SNAP);
  }, []);

  const handleSnapChange = useCallback((snapPoint: number | string | null) => {
    if (isClosingRef.current || snapPoint == null) {
      return;
    }
    if (
      dragStartedExpandedRef.current &&
      snapPoint === COLLAPSED_SNAP &&
      snapRef.current === EXPANDED_SNAP
    ) {
      return;
    }
    setSnap(snapPoint);
  }, []);

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
    requestAnimationFrame(handleSnap);

    return () => {
      carouselApi.off("select", handleSnap);
      carouselApi.off("settle", handleSettle);
    };
  }, [carouselApi, matchId, matches, onMatchChange]);

  useEffect(() => {
    if (!carouselApi || frozenExpanded) {
      return;
    }
    // Slide widths change between carousel (90%) and full-screen (100%) modes.
    carouselApi.reInit();
    carouselApi.scrollTo(carouselApi.selectedScrollSnap(), true);
  }, [carouselApi, visualExpanded, frozenExpanded]);

  const handleDrag = useCallback(
    (_event: PointerEvent<HTMLDivElement>, percentageDragged: number) => {
      if (percentageDragged > 0 && snapRef.current === EXPANDED_SNAP) {
        dragStartedExpandedRef.current = true;
        maxExpandedDragRef.current = Math.max(
          maxExpandedDragRef.current,
          percentageDragged,
        );
      }
    },
    [],
  );

  const handleRelease = useCallback(
    (_event: PointerEvent<HTMLDivElement>, willStayOpen: boolean) => {
      if (dragStartedExpandedRef.current) {
        if (!willStayOpen) {
          isClosingRef.current = true;
          setFrozenExpanded(true);
        } else if (maxExpandedDragRef.current > 0.08) {
          setSnap(COLLAPSED_SNAP);
        }
      }
      dragStartedExpandedRef.current = false;
      maxExpandedDragRef.current = 0;
    },
    [],
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        isClosingRef.current = true;
        if (snapRef.current === EXPANDED_SNAP) {
          setFrozenExpanded(true);
        }
        onClose();
      }
    },
    [onClose],
  );

  const handleAnimationEnd = useCallback(() => {
    isClosingRef.current = false;
    dragStartedExpandedRef.current = false;
    maxExpandedDragRef.current = 0;
    setFrozenExpanded(false);
    setSnap(COLLAPSED_SNAP);
  }, []);

  if (matches.length === 0) {
    return null;
  }

  return (
    <Drawer
      open={open}
      onOpenChange={handleOpenChange}
      onDrag={handleDrag}
      onRelease={handleRelease}
      onAnimationEnd={handleAnimationEnd}
      modal
      shouldScaleBackground={false}
      snapPoints={[...SNAP_POINTS]}
      activeSnapPoint={snap}
      setActiveSnapPoint={handleSnapChange}
    >
      <DrawerContent
        fullscreen
        hideHandle
        overlayClassName="z-[60] bg-black/55"
        className="z-[60] border-0 bg-transparent p-0 shadow-none before:hidden"
      >
        <DrawerTitle className="sr-only">Match details</DrawerTitle>

        {contentMounted ? (
          <div
            className={cn(
              "flex h-full min-h-0 flex-col",
              visualExpanded ? "pt-0" : "pt-6",
            )}
          >
            <Carousel
              setApi={setCarouselApi}
              opts={{
                startIndex: activeIndex,
                align: "center",
                containScroll: false,
                loop: false,
                duration: 20,
              }}
              className="h-full min-h-0 w-full flex-1"
            >
              <CarouselContent
                viewportClassName="h-full"
                className="ml-0 h-full items-stretch"
              >
                {matches.map((match, index) => (
                  <CarouselItem
                    key={match.id}
                    className={cn(
                      "flex h-full",
                      visualExpanded ? "basis-full px-0" : "basis-[90%] px-1",
                    )}
                  >
                    <MatchDrawerSlide
                      match={match}
                      voters={voterMap[match.id] ?? { count: 0 }}
                      prediction={predictionMap[match.id]}
                      predictionMap={predictionMap}
                      players={playersByMatch[match.id] ?? []}
                      matchPredictions={predictionsByMatch[match.id] ?? []}
                      matchScorers={scorersByMatch[match.id] ?? []}
                      matchScorerPlayerIds={scorerPlayerIdsByMatch[match.id] ?? []}
                      matchEvents={eventsByMatch[match.id] ?? []}
                      currentUserId={currentUserId}
                      teamColors={teamColors}
                      playerPhotosByTeam={playerPhotosByTeam}
                      groupStandingsByName={groupStandingsByName}
                      liveScoreByTeam={liveScoreByTeam}
                      upsetMatchIds={upsetMatchIds}
                      isActive={index === snapIndex}
                      isMounted={mountedIndices.has(index)}
                      distanceFromActive={Math.abs(index - snapIndex)}
                      expanded={visualExpanded}
                      onRequestExpand={handleRequestExpand}
                      onPredictionSaved={onPredictionSaved}
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
