import { describe, expect, it } from "vitest";
import {
  getApiSearchTermsForOurTeam,
  isMenNationalTeam,
  isPlaceholderTeamName,
  mapApiFootballTeamName,
  matchApiPlayerToDb,
  normalizePlayerName,
  pickApiNationalTeam,
} from "./apiFootballPhotos";

describe("mapApiFootballTeamName", () => {
  it("maps known API team names to our DB names", () => {
    expect(mapApiFootballTeamName("United States")).toBe("USA");
    expect(mapApiFootballTeamName("Korea Republic")).toBe("South Korea");
    expect(mapApiFootballTeamName("Czechia")).toBe("Czech Republic");
  });

  it("returns unknown names unchanged", () => {
    expect(mapApiFootballTeamName("Mexico")).toBe("Mexico");
  });
});

describe("isPlaceholderTeamName", () => {
  it("detects knockout placeholders", () => {
    expect(isPlaceholderTeamName("3A/B/C/D/F")).toBe(true);
    expect(isPlaceholderTeamName("Mexico")).toBe(false);
  });
});

describe("pickApiNationalTeam", () => {
  it("prefers mapped men's national team", () => {
    const team = pickApiNationalTeam("USA", [
      { id: 1, name: "USA W", code: "USA", national: true },
      { id: 2, name: "United States", code: "USA", national: true },
    ]);
    expect(team?.id).toBe(2);
  });
});

describe("getApiSearchTermsForOurTeam", () => {
  it("returns custom search terms when configured", () => {
    expect(getApiSearchTermsForOurTeam("USA")).toEqual(["United States"]);
    expect(getApiSearchTermsForOurTeam("Mexico")).toEqual(["Mexico"]);
  });
});

describe("isMenNationalTeam", () => {
  it("excludes women's teams", () => {
    expect(isMenNationalTeam("USA W")).toBe(false);
    expect(isMenNationalTeam("United States")).toBe(true);
  });
});

describe("normalizePlayerName", () => {
  it("normalizes accents and casing", () => {
    expect(normalizePlayerName("Edson Álvarez")).toBe("edson alvarez");
  });
});

describe("matchApiPlayerToDb", () => {
  const dbPlayers = [
    {
      id: "p1",
      team_id: "t1",
      name: "Edson Alvarez",
      shirt_number: 4,
    },
    {
      id: "p2",
      team_id: "t1",
      name: "Raul Rangel",
      shirt_number: 1,
    },
  ];

  it("matches by shirt number first", () => {
    const match = matchApiPlayerToDb(
      { id: 100, name: "Different Display", number: 4, photo: null },
      dbPlayers,
    );
    expect(match?.id).toBe("p1");
  });

  it("falls back to normalized name", () => {
    const match = matchApiPlayerToDb(
      { id: 101, name: "Raul Rangel", number: null, photo: null },
      dbPlayers,
    );
    expect(match?.id).toBe("p2");
  });
});
