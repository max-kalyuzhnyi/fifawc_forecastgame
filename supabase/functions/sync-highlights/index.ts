import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";
const MAX_PAGES = 5;
const MAX_MATCHES_PER_RUN = 20;

const OUR_TO_FIFA_TEAM_NAME: Record<string, string> = {
  USA: "United States",
  "South Korea": "Korea Republic",
  Iran: "IR Iran",
  "Ivory Coast": "Côte d'Ivoire",
  "Bosnia & Herzegovina": "Bosnia-Herzegovina",
  "Czech Republic": "Czechia",
  "Cape Verde": "Cape Verde Islands",
  "DR Congo": "Congo DR",
  Curacao: "Curaçao",
  Turkey: "Türkiye",
};

interface DbMatch {
  id: string;
  home_team_name: string;
  away_team_name: string;
  kickoff_at: string;
}

interface YtPlaylistItem {
  snippet: {
    title: string;
    publishedAt: string;
    resourceId: {
      videoId: string;
    };
  };
}

interface YtPlaylistResponse {
  items?: YtPlaylistItem[];
  nextPageToken?: string;
}

interface YtChannelResponse {
  items?: Array<{
    contentDetails: {
      relatedPlaylists: {
        uploads: string;
      };
    };
  }>;
}

function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getTeamVariants(ourName: string): string[] {
  const variants = new Set<string>();
  const fifaName = OUR_TO_FIFA_TEAM_NAME[ourName] ?? ourName;

  for (const name of [ourName, fifaName]) {
    const normalized = normalizeForMatch(name);
    if (normalized) variants.add(normalized);

    const words = normalized.split(/\s+/).filter((word) => word.length >= 3);
    for (const word of words) {
      variants.add(word);
    }
  }

  if (ourName === "USA") {
    variants.add("usa");
    variants.add("united states");
  }

  if (ourName === "South Korea") {
    variants.add("korea republic");
    variants.add("korea");
  }

  return [...variants];
}

function titleContainsTeam(title: string, teamName: string): boolean {
  const normalizedTitle = normalizeForMatch(title);
  return getTeamVariants(teamName).some((variant) => {
    if (variant.length < 3) return false;
    return normalizedTitle.includes(variant);
  });
}

function videoMatchesMatch(
  title: string,
  publishedAt: string,
  homeTeamName: string,
  awayTeamName: string,
  kickoffAt: string,
): boolean {
  const normalizedTitle = normalizeForMatch(title);
  if (!normalizedTitle.includes("highlight")) {
    return false;
  }

  if (
    !titleContainsTeam(title, homeTeamName) ||
    !titleContainsTeam(title, awayTeamName)
  ) {
    return false;
  }

  const publishedMs = new Date(publishedAt).getTime();
  const kickoffMs = new Date(kickoffAt).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  return (
    publishedMs >= kickoffMs - dayMs &&
    publishedMs <= kickoffMs + 3 * dayMs
  );
}

async function fetchUploadsPlaylistId(
  apiKey: string,
  channelId: string,
): Promise<string> {
  const url = new URL(`${YT_API_BASE}/channels`);
  url.searchParams.set("part", "contentDetails");
  url.searchParams.set("id", channelId);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`YouTube channels.list ${response.status}: ${body}`);
  }

  const data = (await response.json()) as YtChannelResponse;
  const uploadsId = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsId) {
    throw new Error("FIFA channel uploads playlist not found");
  }

  return uploadsId;
}

async function fetchRecentUploads(
  apiKey: string,
  uploadsPlaylistId: string,
  oldestKickoffMs: number,
): Promise<YtPlaylistItem[]> {
  const items: YtPlaylistItem[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`${YT_API_BASE}/playlistItems`);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("playlistId", uploadsPlaylistId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", apiKey);
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`YouTube playlistItems.list ${response.status}: ${body}`);
    }

    const data = (await response.json()) as YtPlaylistResponse;
    const pageItems = data.items ?? [];
    items.push(...pageItems);

    const cutoffMs = oldestKickoffMs - 2 * 24 * 60 * 60 * 1000;
    const oldestOnPage = pageItems.at(-1)?.snippet.publishedAt;
    if (oldestOnPage && new Date(oldestOnPage).getTime() < cutoffMs) {
      break;
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return items;
}

function scoreHighlightTitle(title: string): number {
  const normalized = normalizeForMatch(title);
  if (normalized.includes("alt cast")) return 1;
  if (normalized.startsWith("highlights")) return 10;
  if (normalized.includes("highlight")) return 5;
  return 0;
}

function findHighlightVideoId(
  uploads: YtPlaylistItem[],
  match: DbMatch,
): string | null {
  let bestVideoId: string | null = null;
  let bestScore = 0;

  for (const item of uploads) {
    const { title, publishedAt, resourceId } = item.snippet;
    if (
      !videoMatchesMatch(
        title,
        publishedAt,
        match.home_team_name,
        match.away_team_name,
        match.kickoff_at,
      )
    ) {
      continue;
    }

    const score = scoreHighlightTitle(title);
    if (score > bestScore) {
      bestScore = score;
      bestVideoId = resourceId.videoId;
    }
  }

  return bestVideoId;
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const youtubeApiKey = Deno.env.get("YOUTUBE_API_KEY");
  const fifaChannelId = Deno.env.get("FIFA_YT_CHANNEL_ID");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (
    !cronSecret ||
    !youtubeApiKey ||
    !fifaChannelId ||
    !supabaseUrl ||
    !serviceRoleKey
  ) {
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

  try {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 30);

    const { data: pendingMatches, error: pendingError } = await supabase
      .from("matches")
      .select("id, home_team_name, away_team_name, kickoff_at")
      .eq("status", "finished")
      .is("highlights_youtube_id", null)
      .gte("kickoff_at", since.toISOString())
      .order("kickoff_at", { ascending: false })
      .limit(MAX_MATCHES_PER_RUN);

    if (pendingError) {
      throw pendingError;
    }

    const matches = (pendingMatches ?? []) as DbMatch[];
    if (matches.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, pending: 0, matched: 0, updated: 0 }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const uploadsPlaylistId = await fetchUploadsPlaylistId(
      youtubeApiKey,
      fifaChannelId,
    );

    const oldestKickoffMs = Math.min(
      ...matches.map((match) => new Date(match.kickoff_at).getTime()),
    );

    const uploads = await fetchRecentUploads(
      youtubeApiKey,
      uploadsPlaylistId,
      oldestKickoffMs,
    );

    let matched = 0;
    let updated = 0;

    for (const match of matches) {
      const videoId = findHighlightVideoId(uploads, match);
      if (!videoId) continue;

      matched++;

      const { error: updateError } = await supabase
        .from("matches")
        .update({
          highlights_youtube_id: videoId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.id)
        .is("highlights_youtube_id", null);

      if (!updateError) {
        updated++;
      } else {
        console.error("Highlights update failed", match.id, updateError);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        pending: matches.length,
        uploadsScanned: uploads.length,
        matched,
        updated,
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
