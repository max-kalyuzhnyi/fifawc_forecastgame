import { describe, expect, it } from "vitest";
import {
  buildCandidatesFromLookupRows,
  buildSearchTerms,
  filterLookupRows,
  nameMatchesLookupLabel,
  pickPrimaryBaseId,
  type FifaRostersLookupRow,
} from "@/shared/lib/commonsPhoto/fifarostersClient";

function row(
  overrides: Partial<FifaRostersLookupRow> & Pick<FifaRostersLookupRow, "futid" | "baseid" | "label" | "img_url">,
): FifaRostersLookupRow {
  return {
    playerid: overrides.futid,
    xl_img_url: overrides.img_url,
    rating: overrides.rating ?? "80",
    color_label: overrides.color_label ?? null,
    data: {
      nationid: overrides.data?.nationid ?? "54",
      club_name: overrides.data?.club_name ?? "Real Madrid",
      rating: overrides.data?.rating ?? overrides.rating ?? "80",
      color_label: overrides.data?.color_label ?? null,
    },
    ...overrides,
  };
}

describe("buildSearchTerms", () => {
  it("includes wiki title and short first-name variants", () => {
    const terms = buildSearchTerms("Vinícius Júnior", "Vinícius Júnior");
    expect(terms).toContain("Vinícius Júnior");
    expect(terms).toContain("vini Jr.");
  });
});

describe("nameMatchesLookupLabel", () => {
  it("matches display names and short forms", () => {
    expect(nameMatchesLookupLabel("Vini Jr.", "Vini Jr.")).toBe(true);
    expect(nameMatchesLookupLabel("Endrick", "Endrick")).toBe(true);
  });

  it("rejects unrelated players with similar first names", () => {
    expect(nameMatchesLookupLabel("Vinicius Souza", "Vini Jr.")).toBe(false);
  });

  it("matches abbreviated first names with compatible last names", () => {
    expect(nameMatchesLookupLabel("Vini Jr.", "Vinícius Júnior")).toBe(true);
  });
});

describe("filterLookupRows", () => {
  it("keeps only rows for the requested nation", () => {
    const rows = [
      row({
        futid: "238794",
        baseid: "238794",
        label: "Vini Jr.",
        img_url: "https://www.fifarosters.com/assets/players/fifa26/faces/238794.png",
        data: { nationid: "54", club_name: "Real Madrid", rating: "89" },
      }),
      row({
        futid: "999",
        baseid: "999",
        label: "Vini Jr.",
        img_url: "https://www.fifarosters.com/assets/players/fifa26/faces/999.png",
        data: { nationid: "18", club_name: "PSG", rating: "88" },
      }),
    ];

    const filtered = filterLookupRows(rows, "Vini Jr.", "Brazil");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.baseid).toBe("238794");
  });
});

describe("buildCandidatesFromLookupRows", () => {
  it("dedupes dynamic and face variants for the primary base id", () => {
    const rows = [
      row({
        futid: "151233738",
        baseid: "238794",
        label: "Vini Jr.",
        img_url: "https://www.fifarosters.com/assets/players/fifa26/dynamic/151233738.png",
        rating: "96",
      }),
      row({
        futid: "84124874",
        baseid: "238794",
        label: "Vini Jr.",
        img_url: "https://www.fifarosters.com/assets/players/fifa26/dynamic/84124874.png",
        rating: "92",
      }),
      row({
        futid: "238794",
        baseid: "238794",
        label: "Vini Jr.",
        img_url: "https://www.fifarosters.com/assets/players/fifa26/faces/238794.png",
        rating: "89",
      }),
    ];

    expect(pickPrimaryBaseId(rows)).toBe("238794");

    const candidates = buildCandidatesFromLookupRows(rows);
    expect(candidates).toHaveLength(3);
    expect(candidates.map((candidate) => candidate.source)).toEqual(
      expect.arrayContaining(["fifarosters_dynamic", "fifarosters_face"]),
    );
  });
});
