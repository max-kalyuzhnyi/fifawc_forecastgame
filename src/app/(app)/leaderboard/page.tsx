import { calculateLeaderboard } from "@/entities/leaderboard/lib/calculateLeaderboard";
import { createClient } from "@/shared/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Leaderboard</h1>

      <Card className="glass corner-squircle border-0 bg-transparent shadow-none ring-0">
        <CardHeader>
          <CardTitle>Standings</CardTitle>
          <CardDescription>
            Scoring: 3 exact · 2 goal diff · 1 result · +3 scorer · x2/x3 boost
            per round
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No players yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="text-right">Scored</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, i) => (
                  <TableRow key={entry.user_id}>
                    <TableCell className="text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {entry.display_name}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge>{entry.total_points}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {entry.predictions_scored}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
