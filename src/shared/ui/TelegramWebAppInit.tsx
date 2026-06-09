"use client";

import { useEffect } from "react";

// Expand Mini App viewport once Telegram WebApp SDK is available
export function TelegramWebAppInit() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();
  }, []);

  return null;
}
