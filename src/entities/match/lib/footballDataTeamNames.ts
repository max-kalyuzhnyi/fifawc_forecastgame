/** football-data.org team name → OpenFootball / our DB team name */
export const FD_TO_OUR_TEAM_NAME: Record<string, string> = {
  "United States": "USA",
  "Korea Republic": "South Korea",
  "IR Iran": "Iran",
  "Côte d'Ivoire": "Ivory Coast",
  "Cote d'Ivoire": "Ivory Coast",
  "Bosnia-Herzegovina": "Bosnia & Herzegovina",
  "Czechia": "Czech Republic",
  "Cape Verde Islands": "Cape Verde",
  "Congo DR": "DR Congo",
  "Curaçao": "Curacao",
};

/** OpenFootball / our DB team name → football-data.org team name */
export const OUR_TO_FD_TEAM_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(FD_TO_OUR_TEAM_NAME).map(([fd, ours]) => [ours, fd]),
);

export function normalizeFdTeamName(fdName: string): string {
  return FD_TO_OUR_TEAM_NAME[fdName] ?? fdName;
}

export function normalizeOurTeamName(ourName: string): string {
  return OUR_TO_FD_TEAM_NAME[ourName] ?? ourName;
}

export function teamNamesMatch(
  fdHome: string,
  fdAway: string,
  ourHome: string,
  ourAway: string,
): boolean {
  return (
    normalizeFdTeamName(fdHome) === ourHome &&
    normalizeFdTeamName(fdAway) === ourAway
  );
}
