import type { OnsideMatchPrediction } from "@/shared/lib/onside/types";

export interface ScoreSuggestion {
  outcome: "home" | "draw" | "away";
  home: number;
  away: number;
  outcomeProbability: number;
}

const MAX_GOALS = 6;
const LAMBDA_MIN = 0.2;
const LAMBDA_MAX = 3.4;
const LAMBDA_STEP = 0.1;

function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) {
    return k === 0 ? 1 : 0;
  }

  let term = Math.exp(-lambda);

  for (let i = 1; i <= k; i += 1) {
    term *= lambda / i;
  }

  return term;
}

function buildPoissonPmf(lambda: number, maxGoals: number): number[] {
  const pmf: number[] = [];
  let total = 0;

  for (let goals = 0; goals <= maxGoals; goals += 1) {
    const value = poissonPmf(goals, lambda);
    pmf.push(value);
    total += value;
  }

  if (total > 0) {
    for (let goals = 0; goals <= maxGoals; goals += 1) {
      pmf[goals] /= total;
    }
  }

  return pmf;
}

function normalizeProbabilities(probability: {
  home: number;
  draw: number;
  away: number;
}): { home: number; draw: number; away: number } {
  const total = probability.home + probability.draw + probability.away;

  if (total <= 0) {
    return { home: 1 / 3, draw: 1 / 3, away: 1 / 3 };
  }

  return {
    home: probability.home / total,
    draw: probability.draw / total,
    away: probability.away / total,
  };
}

function computeOutcomeProbabilities(
  homePmf: number[],
  awayPmf: number[],
): { home: number; draw: number; away: number } {
  let home = 0;
  let draw = 0;
  let away = 0;

  for (let homeGoals = 0; homeGoals <= MAX_GOALS; homeGoals += 1) {
    for (let awayGoals = 0; awayGoals <= MAX_GOALS; awayGoals += 1) {
      const scoreProbability = homePmf[homeGoals] * awayPmf[awayGoals];

      if (homeGoals > awayGoals) {
        home += scoreProbability;
      } else if (homeGoals === awayGoals) {
        draw += scoreProbability;
      } else {
        away += scoreProbability;
      }
    }
  }

  return { home, draw, away };
}

function fitLambdas(target: { home: number; draw: number; away: number }): {
  homeLambda: number;
  awayLambda: number;
} {
  let bestHomeLambda = 1.2;
  let bestAwayLambda = 1.2;
  let bestError = Number.POSITIVE_INFINITY;

  for (
    let homeLambda = LAMBDA_MIN;
    homeLambda <= LAMBDA_MAX + 1e-9;
    homeLambda += LAMBDA_STEP
  ) {
    const homePmf = buildPoissonPmf(homeLambda, MAX_GOALS);

    for (
      let awayLambda = LAMBDA_MIN;
      awayLambda <= LAMBDA_MAX + 1e-9;
      awayLambda += LAMBDA_STEP
    ) {
      const awayPmf = buildPoissonPmf(awayLambda, MAX_GOALS);
      const fitted = computeOutcomeProbabilities(homePmf, awayPmf);
      const error =
        (fitted.home - target.home) ** 2 +
        (fitted.draw - target.draw) ** 2 +
        (fitted.away - target.away) ** 2;

      if (error < bestError) {
        bestError = error;
        bestHomeLambda = homeLambda;
        bestAwayLambda = awayLambda;
      }
    }
  }

  return { homeLambda: bestHomeLambda, awayLambda: bestAwayLambda };
}

function clampGoals(value: number): number {
  return Math.max(0, Math.min(MAX_GOALS, value));
}

function expectedScoreForOutcome(
  homeLambda: number,
  awayLambda: number,
  outcome: ScoreSuggestion["outcome"],
): { home: number; away: number } {
  let home = clampGoals(Math.round(homeLambda));
  let away = clampGoals(Math.round(awayLambda));

  if (outcome === "draw") {
    const level = clampGoals(Math.round((homeLambda + awayLambda) / 2));
    return { home: level, away: level };
  }

  if (outcome === "home") {
    if (home <= away) {
      away = Math.max(0, home - 1);
      if (home === 0) {
        home = 1;
        away = 0;
      }
    }
    return { home, away };
  }

  if (away <= home) {
    home = Math.max(0, away - 1);
    if (away === 0) {
      away = 1;
      home = 0;
    }
  }
  return { home, away };
}

export function suggestScorelines(
  prediction: OnsideMatchPrediction,
): ScoreSuggestion[] {
  const normalized = normalizeProbabilities(prediction.probability);
  const { homeLambda, awayLambda } = fitLambdas(normalized);

  const outcomes: ScoreSuggestion["outcome"][] = ["home", "draw", "away"];

  const suggestions = outcomes.map((outcome) => {
    const score = expectedScoreForOutcome(homeLambda, awayLambda, outcome);

    return {
      outcome,
      home: score.home,
      away: score.away,
      outcomeProbability: Math.round(normalized[outcome] * 100),
    };
  });

  return suggestions.sort(
    (left, right) => right.outcomeProbability - left.outcomeProbability,
  );
}
