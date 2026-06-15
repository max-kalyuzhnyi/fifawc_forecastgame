"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  signInWithDevBypass,
  signInWithTelegram,
} from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

const isDev = process.env.NODE_ENV === "development";

export function TelegramLogin() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("common.errors");
  const [error, setError] = useState<string | null>(null);
  const [outsideTelegram, setOutsideTelegram] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const timezone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : undefined;

  const runDevSignIn = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setOutsideTelegram(false);

    const result = await signInWithDevBypass(timezone);
    if (result?.error) {
      setError(result.error);
    }
    setIsLoading(false);
  }, [timezone]);

  const runTelegramSignIn = useCallback(async () => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      if (isDev) {
        await runDevSignIn();
      } else {
        setOutsideTelegram(true);
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setError(null);
    setOutsideTelegram(false);

    const result = await signInWithTelegram(initData, timezone);
    if (result?.error) {
      if (result.error === "outside_telegram") {
        setOutsideTelegram(true);
      } else {
        setError(result.error);
      }
    }
    setIsLoading(false);
  }, [runDevSignIn, timezone]);

  useEffect(() => {
    void runTelegramSignIn();
  }, [runTelegramSignIn]);

  if (outsideTelegram && !isDev) {
    return (
      <p className="max-w-xs text-center text-xs text-muted-foreground">
        {t("openInTelegram")}
      </p>
    );
  }

  if (error) {
    return (
      <div className="flex max-w-xs flex-col items-center gap-3">
        <p className="text-center text-xs text-destructive">
          {error === "outside_telegram" ? tErrors("outsideTelegram") : error}
        </p>
        {isDev ? (
          <Button
            type="button"
            size="sm"
            disabled={isLoading}
            onClick={() => void runDevSignIn()}
          >
            {isLoading ? t("signingIn") : t("devLogin")}
          </Button>
        ) : null}
      </div>
    );
  }

  if (isLoading) {
    return (
      <p className="max-w-xs text-center text-xs text-muted-foreground">
        {isDev ? t("devLoginHint") : t("signingIn")}
        <span className="mt-2 block">{t("signingIn")}</span>
      </p>
    );
  }

  if (isDev) {
    return (
      <Button
        type="button"
        size="sm"
        onClick={() => void runDevSignIn()}
      >
        {t("devLogin")}
      </Button>
    );
  }

  return (
    <p className="max-w-xs text-center text-xs text-muted-foreground">
      {t("signingIn")}
    </p>
  );
}
