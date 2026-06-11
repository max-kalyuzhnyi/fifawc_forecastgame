"use client";

import { useTranslations } from "next-intl";
import type {
  GroupStanding,
  LiveScoreByTeam,
  TeamLiveScore,
  TeamStandingRow,
} from "@/entities/match/lib/standings";
import { formatMatchScore } from "@/shared/lib/formatMatchScore";
import { TeamFlag } from "@/shared/ui/TeamFlag";
import { cn } from "@/lib/utils";

const FLAG_SIZE = 16;
const STAT_COLUMN_KEYS = ["GP", "W", "D", "L", "GD", "PTS"] as const;

const ROW_GRID =
  "grid grid-cols-[0.875rem_1rem_minmax(0,1fr)_repeat(6,1.25rem)] items-center gap-x-1.5";

function formatGoalDifference(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function LiveScoreChip({ liveScore }: { liveScore: TeamLiveScore }) {
  const { goalsFor, goalsAgainst } = liveScore;
  const variant =
    goalsFor > goalsAgainst
      ? "winning"
      : goalsFor < goalsAgainst
        ? "losing"
        : "drawing";

  return (
    <span
      className={cn(
        "shrink-0 rounded px-1 py-px text-[9px] font-semibold leading-none tabular-nums",
        variant === "winning" && "bg-emerald-500/20 text-emerald-300",
        variant === "losing" && "bg-red-500/20 text-red-300",
        variant === "drawing" && "bg-white/10 text-muted-foreground",
      )}
    >
      {formatMatchScore(goalsFor, goalsAgainst)}
    </span>
  );
}

function StandingStat({
  value,
  emphasize = false,
}: {
  value: string | number;
  emphasize?: boolean;
}) {
  return (
    <span
      className={cn(
        "text-center text-[11px] leading-none tabular-nums",
        emphasize ? "font-semibold text-foreground" : "text-foreground/90",
      )}
    >
      {value}
    </span>
  );
}

function StandingRow({
  position,
  row,
  highlighted = false,
  liveScore,
}: {
  position: number;
  row: TeamStandingRow;
  highlighted?: boolean;
  liveScore?: TeamLiveScore;
}) {
  return (
    <div
      className={cn(
        ROW_GRID,
        "border-t border-white/[0.08] px-3 py-2",
        highlighted && "bg-white/[0.07]",
      )}
    >
      <span className="text-center text-[11px] leading-none tabular-nums text-muted-foreground">
        {position}
      </span>

      <TeamFlag name={row.teamName} size={FLAG_SIZE} />

      <span className="flex min-w-0 items-center gap-1">
        <span className="truncate text-[11px] font-medium leading-tight text-foreground">
          {row.teamName}
        </span>
        {liveScore && <LiveScoreChip liveScore={liveScore} />}
      </span>

      <StandingStat value={row.played} />
      <StandingStat value={row.won} />
      <StandingStat value={row.drawn} />
      <StandingStat value={row.lost} />
      <StandingStat value={formatGoalDifference(row.goalDifference)} />
      <StandingStat value={row.points} emphasize />
    </div>
  );
}

export function GroupStandingsCard({
  group,
  className,
  highlightedTeams,
  liveScoreByTeam,
}: {
  group: GroupStanding;
  className?: string;
  highlightedTeams?: string[];
  liveScoreByTeam?: LiveScoreByTeam;
}) {
  const t = useTranslations("matches");
  const highlightedTeamSet = highlightedTeams
    ? new Set(highlightedTeams)
    : null;

  return (
    <section
      className={cn("sports-panel corner-squircle overflow-hidden", className)}
    >
      <h2 className="border-b border-white/[0.08] px-3 py-2 text-center text-[12px] font-semibold text-foreground">
        {group.groupName}
      </h2>

      <div
        className={cn(
          ROW_GRID,
          "px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground",
        )}
      >
        <span aria-hidden />
        <span aria-hidden />
        <span>{t("team")}</span>
        {STAT_COLUMN_KEYS.map((column) => (
          <span key={column} className="text-center">
            {t(`standingsStats.${column}`)}
          </span>
        ))}
      </div>

      {group.rows.map((row, index) => (
        <StandingRow
          key={row.teamName}
          position={index + 1}
          row={row}
          highlighted={highlightedTeamSet?.has(row.teamName) ?? false}
          liveScore={liveScoreByTeam?.[row.teamName]}
        />
      ))}
    </section>
  );
}

interface GroupStandingsListProps {
  groups: GroupStanding[];
  liveScoreByTeam?: LiveScoreByTeam;
}

export function GroupStandingsList({
  groups,
  liveScoreByTeam,
}: GroupStandingsListProps) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      {groups.map((group) => (
        <GroupStandingsCard
          key={group.groupName}
          group={group}
          liveScoreByTeam={liveScoreByTeam}
        />
      ))}
    </div>
  );
}
