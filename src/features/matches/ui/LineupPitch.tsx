"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { LineupPlayer, MatchEvent, MatchEventSide } from "@/entities/match/model/types";
import {
  buildPlayerBadges,
  formatPlayerShortName,
  getPlayerBadge,
  parseFormation,
  type FormationSlot,
  type PlayerBadge,
} from "@/features/matches/lib/formation";
import {
  getPlayerPhotoUrl,
  type PlayerPhotosByTeam,
} from "@/features/matches/lib/playerPhotos";
import { PlayerAvatar } from "@/shared/ui/PlayerAvatar";

interface LineupPitchProps {
  formation: string | null;
  lineup: LineupPlayer[];
  teamId: string | null;
  playerPhotosByTeam: PlayerPhotosByTeam;
  matchEvents: MatchEvent[];
  side: MatchEventSide;
}

function PitchMarkings() {
  const cornerRadius = 3;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-0 size-full"
      viewBox="0 0 68 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <rect
        x="4"
        y="4"
        width="60"
        height="92"
        rx={cornerRadius}
        ry={cornerRadius}
        fill="none"
        stroke="white"
        strokeOpacity="0.28"
        strokeWidth="0.5"
      />
      <line
        x1="4"
        y1="50"
        x2="64"
        y2="50"
        stroke="white"
        strokeOpacity="0.28"
        strokeWidth="0.5"
      />
      <circle
        cx="34"
        cy="50"
        r="8"
        fill="none"
        stroke="white"
        strokeOpacity="0.28"
        strokeWidth="0.5"
      />
      <rect
        x="18"
        y="4"
        width="32"
        height="14"
        fill="none"
        stroke="white"
        strokeOpacity="0.28"
        strokeWidth="0.5"
      />
      <rect
        x="18"
        y="82"
        width="32"
        height="14"
        fill="none"
        stroke="white"
        strokeOpacity="0.28"
        strokeWidth="0.5"
      />
    </svg>
  );
}

function EventBadges({ badge }: { badge: PlayerBadge | null }) {
  if (!badge) return null;

  return (
    <div className="absolute -right-1 -top-1 flex items-center gap-0.5">
      {badge.goals > 0 && (
        <span
          className="flex size-3.5 items-center justify-center rounded-full bg-[#0d1224] text-[8px] leading-none ring-1 ring-white/20"
          aria-hidden
        >
          {badge.goals > 1 ? badge.goals : "⚽"}
        </span>
      )}
      {badge.yellow && (
        <span
          className="block h-2.5 w-1.5 rounded-[1px] bg-yellow-400"
          aria-hidden
        />
      )}
      {badge.red && (
        <span
          className="block h-2.5 w-1.5 rounded-[1px] bg-red-500"
          aria-hidden
        />
      )}
    </div>
  );
}

function PlayerToken({
  slot,
  teamId,
  playerPhotosByTeam,
  badge,
  gkLabel,
}: {
  slot: FormationSlot;
  teamId: string | null;
  playerPhotosByTeam: PlayerPhotosByTeam;
  badge: PlayerBadge | null;
  gkLabel: string;
}) {
  const { player, x, y, isGK } = slot;

  return (
    <div
      className="absolute z-10 flex w-[18%] min-w-[52px] max-w-[72px] -translate-x-1/2 -translate-y-1/2 flex-col items-center"
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
    >
      <div className="relative isolate">
        <PlayerAvatar
          name={player.name}
          photoUrl={getPlayerPhotoUrl(
            playerPhotosByTeam,
            teamId,
            player.shirtNumber,
          )}
          size={40}
          className="bg-[#1a2038] ring-2 ring-white/35"
        />
        <EventBadges badge={badge} />
      </div>
      <div className="mt-0.5 w-full px-0.5">
        <p className="truncate text-center text-[9px] font-medium leading-tight text-white">
          {formatPlayerShortName(player.name)}
        </p>
        <p className="text-center text-[11px] font-medium tabular-nums leading-tight text-white/90">
          {isGK ? (
            <>
              {gkLabel}
              {player.shirtNumber != null ? ` • ${player.shirtNumber}` : ""}
            </>
          ) : (
            (player.shirtNumber ?? "")
          )}
        </p>
      </div>
    </div>
  );
}

function LineupListFallback({
  lineup,
  teamId,
  playerPhotosByTeam,
  matchEvents,
  side,
}: {
  lineup: LineupPlayer[];
  teamId: string | null;
  playerPhotosByTeam: PlayerPhotosByTeam;
  matchEvents: MatchEvent[];
  side: MatchEventSide;
}) {
  const badges = useMemo(
    () => buildPlayerBadges(matchEvents, side),
    [matchEvents, side],
  );

  return (
    <ul className="flex flex-col gap-0.5">
      {lineup.map((player) => (
        <li
          key={`${player.id}-${player.shirtNumber ?? player.name}`}
          className="flex items-center gap-1.5 text-[11px] text-white/75"
        >
          <div className="relative">
            <PlayerAvatar
              name={player.name}
              photoUrl={getPlayerPhotoUrl(
                playerPhotosByTeam,
                teamId,
                player.shirtNumber,
              )}
              size={20}
            />
            <EventBadges
              badge={getPlayerBadge(badges, player.name, matchEvents, side)}
            />
          </div>
          {player.shirtNumber != null && (
            <span className="w-4 shrink-0 tabular-nums text-white/45">
              {player.shirtNumber}
            </span>
          )}
          <span className="min-w-0 truncate">{player.name}</span>
        </li>
      ))}
    </ul>
  );
}

export function LineupPitch({
  formation,
  lineup,
  teamId,
  playerPhotosByTeam,
  matchEvents,
  side,
}: LineupPitchProps) {
  const t = useTranslations("matches");
  const slots = useMemo(
    () => parseFormation(formation, lineup),
    [formation, lineup],
  );
  const badges = useMemo(
    () => buildPlayerBadges(matchEvents, side),
    [matchEvents, side],
  );

  if (!slots) {
    return (
      <LineupListFallback
        lineup={lineup}
        teamId={teamId}
        playerPhotosByTeam={playerPhotosByTeam}
        matchEvents={matchEvents}
        side={side}
      />
    );
  }

  return (
    <div className="relative isolate mx-auto aspect-[68/100] w-full max-w-sm">
      <PitchMarkings />
      {slots.map((slot) => (
        <PlayerToken
          key={`${slot.player.id}-${slot.player.shirtNumber ?? slot.player.name}`}
          slot={slot}
          teamId={teamId}
          playerPhotosByTeam={playerPhotosByTeam}
          badge={getPlayerBadge(
            badges,
            slot.player.name,
            matchEvents,
            side,
          )}
          gkLabel={t("gk")}
        />
      ))}
    </div>
  );
}
