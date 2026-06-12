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

type GroupStandingsVariant = "panel" | "transparent";

function formatGoalDifference(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function LiveScoreChip({
  liveScore,
  variant,
}: {
  liveScore: TeamLiveScore;
  variant: GroupStandingsVariant;
}) {
  const { goalsFor, goalsAgainst } = liveScore;
  const liveVariant =
    goalsFor > goalsAgainst
      ? "winning"
      : goalsFor < goalsAgainst
        ? "losing"
        : "drawing";

  return (
    <span
      className={cn(
        "shrink-0 rounded px-1 py-px text-[9px] font-semibold leading-none tabular-nums",
        liveVariant === "winning" &&
          (variant === "transparent"
            ? "bg-emerald-500/20 text-emerald-300"
            : "bg-emerald-500/20 text-emerald-300"),
        liveVariant === "losing" &&
          (variant === "transparent"
            ? "bg-red-500/20 text-red-300"
            : "bg-red-500/20 text-red-300"),
        liveVariant === "drawing" &&
          (variant === "transparent"
            ? "bg-white/10 text-white/55"
            : "bg-white/10 text-muted-foreground"),
      )}
    >
      {formatMatchScore(goalsFor, goalsAgainst)}
    </span>
  );
}

function StandingStat({
  value,
  emphasize = false,
  variant,
}: {
  value: string | number;
  emphasize?: boolean;
  variant: GroupStandingsVariant;
}) {
  return (
    <span
      className={cn(
        "text-center text-[11px] leading-none tabular-nums",
        variant === "transparent"
          ? emphasize
            ? "font-semibold text-white"
            : "text-white/65"
          : emphasize
            ? "font-semibold text-foreground"
            : "text-foreground/90",
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
  variant,
}: {
  position: number;
  row: TeamStandingRow;
  highlighted?: boolean;
  liveScore?: TeamLiveScore;
  variant: GroupStandingsVariant;
}) {
  return (
    <div
      className={cn(
        ROW_GRID,
        "border-t px-3 py-2",
        variant === "transparent"
          ? "border-white/10"
          : "border-white/[0.08]",
        highlighted &&
          (variant === "transparent" ? "bg-white/10" : "bg-white/[0.07]"),
      )}
    >
      <span
        className={cn(
          "text-center text-[11px] leading-none tabular-nums",
          variant === "transparent" ? "text-white/45" : "text-muted-foreground",
        )}
      >
        {position}
      </span>

      <TeamFlag name={row.teamName} size={FLAG_SIZE} />

      <span className="flex min-w-0 items-center gap-1">
        <span
          className={cn(
            "truncate text-[11px] font-medium leading-tight",
            variant === "transparent" ? "text-white" : "text-foreground",
          )}
        >
          {row.teamName}
        </span>
        {liveScore && (
          <LiveScoreChip liveScore={liveScore} variant={variant} />
        )}
      </span>

      <StandingStat value={row.played} variant={variant} />
      <StandingStat value={row.won} variant={variant} />
      <StandingStat value={row.drawn} variant={variant} />
      <StandingStat value={row.lost} variant={variant} />
      <StandingStat
        value={formatGoalDifference(row.goalDifference)}
        variant={variant}
      />
      <StandingStat value={row.points} emphasize variant={variant} />
    </div>
  );
}

export function GroupStandingsCard({
  group,
  className,
  highlightedTeams,
  liveScoreByTeam,
  variant = "panel",
}: {
  group: GroupStanding;
  className?: string;
  highlightedTeams?: string[];
  liveScoreByTeam?: LiveScoreByTeam;
  variant?: GroupStandingsVariant;
}) {
  const t = useTranslations("matches");
  const highlightedTeamSet = highlightedTeams
    ? new Set(highlightedTeams)
    : null;
  const isTransparent = variant === "transparent";

  return (
    <section
      className={cn(
        isTransparent
          ? "overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06]"
          : "sports-panel corner-squircle overflow-hidden",
        className,
      )}
    >
      <h2
        className={cn(
          "border-b px-3 py-2 text-center text-[12px] font-semibold",
          isTransparent
            ? "border-white/10 text-white"
            : "border-white/[0.08] text-foreground",
        )}
      >
        {group.groupName}
      </h2>

      <div
        className={cn(
          ROW_GRID,
          "px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide",
          isTransparent ? "text-white/45" : "text-muted-foreground",
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
          variant={variant}
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
