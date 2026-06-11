import { getGroupMatchdayFromRoundKey } from "@/entities/match/lib/parseRoundKey";

export type StageLabelKey =
  | "groupMatchday"
  | "roundOf32"
  | "roundOf16"
  | "quarterFinal"
  | "semiFinal"
  | "thirdPlace"
  | "final"
  | "unknown";

export function getStageLabelKey(roundKey: string): StageLabelKey {
  const matchday = getGroupMatchdayFromRoundKey(roundKey);
  if (matchday != null) {
    return "groupMatchday";
  }

  switch (roundKey) {
    case "round_of_32":
      return "roundOf32";
    case "round_of_16":
      return "roundOf16";
    case "quarter_final":
      return "quarterFinal";
    case "semi_final":
      return "semiFinal";
    case "third_place":
      return "thirdPlace";
    case "final":
      return "final";
    default:
      return "unknown";
  }
}

export function getGroupMatchdayNumber(roundKey: string): number | null {
  return getGroupMatchdayFromRoundKey(roundKey);
}
