"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/shared/lib/supabase/client";
import { isLiveRefreshPaused } from "@/shared/lib/liveRefreshPause";

type LiveTable =
  | "matches"
  | "match_events"
  | "predictions"
  | "match_scorers";

const REFRESH_DEBOUNCE_MS = 10_000;

export function useLiveRefresh(
  channelName: string,
  ...tables: LiveTable[]
): void {
  const router = useRouter();
  const tablesKey = tables.join(",");

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingRefresh = false;
    let cancelled = false;

    const runRefresh = () => {
      pendingRefresh = false;

      if (document.visibilityState === "hidden") {
        pendingRefresh = true;
        return;
      }

      if (isLiveRefreshPaused()) {
        return;
      }

      router.refresh();
    };

    const scheduleRefresh = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        runRefresh();
      }, REFRESH_DEBOUNCE_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && pendingRefresh) {
        runRefresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const removeChannel = async () => {
      if (!channel) {
        return;
      }

      const current = channel;
      channel = null;
      await supabase.removeChannel(current);
    };

    const setupChannel = async (accessToken: string | undefined) => {
      await removeChannel();
      if (cancelled) {
        return;
      }

      if (accessToken) {
        await supabase.realtime.setAuth(accessToken);
      }

      let nextChannel = supabase.channel(channelName);
      for (const table of tables) {
        nextChannel = nextChannel.on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          scheduleRefresh,
        );
      }

      channel = nextChannel.subscribe();
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void setupChannel(session?.access_token);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void removeChannel();
    };
    // tablesKey tracks the subscribed table list.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tables encoded in tablesKey
  }, [channelName, router, tablesKey]);
}
