import type { CARD_TEAMS } from "@/shared/lib/cards/config";
import type { CommonsPhotoCandidate } from "./types";

const FIFAROSTERS_BASE = "https://www.fifarosters.com";
const USER_AGENT =
  "fifawc-forecastgame/1.0 (card photo import; https://github.com/fifawc-forecastgame)";

const API_DELAY_MS = Number(process.env.FIFAROSTERS_API_DELAY_MS ?? 800);
const FUT_YEAR = process.env.FIFAROSTERS_YEAR ?? "26";

/** FIFA nation ids for CARD_TEAMS squads (FUT asset namespace). */
export const TEAM_FIFA_NATION_ID: Record<(typeof CARD_TEAMS)[number], string> = {
  Belgium: "7",
  Brazil: "54",
  Argentina: "52",
  Croatia: "10",
  England: "14",
  France: "18",
  Germany: "21",
  Mexico: "83",
  Netherlands: "34",
  Portugal: "38",
  Spain: "45",
  USA: "95",
};

export interface FifaRostersLookupRow {
  futid: string;
  playerid: string;
  baseid: string;
  label: string;
  img_url: string;
  xl_img_url: string;
  rating: string;
  color_label: string | null;
  data: {
    nationid: string;
    club_name: string;
    rating: string;
    color_label?: string | null;
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizePlayerName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function nameMatchesLookupLabel(label: string, playerName: string): boolean {
  const normalizedLabel = normalizePlayerName(label);
  const normalizedPlayer = normalizePlayerName(playerName);

  if (!normalizedLabel || !normalizedPlayer) {
    return false;
  }

  if (normalizedLabel === normalizedPlayer) {
    return true;
  }

  if (normalizedLabel.includes(normalizedPlayer) || normalizedPlayer.includes(normalizedLabel)) {
    return true;
  }

  const labelTokens = normalizedLabel.split(" ").filter(Boolean);
  const playerTokens = normalizedPlayer.split(" ").filter(Boolean);

  if (labelTokens.length === 0 || playerTokens.length === 0) {
    return false;
  }

  const labelLast = labelTokens[labelTokens.length - 1];
  const playerLast = playerTokens[playerTokens.length - 1];

  if (lastNamesCompatible(labelLast, playerLast)) {
    const labelFirst = labelTokens[0];
    const playerFirst = playerTokens[0];

    if (labelFirst === playerFirst) {
      return true;
    }

    if (
      labelFirst.length >= 4 &&
      playerFirst.length >= 4 &&
      (labelFirst.startsWith(playerFirst.slice(0, 4)) ||
        playerFirst.startsWith(labelFirst.slice(0, 4)))
    ) {
      return true;
    }

    if (labelFirst.length <= 4 || playerFirst.length <= 4) {
      return true;
    }
  }

  return false;
}

function lastNamesCompatible(left: string, right: string): boolean {
  if (left === right) {
    return true;
  }

  const pairs = [
    ["jr", "junior"],
    ["jr", "jr."],
    ["junior", "jr."],
  ];

  return pairs.some(([a, b]) => (left === a && right === b) || (left === b && right === a));
}

export function filterLookupRows(
  rows: FifaRostersLookupRow[],
  playerName: string,
  teamName: string,
  alternateNames: string[] = [],
): FifaRostersLookupRow[] {
  const nationId = TEAM_FIFA_NATION_ID[teamName as keyof typeof TEAM_FIFA_NATION_ID];
  const acceptedNames = [playerName, ...alternateNames];

  return rows.filter((row) => {
    if (!acceptedNames.some((name) => nameMatchesLookupLabel(row.label, name))) {
      return false;
    }

    if (nationId && row.data?.nationid !== nationId) {
      return false;
    }

    return Boolean(row.img_url || row.xl_img_url);
  });
}

export function pickPrimaryBaseId(rows: FifaRostersLookupRow[]): string | null {
  if (rows.length === 0) {
    return null;
  }

  const byBaseId = new Map<string, FifaRostersLookupRow[]>();

  for (const row of rows) {
    const group = byBaseId.get(row.baseid) ?? [];
    group.push(row);
    byBaseId.set(row.baseid, group);
  }

  let bestBaseId: string | null = null;
  let bestScore = -1;

  for (const [baseId, group] of byBaseId) {
    const maxRating = Math.max(...group.map((row) => Number(row.data?.rating ?? row.rating) || 0));
    const dynamicCount = group.filter((row) => isDynamicImageUrl(row.img_url)).length;
    const score = maxRating * 10 + dynamicCount;

    if (score > bestScore) {
      bestScore = score;
      bestBaseId = baseId;
    }
  }

  return bestBaseId;
}

function isDynamicImageUrl(url: string): boolean {
  return /\/dynamic\//.test(url);
}

function isFaceImageUrl(url: string): boolean {
  return /\/faces\//.test(url);
}

function imageUrlForRow(row: FifaRostersLookupRow): string {
  return row.xl_img_url || row.img_url;
}

function defaultDimensions(source: "fifarosters_face" | "fifarosters_dynamic"): {
  width: number;
  height: number;
} {
  if (source === "fifarosters_dynamic") {
    return { width: 512, height: 768 };
  }

  return { width: 256, height: 256 };
}

export function buildCandidatesFromLookupRows(
  rows: FifaRostersLookupRow[],
): CommonsPhotoCandidate[] {
  const baseId = pickPrimaryBaseId(rows);

  if (!baseId) {
    return [];
  }

  const playerRows = rows.filter((row) => row.baseid === baseId);
  const candidates = new Map<string, CommonsPhotoCandidate>();

  for (const row of playerRows) {
    const imageUrl = imageUrlForRow(row);
    const isDynamic = isDynamicImageUrl(imageUrl);
    const isFace = isFaceImageUrl(imageUrl);

    if (!isDynamic && !isFace) {
      continue;
    }

    const source = isDynamic ? "fifarosters_dynamic" : "fifarosters_face";
    const fileTitle = isDynamic ? `fut-${row.futid}` : `face-${row.baseid}`;
    const rating = row.data?.rating ?? row.rating;
    const cardLabel = row.color_label ?? row.data?.color_label ?? "base";
    const dimensions = defaultDimensions(source);

    candidates.set(fileTitle, {
      fileTitle,
      source,
      sourceUrl: imageUrl,
      thumbUrl: imageUrl,
      width: dimensions.width,
      height: dimensions.height,
      licenseUrl: null,
      authorCredit: "EA Sports / FifaRosters",
      description: `${cardLabel} · rating ${rating} · ${row.data?.club_name ?? "unknown club"}`,
    });
  }

  return [...candidates.values()];
}

export async function lookupFifaRostersPlayers(
  term: string,
  year: string = FUT_YEAR,
): Promise<FifaRostersLookupRow[]> {
  const url = new URL(`${FIFAROSTERS_BASE}/lookupfutplayer.php`);
  url.searchParams.set("term", term);
  url.searchParams.set("year", year);

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`FifaRosters lookup failed: ${response.status} ${url}`);
  }

