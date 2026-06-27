import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { CARD_DIMENSIONS, type PlayerCardMeta } from "@/shared/lib/cardArt/types";
import { getFlagCode } from "@/shared/lib/teamFlags";

const FLAGS_DIR = path.join(process.cwd(), "public", "flags");
const DEFAULT_TEAM_COLOR = "#1a4d5c";

const POSITION_LABELS: Record<NonNullable<PlayerCardMeta["position"]>, string> = {
  GK: "GK",
  DF: "DEF",
  MF: "MID",
  FW: "FWD",
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function buildCardBackgroundSvg(
  teamColor: string,
  width: number,
  height: number,
): string {
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#163a47"/>
        <stop offset="45%" stop-color="${escapeXml(teamColor)}" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="#061018"/>
      </linearGradient>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M20 0H0V20" fill="none" stroke="#ffffff" stroke-opacity="0.035" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <rect width="100%" height="100%" fill="url(#grid)"/>
    <rect x="10" y="10" width="${width - 20}" height="${height - 20}" rx="22" fill="none" stroke="#d4af37" stroke-width="3"/>
    <rect x="16" y="16" width="${width - 32}" height="${height - 32}" rx="18" fill="none" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1.5"/>
  </svg>`;
}

function buildNumberWatermarkSvg(
  shirtNumber: number | null,
  width: number,
  height: number,
  teamColor: string,
): string {
  const numberText = shirtNumber != null ? String(shirtNumber) : "";
  if (!numberText) return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"/>`;

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <text x="${width - 28}" y="${height * 0.58}" text-anchor="end" font-family="Arial Black, Arial, sans-serif" font-size="280" font-weight="900" fill="${escapeXml(teamColor)}" fill-opacity="0.22">${escapeXml(numberText)}</text>
  </svg>`;
}

function buildPhotoFadeSvg(width: number, height: number): string {
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="55%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="78%" stop-color="#061018" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="#061018" stop-opacity="0.95"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#fade)"/>
  </svg>`;
}

function buildPlayerOverlaySvg(
  meta: PlayerCardMeta,
  width: number,
  height: number,
  flagCode: string | null,
): string {
  const name = escapeXml(truncateText(meta.displayName.toUpperCase(), 22));
  const team = escapeXml(truncateText(meta.teamName.toUpperCase(), 24));
  const position =
    meta.position != null
      ? escapeXml(POSITION_LABELS[meta.position])
      : "";
  const numberLabel =
    meta.shirtNumber != null ? escapeXml(String(meta.shirtNumber)) : "";
  const metaLine = [numberLabel, position].filter(Boolean).join("  •  ");
  const countryCode = escapeXml((flagCode ?? "xx").toUpperCase());

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <text x="36" y="52" font-family="Arial, sans-serif" font-size="11" font-weight="700" letter-spacing="3" fill="#ffffff" fill-opacity="0.65">WORLD CUP</text>
    <text x="${width - 36}" y="120" text-anchor="end" font-family="Arial Black, Arial, sans-serif" font-size="42" font-weight="900" fill="#ffffff" fill-opacity="0.12" transform="rotate(90 ${width - 36} 120)">${countryCode}</text>
    <rect x="24" y="${height - 148}" width="${width - 48}" height="108" rx="14" fill="#061018" fill-opacity="0.88" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1"/>
    <rect x="24" y="${height - 148}" width="${width - 48}" height="4" rx="2" fill="#d4af37" fill-opacity="0.9"/>
    <text x="${width / 2}" y="${height - 102}" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="30" font-weight="900" fill="#ffffff">${name}</text>
    <text x="${width / 2}" y="${height - 72}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="600" letter-spacing="2" fill="#ffffff" fill-opacity="0.85">${team}</text>
    ${
      metaLine
        ? `<text x="${width / 2}" y="${height - 50}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="600" letter-spacing="1" fill="#d4af37">${escapeXml(metaLine)}</text>`
        : ""
    }
  </svg>`;
}

async function loadFlagLayer(flagCode: string | null): Promise<Buffer | null> {
  if (!flagCode) return null;

  try {
    const flagPath = path.join(FLAGS_DIR, `${flagCode}.svg`);
    const flagSvg = await readFile(flagPath, "utf8");
    return sharp(Buffer.from(flagSvg))
      .resize(52, 52)
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

async function preparePlayerPhoto(
  photo: Buffer,
  width: number,
  photoHeight: number,
): Promise<Buffer> {
  return sharp(photo)
    .resize(width, photoHeight, { fit: "cover", position: "top" })
    .png()
    .toBuffer();
}

export interface ComposeCardOptions {
  outputWidth?: number;
  outputHeight?: number;
}

export async function composeCard(
  enhancedPhoto: Buffer,
  meta: PlayerCardMeta,
  options: ComposeCardOptions = {},
): Promise<Buffer> {
  const width = options.outputWidth ?? CARD_DIMENSIONS.width;
  const height = options.outputHeight ?? CARD_DIMENSIONS.height;
  const teamColor = meta.primaryColor ?? DEFAULT_TEAM_COLOR;
  const flagCode = meta.flagCode ?? getFlagCode(meta.teamName);

  const photoTop = 56;
  const photoHeight = height - 168;

  const background = Buffer.from(buildCardBackgroundSvg(teamColor, width, height));
  const numberWatermark = Buffer.from(
    buildNumberWatermarkSvg(meta.shirtNumber, width, height, teamColor),
  );
  const playerPhoto = await preparePlayerPhoto(enhancedPhoto, width, photoHeight);
  const photoFade = Buffer.from(buildPhotoFadeSvg(width, photoHeight));
  const playerOverlay = Buffer.from(
    buildPlayerOverlaySvg(meta, width, height, flagCode),
  );

  const photoWithFade = await sharp(playerPhoto)
    .composite([{ input: photoFade, blend: "over" }])
    .png()
    .toBuffer();

  const flag = await loadFlagLayer(flagCode);

  const composites: sharp.OverlayOptions[] = [
    { input: await sharp(background).png().toBuffer() },
    { input: await sharp(numberWatermark).png().toBuffer() },
    { input: photoWithFade, top: photoTop, left: 0 },
    { input: await sharp(playerOverlay).png().toBuffer() },
  ];

  if (flag) {
    composites.push({
      input: flag,
      left: width - 80,
      top: height - 132,
    });
  }

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 6, g: 16, b: 24, alpha: 1 },
    },
  })
    .composite(composites)
    .webp({ quality: 90 })
    .toBuffer();
}
