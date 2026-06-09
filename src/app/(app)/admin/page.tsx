import { redirect } from "next/navigation";
import { AddPlayerForm } from "@/features/admin-results/ui/AddPlayerForm";
import { MatchResultForm } from "@/features/admin-results/ui/MatchResultForm";
import { createClient } from "@/shared/lib/supabase/server";
import { isAdmin } from "@/shared/lib/auth";
import { formatKickoff } from "@/shared/lib/formatDate";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/matches");

  const supabase = await createClient();

  const { data: matches } = await supabase
    .from("matches")
    .select("id, home_team_name, away_team_name, kickoff_at, home_score, away_score, status")
    .order("kickoff_at", { ascending: true });

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .order("name");

  const { data: scorers } = await supabase
    .from("match_scorers")
    .select("match_id, scorer_name");

  const scorersByMatch = new Map<string, string[]>();
  for (const s of scorers ?? []) {
    const list = scorersByMatch.get(s.match_id) ?? [];
    list.push(s.scorer_name);
    scorersByMatch.set(s.match_id, list);
  }

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const upcomingOrRecent = (matches ?? []).filter(
    (m) => m.status !== "finished" || new Date(m.kickoff_at) > weekAgo,
  );

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Admin</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Enter match results and manage players. Import schedule via{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          npm run import:schedule
        </code>
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Add player</h2>
        <AddPlayerForm teams={teams ?? []} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Match results</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {upcomingOrRecent.slice(0, 20).map((match) => (
            <div key={match.id}>
              <p className="mb-1 text-xs text-zinc-500">
                {formatKickoff(match.kickoff_at)}
              </p>
              <MatchResultForm
                matchId={match.id}
                homeTeamName={match.home_team_name}
                awayTeamName={match.away_team_name}
                initialHome={match.home_score}
                initialAway={match.away_score}
                initialScorers={(scorersByMatch.get(match.id) ?? []).join(", ")}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