  await sleep(API_DELAY_MS);

  const rows = (await response.json()) as FifaRostersLookupRow[];

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.filter((row) => row.label && row.label !== "No results found");
}

export async function downloadCandidateImage(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${url}`);
  }

  await sleep(API_DELAY_MS);
  return Buffer.from(await response.arrayBuffer());
}

export function buildSearchTerms(playerName: string, wikiTitle?: string | null): string[] {
  const terms = new Set<string>([playerName.trim()]);

  if (wikiTitle?.trim()) {
    terms.add(wikiTitle.trim());
  }

  const tokens = normalizePlayerName(playerName).split(" ").filter(Boolean);
  if (tokens.length >= 2) {
    terms.add(`${tokens[0]} ${tokens[tokens.length - 1]}`);
  }

  const firstToken = tokens[0];
  if (firstToken && firstToken.length >= 4) {
    terms.add(`${firstToken.slice(0, 4)} Jr.`);
  }

  return [...terms].filter(Boolean);
}

export async function collectFifaRostersCandidates(input: {
  playerName: string;
  teamName: string;
  wikiTitle?: string | null;
}): Promise<CommonsPhotoCandidate[]> {
  const searchTerms = buildSearchTerms(input.playerName, input.wikiTitle);
  const mergedRows: FifaRostersLookupRow[] = [];

  for (const term of searchTerms) {
    const rows = await lookupFifaRostersPlayers(term);
    mergedRows.push(...rows);

    const filtered = filterLookupRows(mergedRows, input.playerName, input.teamName, searchTerms);
    if (filtered.length > 0) {
      return buildCandidatesFromLookupRows(filtered);
    }
  }

  const filtered = filterLookupRows(
    mergedRows,
    input.playerName,
    input.teamName,
    searchTerms,
  );
  return buildCandidatesFromLookupRows(filtered);
}
