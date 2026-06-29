import {
  BRACKET_MATCH_NUMBERS,
  BRACKET_PARENT_MATCH_NUMBERS,
  BRACKET_R32_VISUAL_ORDER,
  type BracketStageKey,
} from "@/shared/lib/playoff/bracket";

export const BRACKET_CARD_HEIGHT = 72;
export const BRACKET_SLOT_GAP = 10;
export const BRACKET_CONNECTOR_WIDTH = 14;

const SLOT_UNIT = BRACKET_CARD_HEIGHT + BRACKET_SLOT_GAP;

export const KNOCKOUT_STAGE_ORDER: Exclude<BracketStageKey, "groups">[] = [
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "final",
];

export function getBracketTreeHeight(): number {
  return 16 * BRACKET_CARD_HEIGHT + 15 * BRACKET_SLOT_GAP;
}

export function getPreviousKnockoutStage(
  stage: Exclude<BracketStageKey, "groups">,
): Exclude<BracketStageKey, "groups"> | null {
  const index = KNOCKOUT_STAGE_ORDER.indexOf(stage);
  if (index <= 0) return null;
  return KNOCKOUT_STAGE_ORDER[index - 1];
}

function getR32Slot(matchNumber: number): number {
  const slot = BRACKET_R32_VISUAL_ORDER.indexOf(matchNumber);
  if (slot === -1) {
    throw new Error(`Unknown R32 match number: ${matchNumber}`);
  }
  return slot;
}

export function getMatchCenterY(matchNumber: number): number {
  if (matchNumber >= 73 && matchNumber <= 88) {
    const slot = getR32Slot(matchNumber);
    return slot * SLOT_UNIT + BRACKET_CARD_HEIGHT / 2;
  }

  if (matchNumber === 103) {
    const finalCenter = getMatchCenterY(104);
    return finalCenter + BRACKET_CARD_HEIGHT + BRACKET_SLOT_GAP * 3;
  }

  const parents = BRACKET_PARENT_MATCH_NUMBERS[matchNumber];
  if (parents) {
    const y1 = getMatchCenterY(parents[0]);
    const y2 = getMatchCenterY(parents[1]);
    return (y1 + y2) / 2;
  }

  return BRACKET_CARD_HEIGHT / 2;
}

export function getMatchTop(matchNumber: number): number {
  return getMatchCenterY(matchNumber) - BRACKET_CARD_HEIGHT / 2;
}

export interface BracketConnectorPath {
  yTop: number;
  yBottom: number;
  yChild: number;
}

export function getConnectorPaths(
  toStage: Exclude<BracketStageKey, "groups" | "round_of_32">,
): BracketConnectorPath[] {
  const childNumbers = BRACKET_MATCH_NUMBERS[toStage];

  return childNumbers
    .filter((matchNumber) => matchNumber !== 103)
    .map((matchNumber) => {
      const parents = BRACKET_PARENT_MATCH_NUMBERS[matchNumber];
      if (!parents) {
        const yChild = getMatchCenterY(matchNumber);
        return { yTop: yChild, yBottom: yChild, yChild };
      }

      const yTop = getMatchCenterY(parents[0]);
      const yBottom = getMatchCenterY(parents[1]);
      const yChild = getMatchCenterY(matchNumber);
      return { yTop, yBottom, yChild };
    });
}

/** Width of one bracket column — two columns fit in the viewport. */
export const BRACKET_COLUMN_WIDTH_CLASS = "w-[calc((100vw-1.25rem)/2)]";
