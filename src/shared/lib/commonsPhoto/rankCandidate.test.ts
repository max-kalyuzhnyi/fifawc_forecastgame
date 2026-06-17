import { describe, expect, it } from "vitest";
import {
  pickBestCandidate,
  rankCommonsPhotoCandidate,
} from "@/shared/lib/commonsPhoto/rankCandidate";
import type { CommonsPhotoCandidate } from "@/shared/lib/commonsPhoto/types";

function candidate(
  overrides: Partial<CommonsPhotoCandidate> & Pick<CommonsPhotoCandidate, "fileTitle">,
): CommonsPhotoCandidate {
  return {
    source: "commons_search",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Example.jpg",
    thumbUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/Example.jpg/500px-Example.jpg",
    width: 500,
    height: 700,
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    authorCredit: "Example Author",
    description: null,
    ...overrides,
  };
}

describe("rankCommonsPhotoCandidate", () => {
  it("prefers national-team match photos over casual portraits", () => {
    const casual = rankCommonsPhotoCandidate(
      candidate({
        fileTitle: "Cristiano Ronaldo at awards ceremony in suit.jpg",
        source: "wikidata_p18",
        description: "Formal event portrait",
        width: 400,
        height: 500,
      }),
      "Portugal",
    );

    const matchPhoto = rankCommonsPhotoCandidate(
      candidate({
        fileTitle: "Cristiano Ronaldo 2275 (cropped).jpg",
        description: "Portugal national football team match",
        width: 960,
        height: 1280,
      }),
      "Portugal",
    );

    expect(matchPhoto.score).toBeGreaterThan(casual.score);
    expect(matchPhoto.reasonTags).toContain("national_team_keyword");
  });

  it("penalizes low-resolution candidates", () => {
    const ranked = rankCommonsPhotoCandidate(
      candidate({
        fileTitle: "Player training.jpg",
        width: 150,
        height: 150,
      }),
      "Brazil",
    );

    expect(ranked.reasonTags).toContain("low_resolution");
    expect(ranked.score).toBeLessThan(0);
  });
});

describe("pickBestCandidate", () => {
  it("auto-accepts only when the winner is clearly better", () => {
    const ranked = [
      rankCommonsPhotoCandidate(
        candidate({
          fileTitle: "Lionel Messi Argentina national team World Cup.jpg",
          width: 800,
          height: 1200,
        }),
        "Argentina",
      ),
      rankCommonsPhotoCandidate(
        candidate({
          fileTitle: "Lionel Messi press conference.jpg",
          width: 700,
          height: 900,
        }),
        "Argentina",
      ),
    ];

    const result = pickBestCandidate(ranked);
    expect(result.best?.fileTitle).toContain("national team");
    expect(result.autoAccept).toBe(true);
  });

  it("requires manual review for ambiguous close scores", () => {
    const ranked = [
      rankCommonsPhotoCandidate(
        candidate({ fileTitle: "Player portrait football.jpg" }),
        "France",
      ),
      rankCommonsPhotoCandidate(
        candidate({ fileTitle: "Player portrait soccer.jpg" }),
        "France",
      ),
    ];

    const result = pickBestCandidate(ranked);
    expect(result.autoAccept).toBe(false);
    expect(result.rejectionReason).toBe("ambiguous_candidates");
  });
});
