const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extract a YouTube video ID from a URL or raw ID string.
 * Returns null when the input is empty or not recognizable.
 */
export function parseYoutubeVideoId(input: string | null | undefined): string | null {
  const trimmed = input?.trim();
  if (!trimmed) return null;

  if (YOUTUBE_ID_RE.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);

    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.slice(1).split("/")[0];
      return YOUTUBE_ID_RE.test(id) ? id : null;
    }

    if (url.hostname.includes("youtube.com")) {
      const fromQuery = url.searchParams.get("v");
      if (fromQuery && YOUTUBE_ID_RE.test(fromQuery)) {
        return fromQuery;
      }

      const shortsMatch = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (shortsMatch?.[1]) {
        return shortsMatch[1];
      }

      const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch?.[1]) {
        return embedMatch[1];
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function buildYoutubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

export function buildYoutubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function buildYoutubeThumbnailUrl(
  videoId: string,
  quality: "default" | "hq" | "mq" | "sd" | "maxres" = "hq",
): string {
  const file =
    quality === "maxres"
      ? "maxresdefault.jpg"
      : quality === "hq"
        ? "hqdefault.jpg"
        : quality === "mq"
          ? "mqdefault.jpg"
          : quality === "sd"
            ? "sddefault.jpg"
            : "default.jpg";

  return `https://i.ytimg.com/vi/${videoId}/${file}`;
}

export function buildYoutubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
