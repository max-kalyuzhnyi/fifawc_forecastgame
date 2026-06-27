import type { Match } from "@/entities/match/model/types";

export interface PreviousMatchesByTeam {
  home: Match[];
  away: Match[];
}

function isFinishedMatch(match: Match): boolean {
  return (
    match.status === "finished" &&
    match.home_score !== null &&
    match.away_score !== null
  );
}

function isPreviousMatchForTeam(
  match: Match,
  teamName: string,
  beforeKickoffAt: string,
): boolean {
  if (!isFinishedMatch(match)) {
    return false;
  }

  if (match.kickoff_at >= beforeKickoffAt) {
    return false;
  }

  return (
    match.home_team_name === teamName || match.away_team_name === teamName
  );
}

function sortByKickoffDesc(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => b.kickoff_at.localeCompare(a.kickoff_at));
}

export function buildPreviousMatchesForMatch(
  current: Match,
  all: Match[],
): PreviousMatchesByTeam {
  const home = sortByKickoffDesc(
    all.filter((match) =>
      isPreviousMatchForTeam(match, current.home_team_name, current.kickoff_at),
    ),
  );

  const away = sortByKickoffDesc(
    all.filter((match) =>
      isPreviousMatchForTeam(match, current.away_team_name, current.kickoff_at),
    ),
  );

  return { home, away };
}

export function buildPreviousMatchesByMatch(
  all: Match[],
): Record<string, PreviousMatchesByTeam> {
  const result: Record<string, PreviousMatchesByTeam> = {};

  for (const match of all) {
    result[match.id] = buildPreviousMatchesForMatch(match, all);
  }

  return result;
}
