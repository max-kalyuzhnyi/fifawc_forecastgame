import { describe, expect, it } from "vitest";
import {
  buildPlayerPhotosMap,
  getPlayerPhotoUrl,
} from "@/features/matches/lib/playerPhotos";

describe("buildPlayerPhotosMap", () => {
  it("maps team_id and shirt_number to photo_url", () => {
    const map = buildPlayerPhotosMap([
      {
        team_id: "team-a",
        shirt_number: 10,
        photo_url: "https://example.com/10.jpg",
      },
      {
        team_id: "team-a",
        shirt_number: 7,
        photo_url: "https://example.com/7.jpg",
      },
      {
        team_id: "team-b",
        shirt_number: 1,
        photo_url: null,
      },
      {
        team_id: "team-b",
        shirt_number: null,
        photo_url: "https://example.com/skip.jpg",
      },
    ]);

    expect(map).toEqual({
      "team-a": {
        7: "https://example.com/7.jpg",
        10: "https://example.com/10.jpg",
      },
    });
  });
});

describe("getPlayerPhotoUrl", () => {
  it("returns photo by team and shirt number", () => {
    const map = {
      "team-a": { 9: "https://example.com/9.jpg" },
    };

    expect(getPlayerPhotoUrl(map, "team-a", 9)).toBe(
      "https://example.com/9.jpg",
    );
    expect(getPlayerPhotoUrl(map, "team-a", 11)).toBeNull();
    expect(getPlayerPhotoUrl(map, null, 9)).toBeNull();
    expect(getPlayerPhotoUrl(map, "team-a", null)).toBeNull();
  });
});
