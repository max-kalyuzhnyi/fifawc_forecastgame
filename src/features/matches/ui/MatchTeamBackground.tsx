import type { CSSProperties } from "react";
import {
  DEFAULT_TEAM_COLOR,
  getTeamColor,
} from "@/features/matches/lib/teamColors";
import { cn } from "@/lib/utils";

interface MatchTeamBackgroundProps {
  homeTeamName: string;
  awayTeamName: string;
  teamColors: Record<string, string>;
  className?: string;
}

export function MatchTeamBackground({
  homeTeamName,
  awayTeamName,
  teamColors,
  className,
}: MatchTeamBackgroundProps) {
  const home = getTeamColor(teamColors, homeTeamName);
  const away = getTeamColor(teamColors, awayTeamName);
  const hasCustomColors =
    home !== DEFAULT_TEAM_COLOR || away !== DEFAULT_TEAM_COLOR;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-t-[24px]",
        !hasCustomColors && "bg-[#1b2356]",
        className,
      )}
      aria-hidden
    >
      {hasCustomColors ? (
        <>
          <div
            className="match-team-bg-gradient absolute inset-0"
            style={
              {
                "--home-color": home,
                "--away-color": away,
              } as CSSProperties
            }
          />
          <div className="match-team-bg-fade absolute inset-0" />
          <div className="match-team-bg-noise absolute inset-0 opacity-30" />
        </>
      ) : null}
    </div>
  );
}
