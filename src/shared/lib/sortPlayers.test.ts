import { describe, expect, it } from "vitest";
import { sortPlayersForScorerSelect } from "./sortPlayers";

describe("sortPlayersForScorerSelect", () => {
  it("sorts by position FW → MF → DF → GK, then shirt number", () => {
    const players = [
      { name: "Keeper", position: "GK", shirt_number: 1 },
      { name: "Defender", position: "DF", shirt_number: 4 },
      { name: "Midfielder", position: "MF", shirt_number: 8 },
      { name: "Striker B", position: "FW", shirt_number: 11 },
      { name: "Striker A", position: "FW", shirt_number: 9 },
    ];

    expect(sortPlayersForScorerSelect(players).map((p) => p.name)).toEqual([
      "Striker A",
      "Striker B",
      "Midfielder",
      "Defender",
      "Keeper",
    ]);
  });

  it("puts players without position at the end, sorted by name", () => {
    const players = [
      { name: "Zed", position: null, shirt_number: null },
      { name: "Amy", position: "FW", shirt_number: 10 },
      { name: "Bob", position: null, shirt_number: null },
    ];

    expect(sortPlayersForScorerSelect(players).map((p) => p.name)).toEqual([
      "Amy",
      "Bob",
      "Zed",
    ]);
  });
});
