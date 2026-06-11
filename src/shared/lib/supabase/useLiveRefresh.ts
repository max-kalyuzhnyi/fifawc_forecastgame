"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/client";

type LiveTable =
  | "matches"
  | "match_events"
  | "predictions"
  | "match_scorers";

export function useLiveRefresh(
  channelName: string,
  ...tables: LiveTable[]
): void {
  const router = useRouter();
  const tablesKey = tables.join(",");

  useEffect(() => {
    const supabase = createClient();
    let channel = supabase.channel(channelName);
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        router.refresh();
      }, 3000);
    };

    for (const table of tables) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        scheduleRefresh,
      );
    }

    channel.subscribe();

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      void supabase.removeChannel(channel);
    };
    // tablesKey tracks the subscribed table list.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tables encoded in tablesKey
  }, [channelName, router, tablesKey]);
}
