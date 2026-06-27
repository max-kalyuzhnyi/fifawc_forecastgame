"use client";

import type { Match } from "@/entities/match/model/types";
import {
  BRACKET_MATCH_NUMBERS,
  type BracketStageKey,
} from "@/shared/lib/playoff/bracket";
import {
  BRACKET_CARD_HEIGHT,
  getBracketTreeHeight,
  getMatchTop,
} from "@/shared/lib/playoff/bracketLayout";
import {
  BracketMatchCard,
  buildBracketMatchView,
} from "@/features/brackets/ui/BracketMatchCard";

interface BracketKnockoutColumnProps {
  stage: Exclude<BracketStageKey, "groups">;
  matchesByNumber: Map<number, Match>;
  onSelectMatch?: (matchId: string) => void;
}

export function BracketKnockoutColumn({
  stage,
  matchesByNumber,
  onSelectMatch,
}: BracketKnockoutColumnProps) {
  const matchNumbers = BRACKET_MATCH_NUMBERS[stage];
  const treeHeight = getBracketTreeHeight();

  return (
    <div
      className="relative shrink-0"
      style={{ height: treeHeight, minHeight: treeHeight }}
    >
      {matchNumbers.map((matchNumber) => {
        const match = matchesByNumber.get(matchNumber) ?? null;
        const view = buildBracketMatchView(matchNumber, match);
        const top = getMatchTop(matchNumber);

        return (
          <div
            key={matchNumber}
            className="absolute right-0 left-0"
            style={{ top, height: BRACKET_CARD_HEIGHT }}
          >
            <BracketMatchCard
              view={view}
              showConnector={false}
              onSelect={onSelectMatch}
              compact
            />
          </div>
        );
      })}
    </div>
  );
}
