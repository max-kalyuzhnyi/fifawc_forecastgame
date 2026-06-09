// Case-insensitive comparison for scorer matching
export function normalizeScorerName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
