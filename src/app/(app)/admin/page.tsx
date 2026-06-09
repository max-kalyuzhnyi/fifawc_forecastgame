import { redirect } from "next/navigation";
import { AddPlayerForm } from "@/features/admin-results/ui/AddPlayerForm";
import { MatchResultForm } from "@/features/admin-results/ui/MatchResultForm";
import { createClient } from "@/shared/lib/supabase/server";
import { isAdmin } from "@/shared/lib/auth";
import { formatKickoff } from "@/shared/lib/formatDate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter match results and manage players. Import schedule via{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
            npm run import:schedule
          </code>
        </p>
      </div>

      <Card className="glass corner-squircle border-0 bg-transparent shadow-none ring-0">
        <CardHeader>
          <CardTitle>Add player</CardTitle>
          <CardDescription>
            Add a player to a team for goalscorer predictions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddPlayerForm teams={teams ?? []} />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Match results</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {upcomingOrRecent.slice(0, 20).map((match) => (
            <Card
              key={match.id}
              className="glass corner-squircle border-0 bg-transparent shadow-none ring-0"
            >
              <CardContent className="pt-5">
              <p className="mb-2 text-xs text-muted-foreground">
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
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
