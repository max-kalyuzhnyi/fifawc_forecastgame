"use client";

import { useEffect } from "react";

function syncTelegramViewportHeight(tg: TelegramWebApp): void {
  const height = tg.viewportStableHeight ?? tg.viewportHeight;
  if (typeof height === "number" && height > 0) {
    document.documentElement.style.setProperty("--tg-vh", `${height}px`);
  }
}

// Expand Mini App viewport once Telegram WebApp SDK is available
export function TelegramWebAppInit() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();
    tg.disableVerticalSwipes?.();
    syncTelegramViewportHeight(tg);

    const onViewportChanged = () => syncTelegramViewportHeight(tg);
    tg.onEvent?.("viewportChanged", onViewportChanged);

    return () => {
      tg.offEvent?.("viewportChanged", onViewportChanged);
    };
  }, []);

  return null;
}
