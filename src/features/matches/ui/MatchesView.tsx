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
import { isGroupRoundKey } from "@/entities/match/model/types";
import type { MatchPlayerOption } from "@/features/matches/actions";
import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";
import type { PlayerPhotosByTeam } from "@/features/matches/lib/playerPhotos";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import { buildPreviousMatchesByMatch } from "@/features/matches/lib/previousMatches";
import type { PredictionDetail } from "@/features/matches/lib/predictionDetail";
import { GroupStandingsList } from "@/features/matches/ui/GroupStandingsList";
import { LiveMinuteIndicator } from "@/features/matches/ui/LiveMinuteIndicator";
import { MatchDrawer } from "@/features/matches/ui/MatchDrawer";
import { MatchHighlightsThumb } from "@/features/matches/ui/MatchHighlights";
import { MatchVoters } from "@/features/matches/ui/MatchVoters";
import { isMatchUpsetWatch } from "@/shared/lib/onside/upsets";
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
import { MatchScoreDigit, MatchScoreStatus } from "@/shared/ui/MatchScoreDisplay";
import { calculatePredictionPoints } from "@/entities/prediction/lib/calculatePredictionPoints";
import { getRoundWeight } from "@/entities/match/model/types";
import type { BoostMultiplier } from "@/entities/prediction/model/types";
import { TeamFlag } from "@/shared/ui/TeamFlag";
import { cn } from "@/lib/utils";
import { setLiveRefreshPaused } from "@/shared/lib/liveRefreshPause";
import { useLiveMatchUpdates } from "@/shared/lib/supabase/useLiveMatchUpdates";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { PlayoffHowToTrigger } from "@/features/playoff/ui/PlayoffHowToTrigger";

import type { Locale } from "@/shared/types/database";

interface MatchesViewProps {
  serverMatches: Match[];
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
  upsetMatchIds?: string[];
  showPlayoffUi?: boolean;
  userTier?: number;
}

const TAB_KEYS: MatchDayBucket[] = ["past", "upcoming3days", "future"];
const PLAYOFF_TAB_KEYS = ["playoff", "past", "group"] as const;
type PlayoffScheduleTab = (typeof PLAYOFF_TAB_KEYS)[number];

const FLAG_SIZE = 28;
const FEATURED_FLAG_SIZE = 40;
const MATCH_CARD_MIN_H = "min-h-[7rem]";
const FEATURED_MATCH_CARD_MIN_H = "min-h-[8rem]";
const matchCardGridClassName =
  "grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-2";

function MatchCardScoreMeta({
  prediction,
  locked,
  live,
  finished,
  points,
  pickOnTrack,
  t,
}: {
  prediction: PredictionDetail | undefined;
  locked: boolean;
  live: boolean;
  finished: boolean;
  points: number | null;
  pickOnTrack: boolean;
  t: ReturnType<typeof useTranslations<"matches">>;
}) {
  if (finished) {
    if (prediction) {
      return (
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
      );
    }

    if (!locked) {
      return (
        <span className="text-center text-[11px] font-medium leading-none text-muted-foreground">
          {t("noPick")}
        </span>
      );
    }

    return null;
  }

  if (prediction) {
    return (
      <span
        className={cn(
          "w-full truncate text-center text-[11px] font-semibold leading-none tabular-nums",
          live
            ? pickOnTrack
              ? "text-emerald-300"
              : "text-red-300"
            : "text-muted-foreground",
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
    );
  }

  if (!locked) {
    return (
      <span
        className={cn(
          "text-center text-[11px] font-medium leading-none",
          live ? "text-red-300" : "text-muted-foreground",
        )}
      >
        {t("noPick")}
      </span>
    );
  }

  return null;
}

function MatchCardTeamBlock({
  name,
  flagSize,
  className,
}: {
  name: string;
  flagSize: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-[5.5rem] shrink-0 flex-col items-center gap-1.5",
        className,
      )}
    >
      <TeamFlag name={name} size={flagSize} />
      <span className="line-clamp-2 w-full text-center text-[11px] font-medium leading-tight text-white/85">
        {name}
      </span>
    </div>
  );
}

function isFinishedMatch(match: Match): boolean {
  return (
    match.status === "finished" &&
    match.home_score !== null &&
    match.away_score !== null
  );
}

function getPlayoffTab(match: Match): PlayoffScheduleTab {
  if (isGroupRoundKey(match.round_key)) {
    return "group";
  }
  if (isFinishedMatch(match)) {
    return "past";
  }
  return "playoff";
}

