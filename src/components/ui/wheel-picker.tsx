"use client";

import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PADDING_COUNT = Math.floor(VISIBLE_ITEMS / 2);

interface WheelPickerProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  "aria-label"?: string;
  className?: string;
}

export function WheelPicker({
  value,
  onChange,
  min = 0,
  max = 10,
  "aria-label": ariaLabel,
  className,
}: WheelPickerProps) {
  const items = React.useMemo(
    () => Array.from({ length: max - min + 1 }, (_, i) => min + i),
    [min, max],
  );

  const valueIndex = Math.max(0, Math.min(value - min, items.length - 1));
  const startIndex = PADDING_COUNT + valueIndex;

  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: "y",
    loop: false,
    dragFree: false,
    containScroll: "trimSnaps",
    align: "center",
    startIndex,
  });

  const [selectedIndex, setSelectedIndex] = React.useState(valueIndex);

  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  React.useEffect(() => {
    if (!emblaApi) return;

    const clampSnap = (snapIndex: number) =>
      Math.max(
        PADDING_COUNT,
        Math.min(snapIndex, PADDING_COUNT + items.length - 1),
      );

    const syncFromEmbla = () => {
      const snapIndex = clampSnap(emblaApi.selectedScrollSnap());
      if (snapIndex !== emblaApi.selectedScrollSnap()) {
        emblaApi.scrollTo(snapIndex, false);
      }
      const nextValueIndex = snapIndex - PADDING_COUNT;
      setSelectedIndex(nextValueIndex);
      onChangeRef.current(min + nextValueIndex);
    };

    const scrollToValue = () => {
      emblaApi.scrollTo(PADDING_COUNT + valueIndex, false);
      setSelectedIndex(valueIndex);
    };

    emblaApi.on("init", scrollToValue);
    emblaApi.on("reInit", scrollToValue);
    emblaApi.on("select", syncFromEmbla);

    if (emblaApi.scrollSnapList().length > 0) {
      scrollToValue();
    }

    return () => {
      emblaApi.off("init", scrollToValue);
      emblaApi.off("reInit", scrollToValue);
      emblaApi.off("select", syncFromEmbla);
    };
  }, [emblaApi, items.length, valueIndex]);

  React.useEffect(() => {
    if (!emblaApi) return;
    const targetSnap = PADDING_COUNT + valueIndex;
    if (emblaApi.selectedScrollSnap() !== targetSnap) {
      emblaApi.scrollTo(targetSnap, false);
      setSelectedIndex(valueIndex);
    }
  }, [emblaApi, valueIndex]);

  const containerHeight = ITEM_HEIGHT * VISIBLE_ITEMS;

  return (
    <div
      className={cn("relative flex-1 select-none", className)}
      aria-label={ariaLabel}
      role="group"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 rounded-xl border border-white/10 bg-white/5"
        style={{ height: ITEM_HEIGHT }}
        aria-hidden
      />

      <div
        ref={emblaRef}
        className="overflow-hidden overscroll-contain touch-pan-x"
        style={{ height: containerHeight }}
        data-vaul-no-drag
      >
        <div className="flex flex-col">
          {Array.from({ length: PADDING_COUNT }, (_, padIndex) => (
            <div
              key={`pad-top-${padIndex}`}
              className="shrink-0 grow-0"
              style={{ height: ITEM_HEIGHT, flexBasis: ITEM_HEIGHT }}
              aria-hidden
            />
          ))}
          {items.map((item, index) => {
            const distance = Math.abs(index - selectedIndex);
            const opacity = distance === 0 ? 1 : distance === 1 ? 0.45 : 0.2;
            const scale = distance === 0 ? 1 : distance === 1 ? 0.85 : 0.7;

            return (
              <div
                key={item}
                className="flex shrink-0 grow-0 items-center justify-center tabular-nums transition-[opacity,transform] duration-150"
                style={{
                  height: ITEM_HEIGHT,
                  flexBasis: ITEM_HEIGHT,
                  opacity,
                  transform: `scale(${scale})`,
                  fontSize: distance === 0 ? "1.5rem" : "1.125rem",
                  fontWeight: distance === 0 ? 600 : 400,
                }}
                role="option"
                aria-selected={index === selectedIndex}
              >
                {item}
              </div>
            );
          })}
          {Array.from({ length: PADDING_COUNT }, (_, padIndex) => (
            <div
              key={`pad-bottom-${padIndex}`}
              className="shrink-0 grow-0"
              style={{ height: ITEM_HEIGHT, flexBasis: ITEM_HEIGHT }}
              aria-hidden
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ScoreWheelPickerProps {
  homeScore: number;
  awayScore: number;
  onHomeChange: (value: number) => void;
  onAwayChange: (value: number) => void;
  homeLabel: string;
  awayLabel: string;
  className?: string;
}

export function ScoreWheelPicker({
  homeScore,
  awayScore,
  onHomeChange,
  onAwayChange,
  homeLabel,
  awayLabel,
  className,
}: ScoreWheelPickerProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <WheelPicker
        value={homeScore}
        onChange={onHomeChange}
        aria-label={homeLabel}
      />
      <span className="shrink-0 px-0.5 text-2xl font-light text-muted-foreground">
        :
      </span>
      <WheelPicker
        value={awayScore}
        onChange={onAwayChange}
        aria-label={awayLabel}
      />
    </div>
  );
}
