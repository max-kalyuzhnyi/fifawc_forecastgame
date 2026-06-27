import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";
import { parseKickoff } from "../src/entities/match/lib/parseKickoff";
import { parseRoundKey } from "../src/entities/match/lib/parseRoundKey";
import { isGroupRoundKey } from "../src/entities/match/model/types";

const OPENFOOTBALL_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

interface OpenFootballMatch {
  round: string;
  num?: number;
  date: string;
  time: string;
  team1: string;
  team2: string;
  group?: string;
  ground?: string;
}

interface OpenFootballData {
  matches: OpenFootballMatch[];
}

function isPlaceholderTeam(name: string): boolean {
  return /^[WL]?\d+[A-L]?$/.test(name) || /^\d[A-L]$/.test(name);
}

async function upsertTeam(
  supabase: ReturnType<typeof createClient>,
  name: string,
  cache: Map<string, string>,
): Promise<string | null> {
  if (isPlaceholderTeam(name)) return null;

  const cached = cache.get(name);
  if (cached) return cached;

  const { data, error } = await supabase
    .from("teams")
    .upsert({ name }, { onConflict: "name" })
    .select("id")
    .single();

  if (error) throw error;
  cache.set(name, data.id);
  return data.id;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  const supabase = createClient(url, serviceKey);
  const response = await fetch(OPENFOOTBALL_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch schedule: ${response.status}`);
  }

  const data = (await response.json()) as OpenFootballData;
  const teamCache = new Map<string, string>();
  let updated = 0;
  let skipped = 0;

  for (const match of data.matches) {
    const roundKey = parseRoundKey(match.round);
    if (isGroupRoundKey(roundKey)) {
      skipped += 1;
      continue;
    }

    const externalKey = match.num
      ? `wc2026-${match.num}`
      : `wc2026-${match.date}-${match.team1}-${match.team2}`;

    const { data: existing, error: existingError } = await supabase
      .from("matches")
      .select("id, status, home_score, away_score")
      .eq("external_key", externalKey)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    const homeTeamId = await upsertTeam(supabase, match.team1, teamCache);
    const awayTeamId = await upsertTeam(supabase, match.team2, teamCache);
    const kickoffAt = parseKickoff(match.date, match.time).toISOString();

    if (
      existing &&
      (existing.status === "live" || existing.status === "finished")
    ) {
      const { error } = await supabase
        .from("matches")
        .update({
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          home_team_name: match.team1,
          away_team_name: match.team2,
          round_display: match.round,
          kickoff_at: kickoffAt,
          venue: match.ground ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) throw error;
      updated += 1;
      continue;
    }

    const { error } = await supabase.from("matches").upsert(
      {
        external_key: externalKey,
        round_key: roundKey,
        round_display: match.round,
        group_name: match.group ?? null,
        match_number: match.num ?? null,
        kickoff_at: kickoffAt,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        home_team_name: match.team1,
        away_team_name: match.team2,
        venue: match.ground ?? null,
        status: existing?.status ?? "scheduled",
        home_score: existing?.home_score ?? null,
        away_score: existing?.away_score ?? null,
      },
      { onConflict: "external_key" },
    );

    if (error) throw error;
    updated += 1;
  }

  console.log(`Refreshed ${updated} playoff fixtures (skipped ${skipped} group matches)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
