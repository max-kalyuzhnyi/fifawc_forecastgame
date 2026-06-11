export function formatLiveMinute(
  minute: number | null,
  injuryTime: number | null,
): string | null {
  if (minute == null) return null;
  if (injuryTime != null && injuryTime > 0) {
    return `${minute}+${injuryTime}'`;
  }
  return `${minute}'`;
}

export function formatEventMinute(
  minute: number,
  injuryTime: number | null,
): string {
  if (injuryTime != null && injuryTime > 0) {
    return `${minute}+${injuryTime}'`;
  }
  return `${minute}'`;
}

const defaultEventLabels: Record<string, string> = {
  goal: "Goal",
  penalty: "Penalty",
  own_goal: "Own goal",
  yellow_card: "Yellow card",
  red_card: "Red card",
  yellow_red_card: "Second yellow",
  substitution: "Substitution",
};

export function formatEventTypeLabel(
  type: string,
  labels: Record<string, string> = defaultEventLabels,
): string {
  return labels[type] ?? type;
}
