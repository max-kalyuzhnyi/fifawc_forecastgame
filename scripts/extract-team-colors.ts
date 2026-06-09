import { config } from "dotenv";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { TEAM_FLAG_CODES } from "../src/shared/lib/teamFlags";

config({ path: ".env.local" });
config();

const FLAGS_DIR = path.join(process.cwd(), "public/flags");
const RASTER_SIZE = 96;

/** Curated overrides when dominant-pixel sampling picks the wrong band. */
const MANUAL_COLOR_OVERRIDES: Record<string, string> = {
  "South Korea": "#CD2E3A",
  "Czech Republic": "#11457E",
  Belgium: "#EF3340",
  Japan: "#BC002D",
  France: "#002395",
  Germany: "#DD0000",
  Brazil: "#009C3B",
  Argentina: "#74ACDF",
  England: "#CF081F",
  Scotland: "#005EB8",
  USA: "#B22234",
  Mexico: "#006847",
  Netherlands: "#FF6600",
  Spain: "#AA151B",
  Portugal: "#006600",
  Croatia: "#FF0000",
  Switzerland: "#FF0000",
  Canada: "#FF0000",
  "Ivory Coast": "#F77F00",
  Colombia: "#FCD116",
  Ghana: "#EF3340",
  Senegal: "#00853F",
  Morocco: "#C1272D",
  Egypt: "#CE1126",
  "Saudi Arabia": "#006C35",
  Iran: "#239F40",
  Qatar: "#8A1538",
  Australia: "#00008B",
  "New Zealand": "#00247D",
  Uruguay: "#0038A8",
  Paraguay: "#0038A8",
  Ecuador: "#FFD100",
  Peru: "#D91023",
  Chile: "#D52B1E",
  "Bosnia & Herzegovina": "#002395",
};

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        break;
      case gn:
        h = ((bn - rn) / d + 2) / 6;
        break;
      default:
        h = ((rn - gn) / d + 4) / 6;
    }
  }

  return { h, s, l };
}

function isNeutralPixel(r: number, g: number, b: number, a: number) {
  if (a < 128) return true;
  const { s, l } = rgbToHsl(r, g, b);
  return l > 0.82 || l < 0.22 || s < 0.28;
}

function quantizeChannel(value: number) {
  return Math.min(255, Math.max(0, Math.round(value / 16) * 16));
}

function toHex({ r, g, b }: Rgb) {
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
}

async function extractDominantColor(flagCode: string): Promise<string | null> {
  const filePath = path.join(FLAGS_DIR, `${flagCode}.svg`);
  let svg: Buffer;

  try {
    svg = await readFile(filePath);
  } catch {
    return null;
  }

  const { data, info } = await sharp(svg)
    .resize(RASTER_SIZE, RASTER_SIZE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buckets = new Map<string, { rgb: Rgb; count: number; score: number }>();

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3] ?? 255;

    if (isNeutralPixel(r, g, b, a)) continue;

    const rgb: Rgb = {
      r: quantizeChannel(r),
      g: quantizeChannel(g),
      b: quantizeChannel(b),
    };
    const key = `${rgb.r},${rgb.g},${rgb.b}`;
    const { s } = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const weight = 1 + s * 2;
    const existing = buckets.get(key);

    if (existing) {
      existing.count += 1;
      existing.score += weight;
    } else {
      buckets.set(key, { rgb, count: 1, score: weight });
    }
  }

  let best: { rgb: Rgb; score: number } | null = null;

  for (const bucket of buckets.values()) {
    if (!best || bucket.score > best.score) {
      best = { rgb: bucket.rgb, score: bucket.score };
    }
  }

  return best ? toHex(best.rgb) : null;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  const supabase = createClient(url, serviceKey);
  const flagFiles = await readdir(FLAGS_DIR);
  const availableCodes = new Set(
    flagFiles.filter((file) => file.endsWith(".svg")).map((file) => file.replace(/\.svg$/, "")),
  );

  const colorsByCode = new Map<string, string>();

  for (const code of availableCodes) {
    const color = await extractDominantColor(code);
    if (color) {
      colorsByCode.set(code, color);
      console.log(`${code}: ${color}`);
    }
  }

  const updates: { name: string; primary_color: string }[] = [];

  for (const [teamName, flagCode] of Object.entries(TEAM_FLAG_CODES)) {
    const color =
      MANUAL_COLOR_OVERRIDES[teamName] ?? colorsByCode.get(flagCode) ?? null;
    if (color) {
      updates.push({ name: teamName, primary_color: color });
    } else {
      console.warn(`No color for ${teamName} (${flagCode})`);
    }
  }

  for (const update of updates) {
    const { error } = await supabase
      .from("teams")
      .update({ primary_color: update.primary_color })
      .eq("name", update.name);

    if (error) {
      console.error(`Failed to update ${update.name}:`, error.message);
    } else {
      console.log(`Updated ${update.name} -> ${update.primary_color}`);
    }
  }

  console.log(`Done. Updated ${updates.length} teams.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
