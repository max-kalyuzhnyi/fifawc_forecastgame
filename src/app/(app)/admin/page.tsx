import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AdminTabs } from "@/features/admin/ui/AdminTabs";
import { buildUserPicks } from "@/features/admin/lib/buildUserPicks";
import { findNextMatch } from "@/features/admin/lib/findNextMatch";
import { splitPickers } from "@/features/admin/lib/splitPickers";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentUserId, isAdmin } from "@/shared/lib/auth";

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
    { data: scorers },
  ] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, home_team_name, away_team_name, kickoff_at, home_score, away_score, status, highlights_youtube_id, round_display, group_name",
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
    supabase.from("match_scorers").select("match_id, scorer_name"),
  ]);

  const scorersByMatch: Record<string, string[]> = {};
  for (const scorer of scorers ?? []) {
    const list = scorersByMatch[scorer.match_id] ?? [];
    list.push(scorer.scorer_name);
    scorersByMatch[scorer.match_id] = list;
  }

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
      />
    </div>
  );
}
