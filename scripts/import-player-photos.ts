import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";
import {
  getApiSearchTermsForOurTeam,
  isLikelyPlaceholderPhoto,
  isPlaceholderTeamName,
  matchApiPlayerToDb,
  pickApiNationalTeam,
  type ApiFootballTeamSearchResult,
  type ApiSquadPlayer,
} from "../src/features/matches/lib/apiFootballPhotos";

const API_BASE = "https://v3.football.api-sports.io";
const PLAYER_PHOTOS_BUCKET = "player-photos";
/** Free plan: 10 requests/minute — keep ~2 API calls/team under limit. */
const API_DELAY_MS = 6500;
const RATE_LIMIT_RETRY_MS = 65_000;

interface DbTeam {
  id: string;
  name: string;
}

interface DbPlayer {
  id: string;
  team_id: string;
  name: string;
  shirt_number: number | null;
  api_football_id: number | null;
  photo_url: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getPublicPlayerPhotoUrl(supabaseUrl: string, objectPath: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${PLAYER_PHOTOS_BUCKET}/${objectPath}`;
}

async function apiFootballFetch<T>(
  path: string,
  apiKey: string,
  attempt = 0,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "x-apisports-key": apiKey,
    },
  });

  const data = (await response.json()) as T & {
    errors?: Record<string, string>;
  };

  const rateLimited =
    response.status === 429 ||
    data.errors?.rateLimit != null ||
    data.errors?.requests != null;

  if (rateLimited && attempt < 5) {
    console.warn(`Rate limited on ${path}, waiting ${RATE_LIMIT_RETRY_MS / 1000}s...`);
    await sleep(RATE_LIMIT_RETRY_MS);
    return apiFootballFetch(path, apiKey, attempt + 1);
  }

  if (!response.ok) {
    throw new Error(`API-Football ${path} failed: ${response.status} ${JSON.stringify(data)}`);
  }

  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API-Football ${path} errors: ${JSON.stringify(data.errors)}`);
  }

  return data;
}

async function searchApiNationalTeam(
  apiKey: string,
  ourTeamName: string,
): Promise<ApiFootballTeamSearchResult | null> {
  const searchTerms = getApiSearchTermsForOurTeam(ourTeamName);

  for (const term of searchTerms) {
    const data = await apiFootballFetch<{
      response: { team: ApiFootballTeamSearchResult }[];
    }>(`/teams?search=${encodeURIComponent(term)}`, apiKey);

    const teams = data.response.map((entry) => entry.team);
    const match = pickApiNationalTeam(ourTeamName, teams);
    if (match) return match;

    await sleep(API_DELAY_MS);
  }

  return null;
}

async function fetchTeamSquad(
  apiKey: string,
  apiTeamId: number,
): Promise<ApiSquadPlayer[]> {
  const data = await apiFootballFetch<{
    response: { players: ApiSquadPlayer[] }[];
  }>(`/players/squads?team=${apiTeamId}`, apiKey);

  return data.response[0]?.players ?? [];
}

async function uploadPlayerPhoto(
  supabase: ReturnType<typeof createClient>,
  objectPath: string,
  bytes: Buffer,
  attempt = 0,
): Promise<void> {
  const { error } = await supabase.storage
    .from(PLAYER_PHOTOS_BUCKET)
    .upload(objectPath, bytes, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) {
    const retryable =
      /timeout|gateway|temporarily|rate/i.test(error.message) && attempt < 4;
    if (retryable) {
      const waitMs = 3000 * (attempt + 1);
      console.warn(`Upload retry for ${objectPath} in ${waitMs / 1000}s: ${error.message}`);
      await sleep(waitMs);
      return uploadPlayerPhoto(supabase, objectPath, bytes, attempt + 1);
    }
    throw new Error(`Upload failed for ${objectPath}: ${error.message}`);
  }
}

