import { describe, expect, it } from "vitest";
import {
  BRACKET_MATCH_NUMBERS,
  BRACKET_PARENT_MATCH_NUMBERS,
  BRACKET_R32_VISUAL_ORDER,
} from "@/shared/lib/playoff/bracket";
import {
  BRACKET_CARD_HEIGHT,
  BRACKET_SLOT_GAP,
  getConnectorPaths,
  getMatchCenterY,
} from "@/shared/lib/playoff/bracketLayout";

const SLOT_UNIT = BRACKET_CARD_HEIGHT + BRACKET_SLOT_GAP;

function getR32Slot(matchNumber: number): number {
  return BRACKET_R32_VISUAL_ORDER.indexOf(matchNumber);
}

describe("bracketLayout", () => {
  it("centers R16 matches between their R32 parents", () => {
    const y89 = getMatchCenterY(89);
    const y74 = getMatchCenterY(74);
    const y77 = getMatchCenterY(77);
    expect(y89).toBe((y74 + y77) / 2);
  });

  it("builds connector paths for each next-round match", () => {
    const paths = getConnectorPaths("round_of_16");
    expect(paths).toHaveLength(8);
    expect(paths[0].yChild).toBe((paths[0].yTop + paths[0].yBottom) / 2);
  });

  it("places each R16 parent pair in consecutive R32 slots", () => {
    for (const childNumber of BRACKET_MATCH_NUMBERS.round_of_16) {
      const parents = BRACKET_PARENT_MATCH_NUMBERS[childNumber];
      expect(parents).toBeDefined();

      const [first, second] = parents!;
      const firstSlot = getR32Slot(first);
      const secondSlot = getR32Slot(second);
      expect(Math.abs(firstSlot - secondSlot)).toBe(1);
    }
  });

  it("centers every R16 connector child between its parent Y positions", () => {
    const paths = getConnectorPaths("round_of_16");
    for (const path of paths) {
      expect(path.yChild).toBe((path.yTop + path.yBottom) / 2);
    }
  });

  it("orders R32 slots by bracket pairs, not fixture number", () => {
    expect(getR32Slot(73)).toBe(0);
    expect(getR32Slot(75)).toBe(1);
    expect(getR32Slot(74)).toBe(2);
    expect(getR32Slot(77)).toBe(3);
    expect(getMatchCenterY(75) - getMatchCenterY(73)).toBe(SLOT_UNIT);
    expect(getMatchCenterY(77) - getMatchCenterY(74)).toBe(SLOT_UNIT);
  });
});
