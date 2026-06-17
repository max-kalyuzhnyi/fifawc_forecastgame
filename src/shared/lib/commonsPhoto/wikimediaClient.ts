import type { CommonsPhotoCandidate, CommonsPhotoSource } from "./types";

const USER_AGENT =
  "fifawc-forecastgame/1.0 (card photo import; https://github.com/fifawc-forecastgame)";

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

const API_DELAY_MS = Number(process.env.COMMONS_API_DELAY_MS ?? 1200);
const MAX_RETRIES = 5;
const THUMB_WIDTH = 500;

interface ImageInfoRow {
  thumburl?: string;
  url?: string;
  width?: number;
  height?: number;
  mime?: string;
  extmetadata?: Record<string, { value?: string }>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (!header) return null;

  const seconds = Number.parseInt(header, 10);
  if (!Number.isNaN(seconds)) {
    return seconds * 1000;
  }

  const dateMs = Date.parse(header);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return null;
}

async function wikimediaFetch(url: string, attempt = 0): Promise<Response> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Api-User-Agent": USER_AGENT,
    },
  });

  if ((response.status === 429 || response.status === 503) && attempt < MAX_RETRIES) {
    const retryAfter = parseRetryAfterMs(response) ?? 5000 * (attempt + 1);
    console.warn(
      `Wikimedia rate limited (${response.status}), waiting ${Math.round(retryAfter / 1000)}s...`,
    );
    await sleep(retryAfter);
    return wikimediaFetch(url, attempt + 1);
  }

  if (!response.ok) {
    throw new Error(`Wikimedia request failed: ${response.status} ${url}`);
  }

  await sleep(API_DELAY_MS);
  return response;
}

function toFileTitle(rawTitle: string): string {
  const trimmed = rawTitle.trim();
  if (trimmed.startsWith("File:")) {
    return trimmed.slice("File:".length);
  }
  return trimmed;
}

