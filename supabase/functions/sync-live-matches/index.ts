import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const FD_API_BASE = "https://api.football-data.org/v4";
const WC_COMPETITION = "WC";

function fdHeaders(token: string): Record<string, string> {
  return {
    "X-Auth-Token": token,
    "X-Unfold-Lineups": "true",
    "X-Unfold-Goals": "true",
    "X-Unfold-Bookings": "true",
    "X-Unfold-Subs": "true",
  };
}

const FD_TO_OUR_TEAM_NAME: Record<string, string> = {
  "United States": "USA",
  "Korea Republic": "South Korea",
  "IR Iran": "Iran",
  "Côte d'Ivoire": "Ivory Coast",
  "Cote d'Ivoire": "Ivory Coast",
  "Bosnia-Herzegovina": "Bosnia & Herzegovina",
  "Czechia": "Czech Republic",
  "Cape Verde Islands": "Cape Verde",
  "Congo DR": "DR Congo",
  "Curaçao": "Curacao",
};

type MatchStatus = "scheduled" | "live" | "finished";

interface FdPerson {
  id: number | null;
  name: string | null;
}

interface FdLineupPlayer {
  id: number;
  name: string;
  position: string | null;
  shirtNumber: number | null;
}

interface FdTeamSide {
  id: number;
  name: string;
  coach?: FdPerson | null;
  formation?: string | null;
  lineup?: FdLineupPlayer[];
  bench?: FdLineupPlayer[];
}

interface FdGoal {
  minute: number;
  injuryTime: number | null;
  type: string;
  team: { id: number; name: string };
  scorer: FdPerson;
  assist?: FdPerson | null;
  score: { home: number | null; away: number | null };
}

interface FdBooking {
  minute: number;
  injuryTime?: number | null;
  team: { id: number; name: string };
  player: FdPerson;
  card: string;
}

interface FdSubstitution {
  minute: number;
  injuryTime?: number | null;
  team: { id: number; name: string };
  playerOut: FdPerson;
  playerIn: FdPerson;
}

interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  minute: number | null;
  injuryTime: number | null;
  venue: string | null;
  stage: string;
  lastUpdated: string;
  homeTeam: FdTeamSide;
  awayTeam: FdTeamSide;
  score: {
    fullTime: { home: number | null; away: number | null };
  };
  goals: FdGoal[];
  bookings: FdBooking[];
  substitutions: FdSubstitution[];
}

interface DbMatch {
  id: string;
  fd_match_id: number | null;
  kickoff_at: string;
  home_team_name: string;
  away_team_name: string;
  venue: string | null;
  fd_last_updated: string | null;
}

interface LineupPayload {
  formation: string | null;
  coach: string | null;
  lineup: FdLineupPlayer[];
  bench: FdLineupPlayer[];
}

interface MatchEventRow {
  match_id: string;
  event_key: string;
  type: string;
  minute: number;
  injury_time: number | null;
  side: "home" | "away";
  player_name: string;
  secondary_player_name: string | null;
  score_home: number | null;
  score_away: number | null;
  payload: Record<string, unknown>;
}

function normalizeFdTeamName(name: string): string {
  return FD_TO_OUR_TEAM_NAME[name] ?? name;
}

