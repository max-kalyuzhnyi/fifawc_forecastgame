"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  buildGroupStandings,
  buildLiveScoreByTeam,
} from "@/entities/match/lib/standings";
import { formatLiveMinute } from "@/entities/match/lib/formatLiveData";
import type { Match, MatchEvent } from "@/entities/match/model/types";
import type { MatchPlayerOption } from "@/features/matches/actions";
import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";
import type { PlayerPhotosByTeam } from "@/features/matches/lib/playerPhotos";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import type { PredictionDetail } from "@/features/matches/lib/predictionDetail";
import { GroupStandingsList } from "@/features/matches/ui/GroupStandingsList";
import { LiveMinuteIndicator } from "@/features/matches/ui/LiveMinuteIndicator";
import { MatchDrawer } from "@/features/matches/ui/MatchDrawer";
import { MatchHighlightsThumb } from "@/features/matches/ui/MatchHighlights";
import { MatchVoters } from "@/features/matches/ui/MatchVoters";
import { isMatchUpsetWatch } from "@/shared/lib/onside/upsets";
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
  getRelativeDayOffset,
  type MatchDayBucket,
} from "@/shared/lib/formatDate";
import { formatMatchScore } from "@/shared/lib/formatMatchScore";
import { calculatePredictionPoints } from "@/entities/prediction/lib/calculatePredictionPoints";
import type { BoostMultiplier } from "@/entities/prediction/model/types";
import { TeamFlag } from "@/shared/ui/TeamFlag";
import { cn } from "@/lib/utils";
import { setLiveRefreshPaused } from "@/shared/lib/liveRefreshPause";
import { useLiveMatchUpdates } from "@/shared/lib/supabase/useLiveMatchUpdates";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import type { Locale } from "@/shared/types/database";

interface MatchesViewProps {
  serverMatches: Match[];
  voterMap: Record<string, MatchVoterInfo>;
  predictionMap: Record<string, PredictionDetail>;
  playersByMatch: Record<string, MatchPlayerOption[]>;
  predictionsByMatch: Record<string, MatchPredictionEntry[]>;
  scorersByMatch: Record<string, string[]>;
  eventsByMatch: Record<string, MatchEvent[]>;
  currentUserId: string | null;
  teamColors: Record<string, string>;
  playerPhotosByTeam: PlayerPhotosByTeam;
  upsetMatchIds?: string[];
}

const TAB_KEYS: MatchDayBucket[] = ["past", "upcoming3days", "future"];

const FLAG_SIZE = 28;
const FEATURED_FLAG_SIZE = 40;
const MATCH_CARD_MIN_H = "min-h-[7rem]";
const FEATURED_MATCH_CARD_MIN_H = "min-h-[8rem]";
const matchCardGridClassName =
  "grid w-full grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] items-start gap-x-2";

function isLiveMatch(match: Match): boolean {
  return (
    match.status === "live" &&
    match.home_score !== null &&
    match.away_score !== null
  );
}

