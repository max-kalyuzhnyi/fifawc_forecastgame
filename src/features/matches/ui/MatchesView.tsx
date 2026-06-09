"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Match } from "@/entities/match/model/types";
import type { MatchPlayerOption } from "@/features/matches/actions";
import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";
import type { PredictionDetail } from "@/features/matches/lib/predictionDetail";
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
import { TeamFlag } from "@/shared/ui/TeamFlag";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";

interface MatchesViewProps {
  matches: Match[];
  voterMap: Record<string, MatchVoterInfo>;
  predictionMap: Record<string, PredictionDetail>;
  playersByMatch: Record<string, MatchPlayerOption[]>;
}

const TABS: { key: MatchDayBucket; label: string }[] = [
  { key: "yesterday", label: "Yesterday" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
];

const FLAG_SIZE = 34;

function getDefaultTab(matches: Match[]): MatchDayBucket {
  if (matches.some((match) => getMatchDayBucket(match.kickoff_at) === "today")) {
    return "today";
  }
  if (
    matches.some((match) => getMatchDayBucket(match.kickoff_at) === "upcoming")
  ) {
    return "upcoming";
  }
  return "yesterday";
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
}: MatchesViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedMatchId = searchParams.get("match");

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

  const openMatch = (matchId: string) => {
    router.push(`/matches?match=${matchId}`, { scroll: false });
  };

  const handleTabChange = (tab: MatchDayBucket) => {
    setActiveTab(tab);

    if (!selectedMatchId) {
      return;
    }

    const match = matches.find((item) => item.id === selectedMatchId);
    if (!match || getMatchDayBucket(match.kickoff_at) !== tab) {
      router.replace("/matches", { scroll: false });
    }
  };

  return (
    <div className="-mx-4 flex min-h-0 flex-1 flex-col">
      <div
        className="flex px-1"
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
                "relative flex-1 px-1 pb-2 pt-0.5 text-[13px] transition-colors",
                isActive
                  ? "font-semibold text-foreground"
                  : "font-medium text-muted-foreground hover:text-foreground/80",
              )}
            >
              {tab.label}
              {isActive && (
                <span
                  className="absolute inset-x-4 bottom-0 h-px rounded-full bg-foreground"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="sports-panel corner-squircle mt-0.5 min-h-0 flex-1 overflow-hidden rounded-t-[22px]">
        {groupedByDate.length === 0 ? (
          <Empty className="border-0 py-8">
            <EmptyHeader>
              <EmptyTitle>No matches</EmptyTitle>
              <EmptyDescription>
                Nothing scheduled for {activeTab}.
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
                    "flex w-full items-center justify-center gap-0.5 px-3 py-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-white/[0.03]",
                    groupIndex > 0 && "border-t border-white/[0.08]",
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
                  dayMatches.map((match, index) => {
                    const prediction = predictionMap[match.id];
                    const voters = voterMap[match.id] ?? {
                      count: 0,
                      voters: [],
                    };
                    const locked = new Date(match.kickoff_at) <= new Date();
                    const finished =
                      match.status === "finished" &&
                      match.home_score !== null &&
                      match.away_score !== null;
                    const isSelected = selectedMatchId === match.id;

                    return (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => openMatch(match.id)}
                        aria-pressed={isSelected}
                        className={cn(
                          "block w-full px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]",
                          "border-t border-white/[0.08]",
                          index === 0 && "border-t-0",
                          isSelected && "bg-white/[0.05]",
                        )}
                      >
                        <p className="mb-1.5 text-center text-[11px] leading-tight text-muted-foreground">
                          {formatMatchSubtitle(match)}
                        </p>

                        <div className="grid grid-cols-[1fr_auto_1fr] grid-rows-[auto_auto] items-center gap-x-2 gap-y-1">
                          <div className="col-start-1 row-start-1 flex justify-center">
                            <TeamFlag
                              name={match.home_team_name}
                              size={FLAG_SIZE}
                            />
                          </div>

                          <div className="col-start-2 row-span-2 flex items-center justify-center self-center">
                            {finished ? (
                              <p className="min-w-[3.25rem] text-center text-[20px] font-bold leading-none tabular-nums">
                                {match.home_score}–{match.away_score}
                              </p>
                            ) : (
                              <p className="min-w-[3.25rem] text-center text-[20px] font-bold leading-none tabular-nums">
                                {formatMatchTime(match.kickoff_at)}
                              </p>
                            )}
                          </div>

                          <div className="col-start-3 row-start-1 flex justify-center">
                            <TeamFlag
                              name={match.away_team_name}
                              size={FLAG_SIZE}
                            />
                          </div>

                          <p className="col-start-1 row-start-2 line-clamp-2 text-center text-[12px] font-medium leading-tight">
                            {match.home_team_name}
                          </p>

                          <p className="col-start-3 row-start-2 line-clamp-2 text-center text-[12px] font-medium leading-tight">
                            {match.away_team_name}
                          </p>
                        </div>

                        <div className="mt-1.5 flex flex-col items-center gap-0.5">
                          {prediction ? (
                            <Badge
                              variant="secondary"
                              className="h-4 rounded-md border-0 bg-white/10 px-1.5 text-[10px] font-medium text-foreground"
                            >
                              Your pick: {prediction.home_score}–
                              {prediction.away_score}
                              {prediction.boost_multiplier > 1 &&
                                ` x${prediction.boost_multiplier}`}
                            </Badge>
                          ) : locked ? (
                            <Badge
                              variant="outline"
                              className="h-4 rounded-md border-white/15 bg-transparent px-1.5 text-[10px] font-medium text-muted-foreground"
                            >
                              Missed
                            </Badge>
                          ) : (
                            <Badge
                              variant="destructive"
                              className="h-4 rounded-md border-0 bg-red-500/15 px-1.5 text-[10px] font-medium text-red-300"
                            >
                              No pick yet
                            </Badge>
                          )}
                          <MatchVoters voters={voters} compact />
                        </div>
                      </button>
                    );
                  })}
              </section>
            );
          })
        )}
      </div>

      <MatchDrawer
        matches={filteredMatches}
        matchId={drawerMatchId}
        voterMap={voterMap}
        predictionMap={predictionMap}
        playersByMatch={playersByMatch}
      />
    </div>
  );
}
