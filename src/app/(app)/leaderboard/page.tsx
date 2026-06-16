import { buildLeaderboardAnalytics } from "@/features/leaderboard/lib/buildAnalytics";
import { LeaderboardTabs } from "@/features/leaderboard/ui/LeaderboardTabs";
import { getCurrentUserId } from "@/shared/lib/auth";
import { createClient } from "@/shared/lib/supabase/server";
import { buildMatchScorers } from "@/shared/lib/scorers";
import { getTranslations } from "next-intl/server";
import type { BoostMultiplier } from "@/entities/prediction/model/types";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const userId = await getCurrentUserId();
  const t = await getTranslations("leaderboard");

  const [
    { data: matches },
    { data: predictions },
    { data: profiles },
    { data: matchEvents },
    { data: players },
  ] = await Promise.all([
    supabase
      .from("matches")
      .select("id, round_key, status, home_score, away_score"),
    supabase
      .from("predictions")
      .select(
        "match_id, user_id, home_score, away_score, scorer_name, scorer_player_id, boost_multiplier",
      ),
    supabase.from("profiles").select("id, display_name, photo_url"),
    supabase
      .from("match_events")
      .select("match_id, type, player_name")
      .in("type", ["goal", "penalty"]),
    supabase.from("players").select("id, name"),
  ]);

  const { namesByMatch: scorersByMatch, playerIdsByMatch: scorerPlayerIdsByMatch } =
    buildMatchScorers(
      (matchEvents ?? []).map((event) => ({
        matchId: event.match_id,
        type: event.type,
        playerName: event.player_name,
      })),
      players ?? [],
    );

  const analytics = buildLeaderboardAnalytics({
    matches: matches ?? [],
    predictions: (predictions ?? []).map((prediction) => ({
      ...prediction,
      boost_multiplier: prediction.boost_multiplier as BoostMultiplier,
    })),
    profiles: profiles ?? [],
    scorersByMatch,
    scorerPlayerIdsByMatch,
  });

  return (
    <div className="flex flex-col">
      <div className="sports-panel corner-squircle flex flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-3">
          <div>
            <h1 className="text-[15px] font-semibold text-foreground">
              {t("title")}
            </h1>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              {t("description")}
            </p>
          </div>
          {analytics.hasLiveMatches && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-300">
              <span
                className="size-1.5 shrink-0 rounded-full bg-red-400 animate-pulse"
                aria-hidden
              />
              {t("live")}
            </span>
          )}
        </div>

        <LeaderboardTabs
          analytics={analytics}
          currentUserId={userId}
          canSeePlayerNames
        />
      </div>
    </div>
  );
}
