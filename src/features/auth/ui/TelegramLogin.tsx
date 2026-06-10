"use client";

import { useEffect, useRef, useState } from "react";
import { signInWithDevBypass, signInWithTelegram } from "../actions";

function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: string }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function TelegramLogin() {
  const [error, setError] = useState<string | null>(null);
  const [outsideTelegram, setOutsideTelegram] = useState(false);
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    const initData = window.Telegram?.WebApp?.initData;
    const signIn = initData
      ? signInWithTelegram(initData)
      : signInWithDevBypass();

    signIn
      .then((result) => {
        if (result?.error === "outside_telegram") {
          setOutsideTelegram(true);
          return;
        }
        if (result?.error) {
          setError(result.error);
        }
      })
      .catch((err) => {
        if (isRedirectError(err)) return;
        setError("Authentication failed");
      });
  }, []);

  if (outsideTelegram) {
    return (
      <p className="max-w-xs text-center text-xs text-muted-foreground">
        Open this app inside Telegram to sign in.
      </p>
    );
  }

  if (error) {
    return (
      <p className="max-w-xs text-center text-xs text-muted-foreground">
        {error}
      </p>
    );
  }

  return null;
}
