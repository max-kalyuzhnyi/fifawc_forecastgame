import {
  collectFifaRostersCandidates,
} from "@/shared/lib/commonsPhoto/fifarostersClient";
import {
  isFifaRostersManualPickEnabled,
  pickBestFifaRostersCandidate,
  rankFifaRostersCandidate,
} from "@/shared/lib/commonsPhoto/rankFifarostersCandidate";
import type { PlayerPhotoReviewEntry } from "@/shared/lib/commonsPhoto/types";

export interface ReviewPlayerInput {
  playerId: string;
  playerName: string;
  teamName: string;
  wikiTitle?: string | null;
  currentPhotoUrl?: string | null;
}

export async function reviewFifaRostersPlayer(
  row: ReviewPlayerInput,
): Promise<PlayerPhotoReviewEntry> {
  const rawCandidates = await collectFifaRostersCandidates({
    playerName: row.playerName,
    teamName: row.teamName,
    wikiTitle: row.wikiTitle,
  });

  const ranked = rawCandidates
    .map((candidate) => rankFifaRostersCandidate(candidate))
    .sort((left, right) => right.score - left.score)
    .slice(0, 8);

  const decision = pickBestFifaRostersCandidate(ranked);
  const manualPick = isFifaRostersManualPickEnabled();

  return {
    playerId: row.playerId,
    playerName: row.playerName,
    teamName: row.teamName,
    wikiTitle: row.wikiTitle ?? null,
    currentPhotoUrl: row.currentPhotoUrl ?? null,
    candidates: ranked,
    autoAccept: decision.autoAccept,
    selectedFileTitle: manualPick ? null : decision.best?.fileTitle ?? null,
    suggestedFileTitle: decision.best?.fileTitle ?? null,
    rejectionReason: decision.rejectionReason,
  };
}
