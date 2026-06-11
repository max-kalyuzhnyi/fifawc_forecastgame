import { SettingsView } from "@/features/settings/ui/SettingsView";
import { getCurrentUserId } from "@/shared/lib/auth";
import { createClient } from "@/shared/lib/supabase/server";
import type { Locale } from "@/shared/types/database";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, photo_url, notify_goals, locale")
    .eq("id", userId)
    .maybeSingle();

  return (
    <SettingsView
      displayName={profile?.display_name ?? "User"}
      photoUrl={profile?.photo_url ?? null}
      notifyGoals={profile?.notify_goals ?? true}
      locale={(profile?.locale as Locale | undefined) ?? "en"}
    />
  );
}
