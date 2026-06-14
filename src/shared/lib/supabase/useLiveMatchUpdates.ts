"use client";

import { useEffect } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Match } from "@/entities/match/model/types";
import { createClient } from "@/shared/lib/supabase/client";

export function useLiveMatchUpdates(
  onMatchUpdate: (match: Match) => void,
): void {
  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    let setupSeq = 0;

    const removeChannel = async () => {
      if (!channel) {
        return;
      }

      const current = channel;
      channel = null;
      await supabase.removeChannel(current);
    };

    const setupChannel = async (accessToken: string | undefined) => {
      const id = ++setupSeq;
      await removeChannel();
      if (cancelled || id !== setupSeq) {
        return;
      }

      if (accessToken) {
        await supabase.realtime.setAuth(accessToken);
      }

      if (cancelled || id !== setupSeq) {
        return;
      }

      channel = supabase
        .channel("live-match-updates")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "matches" },
          (payload) => {
            if (
              payload.new &&
              typeof payload.new === "object" &&
              "id" in payload.new
            ) {
              onMatchUpdate(payload.new as Match);
            }
          },
        )
        .subscribe();
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void setupChannel(session?.access_token);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      void removeChannel();
    };
  }, [onMatchUpdate]);
}
