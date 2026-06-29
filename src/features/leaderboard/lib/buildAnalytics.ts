import { calculatePredictionPoints } from "@/entities/prediction/lib/calculatePredictionPoints";
import { getTierFromRank } from "@/entities/playoff/model/boostBudget";
import { getRoundWeight, isGroupRoundKey } from "@/entities/match/model/types";
import type { BoostMultiplier } from "@/entities/prediction/model/types";

export interface GroupStageTierInfo {
  group_rank: number;
  tier: number;
  group_points: number;
}

export const STAGE_ORDER = [
  "group_1",
  "group_2",
  "group_3",
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
] as const;

export type StageKey = (typeof STAGE_ORDER)[number];

export interface MatchForAnalytics {
  id: string;
  round_key: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

export interface PredictionForAnalytics {
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  scorer_name: string | null;
  scorer_player_id: string | null;
  boost_multiplier: BoostMultiplier;
}

export interface ProfileForAnalytics {
  id: string;
  display_name: string;
  photo_url: string | null;
}

export interface LeaderboardPlayer {
  user_id: string;
  display_name: string;
  photo_url: string | null;
}

export interface LeaderboardOverallEntry extends LeaderboardPlayer {
  total_points: number;
  live_points_delta: number;
  predictions_count: number;
  rank: number;
  group_rank?: number | null;
  tier?: number | null;
}

export interface LeaderboardStageEntry extends LeaderboardPlayer {
  points: number;
  picks: number;
  rank: number;
}

export interface PositionSeriesPoint {
  stageKey: string;
  cumulativePoints: number;
  position: number;
}

export interface NomineeEntry extends LeaderboardPlayer {
  value: number;
  rank: number;
}

export interface LeaderboardNominees {
  goldenBoot: NomineeEntry[];
  eagleEye: NomineeEntry[];
  boostHunter: NomineeEntry[];
}

export interface LeaderboardAnalytics {
  stages: string[];
  overall: LeaderboardOverallEntry[];
  playoffOverall: LeaderboardOverallEntry[];
  perStage: Record<string, LeaderboardStageEntry[]>;
  positionSeries: Record<string, PositionSeriesPoint[]>;
  nominees: LeaderboardNominees;
  hasLiveMatches: boolean;
}

interface PlayerStats {
  user_id: string;
  display_name: string;
  photo_url: string | null;
  totalPoints: number;
  playoffPoints: number;
  livePoints: number;
  playoffLivePoints: number;
  totalPicks: number;
  goldenBootCount: number;
  eagleEyeCount: number;
  boostHunterPoints: number;
  stagePoints: Map<string, number>;
  stagePicks: Map<string, number>;
}

function isScoredMatch(match: MatchForAnalytics): boolean {
  return (
    match.status === "finished" &&
    match.home_score !== null &&
    match.away_score !== null
  );
}

export function isLiveMatch(match: MatchForAnalytics): boolean {
  return (
    match.status === "live" &&
    match.home_score !== null &&
    match.away_score !== null
  );
}

function compareRanked(
  a: { points: number; picks: number; display_name: string },
  b: { points: number; picks: number; display_name: string },
): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.picks !== a.picks) return b.picks - a.picks;
  return a.display_name.localeCompare(b.display_name);
}

