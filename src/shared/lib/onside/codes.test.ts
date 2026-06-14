import { describe, expect, it } from "vitest";
import { getGroupMatchdayFromRoundKey } from "@/entities/match/lib/parseRoundKey";
import type { Match } from "@/entities/match/model/types";
import { getOnsideCode, TEAM_ONSIDE_CODES } from "@/shared/lib/onside/codes";
import { buildUpsetMatchIds } from "@/shared/lib/onside/upsets";
import type { OnsideUpset } from "@/shared/lib/onside/types";

describe("getOnsideCode", () => {
  it("maps known WC squads to Onside FIFA codes", () => {
    expect(getOnsideCode("England")).toBe("eng");
    expect(getOnsideCode("USA")).toBe("usa");
    expect(getOnsideCode("Bosnia & Herzegovina")).toBe("bih");
    expect(getOnsideCode("DR Congo")).toBe("cod");
  });

  it("returns null for playoff placeholders", () => {
    expect(getOnsideCode("Winner Group A")).toBeNull();
  });

  it("covers all flag-mapped squads", () => {
    expect(Object.keys(TEAM_ONSIDE_CODES)).toHaveLength(48);
  });
});

describe("buildUpsetMatchIds", () => {
  it("matches upsets by team codes and group matchday", () => {
    const match: Match = {
      id: "m1",
      external_key: "x",
      round_key: "group_3",
      round_display: "Group Stage",
      group_name: "B",
      match_number: 1,
      kickoff_at: "2026-06-24T19:00:00.000Z",
      home_team_id: null,
      away_team_id: null,
      home_team_name: "Bosnia & Herzegovina",
      away_team_name: "Qatar",
      venue: "Seattle",
      status: "scheduled",
      home_score: null,
      away_score: null,
    };

    const upsets: OnsideUpset[] = [
      {
        fixture_id: "wc-b-md3-bih-qat",
        group: "B",
        matchday: 3,
        kickoff_utc: "2026-06-24T19:00:00.000Z",
        venue_city: "Seattle",
        home: { code: "bih", name: "Bosnia & Herzegovina", rank: 65 },
        away: { code: "qat", name: "Qatar", rank: 55 },
        favourite: { code: "qat", name: "Qatar", confidence: "narrow" },
        underdog: { code: "bih", name: "Bosnia & Herzegovina" },
        probability: { home: 31, draw: 27, away: 42 },
        upset_combined_pct: 58,
        deep_link: "https://example.com",
      },
    ];

    expect(getGroupMatchdayFromRoundKey(match.round_key)).toBe(3);
    expect([...buildUpsetMatchIds([match], upsets)]).toEqual(["m1"]);
  });
});
