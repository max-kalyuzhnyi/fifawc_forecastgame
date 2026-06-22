import { describe, expect, it } from "vitest";
import {
  buildRosterPoolPlayers,
  extractSubstituteIns,
  findLatestLineupForTeam,
  mapFdPosition,
  mapLineupToRosterPlayers,
  type MatchWithLineup,
} from "@/features/matches/lib/lineupRoster";

function match(overrides: Partial<MatchWithLineup> & Pick<MatchWithLineup, "kickoff_at">): MatchWithLineup {
  return {
    id: "match-1",
    status: "finished",
    home_team_name: "Brazil",
    away_team_name: "Serbia",
    home_lineup: {
      formation: "4-2-3-1",
      coach: "Dorival Jr",
      lineup: Array.from({ length: 11 }, (_, index) => ({
        id: index + 1,
        name: `Starter ${index + 1}`,
        position: index === 0 ? "Goalkeeper" : "Midfielder",
        shirtNumber: index + 1,
      })),
      bench: [
        { id: 20, name: "Bench Sub 1", position: "Midfielder", shirtNumber: 20 },
        { id: 21, name: "Bench Sub 2", position: "Defender", shirtNumber: 21 },
      ],
    },
    away_lineup: {
      formation: "4-3-3",
      coach: "Coach",
      lineup: Array.from({ length: 11 }, (_, index) => ({
        id: 100 + index,
        name: `Serbia ${index + 1}`,
        position: "Midfielder",
        shirtNumber: index + 1,
      })),
      bench: [],
    },
    ...overrides,
  };
}

describe("mapFdPosition", () => {
  it("maps football-data positions to roster positions", () => {
    expect(mapFdPosition("Goalkeeper")).toBe("GK");
    expect(mapFdPosition("Defender")).toBe("DF");
    expect(mapFdPosition("Midfielder")).toBe("MF");
    expect(mapFdPosition("Attacker")).toBe("FW");
  });
});

describe("mapLineupToRosterPlayers", () => {
  it("returns the first 11 starters", () => {
    const players = mapLineupToRosterPlayers(
      Array.from({ length: 13 }, (_, index) => ({
        id: index,
        name: `Player ${index}`,
        position: "Midfielder",
        shirtNumber: index,
      })),
    );

    expect(players).toHaveLength(11);
    expect(players[0]?.name).toBe("Player 0");
  });
});

describe("extractSubstituteIns", () => {
  it("returns unique substitute-ins excluding starters", () => {
    const starters = mapLineupToRosterPlayers(
      Array.from({ length: 11 }, (_, index) => ({
        id: index,
        name: `Starter ${index}`,
        position: "Midfielder",
        shirtNumber: index,
      })),
    );

    const subs = extractSubstituteIns(
      [
        { side: "home", player_name: "Sub One" },
        { side: "home", player_name: "Sub One" },
        { side: "home", player_name: "Starter 0" },
        { side: "away", player_name: "Away Sub" },
      ],
      "home",
      starters,
    );

    expect(subs).toHaveLength(1);
    expect(subs[0]?.name).toBe("Sub One");
  });
});

describe("buildRosterPoolPlayers", () => {
  it("builds a 15-player pool with subs before bench", () => {
    const lineup = Array.from({ length: 11 }, (_, index) => ({
      id: index,
      name: `Starter ${index}`,
      position: "Midfielder",
      shirtNumber: index,
    }));

    const pool = buildRosterPoolPlayers({
      lineup,
      bench: [
        { id: 20, name: "Bench A", position: "Midfielder", shirtNumber: 20 },
        { id: 21, name: "Bench B", position: "Defender", shirtNumber: 21 },
      ],
      substituteIns: [
        { name: "Sub A", shirtNumber: null, position: "MF" },
        { name: "Sub B", shirtNumber: null, position: "MF" },
      ],
      poolSize: 15,
    });

    expect(pool.poolPlayers).toHaveLength(15);
    expect(pool.poolPlayers.filter((player) => player.poolRole === "starter")).toHaveLength(11);
    expect(pool.poolPlayers.filter((player) => player.poolRole === "substitute")).toHaveLength(2);
    expect(pool.poolPlayers.filter((player) => player.poolRole === "bench")).toHaveLength(2);
  });
});

describe("findLatestLineupForTeam", () => {
  it("picks the latest finished match with a full starting XI", () => {
    const older = match({
      kickoff_at: "2026-06-10T18:00:00.000Z",
      home_lineup: {
        formation: null,
        coach: null,
        lineup: Array.from({ length: 11 }, (_, index) => ({
          id: index,
          name: `Old ${index}`,
          position: "Midfielder",
          shirtNumber: index,
        })),
        bench: [],
      },
    });
    const newer = match({ kickoff_at: "2026-06-15T18:00:00.000Z" });

    const resolved = findLatestLineupForTeam([older, newer], "Brazil");
    expect(resolved?.kickoffAt).toBe("2026-06-15T18:00:00.000Z");
    expect(resolved?.side).toBe("home");
    expect(resolved?.opponent).toBe("Serbia");
    expect(resolved?.starters).toHaveLength(11);
    expect(resolved?.poolPlayers.length).toBeGreaterThanOrEqual(11);
  });

  it("returns away lineup when the team played away", () => {
    const resolved = findLatestLineupForTeam(
      [
        match({
          kickoff_at: "2026-06-15T18:00:00.000Z",
          home_team_name: "Serbia",
          away_team_name: "Brazil",
          away_lineup: {
            formation: "4-2-3-1",
            coach: "Dorival Jr",
            lineup: Array.from({ length: 11 }, (_, index) => ({
              id: index + 1,
              name: `Brazil Starter ${index + 1}`,
              position: "Midfielder",
              shirtNumber: index + 1,
            })),
            bench: [],
          },
        }),
      ],
      "Brazil",
    );

    expect(resolved?.side).toBe("away");
    expect(resolved?.poolPlayers[0]?.name).toBe("Brazil Starter 1");
  });

  it("includes substitute-ins from match events", () => {
    const events = new Map([
      [
        "match-1",
        [
          { side: "home" as const, player_name: "Event Sub 1" },
          { side: "home" as const, player_name: "Event Sub 2" },
        ],
      ],
    ]);

    const resolved = findLatestLineupForTeam([match({ kickoff_at: "2026-06-15T18:00:00.000Z" })], "Brazil", {
      substitutionEventsByMatchId: events,
    });

    expect(resolved?.substituteIns.map((player) => player.name)).toEqual([
      "Event Sub 1",
      "Event Sub 2",
    ]);
    expect(resolved?.poolPlayers.some((player) => player.name === "Event Sub 1")).toBe(true);
  });
});
