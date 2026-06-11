import type { Match } from "@/entities/match/model/types";

export interface TeamStandingRow {
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface GroupStanding {
  groupName: string;
  rows: TeamStandingRow[];
}

export interface TeamLiveScore {
  goalsFor: number;
  goalsAgainst: number;
}

export type LiveScoreByTeam = Record<string, TeamLiveScore>;

interface TeamStats {
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
}

function createEmptyStats(teamName: string): TeamStats {
  return {
    teamName,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
  };
}

function getGroupSortKey(groupName: string): number {
  const match = groupName.match(/Group\s+([A-Z])/i);
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  return match[1].charCodeAt(0) - 65;
}

function isGroupMatch(match: Match): boolean {
  return match.round_key.startsWith("group_") && match.group_name != null;
}

function isFinishedWithScore(match: Match): boolean {
  return (
    match.status === "finished" &&
    match.home_score !== null &&
    match.away_score !== null
  );
}

function applyMatchResult(
  statsByTeam: Map<string, TeamStats>,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
): void {
  const home = statsByTeam.get(homeTeam) ?? createEmptyStats(homeTeam);
  const away = statsByTeam.get(awayTeam) ?? createEmptyStats(awayTeam);

  home.played += 1;
  away.played += 1;
  home.goalsFor += homeScore;
  home.goalsAgainst += awayScore;
  away.goalsFor += awayScore;
  away.goalsAgainst += homeScore;

  if (homeScore > awayScore) {
    home.won += 1;
    away.lost += 1;
  } else if (homeScore < awayScore) {
    home.lost += 1;
    away.won += 1;
  } else {
    home.drawn += 1;
    away.drawn += 1;
  }

  statsByTeam.set(homeTeam, home);
  statsByTeam.set(awayTeam, away);
}

function toStandingRow(stats: TeamStats): TeamStandingRow {
  return {
    teamName: stats.teamName,
    played: stats.played,
    won: stats.won,
    drawn: stats.drawn,
    lost: stats.lost,
    goalsFor: stats.goalsFor,
    goalsAgainst: stats.goalsAgainst,
    goalDifference: stats.goalsFor - stats.goalsAgainst,
    points: stats.won * 3 + stats.drawn,
  };
}

function compareStandingRows(a: TeamStandingRow, b: TeamStandingRow): number {
  if (b.points !== a.points) {
    return b.points - a.points;
  }

  if (b.goalDifference !== a.goalDifference) {
    return b.goalDifference - a.goalDifference;
  }

  if (b.goalsFor !== a.goalsFor) {
    return b.goalsFor - a.goalsFor;
  }

  return a.teamName.localeCompare(b.teamName);
}

export function buildLiveScoreByTeam(matches: Match[]): LiveScoreByTeam {
  const result: LiveScoreByTeam = {};

  for (const match of matches) {
    if (
      match.status !== "live" ||
      match.home_score === null ||
      match.away_score === null
    ) {
      continue;
    }

    result[match.home_team_name] = {
      goalsFor: match.home_score,
      goalsAgainst: match.away_score,
    };
    result[match.away_team_name] = {
      goalsFor: match.away_score,
      goalsAgainst: match.home_score,
    };
  }

  return result;
}

export function buildGroupStandings(matches: Match[]): GroupStanding[] {
  const groupMatches = matches.filter(isGroupMatch);
  const groups = new Map<string, Map<string, TeamStats>>();

  for (const match of groupMatches) {
    const groupName = match.group_name!;
    const statsByTeam = groups.get(groupName) ?? new Map<string, TeamStats>();

    if (!statsByTeam.has(match.home_team_name)) {
      statsByTeam.set(
        match.home_team_name,
        createEmptyStats(match.home_team_name),
      );
    }

    if (!statsByTeam.has(match.away_team_name)) {
      statsByTeam.set(
        match.away_team_name,
        createEmptyStats(match.away_team_name),
      );
    }

    if (isFinishedWithScore(match)) {
      applyMatchResult(
        statsByTeam,
        match.home_team_name,
        match.away_team_name,
        match.home_score!,
        match.away_score!,
      );
    }

    groups.set(groupName, statsByTeam);
  }

  return [...groups.entries()]
    .map(([groupName, statsByTeam]) => ({
      groupName,
      rows: [...statsByTeam.values()]
        .map(toStandingRow)
        .sort(compareStandingRows),
    }))
    .sort((a, b) => getGroupSortKey(a.groupName) - getGroupSortKey(b.groupName));
}
