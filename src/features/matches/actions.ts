"use server";

import { createClient } from "@/shared/lib/supabase/server";
import { fetchPlayersByTeamIds } from "@/features/matches/lib/playersByMatch";
import { getOnsideCode } from "@/shared/lib/onside/codes";
import { compareTeams, getMatchPrediction } from "@/shared/lib/onside/client";
import {
  suggestScorelines,
  type ScoreSuggestion,
} from "@/shared/lib/onside/scoreModel";
import type { TeamCompare } from "@/shared/lib/onside/types";

export type { ScoreSuggestion } from "@/shared/lib/onside/scoreModel";

export type MatchModel = TeamCompare;

export interface MatchPlayerOption {
  id: string;
  name: string;
  team_id: string;
  position: "GK" | "DF" | "MF" | "FW" | null;
  shirt_number: number | null;
  photo_url: string | null;
}

export async function loadMatchModel(
  homeName: string,
  awayName: string,
): Promise<MatchModel | null> {
  const homeCode = getOnsideCode(homeName);
  const awayCode = getOnsideCode(awayName);

  if (!homeCode || !awayCode) {
    return null;
  }

  return compareTeams(homeCode, awayCode);
}

function alignSuggestionsToMatchSide(
  suggestions: ScoreSuggestion[],
  requestedHomeCode: string,
  predictionHomeCode: string,
): ScoreSuggestion[] {
  if (requestedHomeCode.toLowerCase() === predictionHomeCode.toLowerCase()) {
    return suggestions;
  }

  return suggestions.map((suggestion) => ({
    ...suggestion,
    outcome:
      suggestion.outcome === "home"
        ? "away"
        : suggestion.outcome === "away"
          ? "home"
          : "draw",
    home: suggestion.away,
    away: suggestion.home,
  }));
}

export async function loadScoreSuggestions(
  homeName: string,
  awayName: string,
): Promise<ScoreSuggestion[] | null> {
  const homeCode = getOnsideCode(homeName);
  const awayCode = getOnsideCode(awayName);

  if (!homeCode || !awayCode) {
    return null;
  }

  const prediction = await getMatchPrediction(homeCode, awayCode);

  if (!prediction) {
    return null;
  }

  const suggestions = suggestScorelines(prediction);

  return alignSuggestionsToMatchSide(
    suggestions,
    homeCode,
    prediction.home.code,
  );
}

export async function loadMatchPlayers(
  homeTeamId: string | null,
  awayTeamId: string | null,
): Promise<MatchPlayerOption[]> {
  const teamIds = [homeTeamId, awayTeamId].filter(Boolean) as string[];

  if (teamIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  return fetchPlayersByTeamIds(supabase, teamIds);
}
