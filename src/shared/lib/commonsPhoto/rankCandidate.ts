import type { CommonsPhotoCandidate, RankedCommonsPhotoCandidate } from "./types";

const MIN_SHORT_EDGE = 180;
const MIN_BYTES_HINT = 15_000;

interface ScoreRule {
  pattern: RegExp;
  score: number;
  reason: string;
}

/** Positive signals for card-suitable football photos. */
const POSITIVE_RULES: ScoreRule[] = [
  { pattern: /national/i, score: 5, reason: "national_team_keyword" },
  { pattern: /world[_ ]?cup|euro|copa|copa america|nations league/i, score: 4, reason: "tournament" },
  { pattern: /jersey|kit|shirt/i, score: 3, reason: "kit_keyword" },
  { pattern: /training|match|stadium|pitch|field|goal|celebrat/i, score: 3, reason: "on_pitch" },
  { pattern: /football|soccer|futebol|fútbol/i, score: 2, reason: "football_context" },
  { pattern: /cropped/i, score: 2, reason: "cropped_for_portrait" },
  { pattern: /portrait|headshot/i, score: 1, reason: "portrait_keyword" },
];

/** Negative signals for casual or unsuitable card art. */
const NEGATIVE_RULES: ScoreRule[] = [
  { pattern: /suit|tuxedo|gala|ceremony|award|red carpet|met gala/i, score: -8, reason: "casual_event" },
  { pattern: /press conference|signing|brand|advert|commercial|fashion/i, score: -6, reason: "off_pitch_event" },
  { pattern: /logo|watermark|banner/i, score: -4, reason: "overlay_or_logo" },
  { pattern: /team photo|group photo|squad photo/i, score: -5, reason: "group_photo" },
];

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function applyRules(text: string, rules: ScoreRule[]): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      score += rule.score;
      reasons.push(rule.reason);
    }
  }

  return { score, reasons };
}

function teamNameBoost(teamName: string, text: string): { score: number; reasons: string[] } {
  const normalizedTeam = normalizeText(teamName);
  const normalizedText = normalizeText(text);
  const reasons: string[] = [];
  let score = 0;

  if (normalizedTeam && normalizedText.includes(normalizedTeam)) {
    score += 4;
    reasons.push("team_name_match");
  }

  const nationalPhrases = [
    `${normalizedTeam} national`,
    `national team`,
    `with the ${normalizedTeam}`,
  ];

  for (const phrase of nationalPhrases) {
    if (normalizedText.includes(phrase)) {
      score += 3;
      reasons.push("national_team_phrase");
      break;
    }
  }

  return { score, reasons };
}

function resolutionScore(width: number, height: number): { score: number; reasons: string[] } {
  const shortEdge = Math.min(width, height);
  const reasons: string[] = [];

  if (shortEdge < MIN_SHORT_EDGE) {
    return { score: -20, reasons: ["low_resolution"] };
  }

  if (shortEdge >= 500) {
    reasons.push("high_resolution");
    return { score: 4, reasons };
  }

  if (shortEdge >= 250) {
    reasons.push("acceptable_resolution");
    return { score: 2, reasons };
  }

  reasons.push("minimum_resolution");
  return { score: 0, reasons };
}

function aspectScore(width: number, height: number): { score: number; reasons: string[] } {
  if (width <= 0 || height <= 0) {
    return { score: -5, reasons: ["unknown_dimensions"] };
  }

  const aspect = width / height;
  const cardAspect = 2 / 3;

  if (Math.abs(aspect - cardAspect) <= 0.2) {
    return { score: 3, reasons: ["card_friendly_aspect"] };
  }

  if (aspect >= 0.55 && aspect <= 1.4) {
    return { score: 1, reasons: ["portrait_aspect"] };
  }

  if (aspect > 2) {
    return { score: -4, reasons: ["very_wide_aspect"] };
  }

  return { score: 0, reasons: [] };
}

/** Score a Commons candidate for card-art suitability. */
export function rankCommonsPhotoCandidate(
  candidate: CommonsPhotoCandidate,
  teamName: string,
): RankedCommonsPhotoCandidate {
  const searchableText = [
    candidate.fileTitle,
    candidate.description ?? "",
    candidate.authorCredit ?? "",
  ].join(" ");

  const normalizedText = normalizeText(searchableText);
  const reasonTags = new Set<string>();
  let score = 0;

  const positive = applyRules(normalizedText, POSITIVE_RULES);
  score += positive.score;
  positive.reasons.forEach((reason) => reasonTags.add(reason));

  const negative = applyRules(normalizedText, NEGATIVE_RULES);
  score += negative.score;
  negative.reasons.forEach((reason) => reasonTags.add(reason));

  const teamBoost = teamNameBoost(teamName, searchableText);
  score += teamBoost.score;
  teamBoost.reasons.forEach((reason) => reasonTags.add(reason));

  const resolution = resolutionScore(candidate.width, candidate.height);
  score += resolution.score;
  resolution.reasons.forEach((reason) => reasonTags.add(reason));

  const aspect = aspectScore(candidate.width, candidate.height);
  score += aspect.score;
  aspect.reasons.forEach((reason) => reasonTags.add(reason));

  if (candidate.source === "wikidata_p18") {
    score -= 2;
    reasonTags.add("default_representative_image");
  }

  if (candidate.source === "commons_category" || candidate.source === "commons_search") {
    score += 1;
    reasonTags.add("curated_search_result");
  }

  return {
    ...candidate,
    score,
    reasonTags: [...reasonTags],
  };
}

export function pickBestCandidate(
  candidates: RankedCommonsPhotoCandidate[],
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

  if (best.score < 8) {
    return {
      best,
      autoAccept: false,
      rejectionReason: "score_below_review_threshold",
    };
  }

  if (best.reasonTags.includes("low_resolution")) {
    return {
      best,
      autoAccept: false,
      rejectionReason: "low_resolution",
    };
  }

  const scoreGap = second ? best.score - second.score : best.score;
  const highConfidence = best.score >= 15 && scoreGap >= 4;
  const clearWinner = best.score >= 12 && scoreGap >= 6;

  if (!highConfidence && !clearWinner) {
    return {
      best,
      autoAccept: false,
      rejectionReason: "ambiguous_candidates",
    };
  }

  return { best, autoAccept: true, rejectionReason: null };
}

export function isCandidateBytesTooSmall(bytes: number): boolean {
  return bytes < MIN_BYTES_HINT;
}
