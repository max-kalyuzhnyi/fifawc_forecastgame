/** API-Football team name → our teams.name (OpenFootball naming). */
export const API_FOOTBALL_TO_OUR_TEAM_NAME: Record<string, string> = {
  "United States": "USA",
  "USA": "USA",
  "Korea Republic": "South Korea",
  "South Korea": "South Korea",
  "IR Iran": "Iran",
  "Iran": "Iran",
  "Côte d'Ivoire": "Ivory Coast",
  "Cote d'Ivoire": "Ivory Coast",
  "Ivory Coast": "Ivory Coast",
  "Bosnia-Herzegovina": "Bosnia & Herzegovina",
  "Bosnia and Herzegovina": "Bosnia & Herzegovina",
  "Czechia": "Czech Republic",
  "Cape Verde Islands": "Cape Verde",
  "Congo DR": "DR Congo",
  "Curaçao": "Curacao",
  "Curacao": "Curacao",
  "Türkiye": "Turkey",
  "Turkiye": "Turkey",
};

/** Our teams.name → API-Football search terms (free plan has no WC 2026 season list). */
export const OUR_TO_API_SEARCH_TERMS: Record<string, string[]> = {
  USA: ["United States"],
  "Bosnia & Herzegovina": ["Bosnia", "Bosnia-Herzegovina"],
  "Ivory Coast": ["Ivory Coast", "Cote d'Ivoire"],
  "DR Congo": ["DR Congo", "Congo DR"],
  "Czech Republic": ["Czech Republic", "Czechia"],
  "South Korea": ["South Korea", "Korea Republic"],
  Curaçao: ["Curacao", "Curaçao"],
  Turkey: ["Turkey", "Türkiye", "Turkiye"],
};

export function mapApiFootballTeamName(apiName: string): string {
  return API_FOOTBALL_TO_OUR_TEAM_NAME[apiName.trim()] ?? apiName.trim();
}

export function isPlaceholderTeamName(name: string): boolean {
  if (/[\/]/.test(name)) return true;
  return /^[WL]?\d+[A-L]?$/.test(name) || /^\d[A-L]$/.test(name);
}

export function isMenNationalTeam(apiTeamName: string): boolean {
  const name = apiTeamName.trim();
  if (name.endsWith(" W")) return false;
  if (/women/i.test(name)) return false;
  return true;
}

export function getApiSearchTermsForOurTeam(ourTeamName: string): string[] {
  return OUR_TO_API_SEARCH_TERMS[ourTeamName] ?? [ourTeamName];
}

export interface ApiFootballTeamSearchResult {
  id: number;
  name: string;
  code: string | null;
  national: boolean;
}

export function pickApiNationalTeam(
  ourTeamName: string,
  results: ApiFootballTeamSearchResult[],
): ApiFootballTeamSearchResult | null {
  const mappedOurName = ourTeamName.trim();

  for (const team of results) {
    if (!team.national || !isMenNationalTeam(team.name)) continue;
    if (mapApiFootballTeamName(team.name) === mappedOurName) return team;
  }

  for (const team of results) {
    if (!team.national || !isMenNationalTeam(team.name)) continue;
    if (team.name.trim() === mappedOurName) return team;
  }

  const nationalMen = results.filter(
    (team) => team.national && isMenNationalTeam(team.name),
  );
  return nationalMen.length === 1 ? nationalMen[0] : null;
}

export function normalizePlayerName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface DbPlayerForMatch {
  id: string;
  team_id: string;
  name: string;
  shirt_number: number | null;
}

export interface ApiSquadPlayer {
  id: number;
  name: string;
  number: number | null;
  photo: string | null;
}

export function matchApiPlayerToDb(
  apiPlayer: ApiSquadPlayer,
  dbPlayers: DbPlayerForMatch[],
): DbPlayerForMatch | null {
  if (apiPlayer.number != null) {
    const byNumber = dbPlayers.find(
      (player) => player.shirt_number === apiPlayer.number,
    );
    if (byNumber) return byNumber;
  }

  const apiName = normalizePlayerName(apiPlayer.name);
  const byName = dbPlayers.find(
    (player) => normalizePlayerName(player.name) === apiName,
  );
  if (byName) return byName;

  const apiParts = apiName.split(" ").filter(Boolean);
  if (apiParts.length >= 2) {
    const apiLast = apiParts[apiParts.length - 1];
    const candidates = dbPlayers.filter((player) => {
      const dbParts = normalizePlayerName(player.name).split(" ").filter(Boolean);
      if (dbParts.length === 0) return false;
      return dbParts[dbParts.length - 1] === apiLast;
    });
    if (candidates.length === 1) return candidates[0];
  }

  return null;
}

/** Known placeholder silhouette from API-Football CDN (bytes). */
export const API_FOOTBALL_PLACEHOLDER_SIZES = new Set([8186, 8187, 8188]);

export function isLikelyPlaceholderPhoto(
  bytes: Buffer,
  contentType: string | null,
): boolean {
  if (!contentType?.startsWith("image/")) return true;
  if (bytes.length < 1024) return true;
  if (API_FOOTBALL_PLACEHOLDER_SIZES.has(bytes.length)) return true;
  return false;
}
