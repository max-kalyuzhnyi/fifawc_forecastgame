import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";
const MAX_PAGES = 5;
const MAX_MATCHES_PER_RUN = 20;
const SPORTTV_CHANNEL_HANDLE = "sporttvportugal";

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

const OUR_TO_PT_TEAM_NAME: Record<string, string> = {
  Algeria: "Argélia",
  Argentina: "Argentina",
  Australia: "Austrália",
  Austria: "Áustria",
  Belgium: "Bélgica",
  "Bosnia & Herzegovina": "Bósnia e Herzegovina",
  Brazil: "Brasil",
  Canada: "Canadá",
  "Cape Verde": "Cabo Verde",
  Colombia: "Colômbia",
  Croatia: "Croácia",
  Curaçao: "Curaçao",
  "Czech Republic": "República Checa",
  "DR Congo": "RD Congo",
  Ecuador: "Equador",
  Egypt: "Egito",
  England: "Inglaterra",
  France: "França",
  Germany: "Alemanha",
  Ghana: "Gana",
  Haiti: "Haiti",
  Iran: "Irão",
  Iraq: "Iraque",
  "Ivory Coast": "Costa do Marfim",
  Japan: "Japão",
  Jordan: "Jordânia",
  Mexico: "México",
  Morocco: "Marrocos",
  Netherlands: "Países Baixos",
  "New Zealand": "Nova Zelândia",
  Norway: "Noruega",
  Panama: "Panamá",
  Paraguay: "Paraguai",
  Portugal: "Portugal",
  Qatar: "Catar",
  "Saudi Arabia": "Arábia Saudita",
  Scotland: "Escócia",
  Senegal: "Senegal",
  "South Africa": "África do Sul",
  "South Korea": "Coreia do Sul",
  Spain: "Espanha",
  Sweden: "Suécia",
  Switzerland: "Suíça",
  Tunisia: "Tunísia",
  Turkey: "Turquia",
  USA: "Estados Unidos",
  Uruguay: "Uruguai",
  Uzbekistan: "Usbequistão",
};

type HighlightSource = "fifa" | "sporttv";

