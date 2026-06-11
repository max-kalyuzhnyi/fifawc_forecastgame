"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  signInWithDevBypass,
  signInWithTelegram,
} from "@/features/auth/actions";

export function TelegramLogin() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("common.errors");
  const [error, setError] = useState<string | null>(null);
  const [outsideTelegram, setOutsideTelegram] = useState(false);

  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const initData = window.Telegram?.WebApp?.initData;
    const signIn = initData
      ? signInWithTelegram(initData, timezone)
      : signInWithDevBypass(timezone);

    signIn.then((result) => {
      if (result?.error) {
        if (result.error === "outside_telegram") {
          setOutsideTelegram(true);
        } else {
          setError(result.error);
        }
      }
    });
  }, []);

  if (outsideTelegram) {
    return (
      <p className="max-w-xs text-center text-xs text-muted-foreground">
        {t("openInTelegram")}
      </p>
    );
  }

  if (error) {
    return (
      <p className="max-w-xs text-center text-xs text-destructive">
        {error === "outside_telegram" ? tErrors("outsideTelegram") : error}
      </p>
    );
  }

  return (
    <p className="max-w-xs text-center text-xs text-muted-foreground">
      {t("signingIn")}
    </p>
  );
}
