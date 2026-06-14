import { AddPlayerForm } from "@/features/admin-results/ui/AddPlayerForm";
import { MatchResultForm } from "@/features/admin-results/ui/MatchResultForm";
import { formatKickoff } from "@/shared/lib/formatDate";
import type { AdminMatch, AdminTeam } from "@/features/admin/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ResultsTabProps {
  teams: AdminTeam[];
  matches: AdminMatch[];
  scorersByMatch: Record<string, string[]>;
}

export function ResultsTab({ teams, matches, scorersByMatch }: ResultsTabProps) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const upcomingOrRecent = matches.filter(
    (match) =>
      match.status !== "finished" || new Date(match.kickoff_at) > weekAgo,
  );

  return (
    <div className="flex flex-col gap-6">
      <Card className="glass corner-squircle border-0 bg-transparent shadow-none ring-0">
        <CardHeader>
          <CardTitle>Add player</CardTitle>
          <CardDescription>
            Add a player to a team for goalscorer predictions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddPlayerForm teams={teams} />
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
                  initialScorers={(scorersByMatch[match.id] ?? []).join(", ")}
                  initialHighlights={match.highlights_youtube_id}
                  initialStatus={
                    match.status as "scheduled" | "live" | "finished"
                  }
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
