import { getGroupMatchdayFromRoundKey } from "@/entities/match/lib/parseRoundKey";
import type { Match } from "@/entities/match/model/types";
import { getOnsideCode } from "@/shared/lib/onside/codes";
import type { OnsideUpset } from "@/shared/lib/onside/types";

function codesMatchPair(
  codeA: string,
  codeB: string,
  upsetHome: string,
  upsetAway: string,
): boolean {
  return (
    (codeA === upsetHome && codeB === upsetAway) ||
    (codeA === upsetAway && codeB === upsetHome)
  );
}

export function buildUpsetMatchIds(
  matches: Match[],
  upsets: OnsideUpset[],
): Set<string> {
  const upsetIds = new Set<string>();

  for (const match of matches) {
    const homeCode = getOnsideCode(match.home_team_name);
    const awayCode = getOnsideCode(match.away_team_name);
    const matchday = getGroupMatchdayFromRoundKey(match.round_key);

    if (!homeCode || !awayCode || matchday === null) {
      continue;
    }

    const isUpset = upsets.some(
      (upset) =>
        upset.matchday === matchday &&
        codesMatchPair(homeCode, awayCode, upset.home.code, upset.away.code),
    );

    if (isUpset) {
      upsetIds.add(match.id);
    }
  }

  return upsetIds;
}

export function isMatchUpsetWatch(
  match: Pick<Match, "id">,
  upsetMatchIds: Set<string> | string[],
): boolean {
  if (upsetMatchIds instanceof Set) {
    return upsetMatchIds.has(match.id);
  }

  return upsetMatchIds.includes(match.id);
}
