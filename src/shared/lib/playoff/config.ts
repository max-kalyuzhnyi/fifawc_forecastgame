import { isGroupRoundKey } from "@/entities/match/model/types";

/** Non-group knockout rounds (R32 through final). */
export function isPlayoffRoundKey(roundKey: string): boolean {
  return !isGroupRoundKey(roundKey);
}

/** True once playoff fixtures exist in the schedule (data-driven, no time gate). */
export function hasPlayoffSchedule(
  matches: { round_key: string }[],
): boolean {
  return matches.some((match) => isPlayoffRoundKey(match.round_key));
}