function commonsFileUrl(fileTitle: string): string {
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileTitle.replace(/ /g, "_"))}`;
}

function readMetadata(
  extmetadata: Record<string, { value?: string }> | undefined,
  key: string,
): string | null {
  const value = extmetadata?.[key]?.value?.trim();
  return value || null;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function fetchImageInfo(fileTitle: string): Promise<CommonsPhotoCandidate | null> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "imageinfo",
    titles: `File:${fileTitle}`,
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: String(THUMB_WIDTH),
  });

  const response = await wikimediaFetch(`${COMMONS_API}?${params}`);
  const data = (await response.json()) as {
    query?: { pages?: { title?: string; imageinfo?: ImageInfoRow[]; missing?: boolean }[] };
  };

  const page = data.query?.pages?.[0];
  const info = page?.imageinfo?.[0];
  if (!page || page.missing || !info?.url) {
    return null;
  }

  const normalizedTitle = toFileTitle(page.title ?? fileTitle);

  return {
    fileTitle: normalizedTitle,
    source: "commons_search",
    sourceUrl: commonsFileUrl(normalizedTitle),
    thumbUrl: info.thumburl ?? info.url,
    width: info.width ?? 0,
    height: info.height ?? 0,
    licenseUrl: readMetadata(info.extmetadata, "LicenseUrl"),
    authorCredit: stripHtml(readMetadata(info.extmetadata, "Artist") ?? ""),
    description: stripHtml(readMetadata(info.extmetadata, "ImageDescription") ?? ""),
  };
}

function withSource(
  candidate: CommonsPhotoCandidate,
  source: CommonsPhotoSource,
): CommonsPhotoCandidate {
  return { ...candidate, source };
}

export async function resolveWikipediaPageTitle(playerName: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "opensearch",
    format: "json",
    search: playerName,
    namespace: "0",
    limit: "5",
  });

  const response = await wikimediaFetch(`${WIKIPEDIA_API}?${params}`);
  const data = (await response.json()) as [string, string[], string[], string[]];
  const titles = data[1] ?? [];

  const exact = titles.find(
    (title) => title.toLowerCase() === playerName.toLowerCase(),
  );
  return exact ?? titles[0] ?? null;
}

export async function fetchWikidataP18(wikiTitle: string): Promise<CommonsPhotoCandidate | null> {
  const pageParams = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "pageprops",
    titles: wikiTitle,
    redirects: "1",
  });

  const pageResponse = await wikimediaFetch(`${WIKIPEDIA_API}?${pageParams}`);
  const pageData = (await pageResponse.json()) as {
    query?: { pages?: { pageprops?: { wikibase_item?: string } }[] };
  };

  const entityId = pageData.query?.pages?.[0]?.pageprops?.wikibase_item;
  if (!entityId) {
    return null;
  }

  const entityParams = new URLSearchParams({
    action: "wbgetentities",
    format: "json",
    ids: entityId,
    props: "claims",
  });

  const entityResponse = await wikimediaFetch(`${WIKIDATA_API}?${entityParams}`);
  const entityData = (await entityResponse.json()) as {
    entities?: Record<
      string,
      { claims?: { P18?: { mainsnak?: { datavalue?: { value?: string } } }[] } }
    >;
  };

  const fileName = entityData.entities?.[entityId]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  if (!fileName) {
    return null;
  }

  const candidate = await fetchImageInfo(fileName);
  return candidate ? withSource(candidate, "wikidata_p18") : null;
}

export async function fetchWikipediaPageImage(
  wikiTitle: string,
): Promise<CommonsPhotoCandidate | null> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "pageimages",
    piprop: "name|thumbnail|original",
    pithumbsize: String(THUMB_WIDTH),
    titles: wikiTitle,
    redirects: "1",
  });

  const response = await wikimediaFetch(`${WIKIPEDIA_API}?${params}`);
  const data = (await response.json()) as {
    query?: {
      pages?: {
        title?: string;
        pageimage?: string;
        thumbnail?: { source?: string; width?: number; height?: number };
        original?: { source?: string; width?: number; height?: number };
      }[];
    };
  };

  const page = data.query?.pages?.[0];
  if (!page?.pageimage) {
    return null;
  }

  const candidate = await fetchImageInfo(page.pageimage);
  return candidate ? withSource(candidate, "wikipedia_pageimage") : null;
}

export async function searchCommonsFiles(
  query: string,
  limit = 8,
): Promise<CommonsPhotoCandidate[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    list: "search",
    srsearch: query,
    srnamespace: "6",
    srlimit: String(limit),
  });

  const response = await wikimediaFetch(`${COMMONS_API}?${params}`);
  const data = (await response.json()) as {
    query?: { search?: { title: string }[] };
  };

  const titles = (data.query?.search ?? []).map((entry) => toFileTitle(entry.title));
  const candidates: CommonsPhotoCandidate[] = [];

  for (const title of titles) {
    const candidate = await fetchImageInfo(title);
    if (candidate) {
      candidates.push(withSource(candidate, "commons_search"));
    }
  }

  return candidates;
}

export async function fetchCommonsCategoryFiles(
  playerName: string,
  limit = 12,
): Promise<CommonsPhotoCandidate[]> {
  const categoryTitle = `Category:${playerName}`;
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    list: "categorymembers",
    cmtitle: categoryTitle,
    cmtype: "file",
    cmlimit: String(limit),
  });

  const response = await wikimediaFetch(`${COMMONS_API}?${params}`);
  const data = (await response.json()) as {
    query?: { categorymembers?: { title: string }[] };
  };

  const titles = (data.query?.categorymembers ?? []).map((entry) => toFileTitle(entry.title));
  const candidates: CommonsPhotoCandidate[] = [];

  for (const title of titles) {
    const candidate = await fetchImageInfo(title);
    if (candidate) {
      candidates.push(withSource(candidate, "commons_category"));
    }
  }

  return candidates;
}

export async function collectCommonsCandidates(input: {
  playerName: string;
  teamName: string;
  wikiTitle: string | null;
}): Promise<CommonsPhotoCandidate[]> {
  const wikiTitle = input.wikiTitle ?? (await resolveWikipediaPageTitle(input.playerName));
  const deduped = new Map<string, CommonsPhotoCandidate>();

  const addCandidate = (candidate: CommonsPhotoCandidate | null) => {
    if (!candidate) return;
    const key = candidate.fileTitle.toLowerCase();
    if (!deduped.has(key)) {
      deduped.set(key, candidate);
    }
  };

  if (wikiTitle) {
    addCandidate(await fetchWikidataP18(wikiTitle));
    addCandidate(await fetchWikipediaPageImage(wikiTitle));
  }

  for (const candidate of await fetchCommonsCategoryFiles(input.playerName)) {
    addCandidate(candidate);
  }

  const searchQueries = [
    `"${input.playerName}" "${input.teamName}" national team football`,
    `"${input.playerName}" football cropped`,
    `"${input.playerName}" soccer`,
  ];

  for (const query of searchQueries) {
    for (const candidate of await searchCommonsFiles(query, 6)) {
      addCandidate(candidate);
    }
  }

  return [...deduped.values()];
}

export async function downloadCandidateImage(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });

  if (response.status === 429 || response.status === 503) {
    const retryAfter = parseRetryAfterMs(response) ?? 5000;
    await sleep(retryAfter);
    return downloadCandidateImage(url);
  }

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${url}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
