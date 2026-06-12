"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { MatchEvent } from "@/entities/match/model/types";
import { formatEventMinute } from "@/entities/match/lib/formatLiveData";
import { getTeamColor } from "@/features/matches/lib/teamColors";
import { formatMatchScore } from "@/shared/lib/formatMatchScore";
import { cn } from "@/lib/utils";

interface MatchEventsTimelineProps {
  events: MatchEvent[];
  homeTeamName: string;
  awayTeamName: string;
  teamColors?: Record<string, string>;
}

function eventIcon(type: MatchEvent["type"]): string {
  switch (type) {
    case "goal":
    case "penalty":
    case "own_goal":
      return "⚽";
    case "yellow_card":
      return "🟨";
    case "red_card":
    case "yellow_red_card":
      return "🟥";
    case "substitution":
      return "↔";
    default:
      return "•";
  }
}

function eventHeadline(event: MatchEvent): string {
  if (event.type === "substitution") {
    return `${event.secondary_player_name ?? "?"} → ${event.player_name}`;
  }

  if (
    event.type === "goal" ||
    event.type === "penalty" ||
    event.type === "own_goal"
  ) {
    const assist = event.secondary_player_name
      ? ` (${event.secondary_player_name})`
      : "";
    return `${event.player_name}${assist}`;
  }

  return event.player_name;
}

function eventScore(event: MatchEvent): string | null {
  if (
    (event.type === "goal" ||
      event.type === "penalty" ||
      event.type === "own_goal") &&
    event.score_home != null &&
    event.score_away != null
  ) {
    return formatMatchScore(event.score_home, event.score_away);
  }

  return null;
}

export function MatchEventsTimeline({
  events,
  homeTeamName,
  awayTeamName,
  teamColors = {},
}: MatchEventsTimelineProps) {
  const t = useTranslations("matches");

  const sorted = useMemo(
    () =>
      [...events].sort((a, b) => {
        const minuteDiff = a.minute - b.minute;
        if (minuteDiff !== 0) return minuteDiff;
        return (a.injury_time ?? 0) - (b.injury_time ?? 0);
      }),
    [events],
  );

  if (sorted.length === 0) {
    return <p className="text-xs text-white/50">{t("noEvents")}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((event) => {
        const isHome = event.side === "home";
        const teamName = isHome ? homeTeamName : awayTeamName;
        const accentColor = getTeamColor(teamColors, teamName);
        const score = eventScore(event);

        return (
          <li
            key={event.id}
            className="relative overflow-hidden rounded-2xl bg-white/5"
          >
            <div
              aria-hidden
              className={cn(
                "absolute inset-y-2 w-0.5 rounded-full",
                isHome ? "left-0" : "right-0",
              )}
              style={{ backgroundColor: accentColor }}
            />

            <div
              className={cn(
                "flex flex-col gap-2 px-3.5 py-3",
                isHome ? "pl-4 text-left" : "pr-4 text-right",
              )}
            >
              <p className="text-sm leading-snug text-white/90">
                {isHome ? (
                  <>
                    <span aria-hidden className="mr-1.5">
                      {eventIcon(event.type)}
                    </span>
                    {eventHeadline(event)}
                  </>
                ) : (
                  <>
                    {eventHeadline(event)}
                    <span aria-hidden className="ml-1.5">
                      {eventIcon(event.type)}
                    </span>
                  </>
                )}
              </p>

              <div
                className={cn(
                  "flex items-center justify-between text-xs tabular-nums",
                  !isHome && "flex-row-reverse",
                )}
              >
                <span className="text-white/50">
                  {formatEventMinute(event.minute, event.injury_time)}
                </span>
                {score ? (
                  <span className="font-medium text-white/80">{score}</span>
                ) : (
                  <span aria-hidden className="invisible">
                    —
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
