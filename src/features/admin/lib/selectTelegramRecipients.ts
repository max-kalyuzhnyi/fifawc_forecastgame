import type {
  AdminMatch,
  AdminPrediction,
  AdminProfile,
} from "@/features/admin/lib/types";

/** Same window as automated pick-reminder edge function (3 hours). */
export const PICK_REMINDER_WINDOW_MS = 3 * 60 * 60 * 1000;

export type CommunicationTarget = "all" | "selectedUsers" | "missingNextPick";

export interface TelegramRecipient {
  id: string;
  display_name: string;
  telegram_id: number;
  locale: string | null;
  timezone: string | null;
}

/** Profiles that can receive Telegram DMs. */
export function filterProfilesWithTelegram(
  profiles: AdminProfile[],
): TelegramRecipient[] {
  return profiles
    .filter(
      (profile): profile is AdminProfile & { telegram_id: number } =>
        profile.telegram_id != null,
    )
    .map((profile) => ({
      id: profile.id,
      display_name: profile.display_name,
      telegram_id: profile.telegram_id,
      locale: profile.locale,
      timezone: profile.timezone,
    }));
}

/** Next scheduled match kicking off within the reminder window. */
export function findSoonMatch(
  matches: AdminMatch[],
  now: number = Date.now(),
  windowMs: number = PICK_REMINDER_WINDOW_MS,
): AdminMatch | null {
  const nowIso = new Date(now).toISOString();
  const windowEndIso = new Date(now + windowMs).toISOString();

  const upcoming = matches
    .filter(
      (match) =>
        match.status === "scheduled" &&
        match.kickoff_at > nowIso &&
        match.kickoff_at <= windowEndIso,
    )
    .sort(
      (a, b) =>
        new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime(),
    );

  return upcoming[0] ?? null;
}

/** Users with Telegram who have not predicted the given match. */
export function selectMissingPickRecipients(
  profiles: AdminProfile[],
  predictions: AdminPrediction[],
  match: AdminMatch,
): TelegramRecipient[] {
  const pickedUserIds = new Set(
    predictions
      .filter((prediction) => prediction.match_id === match.id)
      .map((prediction) => prediction.user_id),
  );

  return filterProfilesWithTelegram(profiles).filter(
    (profile) => !pickedUserIds.has(profile.id),
  );
}

export interface SelectTelegramRecipientsInput {
  target: CommunicationTarget;
  profiles: AdminProfile[];
  predictions: AdminPrediction[];
  matches: AdminMatch[];
  selectedUserIds?: string[];
  now?: number;
}

export interface SelectTelegramRecipientsResult {
  recipients: TelegramRecipient[];
  match: AdminMatch | null;
}

/** Resolve communication recipients for admin targeting modes. */
export function selectTelegramRecipients(
  input: SelectTelegramRecipientsInput,
): SelectTelegramRecipientsResult {
  const { target, profiles, predictions, matches, selectedUserIds, now } =
    input;

  if (target === "all") {
    return { recipients: filterProfilesWithTelegram(profiles), match: null };
  }

  if (target === "selectedUsers") {
    const selected = new Set(selectedUserIds ?? []);
    return {
      recipients: filterProfilesWithTelegram(profiles).filter((profile) =>
        selected.has(profile.id),
      ),
      match: null,
    };
  }

  const match = findSoonMatch(matches, now);
  if (!match) {
    return { recipients: [], match: null };
  }

  return {
    recipients: selectMissingPickRecipients(profiles, predictions, match),
    match,
  };
}
