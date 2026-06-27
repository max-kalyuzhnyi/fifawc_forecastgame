"use server";

import { loadMatchesBundle } from "@/features/matches/lib/loadMatchesBundle";

export async function loadBracketData() {
  return loadMatchesBundle();
}