function mapFdStatus(status: string): MatchStatus {
  switch (status) {
    case "IN_PLAY":
    case "PAUSED":
    case "LIVE":
      return "live";
    case "FINISHED":
      return "finished";
    default:
      return "scheduled";
  }
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
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

function teamSide(
  teamName: string,
  homeTeam: FdTeamSide,
  awayTeam: FdTeamSide,
): "home" | "away" {
  if (teamName === homeTeam.name) return "home";
  if (teamName === awayTeam.name) return "away";
  if (normalizeFdTeamName(teamName) === normalizeFdTeamName(homeTeam.name)) {
    return "home";
  }
  return "away";
}

function buildLineupPayload(team: FdTeamSide): LineupPayload | null {
  const lineup = team.lineup ?? [];
  const bench = team.bench ?? [];
  if (lineup.length === 0 && bench.length === 0 && !team.formation) {
    return null;
  }
  return {
    formation: team.formation ?? null,
    coach: team.coach?.name ?? null,
    lineup,
    bench,
  };
}

function goalEventType(type: string): string {
  switch (type) {
    case "PENALTY":
      return "penalty";
    case "OWN":
    case "OWN_GOAL":
      return "own_goal";
    default:
      return "goal";
  }
}

function bookingEventType(card: string): string {
  switch (card) {
    case "RED":
    case "RED_CARD":
      return "red_card";
    case "YELLOW_RED":
    case "YELLOW_RED_CARD":
      return "yellow_red_card";
    default:
      return "yellow_card";
  }
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildEvents(
  matchId: string,
  fdMatch: FdMatch,
): MatchEventRow[] {
  const events: MatchEventRow[] = [];

  for (const goal of fdMatch.goals ?? []) {
    const side = teamSide(goal.team.name, fdMatch.homeTeam, fdMatch.awayTeam);
    const player = goal.scorer?.name ?? "Unknown";
    const scoreHome = goal.score?.home ?? null;
    const scoreAway = goal.score?.away ?? null;
    events.push({
      match_id: matchId,
      event_key: `goal-${goal.minute}-${goal.injuryTime ?? 0}-${slug(player)}`,
      type: goalEventType(goal.type),
      minute: goal.minute,
      injury_time: goal.injuryTime ?? null,
      side,
      player_name: player,
      secondary_player_name: goal.assist?.name ?? null,
      score_home: scoreHome,
      score_away: scoreAway,
      payload: goal as unknown as Record<string, unknown>,
    });
  }

  for (const booking of fdMatch.bookings ?? []) {
    const side = teamSide(
      booking.team.name,
      fdMatch.homeTeam,
      fdMatch.awayTeam,
    );
    const player = booking.player?.name ?? "Unknown";
    events.push({
      match_id: matchId,
      event_key: `card-${booking.minute}-${booking.injuryTime ?? 0}-${booking.card}-${slug(player)}`,
      type: bookingEventType(booking.card),
      minute: booking.minute,
      injury_time: booking.injuryTime ?? null,
      side,
      player_name: player,
      secondary_player_name: null,
      score_home: null,
      score_away: null,
      payload: booking as unknown as Record<string, unknown>,
    });
  }

  for (const sub of fdMatch.substitutions ?? []) {
    const side = teamSide(sub.team.name, fdMatch.homeTeam, fdMatch.awayTeam);
    const playerOut = sub.playerOut?.name ?? "Unknown";
    const playerIn = sub.playerIn?.name ?? "Unknown";
    events.push({
      match_id: matchId,
      event_key: `sub-${sub.minute}-${sub.injuryTime ?? 0}-${slug(playerOut)}-${slug(playerIn)}`,
      type: "substitution",
      minute: sub.minute,
      injury_time: sub.injuryTime ?? null,
      side,
      player_name: playerIn,
      secondary_player_name: playerOut,
      score_home: null,
      score_away: null,
      payload: sub as unknown as Record<string, unknown>,
    });
  }

  return events;
}

function findDbMatch(
  fdMatch: FdMatch,
  dbMatches: DbMatch[],
): DbMatch | undefined {
  const byFdId = dbMatches.find((m) => m.fd_match_id === fdMatch.id);
  if (byFdId) return byFdId;

  const fdHome = normalizeFdTeamName(fdMatch.homeTeam.name);
  const fdAway = normalizeFdTeamName(fdMatch.awayTeam.name);

  const byTeamsAndTime = dbMatches.find(
    (m) =>
      kickoffWithinTolerance(fdMatch.utcDate, m.kickoff_at) &&
      m.home_team_name === fdHome &&
      m.away_team_name === fdAway,
  );
  if (byTeamsAndTime) return byTeamsAndTime;

  return dbMatches.find(
    (m) =>
      kickoffWithinTolerance(fdMatch.utcDate, m.kickoff_at) &&
      m.venue != null &&
      fdMatch.venue != null &&
      m.venue.toLowerCase() === fdMatch.venue.toLowerCase(),
  );
}

async function fetchFdMatches(
  token: string,
  dateFrom: string,
  dateTo: string,
): Promise<{ matches: FdMatch[]; requestsLeft: number | null }> {
  const url = `${FD_API_BASE}/competitions/${WC_COMPETITION}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
  const response = await fetch(url, {
    headers: fdHeaders(token),
  });

  const requestsLeftHeader = response.headers.get("x-requests-available-minute");
  const requestsLeft = requestsLeftHeader
    ? Number.parseInt(requestsLeftHeader, 10)
    : null;

  if (response.status === 429) {
    throw new Error("football-data.org rate limit exceeded");
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`football-data.org ${response.status}: ${body}`);
  }

  const data = await response.json();
  return { matches: (data.matches ?? []) as FdMatch[], requestsLeft };
}

async function fetchFdMatchDetail(
  token: string,
  matchId: number,
): Promise<FdMatch> {
  const response = await fetch(`${FD_API_BASE}/matches/${matchId}`, {
    headers: fdHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`football-data.org match detail ${response.status}`);
  }

  return await response.json();
}

function needsLineupFallback(fdMatch: FdMatch): boolean {
  const status = mapFdStatus(fdMatch.status);
  if (status !== "live") return false;
  const homeEmpty = (fdMatch.homeTeam.lineup ?? []).length === 0;
  const awayEmpty = (fdMatch.awayTeam.lineup ?? []).length === 0;
  return homeEmpty || awayEmpty;
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const fdToken = Deno.env.get("FOOTBALL_DATA_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!cronSecret || !fdToken || !supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing required environment secrets" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const providedSecret = req.headers.get("x-cron-secret");
  if (providedSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  try {
    const { matches: fdMatches, requestsLeft } = await fetchFdMatches(
      fdToken,
      formatDate(yesterday),
      formatDate(tomorrow),
    );

    if (requestsLeft !== null && requestsLeft <= 2) {
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          reason: "low_rate_limit_budget",
          requestsLeft,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const { data: dbMatches, error: dbError } = await supabase
      .from("matches")
      .select(
        "id, fd_match_id, kickoff_at, home_team_name, away_team_name, venue, fd_last_updated",
      );

    if (dbError) {
      throw dbError;
    }

    let updated = 0;
    let skipped = 0;
    let eventsUpserted = 0;
    let detailFetches = 0;

    for (const fdMatch of fdMatches) {
      const dbMatch = findDbMatch(fdMatch, (dbMatches ?? []) as DbMatch[]);
      if (!dbMatch) {
        skipped++;
        continue;
      }

      let effectiveMatch = fdMatch;

      if (needsLineupFallback(fdMatch) && detailFetches < 5) {
        try {
          effectiveMatch = await fetchFdMatchDetail(fdToken, fdMatch.id);
          detailFetches++;
        } catch (detailError) {
          console.warn("Lineup detail fetch failed", fdMatch.id, detailError);
        }
      }

      if (
        dbMatch.fd_last_updated &&
        dbMatch.fd_last_updated === effectiveMatch.lastUpdated
      ) {
        skipped++;
        continue;
      }

      const homeLineup = buildLineupPayload(effectiveMatch.homeTeam);
      const awayLineup = buildLineupPayload(effectiveMatch.awayTeam);
      const status = mapFdStatus(effectiveMatch.status);

      const updatePayload: Record<string, unknown> = {
        fd_match_id: effectiveMatch.id,
        status,
        fd_status: effectiveMatch.status,
        fd_last_updated: effectiveMatch.lastUpdated,
        minute: effectiveMatch.minute,
        injury_time: effectiveMatch.injuryTime,
        home_score: effectiveMatch.score.fullTime.home,
        away_score: effectiveMatch.score.fullTime.away,
        updated_at: new Date().toISOString(),
      };

      if (homeLineup) updatePayload.home_lineup = homeLineup;
      if (awayLineup) updatePayload.away_lineup = awayLineup;

      const { error: updateError } = await supabase
        .from("matches")
        .update(updatePayload)
        .eq("id", dbMatch.id);

      if (updateError) {
        console.error("Match update failed", dbMatch.id, updateError);
        continue;
      }

      const events = buildEvents(dbMatch.id, effectiveMatch);
      if (events.length > 0) {
        const { error: eventsError } = await supabase
          .from("match_events")
          .upsert(events, { onConflict: "match_id,event_key" });

        if (eventsError) {
          console.error("Events upsert failed", dbMatch.id, eventsError);
        } else {
          eventsUpserted += events.length;
        }
      }

      updated++;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        fdMatches: fdMatches.length,
        updated,
        skipped,
        eventsUpserted,
        detailFetches,
        requestsLeft,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
