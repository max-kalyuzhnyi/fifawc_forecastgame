// Parses OpenFootball date + time like "2026-06-11" and "13:00 UTC-6"
export function parseKickoff(date: string, time: string): Date {
  const offsetMatch = time.match(/UTC([+-]\d+)/i);
  const offsetHours = offsetMatch ? Number(offsetMatch[1]) : 0;
  const timePart = time.replace(/\s*UTC[+-]\d+\s*/i, "").trim();
  const [hours, minutes] = timePart.split(":").map(Number);

  const [year, month, day] = date.split("-").map(Number);
  const utcMs = Date.UTC(year, month - 1, day, hours - offsetHours, minutes);
  return new Date(utcMs);
}
