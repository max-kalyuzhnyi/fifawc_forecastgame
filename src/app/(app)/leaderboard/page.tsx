import { calculateLeaderboard } from "@/entities/leaderboard/lib/calculateLeaderboard";
import { createClient } from "@/shared/lib/supabase/server";

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .order("display_name");

  const { data: predictions } = await supabase
    .from("predictions")
    .select("user_id, match_id, home_score, away_score, scorer_name, boost_multiplier");

  const { data: finishedMatches } = await supabase
    .from("matches")
    .select("id, home_score, away_score")
    .eq("status", "finished")
    .not("home_score", "is", null);

  const { data: allScorers } = await supabase
    .from("match_scorers")
    .select("match_id, scorer_name");

  const scorersByMatch = new Map<string, string[]>();
  for (const s of allScorers ?? []) {
    const list = scorersByMatch.get(s.match_id) ?? [];
    list.push(s.scorer_name);
    scorersByMatch.set(s.match_id, list);
  }

  const matchMap: Record<
    string,
    { home_score: number | null; away_score: number | null; scorers: string[] }
  > = {};
  for (const m of finishedMatches ?? []) {
    matchMap[m.id] = {
      home_score: m.home_score,
      away_score: m.away_score,
      scorers: scorersByMatch.get(m.id) ?? [],
    };
  }

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name]),
  );

  const enrichedPredictions = (predictions ?? []).map((p) => ({
    user_id: p.user_id,
    match_id: p.match_id,
    home_score: p.home_score,
    away_score: p.away_score,
    scorer_name: p.scorer_name,
    boost_multiplier: p.boost_multiplier as 1 | 2 | 3,
    display_name: profileMap.get(p.user_id) ?? "Unknown",
  }));

  const entries = calculateLeaderboard(
    profiles ?? [],
    enrichedPredictions,
    matchMap,
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Leaderboard</h1>

      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500">No players yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">Player</th>
              <th className="py-2 pr-4 text-right">Points</th>
              <th className="py-2 text-right">Scored</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr
                key={entry.user_id}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-3 pr-4 text-zinc-400">{i + 1}</td>
                <td className="py-3 pr-4 font-medium">{entry.display_name}</td>
                <td className="py-3 pr-4 text-right font-bold text-emerald-700">
                  {entry.total_points}
                </td>
                <td className="py-3 text-right text-zinc-500">
                  {entry.predictions_scored}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-6 text-xs text-zinc-400">
        Scoring: 3 exact · 2 goal diff · 1 result · +3 scorer · x2/x3 boost per round
      </p>
    </div>
  );
}
