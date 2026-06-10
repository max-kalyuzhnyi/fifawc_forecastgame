import { calculateLeaderboard } from "@/entities/leaderboard/lib/calculateLeaderboard";
import { createClient } from "@/shared/lib/supabase/server";
const RANK_LABELS: Record<number, { emoji: string; label: string }> = {
  1: { emoji: "🥇", label: "1st place" },
  2: { emoji: "🥈", label: "2nd place" },
  3: { emoji: "🥉", label: "3rd place" },
};

function RankCell({ rank }: { rank: number }) {
  const medal = RANK_LABELS[rank];

  if (medal) {
    return (
      <span className="flex size-6 items-center justify-center text-base leading-none">
        <span role="img" aria-label={medal.label}>
          {medal.emoji}
        </span>
      </span>
    );
  }

  return (
    <span className="flex size-6 items-center justify-center text-[12px] tabular-nums text-muted-foreground">
      {rank}
    </span>
  );
}

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
    <div className="flex flex-col">
      <div className="sports-panel sports-panel-max-h flex flex-col overflow-hidden">
        <div className="shrink-0 border-b border-white/[0.08] px-4 py-3">
          <h1 className="text-[15px] font-semibold text-foreground">Leaderboard</h1>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Scoring: 3 exact · 2 goal diff · 1 result · +3 scorer · x2/x3 boost
            per round
          </p>
        </div>

        <div className="overflow-y-auto overscroll-contain">
          {entries.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No players yet.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-[2rem_minmax(0,1fr)_4rem_3rem] items-center gap-x-3 px-3 py-2 text-[11px] font-medium text-muted-foreground">
                <span className="text-center">#</span>
                <span>Player</span>
                <span className="text-right">Points</span>
                <span className="text-right">Scored</span>
              </div>

              {entries.map((entry, index) => {
                const rank = index + 1;

                return (
                  <div
                    key={entry.user_id}
                    className="grid grid-cols-[2rem_minmax(0,1fr)_4rem_3rem] items-center gap-x-3 border-t border-white/[0.08] px-3 py-2.5"
                  >
                    <RankCell rank={rank} />
                    <p className="truncate text-[13px] font-medium leading-tight">
                      {entry.display_name}
                    </p>
                    <p className="text-right text-[17px] font-bold leading-none tabular-nums text-foreground">
                      {entry.total_points}
                    </p>
                    <p className="text-right text-[12px] tabular-nums text-muted-foreground">
                      {entry.predictions_scored}
                    </p>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
