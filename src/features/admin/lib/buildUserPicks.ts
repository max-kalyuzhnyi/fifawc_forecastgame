import type {
  AdminMatch,
  AdminPrediction,
  AdminProfile,
  UserPickRow,
  UserWithPicks,
} from "./types";

export function buildUserPicks(
  profiles: AdminProfile[],
  predictions: AdminPrediction[],
  matches: AdminMatch[],
  adminUserIds: Set<string>,
): UserWithPicks[] {
  const matchMap = new Map(matches.map((match) => [match.id, match]));
  const picksByUser = new Map<string, UserPickRow[]>();

  for (const prediction of predictions) {
    const match = matchMap.get(prediction.match_id);
    if (!match) continue;

    const row: UserPickRow = {
      matchId: match.id,
      homeTeamName: match.home_team_name,
      awayTeamName: match.away_team_name,
      kickoffAt: match.kickoff_at,
      status: match.status,
      homeScore: prediction.home_score,
      awayScore: prediction.away_score,
      scorerName: prediction.scorer_name,
      boostMultiplier: prediction.boost_multiplier,
    };

    const list = picksByUser.get(prediction.user_id) ?? [];
    list.push(row);
    picksByUser.set(prediction.user_id, list);
  }

  return profiles
    .map((profile) => ({
      profile,
      isAdmin: adminUserIds.has(profile.id),
      picks: (picksByUser.get(profile.id) ?? []).sort(
        (a, b) =>
          new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime(),
      ),
    }))
    .sort((a, b) =>
      a.profile.display_name.localeCompare(b.profile.display_name, undefined, {
        sensitivity: "base",
      }),
    );
}
