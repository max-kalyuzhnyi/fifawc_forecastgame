import Image from "next/image";
import { cn } from "@/lib/utils";

const TEMPLATE_LAYERS = {
  background: "/card-template/background.svg",
  frame: "/card-template/frame.svg",
  emblem: "/card-template/emblem.svg",
  banner: "/card-template/banner.svg",
} as const;

interface CardArtTemplateProps {
  displayName: string;
  teamName: string;
  shirtNumber?: number | null;
  photoUrl?: string | null;
  owned?: boolean;
  locked?: boolean;
  onPhotoError?: () => void;
  className?: string;
}

function TemplateLayer({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG template layers
    <img
      src={src}
      alt=""
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
    />
  );
}

export function CardArtTemplate({
  displayName,
  teamName,
  shirtNumber,
  photoUrl,
  owned = false,
  locked = false,
  onPhotoError,
  className,
}: CardArtTemplateProps) {
  const showPhoto = Boolean(photoUrl);

  return (
    <div
      className={cn(
        "relative size-full",
        !owned && "brightness-[0.38] saturate-[0.08]",
        className,
      )}
    >
      <TemplateLayer src={TEMPLATE_LAYERS.background} />

      {showPhoto && (
        <div className="absolute top-[11.5%] left-[9.375%] h-[64.6%] w-[81.25%] overflow-hidden rounded-[3.5%]">
          <Image
            src={photoUrl!}
            alt=""
            fill
            unoptimized
            onError={onPhotoError}
            className={cn(
              "object-cover object-top",
              locked && "opacity-35 grayscale",
            )}
            aria-hidden
          />
        </div>
      )}

      {shirtNumber != null ? (
        <span
          className="pointer-events-none absolute top-[58%] right-[12%] -translate-y-1/2 font-black text-[clamp(1.5rem,8vw,2.5rem)] leading-none text-white/10 tabular-nums"
          aria-hidden
        >
          {shirtNumber}
        </span>
      ) : null}

      <TemplateLayer src={TEMPLATE_LAYERS.frame} />
      <TemplateLayer src={TEMPLATE_LAYERS.emblem} />
      <TemplateLayer src={TEMPLATE_LAYERS.banner} />

      <div className="absolute inset-x-[6.25%] bottom-[5.2%] flex h-[16.7%] flex-col items-center justify-center gap-0.5 px-2 text-center">
        <span
          className={cn(
            "line-clamp-2 text-[10px] font-bold uppercase leading-tight tracking-wide",
            owned ? "text-white" : "text-white/40",
          )}
        >
          {displayName}
        </span>
        <span
          className={cn(
            "line-clamp-1 text-[8px] font-medium",
            owned ? "text-white/60" : "text-white/25",
          )}
        >
          {teamName}
        </span>
      </div>

      {!owned ? (
        <div
          className="pointer-events-none absolute inset-0 bg-slate-950/30"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
