"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import {
  BRACKET_STAGE_SHORT_LABELS,
  KNOCKOUT_BRACKET_STAGES,
  type KnockoutBracketStageKey,
  getKnockoutStageIndex,
} from "@/shared/lib/playoff/bracket";
import { cn } from "@/lib/utils";

interface BracketStageNavigatorProps {
  activeStage: KnockoutBracketStageKey;
  onStageChange: (stage: KnockoutBracketStageKey) => void;
}

function StageBracketGlyph({
  stage,
  active,
}: {
  stage: KnockoutBracketStageKey;
  active: boolean;
}) {
  if (stage === "final") {
    return (
      <span
        className={cn(
          "text-[11px] leading-none",
          active ? "text-white" : "text-white/35",
        )}
        aria-hidden
      >
        🏆
      </span>
    );
  }

  const lineCount =
    stage === "round_of_32"
      ? 4
      : stage === "round_of_16"
        ? 3
        : stage === "quarter_final"
          ? 2
          : 1;

  return (
    <div className="flex flex-col items-center justify-center gap-1">
      {Array.from({ length: lineCount }, (_, index) => (
        <span
          key={index}
          className={cn(
            "block h-px rounded-full",
            active ? "w-5 bg-white" : "w-4 bg-white/35",
          )}
        />
      ))}
    </div>
  );
}

export function BracketStageNavigator({
  activeStage,
  onStageChange,
}: BracketStageNavigatorProps) {
  const t = useTranslations("brackets");
  const activeIndex = getKnockoutStageIndex(activeStage);
  const secondaryStage =
    activeIndex < KNOCKOUT_BRACKET_STAGES.length - 1
      ? KNOCKOUT_BRACKET_STAGES[activeIndex + 1]
      : null;

  const scrollPrev = () => {
    if (activeIndex > 0) {
      onStageChange(KNOCKOUT_BRACKET_STAGES[activeIndex - 1]);
    }
  };

  const scrollNext = () => {
    if (activeIndex < KNOCKOUT_BRACKET_STAGES.length - 1) {
      onStageChange(KNOCKOUT_BRACKET_STAGES[activeIndex + 1]);
    }
  };

  return (
    <div className="px-4 pb-3">
      <div className="mb-2 flex items-center justify-between gap-1">
        {KNOCKOUT_BRACKET_STAGES.map((stage) => (
          <button
            key={stage}
            type="button"
            onClick={() => onStageChange(stage)}
            className={cn(
              "flex-1 text-center text-[11px] font-semibold tracking-wide transition-colors",
              stage === activeStage || stage === secondaryStage
                ? "text-white"
                : "text-white/35 hover:text-white/55",
            )}
          >
            {BRACKET_STAGE_SHORT_LABELS[stage]}
          </button>
        ))}
      </div>

      <div className="relative rounded-2xl bg-[rgb(4_12_48/0.9)] px-1 py-2">
        <div
          className="pointer-events-none absolute inset-y-1 rounded-xl border border-white/80 transition-[left,width] duration-300 ease-out motion-reduce:transition-none"
          style={{
            left: `calc(${(activeIndex / KNOCKOUT_BRACKET_STAGES.length) * 100}% + 4px)`,
            width: `calc(${secondaryStage ? (2 / KNOCKOUT_BRACKET_STAGES.length) * 100 : (1 / KNOCKOUT_BRACKET_STAGES.length) * 100}% - 8px)`,
          }}
          aria-hidden
        />

        <div className="relative grid grid-cols-5 items-end gap-1 px-6">
          <button
            type="button"
            onClick={scrollPrev}
            disabled={activeIndex === 0}
            className="absolute top-1/2 left-0 flex size-6 -translate-y-1/2 items-center justify-center text-white/70 disabled:opacity-30"
            aria-label={t("prevStage")}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
          </button>

          {KNOCKOUT_BRACKET_STAGES.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => onStageChange(stage)}
              className="flex flex-col items-center justify-end gap-1 py-1"
              aria-label={t(`stages.${stage}`)}
            >
              <StageBracketGlyph
                stage={stage}
                active={stage === activeStage || stage === secondaryStage}
              />
            </button>
          ))}

          <button
            type="button"
            onClick={scrollNext}
            disabled={activeIndex === KNOCKOUT_BRACKET_STAGES.length - 1}
            className="absolute top-1/2 right-0 flex size-6 -translate-y-1/2 items-center justify-center text-white/70 disabled:opacity-30"
            aria-label={t("nextStage")}
          >
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function useBracketScrollSync(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  columnRefs: React.RefObject<
    Record<KnockoutBracketStageKey, HTMLDivElement | null>
  >,
  enabled = true,
) {
  const [activeStage, setActiveStage] =
    useState<KnockoutBracketStageKey>("round_of_32");
  const scrollingProgrammatically = useRef(false);

  const scrollToStage = useCallback(
    (stage: KnockoutBracketStageKey) => {
      const container = scrollRef.current;
      const column = columnRefs.current?.[stage];
      if (!container || !column) return;

      scrollingProgrammatically.current = true;
      const containerRect = container.getBoundingClientRect();
      const columnRect = column.getBoundingClientRect();
      const nextLeft =
        container.scrollLeft + (columnRect.left - containerRect.left);

      container.scrollTo({
        left: Math.max(0, nextLeft),
        behavior: "smooth",
      });
      setActiveStage(stage);

      window.setTimeout(() => {
        scrollingProgrammatically.current = false;
      }, 450);
    },
    [scrollRef, columnRefs],
  );

  useEffect(() => {
    if (!enabled) return;

    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (scrollingProgrammatically.current) return;

      const containerRect = container.getBoundingClientRect();
      const viewportCenter = containerRect.left + containerRect.width * 0.25;

      let closestStage: KnockoutBracketStageKey = "round_of_32";
      let closestDistance = Number.POSITIVE_INFINITY;

      for (const stage of KNOCKOUT_BRACKET_STAGES) {
        const column = columnRefs.current?.[stage];
        if (!column) continue;

        const columnRect = column.getBoundingClientRect();
        const distance = Math.abs(columnRect.left - viewportCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestStage = stage;
        }
      }

      setActiveStage(closestStage);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => container.removeEventListener("scroll", handleScroll);
  }, [scrollRef, columnRefs, enabled]);

  return { activeStage, scrollToStage };
}
