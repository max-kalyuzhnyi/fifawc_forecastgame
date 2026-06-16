"use client";

import { memo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type {
  GroupStanding,
  LiveScoreByTeam,
} from "@/entities/match/lib/standings";
import type { Match, MatchEvent } from "@/entities/match/model/types";
import { calculatePredictionPoints } from "@/entities/prediction/lib/calculatePredictionPoints";
import type { BoostMultiplier } from "@/entities/prediction/model/types";
import { formatLiveMinute } from "@/entities/match/lib/formatLiveData";
import type { MatchPlayerOption } from "@/features/matches/actions";
import {
  getBoostUsedForDay,
  toPredictionFormInitial,
  type BoostUsed,
  type PredictionDetail,
} from "@/features/matches/lib/predictionDetail";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import type { PlayerPhotosByTeam } from "@/features/matches/lib/playerPhotos";
import { LiveMinuteIndicator } from "@/features/matches/ui/LiveMinuteIndicator";
import { MatchStatisticsTab } from "@/features/matches/ui/MatchStatisticsTab";
import { UpsetWatchBadge } from "@/features/matches/ui/UpsetWatchBadge";
import { MatchEventsTimeline } from "@/features/matches/ui/MatchEventsTimeline";
import { MatchHighlights } from "@/features/matches/ui/MatchHighlights";
import { MatchLineups } from "@/features/matches/ui/MatchLineups";
import { MatchPredictionsBoard } from "@/features/matches/ui/MatchPredictionsBoard";
import { MatchTeamBackground } from "@/features/matches/ui/MatchTeamBackground";
import { MatchVoters } from "@/features/matches/ui/MatchVoters";
import { PredictionForm } from "@/features/predictions/ui/PredictionForm";
import {
  formatMatchKickoffDate,
  formatMatchTime,
  getDateGroupKey,
} from "@/shared/lib/formatDate";
import { formatMatchScore } from "@/shared/lib/formatMatchScore";
import { TeamFlag } from "@/shared/ui/TeamFlag";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";
import type { Locale } from "@/shared/types/database";
import { cn } from "@/lib/utils";

interface MatchDetailContentProps {
  match: Match;
  voters: MatchVoterInfo;
  prediction?: PredictionDetail;
  predictionMap?: Record<string, PredictionDetail>;
  boostUsed?: BoostUsed;
  players: MatchPlayerOption[];
  playersLoading?: boolean;
  matchPredictions?: MatchPredictionEntry[];
  matchScorers?: string[];
  matchScorerPlayerIds?: string[];
  matchEvents?: MatchEvent[];
  currentUserId?: string | null;
  teamColors?: Record<string, string>;
  currentBoost?: BoostMultiplier;
  groupStanding?: GroupStanding;
  liveScoreByTeam?: LiveScoreByTeam;
  playerPhotosByTeam?: PlayerPhotosByTeam;
  expanded?: boolean;
  onRequestExpand?: () => void;
  isUpsetWatch?: boolean;
  onPredictionSaved?: (prediction: PredictionDetail) => void;
}

const matchTabClassName =
  "min-h-9 flex-1 rounded-none border-0 bg-transparent px-0 text-xs font-medium text-white/50 shadow-none hover:text-white/80 data-active:bg-transparent data-active:text-white data-active:font-semibold data-active:shadow-none dark:text-white/50 dark:hover:text-white/80 dark:data-active:bg-transparent dark:data-active:text-white";

const matchDetailGridClassName =
  "grid w-full grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] items-start gap-x-3";

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
    return t("roundMatch", {
      round: match.round_display,
      number: match.match_number,
    });
  }

  return match.round_display;
}

