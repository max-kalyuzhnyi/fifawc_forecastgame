"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentUserId } from "@/shared/lib/auth";

const predictionSchema = z.object({
  match_id: z.string().uuid(),
  home_score: z.coerce.number().int().min(0).max(20),
  away_score: z.coerce.number().int().min(0).max(20),
  scorer_player_id: z.string().uuid().optional().or(z.literal("")),
  scorer_name: z.string().optional(),
  boost_multiplier: z.coerce.number().int().refine((v) => [1, 2, 3].includes(v)),
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
    scorer_name: formData.get("scorer_name") || undefined,
    boost_multiplier: formData.get("boost_multiplier"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { match_id, home_score, away_score, boost_multiplier } = parsed.data;
  let scorer_player_id = parsed.data.scorer_player_id || null;
  let scorer_name = parsed.data.scorer_name?.trim() || null;

  // Resolve player name from selected player id when dropdown used
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

  // Enforce one x2/x3 per round when changing boost
  if (boost_multiplier === 2 || boost_multiplier === 3) {
    const { data: existingBoost } = await supabase
      .from("predictions")
      .select("id, match_id")
      .eq("user_id", userId)
      .eq("round_key", match.round_key)
      .eq("boost_multiplier", boost_multiplier)
      .maybeSingle();

    if (existingBoost && existingBoost.match_id !== match_id) {
      return {
        error: `You already used your x${boost_multiplier} boost this round on another match`,
      };
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
