import "server-only";

import type {
  OnsideMatchPrediction,
  OnsideTeamInfo,
  OnsideUpsetsResponse,
  TeamCompare,
} from "@/shared/lib/onside/types";

export type {
  OnsideAttribution,
  OnsideMatchPrediction,
  OnsidePlPlayer,
  OnsideTeamInfo,
  OnsideTeamSummary,
  OnsideUpset,
  OnsideUpsetsResponse,
  TeamCompare,
} from "@/shared/lib/onside/types";

const API_BASE = (
  process.env.ONSIDE_API_BASE ?? "https://onsidearena.com/api/v1"
).replace(/\/$/, "");

const USER_AGENT =
  process.env.ONSIDE_USER_AGENT ?? "fifawc-forecastgame/1.0";

const REVALIDATE_SECONDS = 300;
const FETCH_TIMEOUT_MS = 4_000;

async function fetchOnside<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T | null> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!res.ok) {
      return null;
    }

    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getMatchPrediction(
  homeCode: string,
  awayCode: string,
): Promise<OnsideMatchPrediction | null> {
  return fetchOnside<OnsideMatchPrediction>("/wc/predict", {
    home: homeCode.toLowerCase(),
    away: awayCode.toLowerCase(),
  });
}

export async function getTeamInfo(
  teamCode: string,
): Promise<OnsideTeamInfo | null> {
  return fetchOnside<OnsideTeamInfo>(
    `/wc/team/${teamCode.toLowerCase()}`,
  );
}

export async function getUpsets(
  limit = 50,
): Promise<OnsideUpsetsResponse | null> {
  return fetchOnside<OnsideUpsetsResponse>("/wc/upsets", { limit });
}

export async function compareTeams(
  homeCode: string,
  awayCode: string,
): Promise<TeamCompare | null> {
  const [home, away, prediction] = await Promise.all([
    getTeamInfo(homeCode),
    getTeamInfo(awayCode),
    getMatchPrediction(homeCode, awayCode),
  ]);

  if (!home || !away || !prediction) {
    return null;
  }

  return { home, away, prediction };
}
