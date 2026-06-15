import { describe, expect, it } from "vitest";
import {
  filterProfilesWithTelegram,
  findSoonMatch,
  PICK_REMINDER_WINDOW_MS,
  selectMissingPickRecipients,
  selectTelegramRecipients,
} from "./selectTelegramRecipients";
import type {
  AdminMatch,
  AdminPrediction,
  AdminProfile,
} from "./types";

const NOW = new Date("2026-06-15T12:00:00.000Z").getTime();

function profile(
  id: string,
  telegramId: number | null,
  name = id,
): AdminProfile {
  return {
    id,
    display_name: name,
    photo_url: null,
    telegram_id: telegramId,
    locale: "en",
    timezone: "UTC",
  };
}

function match(
  id: string,
  kickoffAt: string,
  status = "scheduled",
): AdminMatch {
  return {
    id,
    home_team_name: "A",
    away_team_name: "B",
    kickoff_at: kickoffAt,
    home_score: null,
    away_score: null,
    status,
    highlights_youtube_id: null,
    round_display: "Group",
    group_name: "A",
  };
}

function prediction(userId: string, matchId: string): AdminPrediction {
  return {
    id: `${userId}-${matchId}`,
    user_id: userId,
    match_id: matchId,
    home_score: 1,
    away_score: 0,
    scorer_player_id: null,
    scorer_name: null,
    boost_multiplier: 1,
    round_key: "group",
  };
}

describe("filterProfilesWithTelegram", () => {
  it("keeps only profiles with telegram_id", () => {
    const result = filterProfilesWithTelegram([
      profile("u1", 111),
      profile("u2", null),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("u1");
    expect(result[0]?.telegram_id).toBe(111);
  });
});

describe("findSoonMatch", () => {
  it("returns earliest scheduled match within the window", () => {
    const soon = match("m1", "2026-06-15T14:00:00.000Z");
    const later = match("m2", "2026-06-15T15:00:00.000Z");
    const tooFar = match("m3", "2026-06-15T16:01:00.000Z");

    expect(findSoonMatch([later, soon, tooFar], NOW)).toEqual(soon);
  });

  it("ignores matches outside the window or not scheduled", () => {
    const past = match("m1", "2026-06-15T11:00:00.000Z");
    const live = match("m2", "2026-06-15T14:00:00.000Z", "live");

    expect(findSoonMatch([past, live], NOW)).toBeNull();
  });

  it("uses the same 3-hour window as pick reminders", () => {
    const edge = match(
      "m-edge",
      new Date(NOW + PICK_REMINDER_WINDOW_MS).toISOString(),
    );
    const outside = match(
      "m-out",
      new Date(NOW + PICK_REMINDER_WINDOW_MS + 60_000).toISOString(),
    );

    expect(findSoonMatch([outside, edge], NOW)?.id).toBe("m-edge");
  });
});

describe("selectMissingPickRecipients", () => {
  it("excludes users who already predicted the match", () => {
    const m = match("m1", "2026-06-15T14:00:00.000Z");
    const profiles = [profile("u1", 1), profile("u2", 2)];
    const predictions = [prediction("u1", "m1")];

    const result = selectMissingPickRecipients(profiles, predictions, m);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("u2");
  });
});

describe("selectTelegramRecipients", () => {
  const profiles = [profile("u1", 1), profile("u2", 2), profile("u3", null)];
  const matches = [match("m1", "2026-06-15T14:00:00.000Z")];
  const predictions = [prediction("u1", "m1")];

  it("returns all telegram users for all target", () => {
    const { recipients, match: resolvedMatch } = selectTelegramRecipients({
      target: "all",
      profiles,
      predictions,
      matches,
      now: NOW,
    });

    expect(resolvedMatch).toBeNull();
    expect(recipients.map((r) => r.id)).toEqual(["u1", "u2"]);
  });

  it("returns only selected users with telegram", () => {
    const { recipients } = selectTelegramRecipients({
      target: "selectedUsers",
      profiles,
      predictions,
      matches,
      selectedUserIds: ["u2", "u3"],
      now: NOW,
    });

    expect(recipients.map((r) => r.id)).toEqual(["u2"]);
  });

  it("returns missing-pick users for soon match", () => {
    const { recipients, match: resolvedMatch } = selectTelegramRecipients({
      target: "missingNextPick",
      profiles,
      predictions,
      matches,
      now: NOW,
    });

    expect(resolvedMatch?.id).toBe("m1");
    expect(recipients.map((r) => r.id)).toEqual(["u2"]);
  });

  it("returns empty list when no soon match exists", () => {
    const { recipients, match: resolvedMatch } = selectTelegramRecipients({
      target: "missingNextPick",
      profiles,
      predictions,
      matches: [match("m-far", "2026-06-16T12:00:00.000Z")],
      now: NOW,
    });

    expect(resolvedMatch).toBeNull();
    expect(recipients).toEqual([]);
  });
});
