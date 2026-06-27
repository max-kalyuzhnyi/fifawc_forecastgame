import type { Match } from "@/entities/match/model/types";

/** Snap columns in the horizontal bracket slider. */
export type BracketStageKey =
  | "groups"
  | "round_of_32"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "final";

export const BRACKET_STAGES: BracketStageKey[] = [
  "groups",
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "final",
];

export type KnockoutBracketStageKey = Exclude<BracketStageKey, "groups">;

/** Stages shown in the brackets overlay (knockout only). */
export const KNOCKOUT_BRACKET_STAGES: KnockoutBracketStageKey[] = [
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "final",
];

/** Short labels shown in the stage navigator (GS, R32, …). */
export const BRACKET_STAGE_SHORT_LABELS: Record<BracketStageKey, string> = {
  groups: "GS",
  round_of_32: "R32",
  round_of_16: "R16",
  quarter_final: "QF",
  semi_final: "SF",
  final: "F",
};

/** Ordered match numbers per knockout column (OpenFootball WC 2026). */
export const BRACKET_MATCH_NUMBERS: Record<
  Exclude<BracketStageKey, "groups">,
  number[]
> = {
  round_of_32: [
    73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88,
  ],
  round_of_16: [89, 90, 91, 92, 93, 94, 95, 96],
  quarter_final: [97, 98, 99, 100],
  semi_final: [101, 102],
  final: [104, 103],
};

/** Child match number → parent match numbers (feeds bracket ordering). */
export const BRACKET_PARENT_MATCH_NUMBERS: Record<number, [number, number]> = {
  89: [74, 77],
  90: [73, 75],
  91: [76, 78],
  92: [79, 80],
  93: [83, 84],
  94: [81, 82],
  95: [86, 88],
  96: [85, 87],
  97: [89, 90],
  98: [93, 94],
  99: [91, 92],
  100: [95, 96],
  101: [97, 98],
  102: [99, 100],
  104: [101, 102],
  103: [101, 102],
};

export interface BracketMatchTemplate {
  matchNumber: number;
  roundKey: string;
  kickoffAt: string;
}

/** Static playoff templates when DB rows are missing (OpenFootball kickoffs). */
export const BRACKET_MATCH_TEMPLATES: BracketMatchTemplate[] = [
  { matchNumber: 73, roundKey: "round_of_32", kickoffAt: "2026-06-28T19:00:00.000Z" },
  { matchNumber: 74, roundKey: "round_of_32", kickoffAt: "2026-06-29T20:30:00.000Z" },
  { matchNumber: 75, roundKey: "round_of_32", kickoffAt: "2026-06-30T01:00:00.000Z" },
  { matchNumber: 76, roundKey: "round_of_32", kickoffAt: "2026-06-29T17:00:00.000Z" },
  { matchNumber: 77, roundKey: "round_of_32", kickoffAt: "2026-06-30T21:00:00.000Z" },
  { matchNumber: 78, roundKey: "round_of_32", kickoffAt: "2026-06-30T17:00:00.000Z" },
  { matchNumber: 79, roundKey: "round_of_32", kickoffAt: "2026-07-01T01:00:00.000Z" },
  { matchNumber: 80, roundKey: "round_of_32", kickoffAt: "2026-07-01T16:00:00.000Z" },
  { matchNumber: 81, roundKey: "round_of_32", kickoffAt: "2026-07-01T21:00:00.000Z" },
  { matchNumber: 82, roundKey: "round_of_32", kickoffAt: "2026-07-01T20:00:00.000Z" },
  { matchNumber: 83, roundKey: "round_of_32", kickoffAt: "2026-07-02T23:00:00.000Z" },
  { matchNumber: 84, roundKey: "round_of_32", kickoffAt: "2026-07-02T19:00:00.000Z" },
  { matchNumber: 85, roundKey: "round_of_32", kickoffAt: "2026-07-03T03:00:00.000Z" },
  { matchNumber: 86, roundKey: "round_of_32", kickoffAt: "2026-07-03T22:00:00.000Z" },
  { matchNumber: 87, roundKey: "round_of_32", kickoffAt: "2026-07-04T01:30:00.000Z" },
  { matchNumber: 88, roundKey: "round_of_32", kickoffAt: "2026-07-03T18:00:00.000Z" },
  { matchNumber: 89, roundKey: "round_of_16", kickoffAt: "2026-07-04T21:00:00.000Z" },
  { matchNumber: 90, roundKey: "round_of_16", kickoffAt: "2026-07-04T17:00:00.000Z" },
  { matchNumber: 91, roundKey: "round_of_16", kickoffAt: "2026-07-05T20:00:00.000Z" },
  { matchNumber: 92, roundKey: "round_of_16", kickoffAt: "2026-07-06T00:00:00.000Z" },
  { matchNumber: 93, roundKey: "round_of_16", kickoffAt: "2026-07-06T19:00:00.000Z" },
  { matchNumber: 94, roundKey: "round_of_16", kickoffAt: "2026-07-06T22:00:00.000Z" },
  { matchNumber: 95, roundKey: "round_of_16", kickoffAt: "2026-07-07T16:00:00.000Z" },
  { matchNumber: 96, roundKey: "round_of_16", kickoffAt: "2026-07-07T17:00:00.000Z" },
  { matchNumber: 97, roundKey: "quarter_final", kickoffAt: "2026-07-09T20:00:00.000Z" },
  { matchNumber: 98, roundKey: "quarter_final", kickoffAt: "2026-07-10T19:00:00.000Z" },
  { matchNumber: 99, roundKey: "quarter_final", kickoffAt: "2026-07-11T21:00:00.000Z" },
  { matchNumber: 100, roundKey: "quarter_final", kickoffAt: "2026-07-12T01:00:00.000Z" },
  { matchNumber: 101, roundKey: "semi_final", kickoffAt: "2026-07-14T19:00:00.000Z" },
  { matchNumber: 102, roundKey: "semi_final", kickoffAt: "2026-07-15T19:00:00.000Z" },
  { matchNumber: 103, roundKey: "third_place", kickoffAt: "2026-07-18T21:00:00.000Z" },
  { matchNumber: 104, roundKey: "final", kickoffAt: "2026-07-19T19:00:00.000Z" },
];

const TEMPLATE_BY_NUMBER = new Map(
  BRACKET_MATCH_TEMPLATES.map((template) => [template.matchNumber, template]),
);

export function isPlaceholderTeamName(name: string): boolean {
  if (/[\/]/.test(name)) return true;
  return /^[WL]?\d+[A-L]?$/.test(name) || /^\d[A-L]$/.test(name);
}

export function buildMatchesByNumber(matches: Match[]): Map<number, Match> {
  const map = new Map<number, Match>();
  for (const match of matches) {
    if (match.match_number != null) {
      map.set(match.match_number, match);
    }
  }
  return map;
}

export function resolveBracketMatch(
  matchNumber: number,
  matchesByNumber: Map<number, Match>,
): Match | null {
  return matchesByNumber.get(matchNumber) ?? null;
}

export function getBracketTemplate(
  matchNumber: number,
): BracketMatchTemplate | undefined {
  return TEMPLATE_BY_NUMBER.get(matchNumber);
}

export function getKnockoutStages(): KnockoutBracketStageKey[] {
  return KNOCKOUT_BRACKET_STAGES;
}

export function getKnockoutStageIndex(stage: KnockoutBracketStageKey): number {
  return KNOCKOUT_BRACKET_STAGES.indexOf(stage);
}

export function getStageIndex(stage: BracketStageKey): number {
  return BRACKET_STAGES.indexOf(stage);
}
