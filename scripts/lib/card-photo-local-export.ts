import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PlayerPhotoReviewEntry } from "../../src/shared/lib/commonsPhoto/types";

const TEAM_SLUG: Record<string, string> = {
  Belgium: "belgium",
  Brazil: "brazil",
  Argentina: "argentina",
  Croatia: "croatia",
  England: "england",
  France: "france",
  Germany: "germany",
  Mexico: "mexico",
  Netherlands: "netherlands",
  Portugal: "portugal",
  Spain: "spain",
  USA: "usa",
};

export function slugifyName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function teamSlug(teamName: string): string {
  return TEAM_SLUG[teamName] ?? slugifyName(teamName);
}

export interface LocalCardPhotoMeta {
  playerId: string;
  playerName: string;
  teamName: string;
  cardId: string;
  status: "accepted" | "needs_review" | "unresolved";
  selectedFileTitle: string | null;
  rejectionReason: string | null;
  score: number | null;
  source: string | null;
  sourceUrl: string | null;
  exportedAt: string;
  cardRelativePath: string;
  sourceRelativePath: string | null;
}

export interface LocalExportManifest {
  provider: "fifarosters";
  updatedAt: string;
  outputDir: string;
  totals: {
    accepted: number;
    needsReview: number;
    unresolved: number;
    failed: number;
  };
  entries: LocalCardPhotoMeta[];
}

export function resolveLocalExportDir(): string {
  return (
    process.env.CARD_PHOTOS_LOCAL_DIR ??
    path.join(process.cwd(), "scripts", "output", "card-photos")
  );
}

export function playerExportDir(
  rootDir: string,
  status: LocalCardPhotoMeta["status"],
  teamName: string,
  playerName: string,
): string {
  const bucket = status === "accepted" ? "accepted" : status === "needs_review" ? "needs-review" : "unresolved";
  return path.join(rootDir, bucket, teamSlug(teamName), slugifyName(playerName));
}

export async function saveLocalCardPhotoExport(input: {
  rootDir: string;
  status: LocalCardPhotoMeta["status"];
  row: {
    cardId: string;
    playerId: string;
    playerName: string;
    teamName: string;
  };
  review: PlayerPhotoReviewEntry;
  cardWebp: Buffer | null;
  sourcePng: Buffer | null;
}): Promise<LocalCardPhotoMeta> {
  const exportDir = playerExportDir(
    input.rootDir,
    input.status,
    input.row.teamName,
    input.row.playerName,
  );
  await mkdir(exportDir, { recursive: true });

  const selected = input.review.candidates.find(
    (candidate) => candidate.fileTitle === input.review.selectedFileTitle,
  );
  const cardFileName = "card.webp";
  const sourceFileName = selected ? `${selected.fileTitle}.png` : null;
  let cardRelativePath = path.relative(input.rootDir, path.join(exportDir, cardFileName));
  let sourceRelativePath: string | null = null;

  if (input.cardWebp) {
    await writeFile(path.join(exportDir, cardFileName), input.cardWebp);
  } else {
    cardRelativePath = "";
  }

  if (input.sourcePng && sourceFileName) {
    await writeFile(path.join(exportDir, sourceFileName), input.sourcePng);
    sourceRelativePath = path.relative(input.rootDir, path.join(exportDir, sourceFileName));
  }

  const meta: LocalCardPhotoMeta = {
    playerId: input.row.playerId,
    playerName: input.row.playerName,
    teamName: input.row.teamName,
    cardId: input.row.cardId,
    status: input.status,
    selectedFileTitle: input.review.selectedFileTitle,
    rejectionReason: input.review.rejectionReason,
    score: selected?.score ?? null,
    source: selected?.source ?? null,
    sourceUrl: selected?.sourceUrl ?? null,
    exportedAt: new Date().toISOString(),
    cardRelativePath: cardRelativePath.replaceAll("\\", "/"),
    sourceRelativePath: sourceRelativePath?.replaceAll("\\", "/") ?? null,
  };

  await writeFile(path.join(exportDir, "meta.json"), JSON.stringify(meta, null, 2));

  if (input.status === "needs_review") {
    await writeFile(
      path.join(exportDir, "candidates.json"),
      JSON.stringify(input.review.candidates, null, 2),
    );
  }

  return meta;
}

export async function loadManifest(rootDir: string): Promise<LocalExportManifest | null> {
  try {
    const raw = await readFile(path.join(rootDir, "manifest.json"), "utf8");
    return JSON.parse(raw) as LocalExportManifest;
  } catch {
    return null;
  }
}

export async function saveManifest(rootDir: string, manifest: LocalExportManifest): Promise<void> {
  await mkdir(rootDir, { recursive: true });
  await writeFile(path.join(rootDir, "manifest.json"), JSON.stringify(manifest, null, 2));
}