async function downloadPlayerPhoto(photoUrl: string): Promise<{
  bytes: Buffer;
  contentType: string | null;
}> {
  const response = await fetch(photoUrl, {
    headers: { "User-Agent": "fifawc-forecastgame/1.0 (player photo import)" },
  });

  if (!response.ok) {
    throw new Error(`Failed to download photo: ${response.status} ${photoUrl}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  return {
    bytes,
    contentType: response.headers.get("content-type"),
  };
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  if (!apiKey) {
    throw new Error(
      "Set API_FOOTBALL_KEY in .env.local (free key: https://dashboard.api-football.com/)",
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const [{ data: teams, error: teamsError }, { data: players, error: playersError }] =
    await Promise.all([
      supabase.from("teams").select("id, name").order("name"),
      supabase
        .from("players")
        .select("id, team_id, name, shirt_number, api_football_id, photo_url"),
    ]);

  if (teamsError) throw teamsError;
  if (playersError) throw playersError;

  const realTeams = ((teams ?? []) as DbTeam[]).filter(
    (team) => !isPlaceholderTeamName(team.name),
  );
  const playersByTeamId = new Map<string, DbPlayer[]>();

  for (const player of (players ?? []) as DbPlayer[]) {
    const list = playersByTeamId.get(player.team_id) ?? [];
    list.push(player);
    playersByTeamId.set(player.team_id, list);
  }

  console.log(
    `Processing ${realTeams.length} teams (${(teams ?? []).length - realTeams.length} placeholders skipped).`,
  );

  const unmatchedTeams: string[] = [];
  const unmatchedApiPlayers: string[] = [];
  const missingPhotos: string[] = [];
  const placeholderPhotos: string[] = [];
  let uploaded = 0;
  let skipped = 0;

  for (const team of realTeams) {
    const dbPlayers = playersByTeamId.get(team.id) ?? [];
    if (dbPlayers.length === 0) {
      console.warn(`No DB players for team ${team.name} (${team.id}).`);
      continue;
    }

    if (dbPlayers.every((player) => player.photo_url)) {
      skipped += dbPlayers.length;
      console.log(`Skipping ${team.name} — all ${dbPlayers.length} players already have photos.`);
      continue;
    }

    const apiTeam = await searchApiNationalTeam(apiKey, team.name);
    await sleep(API_DELAY_MS);

    if (!apiTeam) {
      unmatchedTeams.push(team.name);
      continue;
    }

    const squad = await fetchTeamSquad(apiKey, apiTeam.id);
    await sleep(API_DELAY_MS);

    console.log(
      `Processing ${team.name}: API ${apiTeam.name} (#${apiTeam.id}), ${squad.length} API players, ${dbPlayers.length} DB players.`,
    );

    for (const apiPlayer of squad) {
      const dbPlayer = matchApiPlayerToDb(apiPlayer, dbPlayers);

      if (!dbPlayer) {
        unmatchedApiPlayers.push(`${team.name}: ${apiPlayer.name} (#${apiPlayer.number ?? "?"})`);
        continue;
      }

      const photoUrl = apiPlayer.photo?.trim();
      if (!photoUrl) {
        missingPhotos.push(`${team.name}: ${dbPlayer.name}`);
        continue;
      }

      const { bytes, contentType } = await downloadPlayerPhoto(photoUrl);
      if (isLikelyPlaceholderPhoto(bytes, contentType)) {
        placeholderPhotos.push(`${team.name}: ${dbPlayer.name}`);
        continue;
      }

      const objectPath = `${team.id}/${dbPlayer.id}.png`;
      const publicUrl = getPublicPlayerPhotoUrl(supabaseUrl, objectPath);

      if (
        dbPlayer.api_football_id === apiPlayer.id &&
        dbPlayer.photo_url === publicUrl
      ) {
        skipped++;
        continue;
      }

      await uploadPlayerPhoto(supabase, objectPath, bytes);

      const { error: updateError } = await supabase
        .from("players")
        .update({
          photo_url: publicUrl,
          api_football_id: apiPlayer.id,
        })
        .eq("id", dbPlayer.id);

      if (updateError) throw updateError;
      uploaded++;
    }
  }

  const { data: playersAfter, error: playersAfterError } = await supabase
    .from("players")
    .select("photo_url")
    .is("photo_url", null);

  if (playersAfterError) throw playersAfterError;

  console.log("\n=== Import summary ===");
  console.log(`Uploaded/updated: ${uploaded}`);
  console.log(`Skipped (unchanged): ${skipped}`);

  if (unmatchedTeams.length > 0) {
    console.log(`\nUnmatched API teams (${unmatchedTeams.length}):`);
    for (const teamName of unmatchedTeams) console.log(`  - ${teamName}`);
  }

  if (unmatchedApiPlayers.length > 0) {
    console.log(`\nUnmatched API players (${unmatchedApiPlayers.length}):`);
    for (const player of unmatchedApiPlayers.slice(0, 30)) {
      console.log(`  - ${player}`);
    }
    if (unmatchedApiPlayers.length > 30) {
      console.log(`  ... and ${unmatchedApiPlayers.length - 30} more`);
    }
  }

  if (placeholderPhotos.length > 0) {
    console.log(`\nPlaceholder photos skipped (${placeholderPhotos.length}):`);
    for (const player of placeholderPhotos.slice(0, 20)) {
      console.log(`  - ${player}`);
    }
  }

  if (missingPhotos.length > 0) {
    console.log(`\nAPI players without photo URL (${missingPhotos.length}):`);
    for (const player of missingPhotos.slice(0, 20)) {
      console.log(`  - ${player}`);
    }
  }

  console.log(`\nDB players still without photo_url: ${playersAfter?.length ?? 0}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
