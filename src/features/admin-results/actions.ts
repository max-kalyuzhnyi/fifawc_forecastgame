"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentUserId, isAdmin } from "@/shared/lib/auth";

const resultSchema = z.object({
  match_id: z.string().uuid(),
  home_score: z.coerce.number().int().min(0),
  away_score: z.coerce.number().int().min(0),
  scorers: z.string().optional(),
  result_type: z.enum(["live", "finished"]),
});

const playerSchema = z.object({
  team_id: z.string().uuid(),
  name: z.string().min(1).max(100),
});

export async function saveMatchResult(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  const parsed = resultSchema.safeParse({
    match_id: formData.get("match_id"),
    home_score: formData.get("home_score"),
    away_score: formData.get("away_score"),
    scorers: formData.get("scorers"),
    result_type: formData.get("result_type"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { match_id, home_score, away_score, result_type } = parsed.data;
  const isFinal = result_type === "finished";

  const { error: matchError } = await supabase
    .from("matches")
    .update({
      home_score,
      away_score,
      status: isFinal ? "finished" : "live",
      updated_at: new Date().toISOString(),
    })
    .eq("id", match_id);

  if (matchError) return { error: matchError.message };

  if (isFinal) {
    await supabase.from("match_scorers").delete().eq("match_id", match_id);

    const scorerNames = (parsed.data.scorers ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (scorerNames.length > 0) {
      const { error: scorerError } = await supabase.from("match_scorers").insert(
        scorerNames.map((name) => ({
          match_id,
          scorer_name: name,
        })),
      );
      if (scorerError) return { error: scorerError.message };
    }
  }

  revalidatePath("/admin");
  revalidatePath("/matches");
  revalidatePath("/leaderboard");
  return { success: true };
}

export async function addPlayer(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  const parsed = playerSchema.safeParse({
    team_id: formData.get("team_id"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("players").insert(parsed.data);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { success: true };
}

export async function triggerScheduleImport(): Promise<{ error?: string; success?: boolean }> {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };

  // Import is run via CLI; admin page shows instructions
  return { success: true };
}
