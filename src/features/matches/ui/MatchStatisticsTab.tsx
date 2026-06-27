"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type {
  GroupStanding,
  LiveScoreByTeam,
} from "@/entities/match/lib/standings";
import type { Match } from "@/entities/match/model/types";
import { loadMatchModel, type MatchModel } from "@/features/matches/actions";
import type { PreviousMatchesByTeam } from "@/features/matches/lib/previousMatches";
import { GroupStandingsCard } from "@/features/matches/ui/GroupStandingsList";
import { MatchPreviousMatches } from "@/features/matches/ui/MatchPreviousMatches";
import { UpsetWatchBadge } from "@/features/matches/ui/UpsetWatchBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamFlag } from "@/shared/ui/TeamFlag";
import { cn } from "@/lib/utils";
import type { OnsidePlPlayer, OnsideTeamInfo } from "@/shared/lib/onside/types";

interface MatchStatisticsTabProps {
  match: Match;
  groupStanding?: GroupStanding;
  liveScoreByTeam?: LiveScoreByTeam;
  isUpsetWatch?: boolean;
  previousMatches?: PreviousMatchesByTeam;
}

type GroupFixture = NonNullable<OnsideTeamInfo["group_fixtures"]>[number];

function ProbabilityBar({
  homeLabel,
  drawLabel,
  awayLabel,
  home,
  draw,
  away,
  compact = false,
}: {
  homeLabel: string;
  drawLabel: string;
  awayLabel: string;
  home: number;
  draw: number;
  away: number;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col", compact ? "gap-1" : "gap-2")}>
      <div
        className={cn(
          "flex overflow-hidden rounded-full bg-white/10",
          compact ? "h-1.5" : "h-2.5",
        )}
      >
        <div
          className="bg-emerald-400/80"
          style={{ width: `${home}%` }}
          title={`${homeLabel}: ${home}%`}
        />
        <div
          className="bg-white/30"
          style={{ width: `${draw}%` }}
          title={`${drawLabel}: ${draw}%`}
        />
        <div
          className="bg-sky-400/80"
          style={{ width: `${away}%` }}
          title={`${awayLabel}: ${away}%`}
        />
      </div>
      {!compact ? (
        <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-white/70">
          <div>
            <p className="font-medium text-white/90">{home}%</p>
            <p className="truncate">{homeLabel}</p>
          </div>
          <div>
            <p className="font-medium text-white/90">{draw}%</p>
            <p>{drawLabel}</p>
          </div>
          <div>
            <p className="font-medium text-white/90">{away}%</p>
            <p className="truncate">{awayLabel}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StrengthIndicator({
  strength,
  label,
}: {
  strength: number;
  label: string;
}) {
  const pct = Math.round(strength * 100);

  return (
    <div className="col-span-2 flex flex-col gap-1">
      <div className="flex items-center justify-between text-[11px] text-white/65">
        <span>{label}</span>
        <span className="font-semibold text-white">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-amber-400/80"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PlStarsList({
  players,
  count,
  t,
}: {
  players: OnsidePlPlayer[];
  count: number;
  t: ReturnType<typeof useTranslations<"matches">>;
}) {
  if (players.length === 0) {
    return null;
  }

  return (
    <details className="col-span-2 group">
      <summary className="cursor-pointer list-none text-[11px] text-white/65 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1">
          <span className="font-semibold text-white">
            {t("plFootprint")} · {count}
          </span>
          <span className="text-white/40 transition-transform group-open:rotate-180">
            ▾
          </span>
        </span>
      </summary>
      <ul className="mt-1.5 flex max-h-36 flex-col gap-0.5 overflow-y-auto text-[11px] text-white/70">
        {players.map((player) => (
          <li
            key={`${player.name}-${player.club}`}
            className="flex justify-between gap-2"
          >
            <span className="truncate text-white/85">{player.name}</span>
            <span className="shrink-0 text-white/50">{player.club}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function TeamStatCard({
  teamName,
  rank,
  confederation,
  group,
  strength,
  plStars,
  t,
}: {
  teamName: string;
  rank: number;
  confederation: string;
  group?: string;
  strength?: number;
  plStars?: { count: number; players: OnsidePlPlayer[] };
  t: ReturnType<typeof useTranslations<"matches">>;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-white/5 p-3">
      <div className="flex items-center gap-2">
        <TeamFlag name={teamName} size={24} />
        <p className="text-sm font-semibold text-white">{teamName}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-white/65">
        <div>
          <dt>{t("fifaRank")}</dt>
          <dd className="font-semibold text-white">#{rank}</dd>
        </div>
        <div>
          <dt>{t("confederation")}</dt>
          <dd className="font-semibold text-white">{confederation}</dd>
        </div>
        {group ? (
          <div>
            <dt>{t("group")}</dt>
            <dd className="font-semibold text-white">{group}</dd>
          </div>
        ) : null}
        {strength != null ? (
          <StrengthIndicator strength={strength} label={t("strength")} />
        ) : null}
        {plStars ? (
          <PlStarsList
            players={plStars.players}
            count={plStars.count}
            t={t}
          />
        ) : null}
      </dl>
    </div>
  );
}

function GroupRoadFixtureRow({
  fixture,
  isCurrentMatch,
  t,
}: {
  fixture: GroupFixture;
  isCurrentMatch: boolean;
  t: ReturnType<typeof useTranslations<"matches">>;
}) {
  const venueLabel = fixture.is_home ? t("homeShort") : t("awayShort");

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-lg px-2 py-1.5",
        isCurrentMatch ? "bg-white/10 ring-1 ring-white/15" : "bg-white/[0.03]",
      )}
    >
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-medium text-white/50">
          {t("matchdayShort", { n: fixture.matchday })}
        </span>
        <span className="truncate text-right text-white/85">
          {venueLabel} {fixture.opponent_name}
        </span>
      </div>
      <ProbabilityBar
        compact
        homeLabel={t("win")}
        drawLabel={t("draw")}
        awayLabel={t("loss")}
        home={fixture.probability_win}
        draw={fixture.probability_draw}
        away={fixture.probability_loss}
      />
      <div className="flex justify-between text-[10px] text-white/45">
        <span>
          {fixture.probability_win}% {t("win")}
        </span>
        <span>
          {fixture.probability_draw}% {t("draw")}
        </span>
        <span>
          {fixture.probability_loss}% {t("loss")}
        </span>
      </div>
    </div>
  );
}

function GroupRoadColumn({
  teamName,
  fixtures,
  opponentName,
  t,
}: {
  teamName: string;
  fixtures: GroupFixture[];
  opponentName: string;
  t: ReturnType<typeof useTranslations<"matches">>;
}) {
  const sorted = [...fixtures].sort((a, b) => a.matchday - b.matchday);

  if (sorted.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <TeamFlag name={teamName} size={20} />
        <p className="text-xs font-semibold text-white">{teamName}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        {sorted.map((fixture) => (
          <GroupRoadFixtureRow
            key={fixture.id}
            fixture={fixture}
            isCurrentMatch={fixture.opponent_name === opponentName}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function GroupRoad({
  homeTeam,
  awayTeam,
  homeFixtures,
  awayFixtures,
  t,
}: {
  homeTeam: string;
  awayTeam: string;
  homeFixtures?: GroupFixture[];
  awayFixtures?: GroupFixture[];
  t: ReturnType<typeof useTranslations<"matches">>;
}) {
  const hasHome = (homeFixtures?.length ?? 0) > 0;
  const hasAway = (awayFixtures?.length ?? 0) > 0;

  if (!hasHome && !hasAway) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-white">{t("groupRoad")}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {hasHome ? (
          <GroupRoadColumn
            teamName={homeTeam}
            fixtures={homeFixtures!}
            opponentName={awayTeam}
            t={t}
          />
        ) : null}
        {hasAway ? (
          <GroupRoadColumn
            teamName={awayTeam}
            fixtures={awayFixtures!}
            opponentName={homeTeam}
            t={t}
          />
        ) : null}
      </div>
    </section>
  );
}

function ModelSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-4 w-40 bg-white/10" />
      <Skeleton className="h-2.5 w-full rounded-full bg-white/10" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-24 rounded-xl bg-white/10" />
        <Skeleton className="h-24 rounded-xl bg-white/10" />
      </div>
    </div>
  );
}

export function MatchStatisticsTab({
  match,
  groupStanding,
  liveScoreByTeam,
  isUpsetWatch = false,
  previousMatches,
}: MatchStatisticsTabProps) {
  const t = useTranslations("matches");
  const [model, setModel] = useState<MatchModel | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    loadMatchModel(match.home_team_name, match.away_team_name).then((data) => {
      if (!cancelled) {
        setModel(data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [match.home_team_name, match.away_team_name]);

  const prediction = model?.prediction;
  const favouriteName = prediction
    ? prediction.favourite === prediction.home.code
      ? prediction.home.name
      : prediction.favourite === prediction.away.code
        ? prediction.away.name
        : null
    : null;

  return (
    <div className="flex flex-col gap-5">
      {previousMatches ? (
        <MatchPreviousMatches
          homeTeamName={match.home_team_name}
          awayTeamName={match.away_team_name}
          home={previousMatches.home}
          away={previousMatches.away}
        />
      ) : null}

      {groupStanding ? (
        <GroupStandingsCard
          group={groupStanding}
          variant="transparent"
          highlightedTeams={[match.home_team_name, match.away_team_name]}
          liveScoreByTeam={liveScoreByTeam}
        />
      ) : null}

      {model === undefined ? (
        <ModelSkeleton />
      ) : model ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">
              {t("modelPrediction")}
            </h3>
            <div className="flex items-center gap-2">
              {isUpsetWatch || prediction?.upset_watch ? (
                <UpsetWatchBadge label={t("upsetWatch")} />
              ) : null}
              {prediction?.confidence ? (
                <span className="text-[11px] text-white/50">
                  {prediction.confidence}
                </span>
              ) : null}
            </div>
          </div>

          <ProbabilityBar
            homeLabel={match.home_team_name}
            drawLabel={t("draw")}
            awayLabel={match.away_team_name}
            home={prediction!.probability.home}
            draw={prediction!.probability.draw}
            away={prediction!.probability.away}
          />

          {favouriteName ? (
            <p className="text-xs text-white/60">
              {t("favourite")}:{" "}
              <span className="font-medium text-white/85">{favouriteName}</span>
            </p>
          ) : null}

          <h3 className="pt-1 text-sm font-semibold text-white">
            {t("headToHead")}
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <TeamStatCard
              teamName={model.home.team.name}
              rank={model.home.team.rank}
              confederation={model.home.team.confederation}
              group={model.home.team.group}
              strength={model.home.heuristic_avg_match_win_probability}
              plStars={model.home.pl_stars}
              t={t}
            />
            <TeamStatCard
              teamName={model.away.team.name}
              rank={model.away.team.rank}
              confederation={model.away.team.confederation}
              group={model.away.team.group}
              strength={model.away.heuristic_avg_match_win_probability}
              plStars={model.away.pl_stars}
              t={t}
            />
          </div>

          <GroupRoad
            homeTeam={model.home.team.name}
            awayTeam={model.away.team.name}
            homeFixtures={model.home.group_fixtures}
            awayFixtures={model.away.group_fixtures}
            t={t}
          />

          <p className="text-[10px] text-white/40">
            <a
              href={
                prediction?.deep_link ??
                "https://onsidearena.com/world-cup-2026"
              }
              target="_blank"
              rel="noopener noreferrer"
              className={cn("underline-offset-2 hover:underline")}
            >
              {t("poweredByOnside")}
            </a>
          </p>
        </section>
      ) : (
        <p className="text-sm text-white/50">{t("modelUnavailable")}</p>
      )}
    </div>
  );
}
