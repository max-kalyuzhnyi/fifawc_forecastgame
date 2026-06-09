import Link from "next/link";
import { ROUND_LABELS, type Match } from "@/entities/match/model/types";
import { createClient } from "@/shared/lib/supabase/server";
import { formatKickoff } from "@/shared/lib/formatDate";
import { getCurrentUserId } from "@/shared/lib/auth";

const ROUND_ORDER = [
  "group_1",
  "group_2",
  "group_3",
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
];

export default async function MatchesPage() {
  const supabase = await createClient();
  const userId = await getCurrentUserId();

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("kickoff_at", { ascending: true });

  const { data: predictions } = userId
    ? await supabase
        .from("predictions")
        .select("match_id, home_score, away_score, boost_multiplier")
        .eq("user_id", userId)
    : { data: [] };

  const predictionMap = new Map(
    (predictions ?? []).map((p) => [p.match_id, p]),
  );

  const grouped = new Map<string, Match[]>();
  for (const match of (matches ?? []) as Match[]) {
    const list = grouped.get(match.round_key) ?? [];
    list.push(match);
    grouped.set(match.round_key, list);
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Matches</h1>

      {(!matches || matches.length === 0) && (
        <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
          No matches loaded yet. An admin should run{" "}
          <code className="rounded bg-zinc-100 px-1">npm run import:schedule</code>.
        </p>
      )}

      {ROUND_ORDER.filter((key) => grouped.has(key)).map((roundKey) => (
        <section key={roundKey} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-emerald-700">
            {ROUND_LABELS[roundKey] ?? roundKey}
          </h2>
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {grouped.get(roundKey)!.map((match) => {
              const pred = predictionMap.get(match.id);
              const locked = new Date(match.kickoff_at) <= new Date();
              const finished =
                match.status === "finished" &&
                match.home_score !== null &&
                match.away_score !== null;

              return (
                <li key={match.id}>
                  <Link
                    href={`/matches/${match.id}`}
                    className="flex flex-col gap-1 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {match.home_team_name}{" "}
                        {finished
                          ? `${match.home_score}–${match.away_score}`
                          : "vs"}{" "}
                        {match.away_team_name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatKickoff(match.kickoff_at)}
                        {match.group_name && ` · ${match.group_name}`}
                      </p>
                    </div>
                    <div className="text-xs">
                      {pred ? (
                        <span className="text-emerald-600">
                          Your pick: {pred.home_score}–{pred.away_score}
                          {pred.boost_multiplier > 1 && ` x${pred.boost_multiplier}`}
                        </span>
                      ) : locked ? (
                        <span className="text-zinc-400">Missed</span>
                      ) : (
                        <span className="text-amber-600">No pick yet</span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
