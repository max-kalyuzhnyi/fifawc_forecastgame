"use client";

import { useEffect, useRef, useState } from "react";
import { signInWithTelegram } from "../actions";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function TelegramLogin() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [outsideTelegram, setOutsideTelegram] = useState(false);
  const attemptedRef = useRef(false);

  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      setOutsideTelegram(true);
      return;
    }

    if (attemptedRef.current) return;
    attemptedRef.current = true;
    setPending(true);

    signInWithTelegram(initData)
      .then((result) => {
        if (result?.error) {
          setError(result.error);
          setPending(false);
        }
      })
      .catch(() => {
        setError("Authentication failed");
        setPending(false);
      });
  }, []);

  if (outsideTelegram) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Open this app inside Telegram to sign in.
      </p>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <p className="text-center text-sm text-muted-foreground">
      {pending ? "Signing in with Telegram…" : "Preparing Telegram sign-in…"}
    </p>
  );
}
