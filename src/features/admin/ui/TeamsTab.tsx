"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { AdminPlayer, AdminTeam } from "@/features/admin/lib/types";
import { TeamName } from "@/shared/ui/TeamFlag";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TeamsTabProps {
  teams: AdminTeam[];
  players: AdminPlayer[];
}

export function TeamsTab({ teams, players }: TeamsTabProps) {
  const t = useTranslations("admin");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
    teams[0]?.id ?? null,
  );

  const playersByTeam = new Map<string, AdminPlayer[]>();
  for (const player of players) {
    const list = playersByTeam.get(player.team_id) ?? [];
    list.push(player);
    playersByTeam.set(player.team_id, list);
  }

  for (const [teamId, teamPlayers] of playersByTeam) {
    teamPlayers.sort((a, b) => a.name.localeCompare(b.name));
    playersByTeam.set(teamId, teamPlayers);
  }

  const selectedPlayers = selectedTeamId
    ? (playersByTeam.get(selectedTeamId) ?? [])
    : [];

  if (teams.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("teams.noTeams")}</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {teams.map((team) => (
          <button
            key={team.id}
            type="button"
            onClick={() => setSelectedTeamId(team.id)}
            className={`rounded-2xl px-3 py-2 text-sm transition-colors ${
              selectedTeamId === team.id
                ? "bg-primary text-primary-foreground"
                : "bg-white/5 hover:bg-white/10"
            }`}
          >
            <TeamName name={team.name} flagSize={16} />
          </button>
        ))}
      </div>

      <Card className="glass corner-squircle border-0 bg-transparent shadow-none ring-0">
        <CardHeader>
          <CardTitle>{t("teams.squad")}</CardTitle>
          <CardDescription>
            {t("teams.playersCount", { count: selectedPlayers.length })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {selectedPlayers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("teams.noPlayers")}
            </p>
          ) : (
            selectedPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2"
              >
                {player.photo_url ? (
                  <div className="relative size-8 shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={player.photo_url}
                      alt={player.name}
                      width={32}
                      height={32}
                      unoptimized
                      className="size-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {player.shirt_number ?? "–"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{player.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {player.position
                      ? t("teams.positionNumber", {
                          position: player.position,
                          number: player.shirt_number ?? "–",
                        })
                      : t("teams.numberOnly", {
                          number: player.shirt_number ?? "–",
                        })}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
