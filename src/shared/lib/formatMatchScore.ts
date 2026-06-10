export function formatMatchScore(
  home: number | null | undefined,
  away: number | null | undefined,
): string {
  return `${home ?? 0}:${away ?? 0}`;
}
