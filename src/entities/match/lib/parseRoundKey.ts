// Maps OpenFootball round strings to stable round_key values for boost tracking
export function parseRoundKey(round: string): string {
  const matchday = round.match(/^Matchday (\d+)$/i);
  if (matchday) {
    const day = Number(matchday[1]);
    if (day >= 1 && day <= 7) return "group_1";
    if (day >= 8 && day <= 13) return "group_2";
    if (day >= 14 && day <= 17) return "group_3";
  }

  const normalized = round.toLowerCase().trim();
  if (normalized === "round of 32") return "round_of_32";
  if (normalized === "round of 16") return "round_of_16";
  if (normalized === "quarter-final" || normalized === "quarter-finals")
    return "quarter_final";
  if (normalized === "semi-final" || normalized === "semi-finals")
    return "semi_final";
  if (normalized.includes("third place")) return "third_place";
  if (normalized === "final") return "final";

  return normalized.replace(/\s+/g, "_");
}
