import { useTranslations } from "next-intl";
import {
  buildYoutubeThumbnailUrl,
  buildYoutubeWatchUrl,
} from "@/shared/lib/youtube";
import { cn } from "@/lib/utils";

interface MatchHighlightsThumbProps {
  videoId: string;
  className?: string;
}

export function MatchHighlightsThumb({
  videoId,
  className,
}: MatchHighlightsThumbProps) {
  const t = useTranslations("matches");

  return (
    <a
      href={buildYoutubeWatchUrl(videoId)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("highlightsWatchOnYoutube")}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "relative block w-14 shrink-0 overflow-hidden rounded-md aspect-video ring-1 ring-white/15",
        className,
      )}
    >
      <img
        src={buildYoutubeThumbnailUrl(videoId, "mq")}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/25" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span
          aria-hidden
          className="ml-px size-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-white/90"
        />
      </span>
    </a>
  );
}

interface MatchHighlightsProps {
  videoId: string;
}

export function MatchHighlights({ videoId }: MatchHighlightsProps) {
  const t = useTranslations("matches");
  const watchUrl = buildYoutubeWatchUrl(videoId);

  return (
    <a
      href={watchUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("highlightsWatchOnYoutube")}
      className="group block overflow-hidden rounded-xl border border-white/10 bg-black/20"
    >
      <div className="relative aspect-video w-full">
        <img
          src={buildYoutubeThumbnailUrl(videoId, "hq")}
          alt={t("highlights")}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/35" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-black/55 ring-1 ring-white/20 transition-transform group-hover:scale-105">
            <span
              aria-hidden
              className="ml-1 size-0 border-y-[10px] border-l-[16px] border-y-transparent border-l-white"
            />
          </span>
        </div>
        <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white/90">
          {t("highlights")}
        </span>
      </div>
    </a>
  );
}
