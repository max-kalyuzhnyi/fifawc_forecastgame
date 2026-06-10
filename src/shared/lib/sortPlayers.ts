export type PlayerPosition = "GK" | "DF" | "MF" | "FW";

const POSITION_ORDER: Record<PlayerPosition, number> = {
  FW: 0,
  MF: 1,
  DF: 2,
  GK: 3,
};

export interface SortablePlayer {
  name: string;
  position?: PlayerPosition | string | null;
  shirt_number?: number | null;
}

function positionSortKey(position: string | null | undefined): number {
  if (position && position in POSITION_ORDER) {
    return POSITION_ORDER[position as PlayerPosition];
  }
  return 99;
}

export function sortPlayersForScorerSelect<T extends SortablePlayer>(
  players: T[],
): T[] {
  return [...players].sort((a, b) => {
    const posDiff =
      positionSortKey(a.position) - positionSortKey(b.position);
    if (posDiff !== 0) return posDiff;

    const numA = a.shirt_number ?? 999;
    const numB = b.shirt_number ?? 999;
    if (numA !== numB) return numA - numB;

    return a.name.localeCompare(b.name);
  });
}
