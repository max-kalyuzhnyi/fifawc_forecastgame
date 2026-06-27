import type { Match, MatchEvent } from "@/entities/match/model/types";
import {
  buildPlayersByMatch,
  fetchPlayersByTeamIds,
  getMatchTeamIds,
} from "@/features/matches/lib/playersByMatch";
import { buildPredictionsByMatch } from "@/features/matches/lib/predictionsByMatch";
import { buildPlayerPhotosMap } from "@/features/matches/lib/playerPhotos";
import { buildTeamColorsMap } from "@/features/matches/lib/teamColors";
import { buildVoterMap } from "@/features/matches/lib/voterInfo";
import type { MatchPlayerOption } from "@/features/matches/actions";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import type { PlayerPhotosByTeam } from "@/features/matches/lib/playerPhotos";
import type { PredictionDetail } from "@/features/matches/lib/predictionDetail";
import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";
import { loadUserPredictionMap } from "@/features/predictions/lib/loadUserPredictionMap";
import { getCurrentUserId } from "@/shared/lib/auth";
import { getUpsets } from "@/shared/lib/onside/client";
import { buildUpsetMatchIds } from "@/shared/lib/onside/upsets";
import { hasPlayoffSchedule } from "@/shared/lib/playoff/config";
import { buildMatchScorers } from "@/shared/lib/scorers";
import { fetchAllRows } from "@/shared/lib/supabase/fetchAllRows";
import { createClient } from "@/shared/lib/supabase/server";

export interface MatchesBundle {
  matches: Match[];
  voterMap: Record<string, MatchVoterInfo>;
  predictionMap: Record<string, PredictionDetail>;
  playersByMatch: Record<string, MatchPlayerOption[]>;
  predictionsByMatch: Record<string, MatchPredictionEntry[]>;
  scorersByMatch: Record<string, string[]>;
  scorerPlayerIdsByMatch: Record<string, string[]>;
  eventsByMatch: Record<string, MatchEvent[]>;
  currentUserId: string | null;
  teamColors: Record<string, string>;
  playerPhotosByTeam: PlayerPhotosByTeam;
  upsetMatchIds: string[];
  showPlayoffUi: boolean;
  userTier: number;
}

export async function loadMatchesBundle(): Promise<MatchesBundle> {
  const supabase = await createClient();
  const userId = await getCurrentUserId();
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("kickoff_at", { ascending: true });

  const matchList = (matches ?? []) as Match[];
  const teamIds = getMatchTeamIds(matchList);

  const [
    predictions,
    allPredictions,
    { data: profiles },
    { data: players },
    { data: teams },
    matchEvents,
    { data: userTierRow },
  ] = await Promise.all([
    userId
      ? loadUserPredictionMap(supabase, userId)
      : Promise.resolve({} as Record<string, PredictionDetail>),
    fetchAllRows((from, to) =>
      supabase
        .from("predictions")
        .select(
          "match_id, user_id, home_score, away_score, scorer_name, scorer_player_id, boost_multiplier, round_key",
        )
        .order("id", { ascending: true })
        .range(from, to),
    ),
    supabase.from("profiles").select("id, display_name, photo_url"),
    fetchPlayersByTeamIds(supabase, teamIds).then((data) => ({ data })),
    supabase.from("teams").select("name, primary_color"),
    fetchAllRows((from, to) =>
      supabase
        .from("match_events")
        .select("*")
        .order("id", { ascending: true })
        .range(from, to),
    ),
    userId
      ? supabase
          .from("playoff_tiers")
          .select("tier")
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null as { tier: number } | null }),
  ]);

  const eventsByMatch: Record<string, MatchEvent[]> = {};
  for (const event of [...matchEvents].sort((a, b) => a.minute - b.minute)) {
    const list = eventsByMatch[event.match_id] ?? [];
    list.push(event as MatchEvent);
    eventsByMatch[event.match_id] = list;
  }

  const voterMap = Object.fromEntries(
    buildVoterMap(allPredictions, profiles ?? []),
  );

  const playersByMatch = buildPlayersByMatch(matchList, players ?? []);

  const predictionsByMatch = buildPredictionsByMatch(
    allPredictions,
    profiles ?? [],
  );

  const {
    namesByMatch: scorersByMatch,
    playerIdsByMatch: scorerPlayerIdsByMatch,
  } = buildMatchScorers(
    matchEvents.map((event) => ({
      matchId: event.match_id,
      type: event.type,
      playerName: event.player_name,
    })),
    players ?? [],
  );

  const teamColors = buildTeamColorsMap(teams ?? []);
  const playerPhotosByTeam = buildPlayerPhotosMap(
    (players ?? []).map((player) => ({
      team_id: player.team_id,
      shirt_number: player.shirt_number,
      photo_url: player.photo_url,
    })),
  );

  const upsetsResponse = await getUpsets();
  const upsetMatchIds = upsetsResponse
    ? [...buildUpsetMatchIds(matchList, upsetsResponse.upsets)]
    : [];

  return {
    matches: matchList,
    voterMap,
    predictionMap: predictions,
    playersByMatch,
    predictionsByMatch,
    scorersByMatch,
    scorerPlayerIdsByMatch,
    eventsByMatch,
    currentUserId: userId,
    teamColors,
    playerPhotosByTeam,
    upsetMatchIds,
    showPlayoffUi: hasPlayoffSchedule(matchList),
    userTier: userTierRow?.tier ?? 4,
  };
}