function getDefaultTab(matches: Match[]): MatchDayBucket {
  if (
    matches.some(
      (match) => getMatchDayBucket(match) === "upcoming3days",
    )
  ) {
    return "upcoming3days";
  }
  if (matches.some((match) => getMatchDayBucket(match) === "future")) {
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

function MatchTimeBadge({
  kickoffAt,
  locale,
  live,
  finished,
  liveMinute,
  t,
}: {
  kickoffAt: string;
  locale: Locale;
  live: boolean;
  finished: boolean;
  liveMinute: string | null;
  t: ReturnType<typeof useTranslations<"matches">>;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "h-4 shrink-0 rounded-md border-0 bg-white/10 px-1.5 text-[10px] font-medium text-foreground",
        !live && !finished && "tabular-nums",
      )}
    >
      {live ? (
        <LiveMinuteIndicator
          liveMinute={liveMinute}
          liveLabel={t("live")}
          className="text-red-300"
        />
      ) : finished ? (
        t("finished")
      ) : (
        formatMatchTime(kickoffAt, locale)
      )}
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
  featured = false,
  t,
}: {
  prediction: PredictionDetail | undefined;
  locked: boolean;
  live: boolean;
  finished: boolean;
  homeScore: number;
  awayScore: number;
  points: number | null;
  featured?: boolean;
  t: ReturnType<typeof useTranslations<"matches">>;
}) {
  const scoreClassName = featured
    ? "w-full text-center text-[20px] font-bold leading-none tabular-nums"
    : "w-full text-center text-[17px] font-bold leading-none tabular-nums";

  if (finished) {
    return (
      <div className="flex w-full min-w-0 flex-col items-center justify-center gap-1.5 self-center">
        <p className={scoreClassName}>
          {formatMatchScore(homeScore, awayScore)}
        </p>
        {prediction ? (
          <span
            className={cn(
              "text-center text-[11px] font-semibold leading-none tabular-nums",
              points && points > 0 ? "text-emerald-300" : "text-muted-foreground",
            )}
          >
            {points && points > 0
              ? t("ptsPositive", { count: points })
              : t("pts", { count: points ?? 0 })}
          </span>
        ) : !locked ? (
          <span className="text-center text-[11px] font-medium leading-none text-muted-foreground">
            {t("noPick")}
          </span>
        ) : null}
      </div>
    );
  }

  if (live) {
    const pickOnTrack =
      prediction &&
      calculatePredictionPoints({
        predictedHome: prediction.home_score,
        predictedAway: prediction.away_score,
        actualHome: homeScore,
        actualAway: awayScore,
        predictedScorer: prediction.scorer_name,
        actualScorers: [],
        boostMultiplier: prediction.boost_multiplier as BoostMultiplier,
      }).basePoints > 0;

    return (
      <div className="flex w-full min-w-0 flex-col items-center justify-center gap-1.5 self-center">
        <p className={scoreClassName}>
          {formatMatchScore(homeScore, awayScore)}
        </p>
        {prediction ? (
          <span
            className={cn(
              "w-full truncate text-center text-[11px] font-semibold leading-none tabular-nums",
              pickOnTrack ? "text-emerald-300" : "text-red-300",
            )}
          >
            {t("myPick")}{" "}
            {formatMatchScore(prediction.home_score, prediction.away_score)}
            {prediction.boost_multiplier > 1 && (
              <span className="ml-0.5 font-medium opacity-80">
                x{prediction.boost_multiplier}
              </span>
            )}
          </span>
        ) : !locked ? (
          <span className="text-center text-[11px] font-medium leading-none text-red-300">
            {t("noPick")}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-center justify-center gap-1.5 self-center">
      {prediction ? (
        <>
          <p className={cn(scoreClassName, "text-foreground/50")}>
            {formatMatchScore(prediction.home_score, prediction.away_score)}
            {prediction.boost_multiplier > 1 && (
              <span className="ml-0.5 text-[11px] font-semibold text-foreground/35">
                x{prediction.boost_multiplier}
              </span>
            )}
          </p>
          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
            {t("myPick")}
          </span>
        </>
      ) : !locked ? (
        <p className="text-center text-[13px] font-medium text-red-300">
          {t("noPick")}
        </p>
      ) : null}
    </div>
  );
}

function formatMatchSubtitle(
  match: Match,
  t: ReturnType<typeof useTranslations<"matches">>,
): string {
  if (match.round_key.startsWith("group_")) {
    return match.match_number != null
      ? t("groupStageMatch", { number: match.match_number })
      : t("groupStage");
  }

  if (match.match_number != null) {
    return t("roundMatch", { round: match.round_display, number: match.match_number });
  }

  return match.round_display;
}

function MatchCard({
  match,
  prediction,
  voters,
  scorers,
  isSelected,
  featured = false,
  isUpsetWatch = false,
  locale,
  t,
  onOpen,
}: {
  match: Match;
  prediction: PredictionDetail | undefined;
  voters: MatchVoterInfo;
  scorers: string[];
  isSelected: boolean;
  featured?: boolean;
  isUpsetWatch?: boolean;
  locale: Locale;
  t: ReturnType<typeof useTranslations<"matches">>;
  onOpen: (matchId: string) => void;
}) {
  const locked = new Date(match.kickoff_at) <= new Date();
  const live = isLiveMatch(match);
  const finished =
    match.status === "finished" &&
    match.home_score !== null &&
    match.away_score !== null;
  const points =
    finished && prediction
      ? calculatePredictionPoints({
          predictedHome: prediction.home_score,
          predictedAway: prediction.away_score,
          actualHome: match.home_score!,
          actualAway: match.away_score!,
          predictedScorer: prediction.scorer_name,
          actualScorers: scorers,
          boostMultiplier: prediction.boost_multiplier as BoostMultiplier,
        }).totalPoints
      : null;

  const flagSize = featured ? FEATURED_FLAG_SIZE : FLAG_SIZE;
  const teamNameClassName = featured
    ? "line-clamp-2 w-full text-center text-[13px] font-medium leading-tight"
    : "line-clamp-2 w-full text-center text-[11px] font-medium leading-tight";

  return (
    <button
      type="button"
      onClick={() => onOpen(match.id)}
      aria-pressed={isSelected}
      className={cn(
        "flex w-full flex-col justify-center px-3 py-2 text-left transition-colors hover:bg-white/[0.03]",
        featured ? FEATURED_MATCH_CARD_MIN_H : MATCH_CARD_MIN_H,
        "border-t border-white/[0.08]",
        isSelected && "bg-white/[0.05]",
      )}
    >
      <div className="mb-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-x-2">
        <div className="flex min-w-0 items-center justify-start">
          {!finished && <MatchVoters voters={voters} compact />}
        </div>

        <div className="flex min-w-0 flex-col items-center gap-1">
          <p className="truncate text-center text-[11px] leading-tight text-muted-foreground">
            {formatMatchSubtitle(match, t)}
          </p>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-1">
          {isUpsetWatch && !finished ? (
            <span
              aria-label={t("upsetWatch")}
              className="text-sm leading-none"
              role="img"
            >
              🔥
            </span>
          ) : null}
          {!finished && (
            <MatchTimeBadge
              kickoffAt={match.kickoff_at}
              locale={locale}
              live={live}
              finished={finished}
              liveMinute={formatLiveMinute(
                match.minute ?? null,
                match.injury_time ?? null,
              )}
              t={t}
            />
          )}
        </div>
      </div>

      <div className={matchCardGridClassName}>
        <div className="flex min-w-0 flex-col items-center gap-1.5">
          <TeamFlag name={match.home_team_name} size={flagSize} />
          <p className={teamNameClassName}>{match.home_team_name}</p>
        </div>

        <div className="flex min-w-0 flex-col items-center gap-2.5 self-center">
          <MatchCenterFocus
            prediction={prediction}
            locked={locked}
            live={live}
            finished={finished}
            homeScore={match.home_score ?? 0}
            awayScore={match.away_score ?? 0}
            points={points}
            featured={featured}
            t={t}
          />
          {finished && match.highlights_youtube_id && (
            <MatchHighlightsThumb videoId={match.highlights_youtube_id} />
          )}
        </div>

        <div className="flex min-w-0 flex-col items-center gap-1.5">
          <TeamFlag name={match.away_team_name} size={flagSize} />
          <p className={teamNameClassName}>{match.away_team_name}</p>
        </div>
      </div>
    </button>
  );
}

export function MatchesView({
  serverMatches,
  voterMap,
  predictionMap,
  playersByMatch,
  predictionsByMatch,
  scorersByMatch,
  eventsByMatch,
  currentUserId,
  teamColors,
  playerPhotosByTeam,
  upsetMatchIds = [],
}: MatchesViewProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("matches");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [matches, setMatches] = useState(serverMatches);
  const [predictionOverrides, setPredictionOverrides] = useState<
    Record<string, PredictionDetail>
  >({});
  const mergedPredictionMap = useMemo(
    () => ({ ...predictionMap, ...predictionOverrides }),
    [predictionMap, predictionOverrides],
  );
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(
    () => searchParams.get("match"),
  );
  const prevDrawerMatchIdRef = useRef<string | null>(null);

  useEffect(() => {
    setMatches(serverMatches);
  }, [serverMatches]);

  const handleLiveMatchUpdate = useCallback((row: Match) => {
    setMatches((prev) =>
      prev.map((match) =>
        match.id === row.id
          ? {
              ...match,
              status: row.status,
              home_score: row.home_score,
              away_score: row.away_score,
              minute: row.minute,
              injury_time: row.injury_time,
              fd_status: row.fd_status,
            }
          : match,
      ),
    );
  }, []);

  useLiveMatchUpdates(handleLiveMatchUpdate);

  const groupStandings = useMemo(() => buildGroupStandings(matches), [matches]);
  const groupStandingsByName = useMemo(
    () => Object.fromEntries(groupStandings.map((group) => [group.groupName, group])),
    [groupStandings],
  );
  const liveScoreByTeam = useMemo(
    () => buildLiveScoreByTeam(matches),
    [matches],
  );

  const emptyTabDescription: Record<MatchDayBucket, string> = {
    past: t("emptyPast"),
    upcoming3days: t("emptyUpcoming3days"),
    future: t("emptyFuture"),
  };

  const [activeTab, setActiveTab] = useState<MatchDayBucket>(() =>
    getDefaultTab(matches),
  );
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!selectedMatchId) {
      return;
    }

    const match = matches.find((item) => item.id === selectedMatchId);
    if (!match || isLiveMatch(match)) {
      return;
    }

    const bucket = getMatchDayBucket(match);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- align tab with deep-linked match
    setActiveTab(bucket);
  }, [matches, selectedMatchId]);

  const liveMatches = useMemo(
    () =>
      matches
        .filter(isLiveMatch)
        .sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at)),
    [matches],
  );

  const liveMatchIds = useMemo(
    () => new Set(liveMatches.map((match) => match.id)),
    [liveMatches],
  );

  const filteredMatches = useMemo(
    () =>
      matches.filter(
        (match) =>
          getMatchDayBucket(match) === activeTab &&
          !liveMatchIds.has(match.id),
      ),
    [matches, activeTab, liveMatchIds],
  );

  const drawerMatches = useMemo(
    () => [...liveMatches, ...filteredMatches],
    [liveMatches, filteredMatches],
  );

  const drawerMatchId = useMemo(() => {
    if (!selectedMatchId) {
      return null;
    }

    return drawerMatches.some((match) => match.id === selectedMatchId)
      ? selectedMatchId
      : null;
  }, [drawerMatches, selectedMatchId]);

  useEffect(() => {
    setLiveRefreshPaused(Boolean(drawerMatchId));
    return () => setLiveRefreshPaused(false);
  }, [drawerMatchId]);

  useEffect(() => {
    if (prevDrawerMatchIdRef.current && !drawerMatchId) {
      router.refresh();
    }
    prevDrawerMatchIdRef.current = drawerMatchId;
  }, [drawerMatchId, router]);

  useEffect(() => {
    setPredictionOverrides((prev) => {
      if (Object.keys(prev).length === 0) {
        return prev;
      }

      const next = { ...prev };
      let changed = false;

      for (const matchId of Object.keys(next)) {
        if (predictionMap[matchId]) {
          delete next[matchId];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [predictionMap]);

  const handlePredictionSaved = useCallback(
    (matchId: string, prediction: PredictionDetail) => {
      setPredictionOverrides((prev) => ({ ...prev, [matchId]: prediction }));
    },
    [],
  );

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
    if (
      !match ||
      (isLiveMatch(match)
        ? false
        : getMatchDayBucket(match) !== tab)
    ) {
      setSelectedMatchId(null);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="sports-panel corner-squircle sports-panel-max-h flex flex-col overflow-hidden">
        <div
          className="flex shrink-0 border-b border-white/[0.08] px-3 pt-3 pb-2.5"
          role="tablist"
          aria-label={t("scheduleTabs")}
        >
          {TAB_KEYS.map((tabKey) => {
            const isActive = activeTab === tabKey;
            const tabLabel =
              tabKey === "past"
                ? t("tabPast")
                : tabKey === "upcoming3days"
                  ? t("tabUpcoming3days")
                  : t("tabFuture");

            return (
              <button
                key={tabKey}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tabKey)}
                className={cn(
                  "flex-1 px-0.5 py-1 text-center text-[15px] leading-none whitespace-nowrap transition-[color,transform] duration-200 active:scale-[0.97] motion-reduce:transition-none",
                  isActive
                    ? "font-semibold text-foreground"
                    : "font-normal text-white/40 hover:text-white/55",
                )}
              >
                {tabLabel}
              </button>
            );
          })}
        </div>

        <div className="overflow-y-auto overscroll-contain">
        <div
          key={activeTab}
          className="tab-panel-enter motion-reduce:animate-none"
        >
        {liveMatches.length === 0 && groupedByDate.length === 0 ? (
          <Empty className="border-0 py-8">
            <EmptyHeader>
              <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
              <EmptyDescription>
                {emptyTabDescription[activeTab]}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            {liveMatches.length > 0 && (
              <section>
                <div className="flex w-full items-center justify-center gap-1.5 border-b border-white/[0.08] px-3 py-2.5 text-[13px] font-semibold text-foreground">
                  <span
                    className="size-1.5 shrink-0 rounded-full bg-red-400 animate-pulse"
                    aria-hidden
                  />
                  <span>{t("liveNow")}</span>
                </div>

                {liveMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    prediction={mergedPredictionMap[match.id]}
                    voters={
                      voterMap[match.id] ?? {
                        count: 0,
                        voters: [],
                      }
                    }
                    scorers={scorersByMatch[match.id] ?? []}
                    isSelected={selectedMatchId === match.id}
                    featured
                    isUpsetWatch={isMatchUpsetWatch(match, upsetMatchIds)}
                    locale={locale}
                    t={t}
                    onOpen={openMatch}
                  />
                ))}
              </section>
            )}

            {groupedByDate.map(([dateKey, dayMatches], groupIndex) => {
            const isCollapsed = collapsed.has(dateKey);

            return (
              <section key={dateKey}>
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((prev) => toggleCollapsed(prev, dateKey))
                  }
                  className={cn(
                    "flex w-full items-center justify-center gap-0.5 border-t border-white/[0.08] bg-white/[0.05] px-3 py-2.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-white/[0.08]",
                    groupIndex === 0 && liveMatches.length === 0 && "border-t-0",
                  )}
                  aria-expanded={!isCollapsed}
                >
                  <span>
                    {(() => {
                      const kickoffAt = dayMatches[0].kickoff_at;
                      const offset = getRelativeDayOffset(kickoffAt);
                      if (offset === 0) return t("today");
                      if (offset === 1) return t("tomorrow");
                      return formatMatchDateHeader(kickoffAt, locale);
                    })()}
                  </span>
                  {groupIndex > 0 && (
                    <HugeiconsIcon
                      icon={isCollapsed ? ArrowDown01Icon : ArrowUp01Icon}
                      className="size-3 text-muted-foreground"
                    />
                  )}
                </button>

                {!isCollapsed &&
                  dayMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      prediction={mergedPredictionMap[match.id]}
                      voters={
                        voterMap[match.id] ?? {
                          count: 0,
                          voters: [],
                        }
                      }
                      scorers={scorersByMatch[match.id] ?? []}
                      isSelected={selectedMatchId === match.id}
                      isUpsetWatch={isMatchUpsetWatch(match, upsetMatchIds)}
                      locale={locale}
                      t={t}
                      onOpen={openMatch}
                    />
                  ))}
              </section>
            );
          })}
          </>
        )}
        </div>
        </div>
      </div>

      <GroupStandingsList
        groups={groupStandings}
        liveScoreByTeam={liveScoreByTeam}
      />

      <MatchDrawer
        matches={drawerMatches}
        matchId={drawerMatchId}
        voterMap={voterMap}
        predictionMap={mergedPredictionMap}
        playersByMatch={playersByMatch}
        predictionsByMatch={predictionsByMatch}
        scorersByMatch={scorersByMatch}
        eventsByMatch={eventsByMatch}
        currentUserId={currentUserId}
        teamColors={teamColors}
        groupStandingsByName={groupStandingsByName}
        liveScoreByTeam={liveScoreByTeam}
        playerPhotosByTeam={playerPhotosByTeam}
        upsetMatchIds={upsetMatchIds}
        onMatchChange={handleMatchChange}
        onClose={closeMatch}
        onPredictionSaved={handlePredictionSaved}
      />
    </div>
  );
}
