import { describe, expect, it } from "vitest";
import { buildLeaderboardDisplayItems } from "./filterLeaderboardEntries";

function makeEntry(rank: number, userId = `user-${rank}`) {
  return { user_id: userId, rank, display_name: `Player ${rank}` };
}

describe("buildLeaderboardDisplayItems", () => {
  it("returns all entries when list is within top N", () => {
    const entries = [makeEntry(1), makeEntry(2), makeEntry(3)];
    const items = buildLeaderboardDisplayItems(entries, { currentUserId: "user-3" });

    expect(items).toEqual([
      { type: "entry", entry: entries[0] },
      { type: "entry", entry: entries[1] },
      { type: "entry", entry: entries[2] },
    ]);
  });

  it("adds ellipsis and current user when they are below top 25", () => {
    const entries = Array.from({ length: 30 }, (_, index) =>
      makeEntry(index + 1),
    );
    const items = buildLeaderboardDisplayItems(entries, {
      currentUserId: "user-28",
    });

    expect(items).toHaveLength(27);
    expect(items[24]).toEqual({ type: "entry", entry: entries[24] });
    expect(items[25]).toEqual({ type: "ellipsis" });
    expect(items[26]).toEqual({ type: "entry", entry: entries[27] });
  });

  it("omits ellipsis when current user is already in top 25", () => {
    const entries = Array.from({ length: 30 }, (_, index) =>
      makeEntry(index + 1),
    );
    const items = buildLeaderboardDisplayItems(entries, {
      currentUserId: "user-10",
    });

    expect(items).toHaveLength(25);
    expect(items.some((item) => item.type === "ellipsis")).toBe(false);
  });
});
