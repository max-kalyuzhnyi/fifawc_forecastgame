"use client";

import { useTranslations } from "next-intl";
import type { TeamLineup } from "@/entities/match/model/types";
import {
  getPlayerPhotoUrl,
  type PlayerPhotosByTeam,
} from "@/features/matches/lib/playerPhotos";
import { PlayerAvatar } from "@/shared/ui/PlayerAvatar";

interface MatchLineupsProps {
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeLineup: TeamLineup | null;
  awayLineup: TeamLineup | null;
  playerPhotosByTeam: PlayerPhotosByTeam;
}

function LineupColumn({
  teamName,
  teamId,
  lineup,
  playerPhotosByTeam,
  t,
}: {
  teamName: string;
  teamId: string | null;
  lineup: TeamLineup;
  playerPhotosByTeam: PlayerPhotosByTeam;
  t: ReturnType<typeof useTranslations<"matches">>;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div>
        <p className="line-clamp-1 text-xs font-semibold text-white/90">
          {teamName}
        </p>
        {lineup.formation && (
          <p className="text-[10px] text-white/50">{lineup.formation}</p>
        )}
        {lineup.coach && (
          <p className="text-[10px] text-white/45">
            {t("coach", { name: lineup.coach })}
          </p>
        )}
      </div>

      {lineup.lineup.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-white/45">
            {t("startingXi")}
          </p>
          <ul className="flex flex-col gap-0.5">
            {lineup.lineup.map((player) => (
              <li
                key={`${player.id}-${player.shirtNumber ?? player.name}`}
                className="flex items-center gap-1.5 text-[11px] text-white/75"
              >
                <PlayerAvatar
                  name={player.name}
                  photoUrl={getPlayerPhotoUrl(
                    playerPhotosByTeam,
                    teamId,
                    player.shirtNumber,
                  )}
                  size={20}
                />
                {player.shirtNumber != null && (
                  <span className="w-4 shrink-0 tabular-nums text-white/45">
                    {player.shirtNumber}
                  </span>
                )}
                <span className="min-w-0 truncate">{player.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {lineup.bench.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-white/45">
            {t("bench")}
          </p>
          <ul className="flex flex-col gap-0.5">
            {lineup.bench.map((player) => (
              <li
                key={`bench-${player.id}-${player.shirtNumber ?? player.name}`}
                className="flex items-center gap-1.5 text-[11px] text-white/60"
              >
                <PlayerAvatar
                  name={player.name}
                  photoUrl={getPlayerPhotoUrl(
                    playerPhotosByTeam,
                    teamId,
                    player.shirtNumber,
                  )}
                  size={20}
                />
                {player.shirtNumber != null && (
                  <span className="w-4 shrink-0 tabular-nums text-white/40">
                    {player.shirtNumber}
                  </span>
                )}
                <span className="min-w-0 truncate">{player.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
}: MatchLineupsProps) {
  const t = useTranslations("matches");

  if (!homeLineup && !awayLineup) {
    return (
      <p className="text-xs text-white/50">{t("lineupsUnavailable")}</p>
    );
  }

  return (
    <div className="flex gap-4">
      {homeLineup ? (
        <LineupColumn
          teamName={homeTeamName}
          teamId={homeTeamId}
          lineup={homeLineup}
          playerPhotosByTeam={playerPhotosByTeam}
          t={t}
        />
      ) : (
        <div className="min-w-0 flex-1">
          <p className="text-xs text-white/50">{t("tbd", { team: homeTeamName })}</p>
        </div>
      )}

      {awayLineup ? (
        <LineupColumn
          teamName={awayTeamName}
          teamId={awayTeamId}
          lineup={awayLineup}
          playerPhotosByTeam={playerPhotosByTeam}
          t={t}
        />
      ) : (
        <div className="min-w-0 flex-1 text-right">
          <p className="text-xs text-white/50">{t("tbd", { team: awayTeamName })}</p>
        </div>
      )}
    </div>
  );
}