function assignRanks<T extends { rank: number }>(entries: T[]): T[] {
  return entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

function compareNomineeEntries(
  a: { value: number; display_name: string },
  b: { value: number; display_name: string },
): number {
  if (b.value !== a.value) return b.value - a.value;
  return a.display_name.localeCompare(b.display_name);
}

function buildNomineeList(
  players: PlayerStats[],
  getValue: (player: PlayerStats) => number,
): NomineeEntry[] {
  return assignRanks(
    players
      .map((player) => ({
        user_id: player.user_id,
        display_name: player.display_name,
        photo_url: player.photo_url,
        value: getValue(player),
        rank: 0,
      }))
      .filter((entry) => entry.value > 0)
      .sort(compareNomineeEntries),
  );
}

export function buildLeaderboardAnalytics(input: {
  matches: MatchForAnalytics[];
  predictions: PredictionForAnalytics[];
  profiles: ProfileForAnalytics[];
  scorersByMatch: Record<string, string[]>;
  scorerPlayerIdsByMatch?: Record<string, string[]>;
  playoffTiers?: Record<
    string,
    { group_rank: number; tier: number; group_points: number }
  >;
}): LeaderboardAnalytics {
  const {
    matches,
    predictions,
    profiles,
    scorersByMatch,
    scorerPlayerIdsByMatch,
    playoffTiers = {},
  } = input;

  const matchMap = new Map(matches.map((match) => [match.id, match]));
  const scoredMatchIds = new Set(
    matches.filter(isScoredMatch).map((match) => match.id),
  );
  const liveMatchIds = new Set(
    matches.filter(isLiveMatch).map((match) => match.id),
  );
  const hasLiveMatches = liveMatchIds.size > 0;

  const stagesWithResults = new Set<string>();
  for (const match of matches) {
    if (isScoredMatch(match)) {
      stagesWithResults.add(match.round_key);
    }
  }

  const stages = STAGE_ORDER.filter((stage) => stagesWithResults.has(stage));

  const playerMap = new Map<string, PlayerStats>();
  for (const profile of profiles) {
    playerMap.set(profile.id, {
      user_id: profile.id,
      display_name: profile.display_name,
      photo_url: profile.photo_url,
      totalPoints: 0,
      playoffPoints: 0,
      livePoints: 0,
      playoffLivePoints: 0,
      totalPicks: 0,
      goldenBootCount: 0,
      eagleEyeCount: 0,
      boostHunterPoints: 0,
      stagePoints: new Map(),
      stagePicks: new Map(),
    });
  }

  for (const prediction of predictions) {
    const player = playerMap.get(prediction.user_id);
    if (!player) continue;

    player.totalPicks += 1;

    const match = matchMap.get(prediction.match_id);
    if (!match) continue;

    const isScored = scoredMatchIds.has(prediction.match_id);
    const isLive = liveMatchIds.has(prediction.match_id);
    if (!isScored && !isLive) continue;

    const roundWeight = getRoundWeight(match.round_key);
    const isPlayoffMatch = !isGroupRoundKey(match.round_key);

    const breakdown = calculatePredictionPoints({
      predictedHome: prediction.home_score,
      predictedAway: prediction.away_score,
      actualHome: match.home_score!,
      actualAway: match.away_score!,
      predictedScorer: prediction.scorer_name,
      predictedScorerPlayerId: prediction.scorer_player_id,
      actualScorers: scorersByMatch[prediction.match_id] ?? [],
      actualScorerPlayerIds:
        scorerPlayerIdsByMatch?.[prediction.match_id] ?? [],
      boostMultiplier: prediction.boost_multiplier,
      roundWeight,
    });
    const points = breakdown.totalPoints;

    if (isScored) {
      if (breakdown.scorerBonus > 0) {
        player.goldenBootCount += 1;
      }
      if (
        prediction.home_score === match.home_score &&
        prediction.away_score === match.away_score
      ) {
        player.eagleEyeCount += 1;
      }
      const subtotal = breakdown.basePoints + breakdown.scorerBonus;
      player.boostHunterPoints +=
        subtotal * roundWeight * (breakdown.boostMultiplier - 1);

      player.totalPoints += points;
      if (isPlayoffMatch) {
        player.playoffPoints += points;
      }

      const stageKey = match.round_key;
      player.stagePoints.set(
        stageKey,
        (player.stagePoints.get(stageKey) ?? 0) + points,
      );
      player.stagePicks.set(
        stageKey,
        (player.stagePicks.get(stageKey) ?? 0) + 1,
      );
    } else {
      player.livePoints += points;
      if (isPlayoffMatch) {
        player.playoffLivePoints += points;
      }
    }
  }

  const players = [...playerMap.values()];

  const mapOverallEntry = (
    player: PlayerStats,
    pointsKey: "totalPoints" | "playoffPoints",
    liveKey: "livePoints" | "playoffLivePoints",
  ): LeaderboardOverallEntry => {
    const tierInfo = playoffTiers[player.user_id];
    return {
      user_id: player.user_id,
      display_name: player.display_name,
      photo_url: player.photo_url,
      total_points: player[pointsKey],
      live_points_delta: player[liveKey],
      predictions_count: player.totalPicks,
      rank: 0,
      group_rank: tierInfo?.group_rank ?? null,
      tier: tierInfo?.tier ?? null,
    };
  };

  const overall = assignRanks(
    players
      .map((player) => mapOverallEntry(player, "totalPoints", "livePoints"))
      .sort((a, b) =>
        compareRanked(
          {
            points: a.total_points + a.live_points_delta,
            picks: a.predictions_count,
            display_name: a.display_name,
          },
          {
            points: b.total_points + b.live_points_delta,
            picks: b.predictions_count,
            display_name: b.display_name,
          },
        ),
      ),
  );

  const playoffOverall = assignRanks(
    players
      .map((player) =>
        mapOverallEntry(player, "playoffPoints", "playoffLivePoints"),
      )
      .sort((a, b) =>
        compareRanked(
          {
            points: a.total_points + a.live_points_delta,
            picks: a.predictions_count,
            display_name: a.display_name,
          },
          {
            points: b.total_points + b.live_points_delta,
            picks: b.predictions_count,
            display_name: b.display_name,
          },
        ),
      ),
  );

  const perStage: Record<string, LeaderboardStageEntry[]> = {};
  for (const stageKey of stages) {
    perStage[stageKey] = assignRanks(
      players
        .map((player) => ({
          user_id: player.user_id,
          display_name: player.display_name,
          photo_url: player.photo_url,
          points: player.stagePoints.get(stageKey) ?? 0,
          picks: player.stagePicks.get(stageKey) ?? 0,
          rank: 0,
        }))
        .filter((entry) => entry.picks > 0)
        .sort((a, b) =>
          compareRanked(
            {
              points: a.points,
              picks: a.picks,
              display_name: a.display_name,
            },
            {
              points: b.points,
              picks: b.picks,
              display_name: b.display_name,
            },
          ),
        ),
    );
  }

  const cumulativeByStage = new Map<string, Map<string, number>>();
  const cumulativePicksByStage = new Map<string, Map<string, number>>();
  for (const stageKey of stages) {
    const stageIndex = stages.indexOf(stageKey);
    const previousStage = stageIndex > 0 ? stages[stageIndex - 1] : undefined;

    const cumulative = new Map<string, number>();
    const cumulativePicks = new Map<string, number>();
    for (const player of players) {
      const previousPoints = previousStage
        ? (cumulativeByStage.get(previousStage)?.get(player.user_id) ?? 0)
        : 0;
      const previousPicks = previousStage
        ? (cumulativePicksByStage.get(previousStage)?.get(player.user_id) ?? 0)
        : 0;
      const stagePoints = player.stagePoints.get(stageKey) ?? 0;
      const stagePicks = player.stagePicks.get(stageKey) ?? 0;
      cumulative.set(player.user_id, previousPoints + stagePoints);
      cumulativePicks.set(player.user_id, previousPicks + stagePicks);
    }
    cumulativeByStage.set(stageKey, cumulative);
    cumulativePicksByStage.set(stageKey, cumulativePicks);
  }

  const positionSeries: Record<string, PositionSeriesPoint[]> = {};
  for (const player of players) {
    positionSeries[player.user_id] = [];
  }

  for (const stageKey of stages) {
    const cumulative = cumulativeByStage.get(stageKey)!;
    const cumulativePicks = cumulativePicksByStage.get(stageKey)!;
    const ranked = assignRanks(
      players
        .map((player) => ({
          user_id: player.user_id,
          display_name: player.display_name,
          points: cumulative.get(player.user_id) ?? 0,
          picks: cumulativePicks.get(player.user_id) ?? 0,
          rank: 0,
        }))
        .sort((a, b) =>
          compareRanked(
            {
              points: a.points,
              picks: a.picks,
              display_name: a.display_name,
            },
            {
              points: b.points,
              picks: b.picks,
              display_name: b.display_name,
            },
          ),
        ),
    );

    const positionByUser = new Map(
      ranked.map((entry) => [entry.user_id, entry.rank]),
    );

    for (const player of players) {
      positionSeries[player.user_id]!.push({
        stageKey,
        cumulativePoints: cumulative.get(player.user_id) ?? 0,
        position: positionByUser.get(player.user_id) ?? players.length,
      });
    }
  }

  const nominees: LeaderboardNominees = {
    goldenBoot: buildNomineeList(players, (player) => player.goldenBootCount),
    eagleEye: buildNomineeList(players, (player) => player.eagleEyeCount),
    boostHunter: buildNomineeList(
      players,
      (player) => player.boostHunterPoints,
    ),
  };

  return {
    stages: [...stages],
    overall,
    playoffOverall,
    perStage,
    positionSeries,
    nominees,
    hasLiveMatches,
  };
}

/** Frozen group-stage standings: overall points minus playoff points. */
export function buildGroupStageTiersFromAnalytics(
  analytics: LeaderboardAnalytics,
): Record<string, GroupStageTierInfo> {
  const playoffPointsByUser = new Map(
    analytics.playoffOverall.map((entry) => [
      entry.user_id,
      entry.total_points + entry.live_points_delta,
    ]),
  );

  const ranked = assignRanks(
    analytics.overall
      .map((entry) => ({
        user_id: entry.user_id,
        display_name: entry.display_name,
        group_points:
          entry.total_points +
          entry.live_points_delta -
          (playoffPointsByUser.get(entry.user_id) ?? 0),
        predictions_count: entry.predictions_count,
        rank: 0,
      }))
      .filter((entry) => entry.group_points > 0)
      .sort((a, b) =>
        compareRanked(
          {
            points: a.group_points,
            picks: a.predictions_count,
            display_name: a.display_name,
          },
          {
            points: b.group_points,
            picks: b.predictions_count,
            display_name: b.display_name,
          },
        ),
      ),
  );

  return Object.fromEntries(
    ranked.map((entry) => [
      entry.user_id,
      {
        group_rank: entry.rank,
        tier: getTierFromRank(entry.rank),
        group_points: entry.group_points,
      },
    ]),
  );
}