function getDefaultPlayoffTab(matches: Match[]): PlayoffScheduleTab {
  if (
    matches.some(
      (match) => getPlayoffTab(match) === "playoff" && !isLiveMatch(match),
    )
  ) {
    return "playoff";
  }
  if (matches.some((match) => getPlayoffTab(match) === "past")) {
    return "past";
  }
  return "group";
}

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
  scorerPlayerIds,
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
  scorerPlayerIds: string[];
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
          predictedScorerPlayerId: prediction.scorer_player_id,
          actualScorers: scorers,
          actualScorerPlayerIds: scorerPlayerIds,
          boostMultiplier: prediction.boost_multiplier as BoostMultiplier,
          roundWeight: getRoundWeight(match.round_key),
        }).totalPoints
      : null;

  const flagSize = featured ? FEATURED_FLAG_SIZE : FLAG_SIZE;
  const showScore = live || finished;
  const liveMinute = formatLiveMinute(
    match.minute ?? null,
    match.injury_time ?? null,
  );
  const pickOnTrack =
    live && prediction
      ? calculatePredictionPoints({
          predictedHome: prediction.home_score,
          predictedAway: prediction.away_score,
          actualHome: match.home_score ?? 0,
          actualAway: match.away_score ?? 0,
          predictedScorer: prediction.scorer_name,
          actualScorers: [],
          boostMultiplier: prediction.boost_multiplier as BoostMultiplier,
          roundWeight: getRoundWeight(match.round_key),
        }).basePoints > 0
      : false;

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

        <p className="truncate text-center text-[11px] leading-tight text-muted-foreground">
          {formatMatchSubtitle(match, t)}
        </p>

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
        </div>
      </div>

      <div className={matchCardGridClassName}>
        <div className="flex min-w-0 items-start gap-1.5">
          <MatchCardTeamBlock
            name={match.home_team_name}
            flagSize={flagSize}
          />
          {showScore && (
            <MatchScoreDigit
              value={match.home_score ?? 0}
              size={flagSize}
              className="ml-auto text-white"
            />
          )}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1 self-start px-1">
          <div
            className="flex items-center justify-center"
            style={{ height: flagSize }}
          >
            {live ? (
              <LiveMinuteIndicator
                liveMinute={liveMinute}
                liveLabel={t("live")}
                className="text-[11px] font-semibold text-red-300"
              />
            ) : finished ? (
              match.highlights_youtube_id ? (
                <MatchHighlightsThumb videoId={match.highlights_youtube_id} />
              ) : (
                <MatchScoreStatus className="text-[13px] text-foreground">
                  {t("finished")}
                </MatchScoreStatus>
              )
            ) : (
              <span className="text-[15px] font-semibold leading-none tabular-nums text-foreground">
                {formatMatchTime(match.kickoff_at, locale)}
              </span>
            )}
          </div>
          <MatchCardScoreMeta
            prediction={prediction}
            locked={locked}
            live={live}
            finished={finished}
            points={points}
            pickOnTrack={pickOnTrack}
            t={t}
          />
        </div>

        <div className="flex min-w-0 items-start gap-1.5">
          {showScore && (
            <MatchScoreDigit
              value={match.away_score ?? 0}
              size={flagSize}
              className="text-white"
            />
          )}
          <MatchCardTeamBlock
            name={match.away_team_name}
            flagSize={flagSize}
            className="ml-auto"
          />
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
  scorerPlayerIdsByMatch,
  eventsByMatch,
  currentUserId,
  teamColors,
  playerPhotosByTeam,
  upsetMatchIds = [],
  showPlayoffUi = false,
  userTier = 4,
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
              home_team_name: row.home_team_name,
              away_team_name: row.away_team_name,
              home_team_id: row.home_team_id,
              away_team_id: row.away_team_id,
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
  const previousMatchesByMatch = useMemo(
    () => buildPreviousMatchesByMatch(matches),
    [matches],
  );

  const emptyTabDescription: Record<MatchDayBucket, string> = {
    past: t("emptyPast"),
    upcoming3days: t("emptyUpcoming3days"),
    future: t("emptyFuture"),
  };
  const emptyPlayoffTabDescription: Record<PlayoffScheduleTab, string> = {
    playoff: t("emptyPlayoff"),
    past: t("emptyPast"),
    group: t("emptyGroup"),
  };

  const [activeGroupTab, setActiveGroupTab] = useState<MatchDayBucket>(() =>
    getDefaultTab(matches),
  );
  const [activePlayoffTab, setActivePlayoffTab] = useState<PlayoffScheduleTab>(
    () => getDefaultPlayoffTab(matches),
  );
  const activeTab = showPlayoffUi ? activePlayoffTab : activeGroupTab;
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!selectedMatchId) {
      return;
    }

    const match = matches.find((item) => item.id === selectedMatchId);
    if (!match || isLiveMatch(match)) {
      return;
    }

    const bucket = showPlayoffUi ? getPlayoffTab(match) : getMatchDayBucket(match);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- align tab with deep-linked match
    if (showPlayoffUi) {
      setActivePlayoffTab(bucket as PlayoffScheduleTab);
    } else {
      setActiveGroupTab(bucket as MatchDayBucket);
    }
  }, [matches, selectedMatchId, showPlayoffUi]);

  const liveMatches = useMemo(
    () =>
      matches
        .filter((match) =>
          isLiveMatch(match) &&
          (!showPlayoffUi || !isGroupRoundKey(match.round_key)),
        )
        .sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at)),
    [matches, showPlayoffUi],
  );

  const liveMatchIds = useMemo(
    () => new Set(liveMatches.map((match) => match.id)),
    [liveMatches],
  );

  const filteredMatches = useMemo(() => {
    const list = matches.filter((match) => {
      if (liveMatchIds.has(match.id)) {
        return false;
      }

      if (showPlayoffUi) {
        return getPlayoffTab(match) === activePlayoffTab;
      }

      return getMatchDayBucket(match) === activeGroupTab;
    });

    const reverse =
      activeTab === "past" ||
      (showPlayoffUi && activePlayoffTab === "past") ||
      (showPlayoffUi && activePlayoffTab === "group");

    return list.sort((a, b) =>
      reverse
        ? b.kickoff_at.localeCompare(a.kickoff_at)
        : a.kickoff_at.localeCompare(b.kickoff_at),
    );
  }, [matches, activeGroupTab, activePlayoffTab, liveMatchIds, showPlayoffUi, activeTab]);

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
    const main = document.querySelector("main");
    if (!main) {
      return;
    }

    if (drawerMatchId) {
      main.classList.add("overflow-hidden");
    } else {
      main.classList.remove("overflow-hidden");
    }

    return () => {
      main.classList.remove("overflow-hidden");
    };
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
    const reverse =
      activeTab === "past" ||
      (showPlayoffUi &&
        (activePlayoffTab === "past" || activePlayoffTab === "group"));
    const groups = new Map<string, Match[]>();

    for (const match of filteredMatches) {
      const key = getDateGroupKey(match.kickoff_at);
      const list = groups.get(key) ?? [];
      list.push(match);
      groups.set(key, list);
    }

    const compareKickoff = (a: Match, b: Match) =>
      reverse
        ? b.kickoff_at.localeCompare(a.kickoff_at)
        : a.kickoff_at.localeCompare(b.kickoff_at);

    return [...groups.entries()]
      .sort(([a], [b]) => (reverse ? b.localeCompare(a) : a.localeCompare(b)))
      .map(([dateKey, dayMatches]) => [dateKey, [...dayMatches].sort(compareKickoff)] as const);
  }, [filteredMatches, activeTab, activePlayoffTab, showPlayoffUi]);

  const openMatch = useCallback((matchId: string) => {
    setSelectedMatchId(matchId);
  }, []);

  const closeMatch = useCallback(() => {
    setSelectedMatchId(null);
  }, []);

  const handleTabChange = (tab: string) => {
    if (showPlayoffUi) {
      setActivePlayoffTab(tab as PlayoffScheduleTab);
    } else {
      setActiveGroupTab(tab as MatchDayBucket);
    }

    if (!selectedMatchId) {
      return;
    }

    const match = matches.find((item) => item.id === selectedMatchId);
    if (
      !match ||
      (isLiveMatch(match)
        ? false
        : showPlayoffUi
          ? getPlayoffTab(match) !== tab
          : getMatchDayBucket(match) !== tab)
    ) {
      setSelectedMatchId(null);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="sports-panel corner-squircle sports-panel-max-h flex flex-col overflow-hidden">
        <div
          className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.08] px-3 pt-3 pb-2.5"
          role="tablist"
          aria-label={t("scheduleTabs")}
        >
          <div className="flex flex-1">
          {(showPlayoffUi ? PLAYOFF_TAB_KEYS : TAB_KEYS).map((tabKey) => {
            const isActive = activeTab === tabKey;
            const tabLabel = showPlayoffUi
              ? tabKey === "playoff"
                ? t("tabPlayoff")
                : tabKey === "group"
                  ? t("tabGroup")
                  : t("tabPast")
              : tabKey === "past"
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
          <PlayoffHowToTrigger showPlayoffUi={showPlayoffUi} />
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
                {showPlayoffUi
                  ? emptyPlayoffTabDescription[activePlayoffTab]
                  : emptyTabDescription[activeGroupTab]}
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
                    scorerPlayerIds={scorerPlayerIdsByMatch[match.id] ?? []}
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
                    scorerPlayerIds={scorerPlayerIdsByMatch[match.id] ?? []}
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

      {!showPlayoffUi ? (
        <GroupStandingsList
          groups={groupStandings}
          liveScoreByTeam={liveScoreByTeam}
        />
      ) : activePlayoffTab === "group" ? (
        <GroupStandingsList
          groups={groupStandings}
          liveScoreByTeam={liveScoreByTeam}
        />
      ) : null}

      <MatchDrawer
        matches={drawerMatches}
        matchId={drawerMatchId}
        voterMap={voterMap}
        predictionMap={mergedPredictionMap}
        playersByMatch={playersByMatch}
        predictionsByMatch={predictionsByMatch}
        scorersByMatch={scorersByMatch}
        scorerPlayerIdsByMatch={scorerPlayerIdsByMatch}
        eventsByMatch={eventsByMatch}
        currentUserId={currentUserId}
        teamColors={teamColors}
        groupStandingsByName={groupStandingsByName}
        liveScoreByTeam={liveScoreByTeam}
        previousMatchesByMatch={previousMatchesByMatch}
        playerPhotosByTeam={playerPhotosByTeam}
        upsetMatchIds={upsetMatchIds}
        userTier={userTier}
        onClose={closeMatch}
        onPredictionSaved={handlePredictionSaved}
      />
    </div>
  );
}
