import { createClient } from "@/shared/lib/supabase/server";
import { cardsEnabledForTelegramId } from "@/shared/lib/cards/featureFlag";

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return typeof sub === "string" ? sub : null;
}

export async function getCurrentUserTelegramId(): Promise<number | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("telegram_id")
    .eq("id", userId)
    .maybeSingle();

  return data?.telegram_id ?? null;
}

export async function isCardsEnabledForCurrentUser(): Promise<boolean> {
  const telegramId = await getCurrentUserTelegramId();
  return cardsEnabledForTelegramId(telegramId);
}

export async function isAdmin(): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  return !!data;
}
