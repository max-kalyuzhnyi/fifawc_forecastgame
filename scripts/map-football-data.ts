import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";
import { teamNamesMatch } from "../src/entities/match/lib/footballDataTeamNames";

const FD_API_BASE = "https://api.football-data.org/v4";
const WC_COMPETITION = "WC";

interface FdMatch {
  id: number;
  utcDate: string;
  venue: string | null;
  homeTeam: { name: string };
  awayTeam: { name: string };
}

interface DbMatch {
  id: string;
  fd_match_id: number | null;
  kickoff_at: string;
  home_team_name: string;
  away_team_name: string;
  venue: string | null;
}

function kickoffWithinTolerance(
  fdUtcDate: string,
  dbKickoffAt: string,
  toleranceMs = 3 * 60 * 60 * 1000,
): boolean {
  const fdTime = new Date(fdUtcDate).getTime();
  const dbTime = new Date(dbKickoffAt).getTime();
  return Math.abs(fdTime - dbTime) <= toleranceMs;
}

function findDbMatch(fdMatch: FdMatch, dbMatches: DbMatch[]): DbMatch | undefined {
  const byFdId = dbMatches.find((m) => m.fd_match_id === fdMatch.id);
  if (byFdId) return byFdId;

  const byTeams = dbMatches.find(
    (m) =>
      kickoffWithinTolerance(fdMatch.utcDate, m.kickoff_at) &&
      teamNamesMatch(
        fdMatch.homeTeam.name,
        fdMatch.awayTeam.name,
        m.home_team_name,
        m.away_team_name,
      ),
  );
  if (byTeams) return byTeams;

  return dbMatches.find(
    (m) =>
      kickoffWithinTolerance(fdMatch.utcDate, m.kickoff_at) &&
      m.venue != null &&
      fdMatch.venue != null &&
      m.venue.toLowerCase() === fdMatch.venue.toLowerCase(),
  );
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const fdToken =
    process.env.FOOTBALL_DATA_TOKEN ?? "635ba1bf38894324a6da02c2fe134d79";

  if (!url || !serviceKey) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  const supabase = createClient(url, serviceKey);

  const response = await fetch(
    `${FD_API_BASE}/competitions/${WC_COMPETITION}/matches`,
    { headers: { "X-Auth-Token": fdToken } },
  );

  if (!response.ok) {
    throw new Error(`football-data.org ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  const fdMatches = (payload.matches ?? []) as FdMatch[];

  const { data: dbMatches, error } = await supabase
    .from("matches")
    .select("id, fd_match_id, kickoff_at, home_team_name, away_team_name, venue");

  if (error) throw error;

  let mapped = 0;
  let unmatched = 0;

  for (const fdMatch of fdMatches) {
    const dbMatch = findDbMatch(fdMatch, (dbMatches ?? []) as DbMatch[]);
    if (!dbMatch) {
      unmatched++;
      console.warn(
        `No match for fd:${fdMatch.id} ${fdMatch.homeTeam.name} vs ${fdMatch.awayTeam.name} @ ${fdMatch.utcDate}`,
      );
      continue;
    }

    if (dbMatch.fd_match_id === fdMatch.id) {
      continue;
    }

    const { error: updateError } = await supabase
      .from("matches")
      .update({ fd_match_id: fdMatch.id })
      .eq("id", dbMatch.id);

    if (updateError) throw updateError;
    mapped++;
    console.log(
      `Mapped ${dbMatch.home_team_name} vs ${dbMatch.away_team_name} → fd:${fdMatch.id}`,
    );
  }

  console.log(
    `Done. Mapped ${mapped} new links. ${unmatched} football-data matches unmatched.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
