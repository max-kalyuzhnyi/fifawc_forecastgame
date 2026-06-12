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

const DEBOUNCE_MS = 1000;

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
    let cancelled = false;

    const scheduleRefresh = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        if (isLiveRefreshPaused()) {
          return;
        }
        router.refresh();
      }, DEBOUNCE_MS);
    };

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

      void removeChannel();
    };
    // tablesKey tracks the subscribed table list.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tables encoded in tablesKey
  }, [channelName, router, tablesKey]);
}
