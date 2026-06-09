export interface TeamColorRow {
  name: string;
  primary_color: string | null;
}

export function buildTeamColorsMap(
  teams: TeamColorRow[],
): Record<string, string> {
  return Object.fromEntries(
    teams
      .filter((team): team is TeamColorRow & { primary_color: string } =>
        Boolean(team.primary_color),
      )
      .map((team) => [team.name, team.primary_color]),
  );
}

export const DEFAULT_TEAM_COLOR = "#1b2356";

export function getTeamColor(
  teamColors: Record<string, string>,
  teamName: string,
): string {
  return teamColors[teamName] ?? DEFAULT_TEAM_COLOR;
}
