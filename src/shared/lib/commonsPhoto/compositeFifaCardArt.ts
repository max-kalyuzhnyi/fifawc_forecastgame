import { access, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { CARD_TEAMS } from "@/shared/lib/cards/config";
import type { FifaRostersPhotoSource } from "./types";
import { removeFifaCardOuterBackground } from "./removeFifaCardOuterBackground";

export const CARD_ART_WIDTH = 512;
export const CARD_ART_HEIGHT = 768;

/** Golden divider between art panel and name plate (~58% card height). */
export const CARD_GOLD_DIVIDER_Y_RATIO = 0.58;

/** Dynamic FUT renders include a built-in bottom fade — anchor lower so fade meets the divider. */
export const DYNAMIC_RENDER_BOTTOM_ANCHOR_Y_RATIO = 0.76;

/** Face headshots use a tighter crop so the bottom sits on the gold divider. */
export const FACE_HEADSHOT_SCALE_RATIO = 0.72;
export const FACE_HEADSHOT_MAX_HEIGHT_RATIO = 0.45;

const DEFAULT_BACKGROUND_DIR = path.join(process.cwd(), "card_backgrounds");
const DEFAULT_FALLBACK_BACKGROUND = "fifa_card_background.png";

const PREPROCESSED_BACKGROUND_SLUGS = new Set(["croatia", "mexico", "usa"]);

const TEAM_SLUG: Record<(typeof CARD_TEAMS)[number], string> = {
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

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function backgroundDir(): string {
  return process.env.FIFA_CARD_BACKGROUND_DIR ?? DEFAULT_BACKGROUND_DIR;
}

function fallbackBackgroundFileName(): string {
  return process.env.FIFA_CARD_BACKGROUND_PATH ?? DEFAULT_FALLBACK_BACKGROUND;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Resolve per-team background path; falls back to generic FIFA card background. */
export async function resolveTeamBackgroundPath(teamName: string): Promise<{
  path: string;
  usedFallback: boolean;
}> {
  const dir = backgroundDir();
  const slug = TEAM_SLUG[teamName as keyof typeof TEAM_SLUG];
  const candidates = slug
    ? [`fifa_${slug}_bg.png`, `fifa_${slug}_bg.PNG`]
    : [];

  for (const fileName of candidates) {
    const candidatePath = path.join(dir, fileName);
    if (await fileExists(candidatePath)) {
      return { path: candidatePath, usedFallback: false };
    }
  }

  const fallbackName = fallbackBackgroundFileName();
  const fallbackCandidates = [
    path.join(dir, fallbackName),
    path.join(dir, "fifa_card_background.png"),
  ];

  for (const candidatePath of fallbackCandidates) {
    if (await fileExists(candidatePath)) {
      return { path: candidatePath, usedFallback: true };
    }
  }

  throw new Error(
    `No FIFA card background found for ${teamName}. Add fifa_${slug ?? "team"}_bg.png or ${fallbackName}.`,
  );
}

function buildNameOverlaySvg(displayName: string): Buffer {
  const fontSize = Math.round(CARD_ART_WIDTH * 0.065);
  const nameY = Math.round(CARD_ART_HEIGHT * 0.72);
  const label = escapeXml(displayName.toUpperCase());

  const svg = `<svg width="${CARD_ART_WIDTH}" height="${CARD_ART_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <text
    x="50%"
    y="${nameY}"
    text-anchor="middle"
    dominant-baseline="middle"
    fill="#ffffff"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${fontSize}"
    font-weight="700"
    letter-spacing="0.04em"
  >${label}</text>
</svg>`;

  return Buffer.from(svg);
}

export interface CompositeFifaCardArtInput {
  teamName: string;
  displayName: string;
  /** Face headshots keep legacy placement; dynamic card renders sit lower. */
  photoSource?: FifaRostersPhotoSource;
}

export interface PlayerPlacementInput {
  playerWidth: number;
  playerHeight: number;
  photoSource?: FifaRostersPhotoSource;
  cardWidth?: number;
  cardHeight?: number;
  playerScale?: number;
  playerTopRatio?: number;
}

export interface PlayerPlacement {
  left: number;
  top: number;
  maxPlayerWidth: number;
  maxPlayerHeight: number;
}

/** Position player art on the card; exported for unit tests. */
export function computePlayerPlacement(input: PlayerPlacementInput): PlayerPlacement {
  const cardWidth = input.cardWidth ?? CARD_ART_WIDTH;
  const cardHeight = input.cardHeight ?? CARD_ART_HEIGHT;
  const isFaceHeadshot = input.photoSource === "fifarosters_face";
  const defaultScale = isFaceHeadshot ? FACE_HEADSHOT_SCALE_RATIO : 0.85;
  const playerScale =
    input.playerScale ??
    Number(
      process.env[isFaceHeadshot ? "FIFA_CARD_FACE_SCALE" : "FIFA_CARD_PLAYER_SCALE"] ??
        defaultScale,
    );
  const playerTopRatio =
    input.playerTopRatio ?? Number(process.env.FIFA_CARD_PLAYER_TOP ?? 0.08);
  const maxPlayerWidth = Math.round(cardWidth * playerScale);
  const maxPlayerHeight = Math.round(
    cardHeight *
      (isFaceHeadshot ? FACE_HEADSHOT_MAX_HEIGHT_RATIO : 0.62),
  );
  const minTop = Math.round(cardHeight * playerTopRatio);
  const bottomAnchorY = Math.round(
    cardHeight *
      (isFaceHeadshot
        ? CARD_GOLD_DIVIDER_Y_RATIO
        : DYNAMIC_RENDER_BOTTOM_ANCHOR_Y_RATIO),
  );
  const playerLeft = Math.round((cardWidth - input.playerWidth) / 2);
  // Faces: always anchor bottom to gold divider; dynamic: allow lower anchor with min-top guard.
  const playerTop = isFaceHeadshot
    ? Math.max(0, bottomAnchorY - input.playerHeight)
    : Math.max(minTop, bottomAnchorY - input.playerHeight);

  return {
    left: playerLeft,
    top: playerTop,
    maxPlayerWidth,
    maxPlayerHeight,
  };
}

/** Skip flood-fill when Keynote/export already delivered a transparent outer canvas. */
export function isFifaCardBackgroundPreprocessed(
  rgba: Buffer,
  width: number,
  height: number,
): boolean {
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ] as const;

  const transparentCorners = corners.filter(([x, y]) => {
    const alpha = rgba[(y * width + x) * 4 + 3];
    return alpha < 128;
  }).length;

  return transparentCorners >= 3;
}

/** Strip rectangular outer canvas so only the gold shield remains opaque. */
export async function prepareFifaCardBackground(bytes: Buffer): Promise<Buffer> {
  if (process.env.FIFA_CARD_SKIP_BG_REMOVAL === "1") {
    return sharp(bytes).ensureAlpha().png().toBuffer();
  }

  const tolerance = Number(process.env.FIFA_CARD_BG_REMOVAL_TOLERANCE ?? 40);
  const { data, info } = await sharp(bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (isFifaCardBackgroundPreprocessed(data, info.width, info.height)) {
    return sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toBuffer();
  }

  const cleaned = removeFifaCardOuterBackground(
    data,
    info.width,
    info.height,
    tolerance,
  );

  return sharp(cleaned, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function loadTeamBackground(bytes: Buffer, teamName: string): Promise<Buffer> {
  const slug = TEAM_SLUG[teamName as keyof typeof TEAM_SLUG];
  if (slug && PREPROCESSED_BACKGROUND_SLUGS.has(slug)) {
    return sharp(bytes).ensureAlpha().png().toBuffer();
  }

  return prepareFifaCardBackground(bytes);
}

/** Composite a transparent player render onto a team FIFA card background with name in the bottom panel. */
export async function compositeFifaCardArt(
  playerBytes: Buffer,
  input: CompositeFifaCardArtInput,
): Promise<Buffer> {
  const { path: backgroundPath, usedFallback } = await resolveTeamBackgroundPath(input.teamName);

  if (usedFallback) {
    console.warn(`Using fallback FIFA background for ${input.teamName}: ${backgroundPath}`);
  }

  const background = await loadTeamBackground(await readFile(backgroundPath), input.teamName);
  const placementInput: PlayerPlacementInput = {
    playerWidth: 0,
    playerHeight: 0,
    photoSource: input.photoSource,
  };
  const { maxPlayerWidth, maxPlayerHeight } = computePlayerPlacement(placementInput);

  const resizedPlayer = await sharp(playerBytes)
    .rotate()
    .trim()
    .resize(maxPlayerWidth, maxPlayerHeight, { fit: "inside" })
    .png()
    .toBuffer();

  const playerMeta = await sharp(resizedPlayer).metadata();
  const playerWidth = playerMeta.width ?? maxPlayerWidth;
  const playerHeight = playerMeta.height ?? maxPlayerHeight;
  const { left: playerLeft, top: playerTop } = computePlayerPlacement({
    ...placementInput,
    playerWidth,
    playerHeight,
  });

  const base = await sharp(background)
    .resize(CARD_ART_WIDTH, CARD_ART_HEIGHT, { fit: "cover" })
    .png()
    .toBuffer();

  return sharp(base)
    .composite([
      { input: resizedPlayer, left: playerLeft, top: playerTop },
      { input: buildNameOverlaySvg(input.displayName), left: 0, top: 0 },
    ])
    .webp({ quality: 85 })
    .toBuffer();
}
