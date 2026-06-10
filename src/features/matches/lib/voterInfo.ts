export interface MatchVoterInfo {
  count: number;
  voters: string[];
}

export function buildVoterMap(
  predictions: { match_id: string; user_id: string }[],
  profiles: { id: string; display_name: string }[],
): Map<string, MatchVoterInfo> {
  const profileMap = new Map(profiles.map((p) => [p.id, p.display_name]));
  const voterMap = new Map<string, MatchVoterInfo>();

  for (const prediction of predictions) {
    const entry = voterMap.get(prediction.match_id) ?? {
      count: 0,
      voters: [],
    };
    entry.count += 1;

    if (entry.voters.length < 3) {
      const name = profileMap.get(prediction.user_id);
      if (name && !entry.voters.includes(name)) {
        entry.voters.push(name);
      }
    }

    voterMap.set(prediction.match_id, entry);
  }

  return voterMap;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function getVoterLetter(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed[0].toUpperCase();
}