interface DbMatch {
  id: string;
  home_team_name: string;
  away_team_name: string;
  kickoff_at: string;
  highlights_youtube_id: string | null;
  highlights_source: string | null;
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

function addNameVariants(variants: Set<string>, name: string): void {
  const normalized = normalizeForMatch(name);
  if (normalized) variants.add(normalized);

  const words = normalized.split(/\s+/).filter((word) => word.length >= 3);
  for (const word of words) {
    variants.add(word);
  }
}

function getTeamVariants(ourName: string): string[] {
  const variants = new Set<string>();
  const fifaName = OUR_TO_FIFA_TEAM_NAME[ourName] ?? ourName;
  const ptName = OUR_TO_PT_TEAM_NAME[ourName];

  for (const name of [ourName, fifaName, ptName].filter(Boolean)) {
    addNameVariants(variants, name);
  }

  if (ourName === "USA") {
    variants.add("usa");
    variants.add("united states");
    variants.add("estados unidos");
    variants.add("eua");
  }

  if (ourName === "South Korea") {
    variants.add("korea republic");
    variants.add("korea");
    variants.add("coreia do sul");
    variants.add("coreia");
  }

  if (ourName === "Netherlands") {
    variants.add("paises baixos");
    variants.add("holanda");
  }

  if (ourName === "DR Congo") {
    variants.add("rd congo");
    variants.add("congo dr");
    variants.add("republica democratica do congo");
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

function videoMatchesTeamsAndDate(
  title: string,
  publishedAt: string,
  homeTeamName: string,
  awayTeamName: string,
  kickoffAt: string,
): boolean {
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

function titleHasKeyword(
  title: string,
  keywords: string[],
): boolean {
  const normalizedTitle = normalizeForMatch(title);
  return keywords.some((keyword) => normalizedTitle.includes(keyword));
}

function videoMatchesFifaHighlight(
  title: string,
  publishedAt: string,
  homeTeamName: string,
  awayTeamName: string,
  kickoffAt: string,
): boolean {
  if (!titleHasKeyword(title, ["highlight"])) {
    return false;
  }

  return videoMatchesTeamsAndDate(
    title,
    publishedAt,
    homeTeamName,
    awayTeamName,
    kickoffAt,
  );
}

function videoMatchesSportTvSummary(
  title: string,
  publishedAt: string,
  homeTeamName: string,
  awayTeamName: string,
  kickoffAt: string,
): boolean {
  if (!titleHasKeyword(title, ["resumo", "summary"])) {
    return false;
  }

  return videoMatchesTeamsAndDate(
    title,
    publishedAt,
    homeTeamName,
    awayTeamName,
    kickoffAt,
  );
}

async function fetchUploadsPlaylistId(
  apiKey: string,
  options: { channelId?: string; forHandle?: string },
): Promise<string> {
  const url = new URL(`${YT_API_BASE}/channels`);
  url.searchParams.set("part", "contentDetails");
  url.searchParams.set("key", apiKey);

  if (options.channelId) {
    url.searchParams.set("id", options.channelId);
  } else if (options.forHandle) {
    url.searchParams.set("forHandle", options.forHandle);
  } else {
    throw new Error("Either channelId or forHandle is required");
  }

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`YouTube channels.list ${response.status}: ${body}`);
  }

  const data = (await response.json()) as YtChannelResponse;
  const uploadsId = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsId) {
    throw new Error("YouTube channel uploads playlist not found");
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

function scoreFifaHighlightTitle(title: string): number {
  const normalized = normalizeForMatch(title);
  if (normalized.includes("alt cast")) return 1;
  if (normalized.startsWith("highlights")) return 10;
  if (normalized.includes("highlight")) return 5;
  return 0;
}

function scoreSportTvTitle(title: string): number {
  const normalized = normalizeForMatch(title);
  if (normalized.startsWith("resumo")) return 10;
  if (normalized.startsWith("summary")) return 10;
  if (normalized.includes("resumo")) return 5;
  if (normalized.includes("summary")) return 5;
  return 0;
}

function findBestVideoId(
  uploads: YtPlaylistItem[],
  match: DbMatch,
  matcher: (
    title: string,
    publishedAt: string,
    homeTeamName: string,
    awayTeamName: string,
    kickoffAt: string,
  ) => boolean,
  scorer: (title: string) => number,
): string | null {
  let bestVideoId: string | null = null;
  let bestScore = 0;

  for (const item of uploads) {
    const { title, publishedAt, resourceId } = item.snippet;
    if (
      !matcher(
        title,
        publishedAt,
        match.home_team_name,
        match.away_team_name,
        match.kickoff_at,
      )
    ) {
      continue;
    }

    const score = scorer(title);
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
  const sportTvChannelId = Deno.env.get("SPORTTV_YT_CHANNEL_ID");
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
      .select(
        "id, home_team_name, away_team_name, kickoff_at, highlights_youtube_id, highlights_source",
      )
      .eq("status", "finished")
      .or("highlights_youtube_id.is.null,highlights_source.eq.sporttv")
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

    const oldestKickoffMs = Math.min(
      ...matches.map((match) => new Date(match.kickoff_at).getTime()),
    );

    const fifaUploadsPlaylistId = await fetchUploadsPlaylistId(youtubeApiKey, {
      channelId: fifaChannelId,
    });
    const fifaUploads = await fetchRecentUploads(
      youtubeApiKey,
      fifaUploadsPlaylistId,
      oldestKickoffMs,
    );

    const needsSportTvFallback = matches.some(
      (match) => !match.highlights_youtube_id,
    );

    let sportTvUploads: YtPlaylistItem[] = [];
    if (needsSportTvFallback) {
      const sportTvUploadsPlaylistId = await fetchUploadsPlaylistId(
        youtubeApiKey,
        sportTvChannelId
          ? { channelId: sportTvChannelId }
          : { forHandle: SPORTTV_CHANNEL_HANDLE },
      );
      sportTvUploads = await fetchRecentUploads(
        youtubeApiKey,
        sportTvUploadsPlaylistId,
        oldestKickoffMs,
      );
    }

    let matchedFifa = 0;
    let matchedSportTv = 0;
    let updated = 0;

    for (const match of matches) {
      const fifaVideoId = findBestVideoId(
        fifaUploads,
        match,
        videoMatchesFifaHighlight,
        scoreFifaHighlightTitle,
      );

      if (fifaVideoId) {
        matchedFifa++;

        const { error: updateError } = await supabase
          .from("matches")
          .update({
            highlights_youtube_id: fifaVideoId,
            highlights_source: "fifa" satisfies HighlightSource,
            updated_at: new Date().toISOString(),
          })
          .eq("id", match.id)
          .or("highlights_youtube_id.is.null,highlights_source.eq.sporttv");

        if (!updateError) {
          updated++;
        } else {
          console.error("FIFA highlights update failed", match.id, updateError);
        }
        continue;
      }

      if (match.highlights_youtube_id) {
        continue;
      }

      const sportTvVideoId = findBestVideoId(
        sportTvUploads,
        match,
        videoMatchesSportTvSummary,
        scoreSportTvTitle,
      );
      if (!sportTvVideoId) continue;

      matchedSportTv++;

      const { error: updateError } = await supabase
        .from("matches")
        .update({
          highlights_youtube_id: sportTvVideoId,
          highlights_source: "sporttv" satisfies HighlightSource,
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.id)
        .is("highlights_youtube_id", null);

      if (!updateError) {
        updated++;
      } else {
        console.error("Sport TV highlights update failed", match.id, updateError);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        pending: matches.length,
        fifaUploadsScanned: fifaUploads.length,
        sportTvUploadsScanned: sportTvUploads.length,
        matchedFifa,
        matchedSportTv,
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
