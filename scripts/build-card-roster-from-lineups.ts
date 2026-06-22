import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";
import { CARD_TEAMS } from "../src/shared/lib/cards/config";
import {
  DEFAULT_ROSTER_POOL_SIZE,
  findLatestLineupForTeam,
  type SubstitutionEvent,
} from "../src/features/matches/lib/lineupRoster";
import type { TeamLineup } from "../src/entities/match/model/types";
import { buildLocalRosterPlayer, replaceTeamsInRoster } from "./lib/load-local-roster";
import { CARD_COLLECTION_ROSTER_PATH } from "./lib/card-collection";

const TEAM_FILTER = process.env.CARD_ROSTER_TEAMS
  ?.split(",")
  .map((team) => team.trim())
  .filter(Boolean);

const POOL_SIZE = Number(process.env.CARD_ROSTER_POOL_SIZE ?? DEFAULT_ROSTER_POOL_SIZE);

async function main(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const teamsToBuild = TEAM_FILTER?.length ? TEAM_FILTER : [...CARD_TEAMS];

  const { data: matches, error } = await supabase
    .from("matches")
    .select(
      "id, kickoff_at, status, home_team_name, away_team_name, home_lineup, away_lineup",
    )
    .eq("status", "finished")
    .order("kickoff_at", { ascending: false });

  if (error) {
    throw error;
  }

  const parsedMatches = (matches ?? []).map((match) => ({
    id: match.id,
    kickoff_at: match.kickoff_at,
    status: match.status,
    home_team_name: match.home_team_name,
    away_team_name: match.away_team_name,
    home_lineup: match.home_lineup as TeamLineup | null,
    away_lineup: match.away_lineup as TeamLineup | null,
  }));

  const matchIds = parsedMatches.map((match) => match.id).filter(Boolean);
  const substitutionEventsByMatchId = new Map<string, SubstitutionEvent[]>();

  if (matchIds.length > 0) {
    const { data: events, error: eventsError } = await supabase
      .from("match_events")
      .select("match_id, side, player_name, type")
      .in("match_id", matchIds)
      .eq("type", "substitution");

    if (eventsError) {
      throw eventsError;
    }

    for (const event of events ?? []) {
      const list = substitutionEventsByMatchId.get(event.match_id) ?? [];
      list.push({
        side: event.side as "home" | "away",
        player_name: event.player_name,
      });
      substitutionEventsByMatchId.set(event.match_id, list);
    }
  }

  const teamPayloads = [];

  for (const teamName of teamsToBuild) {
    const resolved = findLatestLineupForTeam(parsedMatches, teamName, {
      poolSize: POOL_SIZE,
      substitutionEventsByMatchId,
    });

    if (!resolved) {
      console.warn(`No lineup found for ${teamName}; skipped.`);
      continue;
    }

    const players = resolved.poolPlayers.map((player) =>
      buildLocalRosterPlayer({
        name: player.name,
        shirtNumber: player.shirtNumber,
        position: player.position,
        poolRole: player.poolRole,
        inFinalSet: false,
      }),
    );

    const starterCount = players.filter((player) => player.poolRole === "starter").length;
    const subCount = players.filter((player) => player.poolRole === "substitute").length;
    const benchCount = players.filter((player) => player.poolRole === "bench").length;

    teamPayloads.push({
      teamName,
      sourceMatch: {
        kickoffAt: resolved.kickoffAt,
        opponent: resolved.opponent,
        side: resolved.side,
        formation: resolved.formation,
      },
      players,
    });

    console.log(`${teamName}: ${players.map((player) => player.name).join(", ")}`);
    console.log(
      `  source ${resolved.kickoffAt} vs ${resolved.opponent} (${resolved.side}) — pool ${starterCount} XI + ${subCount} subs + ${benchCount} bench = ${players.length}`,
    );
  }

  if (teamPayloads.length === 0) {
    throw new Error("No team rosters were built.");
  }

  const roster = await replaceTeamsInRoster({
    teams: teamPayloads,
    rosterPath: CARD_COLLECTION_ROSTER_PATH,
  });

  console.log(`\nWrote ${teamPayloads.length} team roster(s) to ${CARD_COLLECTION_ROSTER_PATH}`);
  console.log(`Updated at: ${roster.updatedAt}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
