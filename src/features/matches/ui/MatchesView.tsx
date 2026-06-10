"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Match } from "@/entities/match/model/types";
import type { MatchPlayerOption } from "@/features/matches/actions";
import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import type { PredictionDetail } from "@/features/matches/lib/predictionDetail";
import { createClient } from "@/shared/lib/supabase/client";
import { MatchDrawer } from "@/features/matches/ui/MatchDrawer";
import { MatchVoters } from "@/features/matches/ui/MatchVoters";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  formatMatchDateHeader,
  formatMatchTime,
  getDateGroupKey,
  getMatchDayBucket,
  type MatchDayBucket,
} from "@/shared/lib/formatDate";
import { formatMatchScore } from "@/shared/lib/formatMatchScore";
import { calculatePredictionPoints } from "@/entities/prediction/lib/calculatePredictionPoints";
import type { BoostMultiplier } from "@/entities/prediction/model/types";
import { TeamFlag } from "@/shared/ui/TeamFlag";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";

interface MatchesViewProps {
  matches: Match[];
  voterMap: Record<string, MatchVoterInfo>;
  predictionMap: Record<string, PredictionDetail>;
  playersByMatch: Record<string, MatchPlayerOption[]>;
  predictionsByMatch: Record<string, MatchPredictionEntry[]>;
  scorersByMatch: Record<string, string[]>;
  currentUserId: string | null;
  teamColors: Record<string, string>;
}

const TABS: { key: MatchDayBucket; label: string }[] = [
  { key: "past", label: "Past" },
  { key: "upcoming3days", label: "Next 3 days" },
  { key: "future", label: "Future" },
];

const EMPTY_TAB_DESCRIPTION: Record<MatchDayBucket, string> = {
  past: "Nothing in past games.",
  upcoming3days: "Nothing in the next 3 days.",
  future: "Nothing scheduled further out.",
};

const FLAG_SIZE = 28;
const MATCH_CARD_MIN_H = "min-h-[7rem]";

function getDefaultTab(matches: Match[]): MatchDayBucket {
  if (
    matches.some(
      (match) => getMatchDayBucket(match.kickoff_at) === "upcoming3days",
    )
  ) {
    return "upcoming3days";
  }
  if (matches.some((match) => getMatchDayBucket(match.kickoff_at) === "future")) {
    return "future";
  }
  return "past";
}

function toggleCollapsed(
  collapsed: Set<string>,
  dateKey: string,
): Set<string> {
  const next = new Set(collapsed);
  if (next.has(dateKey)) {
    next.delete(dateKey);
  } else {
    next.add(dateKey);
  }
  return next;
}

function MatchTimeBadge({ kickoffAt }: { kickoffAt: string }) {
  return (
    <Badge
      variant="secondary"
      className="h-4 shrink-0 rounded-md border-0 bg-white/10 px-1.5 text-[10px] font-medium text-foreground tabular-nums"
    >
      {formatMatchTime(kickoffAt)}
    </Badge>
  );
}

