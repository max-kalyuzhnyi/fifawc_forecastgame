import { describe, expect, it } from "vitest";
import {
  pickBestFifaRostersCandidate,
  rankFifaRostersCandidate,
} from "@/shared/lib/commonsPhoto/rankFifarostersCandidate";
import type { CommonsPhotoCandidate } from "@/shared/lib/commonsPhoto/types";

function candidate(
  overrides: Partial<CommonsPhotoCandidate> & Pick<CommonsPhotoCandidate, "fileTitle" | "source">,
): CommonsPhotoCandidate {
  return {
    sourceUrl: "https://www.fifarosters.com/assets/players/fifa26/dynamic/1.png",
    thumbUrl: "https://www.fifarosters.com/assets/players/fifa26/dynamic/1.png",
    width: 512,
    height: 768,
    licenseUrl: null,
    authorCredit: "EA Sports / FifaRosters",
    description: "base · rating 80 · Real Madrid",
    ...overrides,
  };
}

describe("rankFifaRostersCandidate", () => {
  it("prefers dynamic renders over face headshots", () => {
    const dynamic = rankFifaRostersCandidate(
      candidate({
        fileTitle: "fut-1",
        source: "fifarosters_dynamic",
        description: "special · rating 92 · Real Madrid",
      }),
    );

    const face = rankFifaRostersCandidate(
      candidate({
        fileTitle: "face-1",
        source: "fifarosters_face",
        width: 256,
        height: 256,
        description: "base · rating 89 · Real Madrid",
      }),
    );

    expect(dynamic.score).toBeGreaterThan(face.score);
    expect(dynamic.reasonTags).toContain("dynamic_render");
  });

  it("boosts higher-rated special cards", () => {
    const highRated = rankFifaRostersCandidate(
      candidate({
        fileTitle: "fut-2",
        source: "fifarosters_dynamic",
        description: "icon · rating 96 · Real Madrid",
      }),
    );

    const baseRated = rankFifaRostersCandidate(
      candidate({
        fileTitle: "fut-3",
        source: "fifarosters_dynamic",
        description: "gold · rating 82 · Real Madrid",
      }),
    );

    expect(highRated.score).toBeGreaterThan(baseRated.score);
  });
});

describe("pickBestFifaRostersCandidate", () => {
  it("forces manual review when manual pick mode is enabled", () => {
    const ranked = [
      rankFifaRostersCandidate(
        candidate({
          fileTitle: "fut-14",
          source: "fifarosters_dynamic",
          description: "special · rating 96 · Brazil",
        }),
      ),
    ];

    const result = pickBestFifaRostersCandidate(ranked, { manualPick: true });
    expect(result.autoAccept).toBe(false);
    expect(result.rejectionReason).toBe("manual_pick_required");
    expect(result.best?.fileTitle).toBe("fut-14");
  });

  it("auto-accepts the top candidate when score is 10 or higher", () => {
    const ranked = [
      rankFifaRostersCandidate(
        candidate({
          fileTitle: "fut-14",
          source: "fifarosters_dynamic",
          description: "special · rating 96 · Brazil",
        }),
      ),
      rankFifaRostersCandidate(
        candidate({
          fileTitle: "fut-12",
          source: "fifarosters_dynamic",
          description: "special · rating 92 · Brazil",
        }),
      ),
    ];

    const result = pickBestFifaRostersCandidate(ranked);
    expect(result.autoAccept).toBe(true);
    expect(result.best?.fileTitle).toBe("fut-14");
  });

  it("flags ambiguous only for low close scores", () => {
    const lowA = rankFifaRostersCandidate(
      candidate({
        fileTitle: "face-a",
        source: "fifarosters_face",
        width: 256,
        height: 256,
        description: "base · rating 70 · Brazil",
      }),
    );
    const lowB = rankFifaRostersCandidate(
      candidate({
        fileTitle: "face-b",
        source: "fifarosters_face",
        width: 256,
        height: 256,
        description: "base · rating 69 · Brazil",
      }),
    );

    const result = pickBestFifaRostersCandidate([lowA, lowB]);
    expect(result.autoAccept).toBe(false);
    expect(result.rejectionReason).toBe("ambiguous_candidates");
  });

  it("sends mid scores to manual review without ambiguous flag", () => {
    const mid = rankFifaRostersCandidate(
      candidate({
        fileTitle: "fut-mid",
        source: "fifarosters_dynamic",
        width: 350,
        height: 500,
        description: "gold · rating 75 · Brazil",
      }),
    );

    expect(mid.score).toBe(8);

    const result = pickBestFifaRostersCandidate([mid]);
    expect(result.autoAccept).toBe(false);
    expect(result.rejectionReason).toBe("score_below_review_threshold");
  });
});
