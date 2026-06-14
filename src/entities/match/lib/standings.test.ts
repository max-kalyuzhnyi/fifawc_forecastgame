import { describe, expect, it } from "vitest";
import type { Match } from "@/entities/match/model/types";
import { buildGroupStandings } from "@/entities/match/lib/standings";

function makeMatch(overrides: Partial<Match> & Pick<Match, "home_team_name" | "away_team_name">): Match {
  return {
    id: "match-1",
    external_key: "match-1",
    round_key: "group_1",
    round_display: "Group Stage",
    group_name: "Group A",
    match_number: 1,
    kickoff_at: "2026-06-11T19:00:00.000Z",
    home_team_id: null,
    away_team_id: null,
    venue: null,
    status: "scheduled",
    home_score: null,
    away_score: null,
    fd_match_id: null,
    minute: null,
    injury_time: null,
    fd_status: null,
    fd_last_updated: null,
    home_lineup: null,
    away_lineup: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildGroupStandings", () => {
  it("returns four zeroed rows per group from scheduled matches", () => {
    const matches = [
      makeMatch({ id: "1", external_key: "1", home_team_name: "Mexico", away_team_name: "South Africa" }),
      makeMatch({ id: "2", external_key: "2", home_team_name: "South Korea", away_team_name: "Czech Republic" }),
      makeMatch({ id: "3", external_key: "3", home_team_name: "Mexico", away_team_name: "South Korea" }),
    ];

    const standings = buildGroupStandings(matches);

    expect(standings).toHaveLength(1);
    expect(standings[0].groupName).toBe("Group A");
    expect(standings[0].rows).toHaveLength(4);
    expect(standings[0].rows.every((row) => row.played === 0 && row.points === 0)).toBe(
      true,
    );
  });

  it("calculates points and sorts by pts, gd, gf, name", () => {
    const matches = [
      makeMatch({
        id: "1",
        external_key: "1",
        home_team_name: "Mexico",
        away_team_name: "South Africa",
        status: "finished",
        home_score: 2,
        away_score: 0,
      }),
      makeMatch({
        id: "2",
        external_key: "2",
        home_team_name: "South Korea",
        away_team_name: "Czech Republic",
        status: "finished",
        home_score: 1,
        away_score: 1,
      }),
      makeMatch({
        id: "3",
        external_key: "3",
        home_team_name: "Mexico",
        away_team_name: "South Korea",
        status: "finished",
        home_score: 1,
        away_score: 0,
      }),
      makeMatch({
        id: "4",
        external_key: "4",
        home_team_name: "Czech Republic",
        away_team_name: "South Africa",
        status: "finished",
        home_score: 3,
        away_score: 0,
      }),
    ];

    const [groupA] = buildGroupStandings(matches);

    expect(groupA.rows.map((row) => row.teamName)).toEqual([
      "Mexico",
      "Czech Republic",
      "South Korea",
      "South Africa",
    ]);

    expect(groupA.rows[0]).toMatchObject({
      teamName: "Mexico",
      played: 2,
      won: 2,
      drawn: 0,
      lost: 0,
      goalsFor: 3,
      goalsAgainst: 0,
      goalDifference: 3,
      points: 6,
    });

    expect(groupA.rows[2]).toMatchObject({
      teamName: "South Korea",
      played: 2,
      won: 0,
      drawn: 1,
      lost: 1,
      points: 1,
    });
  });

  it("sorts groups alphabetically by letter", () => {
    const matches = [
      makeMatch({
        id: "1",
        external_key: "1",
        group_name: "Group B",
        home_team_name: "Canada",
        away_team_name: "Qatar",
      }),
      makeMatch({
        id: "2",
        external_key: "2",
        group_name: "Group A",
        home_team_name: "Mexico",
        away_team_name: "South Africa",
      }),
    ];

    const standings = buildGroupStandings(matches);

    expect(standings.map((group) => group.groupName)).toEqual([
      "Group A",
      "Group B",
    ]);
  });

  it("ignores non-group matches", () => {
    const matches = [
      makeMatch({ id: "1", external_key: "1", home_team_name: "Mexico", away_team_name: "South Africa" }),
      makeMatch({
        id: "2",
        external_key: "2",
        round_key: "round_of_16",
        group_name: null,
        home_team_name: "Brazil",
        away_team_name: "Germany",
      }),
    ];

    const standings = buildGroupStandings(matches);

    expect(standings).toHaveLength(1);
    expect(standings[0].rows.map((row) => row.teamName)).toEqual([
      "Mexico",
      "South Africa",
    ]);
    expect(
      standings[0].rows.some((row) =>
        ["Brazil", "Germany"].includes(row.teamName),
      ),
    ).toBe(false);
  });

  it("includes live matches with score as provisional standings", () => {
    const matches = [
      makeMatch({
        id: "1",
        external_key: "1",
        home_team_name: "Scotland",
        away_team_name: "Haiti",
        status: "finished",
        home_score: 2,
        away_score: 0,
      }),
      makeMatch({
        id: "2",
        external_key: "2",
        home_team_name: "Brazil",
        away_team_name: "Morocco",
        status: "live",
        home_score: 1,
        away_score: 0,
      }),
      makeMatch({
        id: "3",
        external_key: "3",
        home_team_name: "Scotland",
        away_team_name: "Brazil",
      }),
      makeMatch({
        id: "4",
        external_key: "4",
        home_team_name: "Morocco",
        away_team_name: "Haiti",
      }),
    ];

    const [groupA] = buildGroupStandings(matches);

    expect(groupA.rows.map((row) => row.teamName)).toEqual([
      "Scotland",
      "Brazil",
      "Morocco",
      "Haiti",
    ]);

    expect(groupA.rows[0]).toMatchObject({
      teamName: "Scotland",
      played: 1,
      won: 1,
      drawn: 0,
      lost: 0,
      goalDifference: 2,
      points: 3,
    });

    expect(groupA.rows[1]).toMatchObject({
      teamName: "Brazil",
      played: 1,
      won: 1,
      drawn: 0,
      lost: 0,
      goalDifference: 1,
      points: 3,
    });

    expect(groupA.rows[2]).toMatchObject({
      teamName: "Morocco",
      played: 1,
      won: 0,
      drawn: 0,
      lost: 1,
      goalDifference: -1,
      points: 0,
    });
  });
});
