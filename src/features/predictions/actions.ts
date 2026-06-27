"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getStageBoostBudget,
  isBoostAllowedStage,
  type PlayoffTier,
} from "@/entities/playoff/model/boostBudget";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentUserId } from "@/shared/lib/auth";
import { getBoostDayKey } from "@/shared/lib/formatDate";
import { isPlayoffRoundKey } from "@/shared/lib/playoff/config";

const predictionSchema = z.object({
  match_id: z.string().uuid(),
  home_score: z.coerce.number().int().min(0).max(10),
  away_score: z.coerce.number().int().min(0).max(10),
  scorer_player_id: z.string().uuid().optional().or(z.literal("")),
  boost_multiplier: z.coerce.number().int().refine((v) => [1, 2].includes(v)),
});

export async function savePrediction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };

  const parsed = predictionSchema.safeParse({
    match_id: formData.get("match_id"),
    home_score: formData.get("home_score"),
    away_score: formData.get("away_score"),
    scorer_player_id: formData.get("scorer_player_id") || undefined,
    boost_multiplier: formData.get("boost_multiplier"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { match_id, home_score, away_score, boost_multiplier } = parsed.data;

  let scorer_player_id = parsed.data.scorer_player_id || null;
  let scorer_name: string | null = null;

  if (scorer_player_id) {
    const { data: player } = await supabase
      .from("players")
      .select("name")
      .eq("id", scorer_player_id)
      .single();
    if (player) scorer_name = player.name;
  } else {
    scorer_player_id = null;
  }

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, round_key, kickoff_at")
    .eq("id", match_id)
    .single();

  if (matchError || !match) return { error: "Match not found" };
  if (new Date(match.kickoff_at) <= new Date()) {
    return { error: "Predictions are locked after kickoff" };
  }

  // Derive the booster day on the server from the kickoff instant in UTC so it is
  // timezone-invariant; never trust the client-supplied value (a user changing
  // timezone could otherwise produce two distinct day keys for the same match-day).
  let boost_day: string | null = null;

  if (boost_multiplier === 2) {
    if (isPlayoffRoundKey(match.round_key)) {
      if (!isBoostAllowedStage(match.round_key)) {
        return { error: "Boost is not available for this stage" };
      }

      const { data: tierRow } = await supabase
        .from("playoff_tiers")
        .select("tier")
        .eq("user_id", userId)
        .maybeSingle();

      const tier = (tierRow?.tier ?? 4) as PlayoffTier;
      const budget = getStageBoostBudget(tier, match.round_key);

      const { count, error: countError } = await supabase
        .from("predictions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("round_key", match.round_key)
        .eq("boost_multiplier", 2)
        .neq("match_id", match_id);

      if (countError) {
        return { error: countError.message };
      }

      if ((count ?? 0) >= budget) {
        return { error: "No x2 boosts remaining for this stage" };
      }
    } else {
      boost_day = getBoostDayKey(match.kickoff_at);

      const { data: existingBoost } = await supabase
        .from("predictions")
        .select("id, match_id")
        .eq("user_id", userId)
        .eq("boost_day", boost_day)
        .eq("boost_multiplier", 2)
        .maybeSingle();

      if (existingBoost && existingBoost.match_id !== match_id) {
        return { error: "Boost already used today on another match" };
      }
    }
  }

  const { error } = await supabase.from("predictions").upsert(
    {
      user_id: userId,
      match_id,
      round_key: match.round_key,
      home_score,
      away_score,
      scorer_player_id,
      scorer_name,
      boost_multiplier,
      boost_day,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,match_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/matches");
  revalidatePath(`/matches/${match_id}`);
  revalidatePath("/leaderboard");
  return { success: true };
}
