"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Match } from "@/entities/match/model/types";
import {
  getBracketTemplate,
  isPlaceholderTeamName,
} from "@/shared/lib/playoff/bracket";
import {
  formatMatchDateHeader,
  formatMatchTime,
} from "@/shared/lib/formatDate";
import { TeamFlag } from "@/shared/ui/TeamFlag";
import type { Locale } from "@/shared/types/database";
import { cn } from "@/lib/utils";

const FLAG_SIZE = 18;

export interface BracketMatchView {
  matchNumber: number;
  match: Match | null;
  kickoffAt: string;
  roundKey: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  status: Match["status"] | "scheduled";
  matchId: string | null;
}

export function buildBracketMatchView(
  matchNumber: number,
  match: Match | null,
): BracketMatchView {
  const template = getBracketTemplate(matchNumber);

  if (match) {
    return {
      matchNumber,
      match,
      kickoffAt: match.kickoff_at,
      roundKey: match.round_key,
      homeTeamName: match.home_team_name,
      awayTeamName: match.away_team_name,
      homeScore: match.home_score,
      awayScore: match.away_score,
      status: match.status,
      matchId: match.id,
    };
  }

  return {
    matchNumber,
    match: null,
    kickoffAt: template?.kickoffAt ?? new Date().toISOString(),
    roundKey: template?.roundKey ?? "round_of_32",
    homeTeamName: "TBD",
    awayTeamName: "TBD",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    matchId: null,
  };
}

function BracketTeamRow({
  name,
  score,
  showScore,
  tbdLabel,
  compact = false,
}: {
  name: string;
  score: number | null;
  showScore: boolean;
  tbdLabel: string;
  compact?: boolean;
}) {
  const placeholder = isPlaceholderTeamName(name) || name === "TBD";

  return (
    <div
      className={cn(
        "flex items-center gap-1.5",
        compact ? "px-2 py-1" : "gap-2 px-3 py-1.5",
      )}
    >
      {placeholder ? (
        <div
          className={cn(
            "shrink-0 rounded-full bg-white/15",
            compact ? "size-4" : "size-[18px]",
          )}
          aria-hidden
        />
      ) : (
        <TeamFlag name={name} size={compact ? 16 : FLAG_SIZE} />
      )}
      <span
        className={cn(
          "min-w-0 flex-1 truncate font-medium leading-tight",
          compact ? "text-[11px]" : "text-[12px]",
          placeholder ? "text-white/45" : "text-white",
        )}
      >
        {placeholder ? tbdLabel : name}
      </span>
      {showScore && score !== null && (
        <span
          className={cn(
            "font-semibold tabular-nums text-white",
            compact ? "text-[11px]" : "text-[12px]",
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}

interface BracketMatchCardProps {
  view: BracketMatchView;
  title?: string;
  showConnector?: boolean;
  compact?: boolean;
  onSelect?: (matchId: string) => void;
}

export function BracketMatchCard({
  view,
  title,
  showConnector = true,
  compact = false,
  onSelect,
}: BracketMatchCardProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("brackets");
  const tMatches = useTranslations("matches");

  const finished =
    view.status === "finished" &&
    view.homeScore !== null &&
    view.awayScore !== null;
  const live =
    view.status === "live" &&
    view.homeScore !== null &&
    view.awayScore !== null;
  const showScore = finished || live;
  const interactive = Boolean(view.matchId && onSelect);

  const headerLabel =
    title ??
    (view.roundKey === "third_place"
      ? t("thirdPlace")
      : view.roundKey === "final"
        ? t("final")
        : `${formatMatchDateHeader(view.kickoffAt, locale)} · ${formatMatchTime(view.kickoffAt, locale)}`);

  return (
    <div className={cn("relative flex h-full items-stretch", compact && "h-full")}>
      <button
        type="button"
        disabled={!interactive}
        onClick={() => view.matchId && onSelect?.(view.matchId)}
        className={cn(
          "flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/15 bg-[rgb(8_24_88/0.9)] text-left transition-colors",
          compact ? "justify-center" : "",
          interactive && "hover:bg-[rgb(12_32_104/0.95)] active:scale-[0.99]",
          !interactive && "cursor-default",
        )}
      >
        <div
          className={cn(
            "shrink-0 border-b border-white/10 text-center font-medium text-white/55",
            compact ? "px-2 py-1 text-[9px]" : "px-3 py-1.5 text-[10px]",
          )}
        >
          {headerLabel}
          {live && (
            <span className="ml-1 font-semibold text-red-300">
              {tMatches("live")}
            </span>
          )}
        </div>
        <BracketTeamRow
          name={view.homeTeamName}
          score={view.homeScore}
          showScore={showScore}
          tbdLabel={t("tbd")}
          compact={compact}
        />
        <div className="border-t border-white/10" />
        <BracketTeamRow
          name={view.awayTeamName}
          score={view.awayScore}
          showScore={showScore}
          tbdLabel={t("tbd")}
          compact={compact}
        />
      </button>

      {showConnector && !compact && (
        <div
          className="pointer-events-none absolute top-1/2 -right-3 hidden h-px w-3 -translate-y-1/2 bg-white/25 sm:block"
          aria-hidden
        />
      )}
    </div>
  );
}
