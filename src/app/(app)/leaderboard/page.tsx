import { buildLeaderboardAnalytics } from "@/features/leaderboard/lib/buildAnalytics";
import { LeaderboardTabs } from "@/features/leaderboard/ui/LeaderboardTabs";
import { PlayoffHowToTrigger } from "@/features/playoff/ui/PlayoffHowToTrigger";
import { getCurrentUserId } from "@/shared/lib/auth";
import { fetchAllRows } from "@/shared/lib/supabase/fetchAllRows";
import { createClient } from "@/shared/lib/supabase/server";
import { buildMatchScorers } from "@/shared/lib/scorers";
import { hasPlayoffSchedule } from "@/shared/lib/playoff/config";
import { getTranslations } from "next-intl/server";
import type { BoostMultiplier } from "@/entities/prediction/model/types";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const userId = await getCurrentUserId();
  const t = await getTranslations("leaderboard");
  const [
    { data: matches },
    predictions,
    { data: profiles },
    matchEvents,
    players,
    { data: playoffTierRows },
  ] = await Promise.all([
    supabase
      .from("matches")
      .select("id, round_key, status, home_score, away_score"),
    fetchAllRows((from, to) =>
      supabase
        .from("predictions")
        .select(
          "match_id, user_id, home_score, away_score, scorer_name, scorer_player_id, boost_multiplier",
        )
        .order("id", { ascending: true })
        .range(from, to),
    ),
    supabase.from("profiles").select("id, display_name, photo_url"),
    fetchAllRows((from, to) =>
      supabase
        .from("match_events")
        .select("match_id, type, player_name")
        .in("type", ["goal", "penalty"])
        .order("id", { ascending: true })
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("players")
        .select("id, name")
        .order("id", { ascending: true })
        .range(from, to),
    ),
    supabase.from("playoff_tiers").select("user_id, group_rank, tier, group_points"),
  ]);

  const showPlayoffUi = hasPlayoffSchedule(matches ?? []);

  const { namesByMatch: scorersByMatch, playerIdsByMatch: scorerPlayerIdsByMatch } =
    buildMatchScorers(
      matchEvents.map((event) => ({
        matchId: event.match_id,
        type: event.type,
        playerName: event.player_name,
      })),
      players,
    );

  const playoffTiers = Object.fromEntries(
    (playoffTierRows ?? []).map((row) => [
      row.user_id,
      {
        group_rank: row.group_rank,
        tier: row.tier,
        group_points: row.group_points,
      },
    ]),
  );

  const analytics = buildLeaderboardAnalytics({
    matches: matches ?? [],
    predictions: predictions.map((prediction) => ({
      ...prediction,
      boost_multiplier: prediction.boost_multiplier as BoostMultiplier,
    })),
    profiles: profiles ?? [],
    scorersByMatch,
    scorerPlayerIdsByMatch,
    playoffTiers,
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
          <div className="flex shrink-0 items-center gap-2">
            <PlayoffHowToTrigger showPlayoffUi={showPlayoffUi} />
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
        </div>

        <LeaderboardTabs
          analytics={analytics}
          currentUserId={userId}
          canSeePlayerNames
          showPlayoffUi={showPlayoffUi}
        />
      </div>
    </div>
  );
}
