import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const MIN_IMAGE_BYTES = 15_000;
const MIN_SHORT_EDGE = 220;
const MAX_CARD_ASPECT_DELTA = 0.75;
const VERBOSE = process.env.CARD_PHOTO_AUDIT_VERBOSE === "1";

interface CardRow {
  id: string;
  player_id: string | null;
  team_id: string | null;
  is_legend: boolean;
  display_name: string;
  image_url: string | null;
}

interface PhotoIssue {
  cardName: string;
  teamName: string;
  issue: string;
  details: string;
  imageUrl: string | null;
}

async function fetchImageBytes(imageUrl: string): Promise<Buffer> {
  const response = await fetch(imageUrl, {
    headers: { "User-Agent": "fifawc-forecastgame/1.0 (card photo audit)" },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function auditCardPhoto(
  card: CardRow,
  imageUrl: string | null,
  teamName: string,
): Promise<PhotoIssue[]> {
  if (!imageUrl) {
    return [
      {
        cardName: card.display_name,
        teamName,
        issue: "missing_url",
        details: "Card has no image URL or player photo fallback",
        imageUrl,
      },
    ];
  }

  const issues: PhotoIssue[] = [];
  let bytes: Buffer;

  try {
    bytes = await fetchImageBytes(imageUrl);
  } catch (error) {
    return [
      {
        cardName: card.display_name,
        teamName,
        issue: "download_failed",
        details: error instanceof Error ? error.message : "Unknown fetch error",
        imageUrl,
      },
    ];
  }

  if (bytes.length < MIN_IMAGE_BYTES) {
    issues.push({
      cardName: card.display_name,
      teamName,
      issue: "tiny_file",
      details: `${bytes.length} bytes`,
      imageUrl,
    });
  }

  try {
    const metadata = await sharp(bytes).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    const shortEdge = Math.min(width, height);
    const aspect = height > 0 ? width / height : 0;
    const cardAspect = 2 / 3;

    if (shortEdge < MIN_SHORT_EDGE) {
      issues.push({
        cardName: card.display_name,
        teamName,
        issue: "low_resolution",
        details: `${width}x${height}`,
        imageUrl,
      });
    }

    // Square or very wide source images tend to crop badly into the tall card frame.
    if (Math.abs(aspect - cardAspect) > MAX_CARD_ASPECT_DELTA) {
      issues.push({
        cardName: card.display_name,
        teamName,
        issue: "awkward_aspect",
        details: `${width}x${height}`,
        imageUrl,
      });
    }
  } catch (error) {
    issues.push({
      cardName: card.display_name,
      teamName,
      issue: "decode_failed",
      details: error instanceof Error ? error.message : "Unknown decode error",
      imageUrl,
    });
  }

  return issues;
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const [{ data: cards, error: cardsError }, { data: teams }, { data: players }] =
    await Promise.all([
      supabase
        .from("cards")
        .select("id, player_id, team_id, is_legend, display_name, image_url")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase.from("teams").select("id, name"),
      supabase.from("players").select("id, photo_url"),
    ]);

  if (cardsError) {
    throw cardsError;
  }

  const teamNameById = new Map((teams ?? []).map((team) => [team.id, team.name]));
  const playerPhotoById = new Map(
    (players ?? []).map((player) => [player.id, player.photo_url]),
  );
  const issues: PhotoIssue[] = [];

  for (const card of (cards ?? []) as CardRow[]) {
    const imageUrl =
      card.image_url ??
      (card.player_id ? playerPhotoById.get(card.player_id) ?? null : null);
    const teamName = card.is_legend
      ? "Legends OTB"
      : (card.team_id ? teamNameById.get(card.team_id) ?? "Other" : "Other");

    issues.push(...(await auditCardPhoto(card, imageUrl, teamName)));
  }

  if (issues.length === 0) {
    console.log("No objective card photo quality issues found.");
    return;
  }

  console.log(`Found ${issues.length} objective card photo issue(s):`);
  const byIssue = new Map<string, number>();
  const byTeam = new Map<string, number>();

  for (const issue of issues) {
    byIssue.set(issue.issue, (byIssue.get(issue.issue) ?? 0) + 1);
    byTeam.set(issue.teamName, (byTeam.get(issue.teamName) ?? 0) + 1);
  }

  console.log("\nBy issue:");
  for (const [issue, count] of [...byIssue.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${issue}: ${count}`);
  }

  console.log("\nBy team:");
  for (const [teamName, count] of [...byTeam.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${teamName}: ${count}`);
  }

  const visibleIssues = VERBOSE ? issues : issues.slice(0, 30);
  console.log(VERBOSE ? "\nIssues:" : "\nFirst 30 issues:");

  for (const issue of visibleIssues) {
    console.log(
      [
        issue.issue,
        issue.teamName,
        issue.cardName,
        issue.details,
        issue.imageUrl ?? "",
      ].join("\t"),
    );
  }

  if (!VERBOSE && issues.length > visibleIssues.length) {
    console.log(
      `\nRun CARD_PHOTO_AUDIT_VERBOSE=1 npm run audit:card-photos to print all ${issues.length} issues.`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
