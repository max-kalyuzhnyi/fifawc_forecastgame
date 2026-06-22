import { describe, expect, it } from "vitest";
import { CARD_TEAMS } from "@/shared/lib/cards/config";
import {
  CARD_ART_HEIGHT,
  CARD_GOLD_DIVIDER_Y_RATIO,
  DYNAMIC_RENDER_BOTTOM_ANCHOR_Y_RATIO,
  FACE_HEADSHOT_MAX_HEIGHT_RATIO,
  computePlayerPlacement,
} from "@/shared/lib/commonsPhoto/compositeFifaCardArt";

const TEAM_SLUG: Record<(typeof CARD_TEAMS)[number], string> = {
  Belgium: "belgium",
  Brazil: "brazil",
  Argentina: "argentina",
  Croatia: "croatia",
  England: "england",
  France: "france",
  Germany: "germany",
  Mexico: "mexico",
  Netherlands: "netherlands",
  Portugal: "portugal",
  Spain: "spain",
  USA: "usa",
};

describe("team background slug map", () => {
  it("covers every CARD_TEAMS entry", () => {
    for (const team of CARD_TEAMS) {
      expect(TEAM_SLUG[team]).toBeTruthy();
    }
  });
});

describe("computePlayerPlacement", () => {
  const playerHeight = 400;

  it("anchors face headshots on the gold divider", () => {
    const placement = computePlayerPlacement({
      playerWidth: 280,
      playerHeight: 400,
      photoSource: "fifarosters_face",
    });

    const bottomY = placement.top + 400;
    expect(bottomY).toBe(Math.round(CARD_ART_HEIGHT * CARD_GOLD_DIVIDER_Y_RATIO));
    expect(placement.maxPlayerHeight).toBe(
      Math.round(CARD_ART_HEIGHT * FACE_HEADSHOT_MAX_HEIGHT_RATIO),
    );
  });

  it("pushes dynamic renders lower than the gold divider", () => {
    const facePlacement = computePlayerPlacement({
      playerWidth: 300,
      playerHeight,
      photoSource: "fifarosters_face",
      playerScale: 0.85,
      playerTopRatio: 0.08,
    });
    const dynamicPlacement = computePlayerPlacement({
      playerWidth: 300,
      playerHeight,
      photoSource: "fifarosters_dynamic",
      playerScale: 0.85,
      playerTopRatio: 0.08,
    });

    expect(dynamicPlacement.top).toBeGreaterThan(facePlacement.top);
    const dynamicBottomY = dynamicPlacement.top + playerHeight;
    expect(dynamicBottomY).toBe(
      Math.round(CARD_ART_HEIGHT * DYNAMIC_RENDER_BOTTOM_ANCHOR_Y_RATIO),
    );
  });
});
