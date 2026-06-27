import { describe, expect, it } from "vitest";
import type { Match } from "@/entities/match/model/types";
import {
  buildPreviousMatchesByMatch,
  buildPreviousMatchesForMatch,
} from "./previousMatches";

function makeMatch(overrides: Partial<Match> & Pick<Match, "id" | "kickoff_at">): Match {
  return {
    external_key: overrides.id,
    round_key: "group_1",
    round_display: "Group Stage",
    group_name: "Group A",
    match_number: 1,
    home_team_id: null,
    away_team_id: null,
    home_team_name: "Croatia",
    away_team_name: "Ghana",
    venue: null,
    status: "finished",
    home_score: 1,
    away_score: 0,
    ...overrides,
  };
}

describe("buildPreviousMatchesForMatch", () => {
  it("returns only finished matches before the current kickoff for each team", () => {
    const current = makeMatch({
      id: "current",
      kickoff_at: "2026-06-27T20:00:00.000Z",
      home_team_name: "Croatia",
      away_team_name: "Ghana",
      status: "scheduled",
      home_score: null,
      away_score: null,
    });

    const croatiaPast = makeMatch({
      id: "croatia-past",
      kickoff_at: "2026-06-20T20:00:00.000Z",
      home_team_name: "Croatia",
      away_team_name: "Panama",
    });

    const ghanaPast = makeMatch({
      id: "ghana-past",
      kickoff_at: "2026-06-21T20:00:00.000Z",
      home_team_name: "USA",
      away_team_name: "Ghana",
      home_score: 2,
      away_score: 1,
    });

    const futureForCroatia = makeMatch({
      id: "future",
      kickoff_at: "2026-06-28T20:00:00.000Z",
      home_team_name: "Croatia",
      away_team_name: "Brazil",
    });

    const all = [current, croatiaPast, ghanaPast, futureForCroatia];
    const result = buildPreviousMatchesForMatch(current, all);

    expect(result.home).toEqual([croatiaPast]);
    expect(result.away).toEqual([ghanaPast]);
  });

  it("builds a map for every match", () => {
    const first = makeMatch({
      id: "first",
      kickoff_at: "2026-06-20T20:00:00.000Z",
    });
    const second = makeMatch({
      id: "second",
      kickoff_at: "2026-06-27T20:00:00.000Z",
      home_team_name: "Croatia",
      away_team_name: "Ghana",
      status: "scheduled",
      home_score: null,
      away_score: null,
    });

    const map = buildPreviousMatchesByMatch([first, second]);

    expect(map.second.home).toEqual([first]);
    expect(map.first.home).toEqual([]);
    expect(map.first.away).toEqual([]);
  });
});