function MatchCenterFocus({
  prediction,
  locked,
  live,
  finished,
  homeScore,
  awayScore,
  points,
}: {
  prediction: PredictionDetail | undefined;
  locked: boolean;
  live: boolean;
  finished: boolean;
  homeScore: number;
  awayScore: number;
  points: number | null;
}) {
  if (finished) {
    return (
      <div className="col-start-2 row-span-2 flex flex-col items-center justify-center gap-1.5 self-center">
        <p className="min-w-[2.75rem] text-center text-[17px] font-bold leading-none tabular-nums">
          {formatMatchScore(homeScore, awayScore)}
        </p>
        {prediction ? (
          <span
            className={cn(
              "text-center text-[11px] font-semibold leading-none tabular-nums",
              points && points > 0 ? "text-emerald-300" : "text-muted-foreground",
            )}
          >
            {points && points > 0 ? `+${points} pts` : `${points ?? 0} pts`}
          </span>
        ) : (
          <span className="text-center text-[11px] font-medium leading-none text-muted-foreground">
            {locked ? "Missed" : "No pick"}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="col-start-2 row-span-2 flex flex-col items-center justify-center gap-1.5 self-center">
      {prediction ? (
        <>
          <p className="min-w-[2.75rem] text-center text-[17px] font-bold leading-none tabular-nums">
            {formatMatchScore(prediction.home_score, prediction.away_score)}
            {prediction.boost_multiplier > 1 && (
              <span className="ml-0.5 text-[11px] font-semibold text-muted-foreground">
                x{prediction.boost_multiplier}
              </span>
            )}
          </p>
          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
            My pick
          </span>
        </>
      ) : locked ? (
        <p className="text-center text-[13px] font-medium text-muted-foreground">
          Missed
        </p>
      ) : (
        <p className="text-center text-[13px] font-medium text-red-300">No pick</p>
      )}

      {live && (
        <div className="flex items-center gap-1">
          <p className="text-center text-[11px] font-medium leading-none tabular-nums text-muted-foreground">
            {formatMatchScore(homeScore, awayScore)}
          </p>
          <span className="text-[9px] font-semibold uppercase tracking-wide text-red-300">
            Live
          </span>
        </div>
      )}
    </div>
  );
}

function formatMatchSubtitle(match: Match): string {
  if (match.round_key.startsWith("group_")) {
    return match.match_number != null
      ? `Group Stage · Match ${match.match_number}`
      : "Group Stage";
  }

  if (match.match_number != null) {
    return `${match.round_display} · Match ${match.match_number}`;
  }

  return match.round_display;
}

export function MatchesView({
  matches,
  voterMap,
  predictionMap,
  playersByMatch,
  predictionsByMatch,
  scorersByMatch,
  currentUserId,
  teamColors,
}: MatchesViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(
    () => searchParams.get("match"),
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("matches-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "predictions" },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_scorers" },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  const [activeTab, setActiveTab] = useState<MatchDayBucket>(() =>
    getDefaultTab(matches),
  );
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!selectedMatchId) {
      return;
    }

    const match = matches.find((item) => item.id === selectedMatchId);
    if (!match) {
      return;
    }

    const bucket = getMatchDayBucket(match.kickoff_at);
    setActiveTab(bucket);
  }, [matches, selectedMatchId]);

  const filteredMatches = useMemo(
    () =>
      matches.filter(
        (match) => getMatchDayBucket(match.kickoff_at) === activeTab,
      ),
    [matches, activeTab],
  );

  const drawerMatchId = useMemo(() => {
    if (!selectedMatchId) {
      return null;
    }

    return filteredMatches.some((match) => match.id === selectedMatchId)
      ? selectedMatchId
      : null;
  }, [filteredMatches, selectedMatchId]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, Match[]>();

    for (const match of filteredMatches) {
      const key = getDateGroupKey(match.kickoff_at);
      const list = groups.get(key) ?? [];
      list.push(match);
      groups.set(key, list);
    }

    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredMatches]);

  const openMatch = useCallback((matchId: string) => {
    setSelectedMatchId(matchId);
  }, []);

  const closeMatch = useCallback(() => {
    setSelectedMatchId(null);
  }, []);

  const handleMatchChange = useCallback((matchId: string) => {
    setSelectedMatchId(matchId);
  }, []);

  const handleTabChange = (tab: MatchDayBucket) => {
    setActiveTab(tab);

    if (!selectedMatchId) {
      return;
    }

    const match = matches.find((item) => item.id === selectedMatchId);
    if (!match || getMatchDayBucket(match.kickoff_at) !== tab) {
      setSelectedMatchId(null);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="sports-panel sports-panel-max-h flex flex-col overflow-hidden">
        <div
          className="flex shrink-0 border-b border-white/[0.08] px-3 pt-3 pb-2.5"
          role="tablist"
          aria-label="Match schedule"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  "flex-1 px-0.5 py-1 text-center text-[15px] leading-none whitespace-nowrap transition-colors",
                  isActive
                    ? "font-semibold text-foreground"
                    : "font-normal text-white/40 hover:text-white/55",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="overflow-y-auto overscroll-contain">
        {groupedByDate.length === 0 ? (
          <Empty className="border-0 py-8">
            <EmptyHeader>
              <EmptyTitle>No matches</EmptyTitle>
              <EmptyDescription>
                {EMPTY_TAB_DESCRIPTION[activeTab]}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          groupedByDate.map(([dateKey, dayMatches], groupIndex) => {
            const isCollapsed = collapsed.has(dateKey);

            return (
              <section key={dateKey}>
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((prev) => toggleCollapsed(prev, dateKey))
                  }
                  className={cn(
                    "flex w-full items-center justify-center gap-0.5 border-t border-white/[0.08] px-3 py-2.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-white/[0.03]",
                    groupIndex === 0 && "border-t-0",
                  )}
                  aria-expanded={!isCollapsed}
                >
                  <span>{formatMatchDateHeader(dayMatches[0].kickoff_at)}</span>
                  {groupIndex > 0 && (
                    <HugeiconsIcon
                      icon={isCollapsed ? ArrowDown01Icon : ArrowUp01Icon}
                      className="size-3 text-muted-foreground"
                    />
                  )}
                </button>

                {!isCollapsed &&
                  dayMatches.map((match) => {
                    const prediction = predictionMap[match.id];
                    const voters = voterMap[match.id] ?? {
                      count: 0,
                      voters: [],
                    };
                    const locked = new Date(match.kickoff_at) <= new Date();
                    const live =
                      match.status === "live" &&
                      match.home_score !== null &&
                      match.away_score !== null;
                    const finished =
                      match.status === "finished" &&
                      match.home_score !== null &&
                      match.away_score !== null;
                    const isSelected = selectedMatchId === match.id;
                    const points =
                      finished && prediction
                        ? calculatePredictionPoints({
                            predictedHome: prediction.home_score,
                            predictedAway: prediction.away_score,
                            actualHome: match.home_score!,
                            actualAway: match.away_score!,
                            predictedScorer: prediction.scorer_name,
                            actualScorers: scorersByMatch[match.id] ?? [],
                            boostMultiplier:
                              prediction.boost_multiplier as BoostMultiplier,
                          }).totalPoints
                        : null;

                    return (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => openMatch(match.id)}
                        aria-pressed={isSelected}
                        className={cn(
                          "flex w-full flex-col justify-center px-3 py-2 text-left transition-colors hover:bg-white/[0.03]",
                          MATCH_CARD_MIN_H,
                          "border-t border-white/[0.08]",
                          isSelected && "bg-white/[0.05]",
                        )}
                      >
                        <div className="mb-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-x-2">
                          <div className="flex min-w-0 items-center justify-start">
                            <MatchVoters voters={voters} compact />
                          </div>

                          <p className="truncate text-center text-[11px] leading-tight text-muted-foreground">
                            {formatMatchSubtitle(match)}
                          </p>

                          <div className="flex min-w-0 items-center justify-end">
                            <MatchTimeBadge kickoffAt={match.kickoff_at} />
                          </div>
                        </div>

                        <div className="grid grid-cols-[1fr_auto_1fr] grid-rows-[auto_auto] items-center gap-x-2 gap-y-0.5">
                          <div className="col-start-1 row-start-1 flex justify-center">
                            <TeamFlag
                              name={match.home_team_name}
                              size={FLAG_SIZE}
                            />
                          </div>

                          <MatchCenterFocus
                            prediction={prediction}
                            locked={locked}
                            live={live}
                            finished={finished}
                            homeScore={match.home_score ?? 0}
                            awayScore={match.away_score ?? 0}
                            points={points}
                          />

                          <div className="col-start-3 row-start-1 flex justify-center">
                            <TeamFlag
                              name={match.away_team_name}
                              size={FLAG_SIZE}
                            />
                          </div>

                          <p className="col-start-1 row-start-2 line-clamp-2 text-center text-[11px] font-medium leading-tight">
                            {match.home_team_name}
                          </p>

                          <p className="col-start-3 row-start-2 line-clamp-2 text-center text-[11px] font-medium leading-tight">
                            {match.away_team_name}
                          </p>
                        </div>
                      </button>
                    );
                  })}
              </section>
            );
          })
        )}
        </div>
      </div>

      <MatchDrawer
        matches={filteredMatches}
        matchId={drawerMatchId}
        voterMap={voterMap}
        predictionMap={predictionMap}
        playersByMatch={playersByMatch}
        predictionsByMatch={predictionsByMatch}
        scorersByMatch={scorersByMatch}
        currentUserId={currentUserId}
        teamColors={teamColors}
        onMatchChange={handleMatchChange}
        onClose={closeMatch}
      />
    </div>
  );
}
