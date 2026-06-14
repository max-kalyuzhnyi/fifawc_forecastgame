"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type {
  MatchEvent,
  MatchEventSide,
  TeamLineup,
} from "@/entities/match/model/types";
import {
  getPlayerPhotoUrl,
  type PlayerPhotosByTeam,
} from "@/features/matches/lib/playerPhotos";
import { LineupPitch } from "@/features/matches/ui/LineupPitch";
import { cn } from "@/lib/utils";
import { PlayerAvatar } from "@/shared/ui/PlayerAvatar";
import { TeamFlag } from "@/shared/ui/TeamFlag";

interface MatchLineupsProps {
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeLineup: TeamLineup | null;
  awayLineup: TeamLineup | null;
  playerPhotosByTeam: PlayerPhotosByTeam;
  matchEvents: MatchEvent[];
}

function getDefaultSide(
  homeLineup: TeamLineup | null,
  awayLineup: TeamLineup | null,
): MatchEventSide {
  if (homeLineup?.lineup.length) return "home";
  if (awayLineup?.lineup.length) return "away";
  return "home";
}

function TeamSelector({
  side,
  selected,
  teamName,
  formation,
  onSelect,
}: {
  side: MatchEventSide;
  selected: boolean;
  teamName: string;
  formation: string | null;
  onSelect: (side: MatchEventSide) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(side)}
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors",
        selected
          ? "bg-white/15 text-white"
          : "bg-transparent text-white/55 hover:text-white/80",
      )}
    >
      <TeamFlag name={teamName} size={24} className="shrink-0" />
      <div className="min-w-0 flex flex-1 flex-col">
        <span className="line-clamp-1 text-xs font-medium leading-tight">
          {teamName}
        </span>
        {formation && (
          <span
            className={cn(
              "text-[10px] leading-tight",
              selected ? "text-white/55" : "text-white/40",
            )}
          >
            {formation}
          </span>
        )}
      </div>
    </button>
  );
}

function BenchList({
  bench,
  teamId,
  playerPhotosByTeam,
  t,
}: {
  bench: TeamLineup["bench"];
  teamId: string | null;
  playerPhotosByTeam: PlayerPhotosByTeam;
  t: ReturnType<typeof useTranslations<"matches">>;
}) {
  if (bench.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">
          {t("bench")}
        </p>
        <p className="text-[10px] font-medium uppercase tracking-wide text-white/35">
          {t("subs")}
        </p>
      </div>
      <ul className="flex flex-col gap-1">
        {bench.map((player) => (
          <li
            key={`bench-${player.id}-${player.shirtNumber ?? player.name}`}
            className="flex items-center gap-2 text-[11px] text-white/70"
          >
            {player.shirtNumber != null && (
              <span className="w-5 shrink-0 tabular-nums text-white/45">
                {player.shirtNumber}
              </span>
            )}
            <PlayerAvatar
              name={player.name}
              photoUrl={getPlayerPhotoUrl(
                playerPhotosByTeam,
                teamId,
                player.shirtNumber,
              )}
              size={20}
            />
            <span className="min-w-0 truncate">{player.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MatchLineups({
  homeTeamName,
  awayTeamName,
  homeTeamId,
  awayTeamId,
  homeLineup,
  awayLineup,
  playerPhotosByTeam,
  matchEvents,
}: MatchLineupsProps) {
  const t = useTranslations("matches");
  const [selectedSide, setSelectedSide] = useState<MatchEventSide>(() =>
    getDefaultSide(homeLineup, awayLineup),
  );

  const selectedLineup = selectedSide === "home" ? homeLineup : awayLineup;
  const selectedTeamName =
    selectedSide === "home" ? homeTeamName : awayTeamName;
  const selectedTeamId = selectedSide === "home" ? homeTeamId : awayTeamId;

  const hasAnyLineup = useMemo(
    () =>
      Boolean(
        homeLineup?.lineup.length ||
          awayLineup?.lineup.length ||
          homeLineup?.bench.length ||
          awayLineup?.bench.length,
      ),
    [homeLineup, awayLineup],
  );

  if (!hasAnyLineup) {
    return (
      <p className="text-xs text-white/50">{t("lineupsUnavailable")}</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-2xl bg-white/5 p-1 ring-1 ring-white/10">
        <TeamSelector
          side="home"
          selected={selectedSide === "home"}
          teamName={homeTeamName}
          formation={homeLineup?.formation ?? null}
          onSelect={setSelectedSide}
        />
        <TeamSelector
          side="away"
          selected={selectedSide === "away"}
          teamName={awayTeamName}
          formation={awayLineup?.formation ?? null}
          onSelect={setSelectedSide}
        />
      </div>

      {selectedLineup ? (
        <>
          {selectedLineup.coach && (
            <p className="text-center text-[10px] text-white/45">
              {t("coach", { name: selectedLineup.coach })}
            </p>
          )}

          {selectedLineup.lineup.length > 0 ? (
            <div>
              <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wide text-white/45">
                {t("startingXi")}
              </p>
              <LineupPitch
                formation={selectedLineup.formation}
                lineup={selectedLineup.lineup}
                teamId={selectedTeamId}
                playerPhotosByTeam={playerPhotosByTeam}
                matchEvents={matchEvents}
                side={selectedSide}
              />
            </div>
          ) : (
            <p className="text-center text-xs text-white/50">
              {t("tbd", { team: selectedTeamName })}
            </p>
          )}

          <BenchList
            bench={selectedLineup.bench}
            teamId={selectedTeamId}
            playerPhotosByTeam={playerPhotosByTeam}
            t={t}
          />
        </>
      ) : (
        <p className="text-center text-xs text-white/50">
          {t("tbd", { team: selectedTeamName })}
        </p>
      )}
    </div>
  );
}
