export type PlayerPhotosByTeam = Record<string, Record<number, string>>;

interface PlayerPhotoRow {
  team_id: string;
  shirt_number: number | null;
  photo_url: string | null;
}

export function buildPlayerPhotosMap(
  players: PlayerPhotoRow[],
): PlayerPhotosByTeam {
  const map: PlayerPhotosByTeam = {};

  for (const player of players) {
    if (!player.photo_url || player.shirt_number == null) continue;

    const byShirt = map[player.team_id] ?? {};
    byShirt[player.shirt_number] = player.photo_url;
    map[player.team_id] = byShirt;
  }

  return map;
}

export function getPlayerPhotoUrl(
  playerPhotosByTeam: PlayerPhotosByTeam,
  teamId: string | null | undefined,
  shirtNumber: number | null | undefined,
): string | null {
  if (!teamId || shirtNumber == null) return null;
  return playerPhotosByTeam[teamId]?.[shirtNumber] ?? null;
}
