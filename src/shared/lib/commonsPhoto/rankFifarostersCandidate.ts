import type { CommonsPhotoCandidate, RankedCommonsPhotoCandidate } from "./types";

function parseRating(description: string | null): number {
  if (!description) {
    return 0;
  }

  const match = description.match(/rating\s+(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

/** Score FifaRosters renders for card-art suitability. */
export function rankFifaRostersCandidate(
  candidate: CommonsPhotoCandidate,
): RankedCommonsPhotoCandidate {
  const reasonTags: string[] = [];
  let score = 0;

  if (candidate.source === "fifarosters_dynamic") {
    score += 6;
    reasonTags.push("dynamic_render");
  }

  if (candidate.source === "fifarosters_face") {
    score += 2;
    reasonTags.push("face_headshot");
  }

  const rating = parseRating(candidate.description);
  if (rating >= 90) {
    score += 4;
    reasonTags.push("high_special_rating");
  } else if (rating >= 80) {
    score += 2;
    reasonTags.push("strong_rating");
  }

  const shortEdge = Math.min(candidate.width, candidate.height);
  if (shortEdge >= 400) {
    score += 2;
    reasonTags.push("good_resolution");
  }

  const aspect = candidate.width / candidate.height;
  if (aspect >= 0.55 && aspect <= 0.85) {
    score += 2;
    reasonTags.push("card_friendly_aspect");
  }

  if (candidate.description?.toLowerCase().includes("icon")) {
    score += 1;
    reasonTags.push("icon_card");
  }

  return {
    ...candidate,
    score,
    reasonTags,
  };
}

const FIFA_ROSTERS_AUTO_ACCEPT_SCORE = 10;
const FIFA_ROSTERS_LOW_SCORE_AMBIGUOUS = 4;
const FIFA_ROSTERS_AMBIGUOUS_GAP = 2;

export function isFifaRostersManualPickEnabled(): boolean {
  return process.env.FIFAROSTERS_MANUAL_PICK === "1";
}

/** Pick logic tuned for FifaRosters: auto-first at 10+, ambiguous only on low close scores. */
export function pickBestFifaRostersCandidate(
  candidates: RankedCommonsPhotoCandidate[],
  options?: { manualPick?: boolean },
): {
  best: RankedCommonsPhotoCandidate | null;
  autoAccept: boolean;
  rejectionReason: string | null;
} {
  if (candidates.length === 0) {
    return { best: null, autoAccept: false, rejectionReason: "no_candidates" };
  }

  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const second = sorted[1];

  const manualPick = options?.manualPick ?? isFifaRostersManualPickEnabled();
  if (manualPick) {
    return {
      best,
      autoAccept: false,
      rejectionReason: "manual_pick_required",
    };
  }

  if (best.score >= FIFA_ROSTERS_AUTO_ACCEPT_SCORE) {
    return { best, autoAccept: true, rejectionReason: null };
  }

  if (
    best.score <= FIFA_ROSTERS_LOW_SCORE_AMBIGUOUS &&
    second &&
    best.score - second.score < FIFA_ROSTERS_AMBIGUOUS_GAP
  ) {
    return {
      best,
      autoAccept: false,
      rejectionReason: "ambiguous_candidates",
    };
  }

  return {
    best,
    autoAccept: false,
    rejectionReason: "score_below_review_threshold",
  };
}
