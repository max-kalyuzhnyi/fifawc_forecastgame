"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLiveRefresh } from "@/shared/lib/supabase/useLiveRefresh";

function useRefreshOnTabChange(): void {
  const pathname = usePathname();
  const router = useRouter();
  const previousPath = useRef(pathname);

  useEffect(() => {
    if (previousPath.current === pathname) {
      return;
    }

    previousPath.current = pathname;

    if (
      pathname === "/matches" ||
      pathname === "/leaderboard" ||
      pathname === "/cards" ||
      pathname.startsWith("/matches/")
    ) {
      router.refresh();
    }
  }, [pathname, router]);
}

export function AppLiveRefresh({
  children,
}: {
  children: React.ReactNode;
}) {
  useLiveRefresh(
    "app-live",
    "matches",
    "predictions",
    "match_scorers",
    "match_events",
    "user_cards",
    "card_packs",
    "card_gift_requests",
    "card_gifts",
  );
  useRefreshOnTabChange();

  return children;
}
