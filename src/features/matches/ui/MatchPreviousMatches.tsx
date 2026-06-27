"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Match } from "@/entities/match/model/types";
import type { PreviousMatchesByTeam } from "@/features/matches/lib/previousMatches";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMatchScore } from "@/shared/lib/formatMatchScore";
import { MatchScoreDigit } from "@/shared/ui/MatchScoreDisplay";
import { TeamFlag } from "@/shared/ui/TeamFlag";
import { cn } from "@/lib/utils";

type TeamSide = "home" | "away";

interface MatchPreviousMatchesProps extends PreviousMatchesByTeam {
  homeTeamName: string;
  awayTeamName: string;
}

const teamTabTriggerClassName = cn(
  "h-full flex-1 !rounded-[10px] text-sm font-medium transition-colors",
  "text-white/45 hover:text-white/65",
  "dark:text-white/45 dark:hover:text-white/65",
  "data-active:!border data-active:!border-white/40 data-active:bg-white/20",
  "data-active:text-white data-active:font-semibold dark:data-active:text-white",
);

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

function getDefaultTeamSide(
  homeTeamName: string,
  awayTeamName: string,
  home: Match[],
  away: Match[],
): TeamSide {
  if (home.length > 0) {
    return "home";
  }

  if (away.length > 0) {
    return "away";
  }

  return "home";
}

function PreviousMatchRow({
  match,
  t,
}: {
  match: Match;
  t: ReturnType<typeof useTranslations<"matches">>;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-white/[0.04] px-2 py-2.5">
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center justify-start gap-2">
          <TeamFlag name={match.home_team_name} size={24} />
          <MatchScoreDigit
            value={match.home_score ?? 0}
            size={24}
            className="text-white"
          />
        </div>

        <div className="flex min-w-0 shrink-0 flex-col items-center gap-0.5 px-1 text-center">
          <p className="line-clamp-2 text-[10px] leading-tight text-white/50">
            {formatMatchSubtitle(match, t)}
          </p>
          <p className="text-[11px] font-medium text-white/65">{t("finished")}</p>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <MatchScoreDigit
            value={match.away_score ?? 0}
            size={24}
            className="text-white"
          />
          <TeamFlag name={match.away_team_name} size={24} />
        </div>
      </div>

      <p className="sr-only">
        {match.home_team_name} {formatMatchScore(match.home_score, match.away_score)}{" "}
        {match.away_team_name}
      </p>
    </div>
  );
}

export function MatchPreviousMatches({
  homeTeamName,
  awayTeamName,
  home,
  away,
}: MatchPreviousMatchesProps) {
  const t = useTranslations("matches");
  const defaultSide = useMemo(
    () => getDefaultTeamSide(homeTeamName, awayTeamName, home, away),
    [away, awayTeamName, home, homeTeamName],
  );
  const [selectedSide, setSelectedSide] = useState<TeamSide>(defaultSide);

  if (home.length === 0 && away.length === 0) {
    return null;
  }

  const selectedMatches = selectedSide === "home" ? home : away;

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-center text-sm font-semibold text-white">
        {t("previousMatches")}
      </h3>

      <Tabs
        value={selectedSide}
        onValueChange={(value) => setSelectedSide(value as TeamSide)}
        className="flex flex-col gap-3"
      >
        <TabsList
          className="h-11 w-full gap-1 rounded-xl bg-white/10 p-1 group-data-horizontal/tabs:h-11"
          indicatorVariant="none"
          data-vaul-no-drag
        >
          <TabsTrigger
            value="home"
            className={teamTabTriggerClassName}
            disabled={home.length === 0}
          >
            {homeTeamName}
          </TabsTrigger>
          <TabsTrigger
            value="away"
            className={teamTabTriggerClassName}
            disabled={away.length === 0}
          >
            {awayTeamName}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-2">
        {selectedMatches.map((match) => (
          <PreviousMatchRow key={match.id} match={match} t={t} />
        ))}
      </div>
    </section>
  );
}