function MatchDetailCenterFocus({
  prediction,
  locked,
  showScore,
  live,
  finished,
  homeScore,
  awayScore,
  points,
  pickOnTrack,
  kickoffAt,
  liveMinute,
  locale,
  t,
}: {
  prediction: PredictionDetail | undefined;
  locked: boolean;
  showScore: boolean;
  live: boolean;
  finished: boolean;
  homeScore: number;
  awayScore: number;
  points: number | null;
  pickOnTrack: boolean;
  kickoffAt: string;
  liveMinute: string | null;
  locale: Locale;
  t: ReturnType<typeof useTranslations<"matches">>;
}) {
  if (showScore) {
    const hit = finished ? points !== null && points > 0 : pickOnTrack;

    return (
      <div className="flex w-full min-w-0 flex-col items-center justify-center gap-1 self-center">
        <p className="w-full text-center text-3xl font-bold leading-none tabular-nums text-white">
          {formatMatchScore(homeScore, awayScore)}
        </p>
        {prediction ? (
          <span
            className={cn(
              "w-full truncate text-center text-xs font-semibold leading-none tabular-nums",
              hit ? "text-emerald-300" : "text-white/55",
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
          <span className="text-center text-xs font-medium leading-none text-white/55">
            {t("noPick")}
          </span>
        ) : null}
        {live ? (
          <LiveMinuteIndicator
            liveMinute={liveMinute}
            liveLabel={t("live")}
            className="text-[11px] font-medium text-red-300"
          />
        ) : (
          <p className="text-center text-[11px] text-white/70">
            {formatMatchTime(kickoffAt, locale)}
            <span className="mx-1 text-white/35">·</span>
            {formatMatchKickoffDate(kickoffAt, locale)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-center justify-center gap-1 self-center">
      {prediction ? (
        <>
          <p className="w-full truncate text-center text-3xl font-bold leading-none tabular-nums text-white/50">
            {formatMatchScore(prediction.home_score, prediction.away_score)}
            {prediction.boost_multiplier > 1 && (
              <span className="ml-1 text-base font-semibold text-white/35">
                x{prediction.boost_multiplier}
              </span>
            )}
          </p>
          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white/55">
            {t("myPick")}
          </span>
        </>
      ) : !locked ? (
        <p className="w-full text-center text-lg font-medium text-red-300">
          {t("noPick")}
        </p>
      ) : null}
      <p className="text-center text-[11px] text-white/70">
        {formatMatchTime(kickoffAt, locale)}
        <span className="mx-1 text-white/35">·</span>
        {formatMatchKickoffDate(kickoffAt, locale)}
      </p>
    </div>
  );
}

export const MatchDetailContent = memo(function MatchDetailContent({
  match,
  voters,
  prediction,
  predictionMap,
  boostUsed,
  players,
  playersLoading = false,
  matchPredictions = [],
  matchScorers = [],
  matchScorerPlayerIds = [],
  matchEvents = [],
  currentUserId,
  teamColors = {},
  currentBoost: currentBoostProp,
  groupStanding,
  liveScoreByTeam,
  playerPhotosByTeam = {},
  expanded = false,
  onRequestExpand,
  isUpsetWatch = false,
  onPredictionSaved,
}: MatchDetailContentProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("matches");

  const locked = new Date(match.kickoff_at) <= new Date();
  const live =
    match.status === "live" &&
    match.home_score !== null &&
    match.away_score !== null;
  const finished =
    match.status === "finished" &&
    match.home_score !== null &&
    match.away_score !== null;
  const showScore = live || finished;
  const liveMinute = formatLiveMinute(
    match.minute ?? null,
    match.injury_time ?? null,
  );
  const defaultMatchTab =
    live || finished ? "predictions" : "statistics";
  const resolvedBoostUsed =
    boostUsed ??
    getBoostUsedForDay(
      predictionMap ?? {},
      getDateGroupKey(match.kickoff_at),
      match.id,
    );
  const currentBoost =
    currentBoostProp ??
    ((prediction?.boost_multiplier ?? 1) as BoostMultiplier);
  const predictionPoints =
    finished && prediction && showScore
      ? calculatePredictionPoints({
          predictedHome: prediction.home_score,
          predictedAway: prediction.away_score,
          actualHome: match.home_score!,
          actualAway: match.away_score!,
          predictedScorer: prediction.scorer_name,
          predictedScorerPlayerId: prediction.scorer_player_id,
          actualScorers: matchScorers,
          actualScorerPlayerIds: matchScorerPlayerIds,
          boostMultiplier: prediction.boost_multiplier as BoostMultiplier,
        }).totalPoints
      : null;
  const pickOnTrack =
    live && prediction && showScore
      ? calculatePredictionPoints({
          predictedHome: prediction.home_score,
          predictedAway: prediction.away_score,
          actualHome: match.home_score!,
          actualAway: match.away_score!,
          predictedScorer: prediction.scorer_name,
          predictedScorerPlayerId: prediction.scorer_player_id,
          actualScorers: matchScorers,
          actualScorerPlayerIds: matchScorerPlayerIds,
          boostMultiplier: prediction.boost_multiplier as BoostMultiplier,
        }).basePoints > 0
      : false;

  return (
    <div
      className={cn(
        "match-drawer-card corner-squircle relative isolate flex h-full w-full flex-col",
        expanded && "rounded-none border-0 shadow-none",
      )}
    >
      <MatchTeamBackground
        homeTeamName={match.home_team_name}
        awayTeamName={match.away_team_name}
        teamColors={teamColors}
      />

      <div
        className={cn(
          "relative flex min-h-0 flex-1 flex-col px-4",
          expanded
            ? "overflow-y-auto overscroll-contain pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
            : "overflow-hidden pb-4 pt-2",
        )}
      >
        <section className="flex shrink-0 flex-col gap-2 pb-5">
          <div className="flex flex-col items-center gap-1.5">
            <p className="line-clamp-1 text-center text-[11px] uppercase tracking-wide text-white/70">
              {formatMatchSubtitle(match, t)}
            </p>
            {isUpsetWatch ? <UpsetWatchBadge label={t("upsetWatch")} /> : null}
          </div>

          <div className={matchDetailGridClassName}>
            <div className="flex min-w-0 flex-col items-center gap-1.5">
              <TeamFlag name={match.home_team_name} size={44} />
              <p className="line-clamp-2 w-full text-center text-sm font-semibold leading-tight text-white">
                {match.home_team_name}
              </p>
            </div>

            <MatchDetailCenterFocus
              prediction={prediction}
              locked={locked}
              showScore={showScore}
              live={live}
              finished={finished}
              homeScore={match.home_score ?? 0}
              awayScore={match.away_score ?? 0}
              points={predictionPoints}
              pickOnTrack={pickOnTrack}
              kickoffAt={match.kickoff_at}
              liveMinute={liveMinute}
              locale={locale}
              t={t}
            />

            <div className="flex min-w-0 flex-col items-center gap-1.5">
              <TeamFlag name={match.away_team_name} size={44} />
              <p className="line-clamp-2 w-full text-center text-sm font-semibold leading-tight text-white">
                {match.away_team_name}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <p className="line-clamp-1 text-center text-xs text-white/65">
              {match.venue ?? "\u00a0"}
            </p>

            <MatchVoters voters={voters} />
          </div>

          {finished && match.highlights_youtube_id && (
            <MatchHighlights videoId={match.highlights_youtube_id} />
          )}
        </section>

        {!locked && (
          <section className="flex shrink-0 flex-col border-t border-white/10 py-5">
            <h2 className="mb-3 shrink-0 text-center font-heading text-base font-medium text-white">
              {t("yourPrediction")}
            </h2>

            <div className="w-full">
              {playersLoading ? (
                <p className="text-center text-sm text-white/70">
                  {t("lineupsUnavailable")}
                </p>
              ) : (
                <PredictionForm
                  matchId={match.id}
                  kickoffAt={match.kickoff_at}
                  roundKey={match.round_key}
                  homeTeamName={match.home_team_name}
                  awayTeamName={match.away_team_name}
                  homeTeamId={match.home_team_id}
                  awayTeamId={match.away_team_id}
                  players={players}
                  initial={
                    prediction ? toPredictionFormInitial(prediction) : undefined
                  }
                  locked={false}
                  boostUsed={resolvedBoostUsed}
                  currentBoost={currentBoost}
                  onPredictionSaved={onPredictionSaved}
                />
              )}
            </div>
          </section>
        )}

        <section className="flex shrink-0 flex-col border-t border-white/10 py-5">
          <Tabs
            defaultValue={defaultMatchTab}
            onValueChange={() => {
              if (!expanded) {
                onRequestExpand?.();
              }
            }}
            className="flex flex-col gap-3"
          >
            <TabsList
              onClick={() => {
                if (!expanded) {
                  onRequestExpand?.();
                }
              }}
              indicatorVariant="underline"
              className="flex h-auto w-full shrink-0 justify-start gap-4 bg-transparent p-0 group-data-horizontal/tabs:h-auto"
            >
              <TabsTrigger value="predictions" className={matchTabClassName}>
                {t("predictions")}
              </TabsTrigger>
              <TabsTrigger value="statistics" className={matchTabClassName}>
                {t("statistics")}
              </TabsTrigger>
              <TabsTrigger value="lineups" className={matchTabClassName}>
                {t("lineups")}
              </TabsTrigger>
              <TabsTrigger value="updates" className={matchTabClassName}>
                {t("updates")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="predictions" className="mt-0">
              {locked ? (
                <MatchPredictionsBoard
                  match={match}
                  predictions={matchPredictions}
                  actualScorers={matchScorers}
                  actualScorerPlayerIds={matchScorerPlayerIds}
                  currentUserId={currentUserId}
                />
              ) : (
                <p className="text-sm text-white/50">
                  {t("predictionsRevealAfter")}
                </p>
              )}
            </TabsContent>


            <TabsContent value="statistics" className="mt-0">
              <MatchStatisticsTab
                match={match}
                groupStanding={groupStanding}
                liveScoreByTeam={liveScoreByTeam}
                isUpsetWatch={isUpsetWatch}
              />
            </TabsContent>

            <TabsContent value="lineups" className="mt-0">
              <MatchLineups
                homeTeamName={match.home_team_name}
                awayTeamName={match.away_team_name}
                homeTeamId={match.home_team_id}
                awayTeamId={match.away_team_id}
                homeLineup={match.home_lineup ?? null}
                awayLineup={match.away_lineup ?? null}
                playerPhotosByTeam={playerPhotosByTeam}
                matchEvents={matchEvents ?? []}
              />
            </TabsContent>

            <TabsContent value="updates" className="mt-0">
              <MatchEventsTimeline
                events={matchEvents}
                homeTeamName={match.home_team_name}
                awayTeamName={match.away_team_name}
                teamColors={teamColors}
              />
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  );
});
