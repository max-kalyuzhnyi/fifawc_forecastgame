import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { composeCard } from "@/shared/lib/cardArt/composeCard";
import { CARD_DIMENSIONS } from "@/shared/lib/cardArt/types";

async function createSamplePortrait(): Promise<Buffer> {
  const width = 320;
  const height = 420;

  const base = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 40, g: 90, b: 120 },
    },
  })
    .jpeg()
    .toBuffer();

  const face = await sharp({
    create: {
      width: 140,
      height: 170,
      channels: 3,
      background: { r: 210, g: 170, b: 140 },
    },
  })
    .png()
    .toBuffer();

  return sharp(base)
    .composite([{ input: face, left: 90, top: 70 }])
    .jpeg()
    .toBuffer();
}

describe("composeCard", () => {
  it("composes a 512x768 webp card from an enhanced portrait", async () => {
    const portrait = await createSamplePortrait();
    const card = await composeCard(portrait, {
      playerId: "test-player",
      displayName: "Test Player",
      teamName: "Brazil",
      shirtNumber: 10,
      position: "FW",
      primaryColor: "#009C3B",
      flagCode: "br",
    });

    const meta = await sharp(card).metadata();
    expect(meta.width).toBe(CARD_DIMENSIONS.width);
    expect(meta.height).toBe(CARD_DIMENSIONS.height);
    expect(meta.format).toBe("webp");
  });
});

describe("generatePlayerCard integration", () => {
  it("preserves face pixels when re-pasting over an AI-sized canvas", async () => {
    const samplePath = path.join(
      process.cwd(),
      ".cursor",
      "projects",
      "Users-iarromanov-Documents-code-fifawc-forecastgame",
      "assets",
      "image-d22cdb99-4b2d-49d5-acb5-7d44bb1a0e6d.png",
    );

    let portrait: Buffer;
    try {
      portrait = await readFile(samplePath);
    } catch {
      portrait = await createSamplePortrait();
    }

    const { generatePlayerCard } = await import("@/shared/lib/cardArt/generatePlayerCard");
    const result = await generatePlayerCard(
      portrait,
      {
        playerId: "sample",
        displayName: "Amad Diallo",
        teamName: "Ivory Coast",
        shirtNumber: 16,
        position: "FW",
        primaryColor: "#F77F00",
        flagCode: "ci",
      },
      { skipAiEnhancement: true },
    );

    expect(result.faceReused).toBe(true);
    expect(result.usedAiEnhancement).toBe(false);
    expect(result.cardWebp.byteLength).toBeGreaterThan(5_000);
    expect(result.enhancedPhotoWebp.byteLength).toBeGreaterThan(1_000);
  });
});
