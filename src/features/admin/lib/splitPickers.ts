import type {
  AdminMatch,
  AdminPrediction,
  AdminProfile,
  NextMatchPickers,
  PickerUser,
} from "./types";

export function splitPickers(
  match: AdminMatch,
  predictions: AdminPrediction[],
  profiles: AdminProfile[],
): NextMatchPickers {
  const pickedUserIds = new Set(
    predictions
      .filter((prediction) => prediction.match_id === match.id)
      .map((prediction) => prediction.user_id),
  );

  const withPick: PickerUser[] = [];
  const withoutPick: PickerUser[] = [];

  const sortedProfiles = [...profiles].sort((a, b) =>
    a.display_name.localeCompare(b.display_name, undefined, {
      sensitivity: "base",
    }),
  );

  for (const profile of sortedProfiles) {
    const entry = { profile };
    if (pickedUserIds.has(profile.id)) {
      withPick.push(entry);
    } else {
      withoutPick.push(entry);
    }
  }

  return { match, withPick, withoutPick };
}
