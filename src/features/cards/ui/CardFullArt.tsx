import Image from "next/image";
import { cn } from "@/lib/utils";

const CARD_MASK_STYLE = {
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center top",
  maskPosition: "center top",
} as const;

export function cardMaskStyle(imageUrl: string): React.CSSProperties {
  const mask = `url("${imageUrl}")`;
  return {
    ...CARD_MASK_STYLE,
    WebkitMaskImage: mask,
    maskImage: mask,
  };
}

interface CardFullArtProps {
  src: string;
  alt: string;
  owned: boolean;
  onError: () => void;
  className?: string;
}

export function CardFullArt({
  src,
  alt,
  owned,
  onError,
  className,
}: CardFullArtProps) {
  return (
    <div className={cn("relative size-full", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        onError={onError}
        className={cn(
          "object-top object-contain",
          owned
            ? "brightness-105 contrast-105"
            : "opacity-[0.38] saturate-0 brightness-90",
        )}
      />
      {!owned ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-slate-950/62"
          style={cardMaskStyle(src)}
        />
      ) : null}
    </div>
  );
}
