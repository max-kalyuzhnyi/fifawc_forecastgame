"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const DEFAULT_ITEM_HEIGHT = 44;
const DEFAULT_VISIBLE_ITEMS = 5;

interface WheelPickerProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  itemHeight?: number;
  visibleItems?: number;
  "aria-label"?: string;
  className?: string;
}

export function WheelPicker({
  value,
  onChange,
  min = 0,
  max = 10,
  itemHeight = DEFAULT_ITEM_HEIGHT,
  visibleItems = DEFAULT_VISIBLE_ITEMS,
  "aria-label": ariaLabel,
  className,
}: WheelPickerProps) {
  const paddingCount = Math.floor(visibleItems / 2);
  const items = React.useMemo(
    () => Array.from({ length: max - min + 1 }, (_, i) => min + i),
    [min, max],
  );

  const valueIndex = Math.max(0, Math.min(value - min, items.length - 1));
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const isSyncingRef = React.useRef(false);
  const [selectedIndex, setSelectedIndex] = React.useState(valueIndex);

  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Native scroll keeps wheel, trackpad, and touch on one browser path (no Embla snap drift).
  const syncScrollToValue = React.useCallback(
    (index: number) => {
      const el = scrollRef.current;
      if (!el) return;

      const targetScrollTop = index * itemHeight;
      if (Math.abs(el.scrollTop - targetScrollTop) <= 1) {
        setSelectedIndex(index);
        return;
      }

      isSyncingRef.current = true;
      el.scrollTop = targetScrollTop;
      setSelectedIndex(index);
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    },
    [itemHeight],
  );

  React.useLayoutEffect(() => {
    syncScrollToValue(valueIndex);
  }, [valueIndex, syncScrollToValue]);

  const handleScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el || isSyncingRef.current) return;

    const nextIndex = Math.max(
      0,
      Math.min(Math.round(el.scrollTop / itemHeight), items.length - 1),
    );

    setSelectedIndex(nextIndex);

    const nextValue = min + nextIndex;
    if (nextValue !== value) {
      onChangeRef.current(nextValue);
    }
  }, [items.length, min, value, itemHeight]);

  const containerHeight = itemHeight * visibleItems;

  return (
    <div
      className={cn("relative flex-1 select-none", className)}
      aria-label={ariaLabel}
      role="group"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 rounded-xl border border-white/10 bg-white/5"
        style={{ height: itemHeight }}
        aria-hidden
      />

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="snap-y snap-mandatory overflow-y-auto overscroll-contain touch-pan-y [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ height: containerHeight }}
        data-vaul-no-drag
      >
        <div className="flex flex-col">
          {Array.from({ length: paddingCount }, (_, padIndex) => (
            <div
              key={`pad-top-${padIndex}`}
              className="shrink-0 grow-0"
              style={{ height: itemHeight, flexBasis: itemHeight }}
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
                className="flex shrink-0 grow-0 snap-center items-center justify-center tabular-nums transition-[opacity,transform] duration-150"
                style={{
                  height: itemHeight,
                  flexBasis: itemHeight,
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
          {Array.from({ length: paddingCount }, (_, padIndex) => (
            <div
              key={`pad-bottom-${padIndex}`}
              className="shrink-0 grow-0"
              style={{ height: itemHeight, flexBasis: itemHeight }}
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
        itemHeight={36}
        visibleItems={3}
        aria-label={homeLabel}
      />
      <span className="shrink-0 px-0.5 text-xl font-light text-muted-foreground">
        :
      </span>
      <WheelPicker
        value={awayScore}
        onChange={onAwayChange}
        itemHeight={36}
        visibleItems={3}
        aria-label={awayLabel}
      />
    </div>
  );
}
