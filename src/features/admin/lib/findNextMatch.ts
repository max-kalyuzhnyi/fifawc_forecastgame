import type { AdminMatch } from "./types";

export function findNextMatch(matches: AdminMatch[]): AdminMatch | null {
  const now = Date.now();

  const upcoming = matches
    .filter(
      (match) =>
        match.status === "scheduled" && new Date(match.kickoff_at).getTime() > now,
    )
    .sort(
      (a, b) =>
        new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime(),
    );

  return upcoming[0] ?? null;
}
