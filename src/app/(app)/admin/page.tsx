import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AdminTabs } from "@/features/admin/ui/AdminTabs";
import { buildUserPicks } from "@/features/admin/lib/buildUserPicks";
import { findNextMatch } from "@/features/admin/lib/findNextMatch";
import { splitPickers } from "@/features/admin/lib/splitPickers";
import { createClient } from "@/shared/lib/supabase/server";
import { buildMatchScorers } from "@/shared/lib/scorers";
import { getCardAdminStats } from "@/features/cards/admin-actions";
import { getCurrentUserId, isAdmin } from "@/shared/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/matches");

  const t = await getTranslations("admin");
  const currentUserId = await getCurrentUserId();
  const supabase = await createClient();

  const [
    { data: matches },
    { data: teams },
    { data: players },
    { data: profiles },
    { data: predictions },
    { data: adminUsers },
    { data: matchEvents },
    { data: cards },
    cardStats,
  ] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, home_team_name, away_team_name, kickoff_at, home_score, away_score, status, highlights_youtube_id, highlights_source, round_display, group_name",
      )
      .order("kickoff_at", { ascending: true }),
    supabase.from("teams").select("id, name, primary_color").order("name"),
    supabase
      .from("players")
      .select("id, team_id, name, position, shirt_number, photo_url")
      .order("name"),
    supabase
      .from("profiles")
      .select("id, display_name, photo_url, telegram_id, locale, timezone")
      .order("display_name"),
    supabase
      .from("predictions")
      .select(
        "id, user_id, match_id, home_score, away_score, scorer_player_id, scorer_name, boost_multiplier, round_key",
      ),
    supabase.from("admin_users").select("user_id"),
    supabase
      .from("match_events")
      .select("match_id, type, player_name")
      .in("type", ["goal", "penalty"]),
    supabase
      .from("cards")
      .select("id, player_id, display_name, image_url, rarity, is_legend, team_id")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    getCardAdminStats(),
  ]);

  const teamNameById = new Map((teams ?? []).map((team) => [team.id, team.name]));
  const playerPhotoById = new Map(
    (players ?? []).map((player) => [player.id, player.photo_url]),
  );

  const { namesByMatch: scorersByMatch } = buildMatchScorers(
    (matchEvents ?? []).map((event) => ({
      matchId: event.match_id,
      type: event.type,
      playerName: event.player_name,
    })),
    players ?? [],
  );

  const adminUserIds = new Set((adminUsers ?? []).map((row) => row.user_id));
  const matchList = matches ?? [];
  const profileList = profiles ?? [];
  const predictionList = predictions ?? [];

  const users = buildUserPicks(
    profileList,
    predictionList,
    matchList,
    adminUserIds,
  );

  const nextMatch = findNextMatch(matchList);
  const pickers = nextMatch
    ? splitPickers(nextMatch, predictionList, profileList)
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div>
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <AdminTabs
        teams={teams ?? []}
        matches={matchList}
        players={players ?? []}
        scorersByMatch={scorersByMatch}
        users={users}
        profiles={profileList}
        predictions={predictionList}
        pickers={pickers}
        currentUserId={currentUserId}
        cardStats={cardStats}
        cards={(cards ?? []).map((card) => ({
          id: card.id,
          displayName: card.display_name,
          teamName: card.is_legend
            ? "Legends OTB"
            : (card.team_id ? teamNameById.get(card.team_id) ?? null : null),
          rarity: card.rarity,
          imageUrl:
            card.image_url ??
            (card.player_id ? playerPhotoById.get(card.player_id) ?? null : null),
          isLegend: card.is_legend,
        }))}
      />
    </div>
  );
}
