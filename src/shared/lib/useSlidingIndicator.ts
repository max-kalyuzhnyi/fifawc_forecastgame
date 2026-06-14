"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SlidingIndicatorVariant = "pill" | "underline";

interface UseSlidingIndicatorOptions {
  listRef: React.RefObject<HTMLElement | null>;
  indicatorRef: React.RefObject<HTMLElement | null>;
  activeSelector: string;
  variant?: SlidingIndicatorVariant;
  enabled?: boolean;
}

export function useSlidingIndicator({
  listRef,
  indicatorRef,
  activeSelector,
  variant = "pill",
  enabled = true,
}: UseSlidingIndicatorOptions) {
  const [ready, setReady] = useState(false);
  const activeElementRef = useRef<HTMLElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const measure = useCallback(() => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    if (!list || !indicator || !enabled) {
      return;
    }

    const active = list.querySelector<HTMLElement>(activeSelector);
    if (!active) {
      return;
    }

    if (active !== activeElementRef.current) {
      if (activeElementRef.current) {
        resizeObserverRef.current?.unobserve(activeElementRef.current);
      }
      activeElementRef.current = active;
      resizeObserverRef.current?.observe(active);
    }

    const x = active.offsetLeft;
    const y = active.offsetTop;
    const width = active.offsetWidth;
    const height = active.offsetHeight;

    if (variant === "underline") {
      indicator.style.transform = `translate3d(${x}px, 0, 0)`;
      indicator.style.width = `${width}px`;
      indicator.style.height = "2px";
      indicator.style.top = `${y + height - 2}px`;
    } else {
      indicator.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      indicator.style.width = `${width}px`;
      indicator.style.height = `${height}px`;
      indicator.style.top = "0";
    }

    setReady(true);
  }, [activeSelector, enabled, indicatorRef, listRef, variant]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const list = listRef.current;
    if (!list) {
      return;
    }

    const rafId = requestAnimationFrame(() => {
      measure();
    });

    const mutationObserver = new MutationObserver(() => {
      requestAnimationFrame(measure);
    });

    mutationObserver.observe(list, {
      attributes: true,
      attributeFilter: ["data-state", "data-active", "aria-selected"],
      subtree: true,
      childList: true,
    });

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(measure);
    });
    resizeObserverRef.current = resizeObserver;

    resizeObserver.observe(list);

    const onWindowResize = () => {
      requestAnimationFrame(measure);
    };

    window.addEventListener("resize", onWindowResize);

    return () => {
      cancelAnimationFrame(rafId);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      resizeObserverRef.current = null;
      activeElementRef.current = null;
      window.removeEventListener("resize", onWindowResize);
    };
  }, [activeSelector, enabled, listRef, measure]);

  return { ready };
}
