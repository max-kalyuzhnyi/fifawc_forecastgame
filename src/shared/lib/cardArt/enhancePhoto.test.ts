import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { expandHeadBox, getFallbackFaceDetection } from "@/shared/lib/cardArt/detectFace";
import {
  buildFaceProtectMask,
  getHeadCropRect,
  repasteOriginalHead,
  upscalePhoto,
} from "@/shared/lib/cardArt/enhancePhoto";

async function createPortrait(longEdge = 240): Promise<Buffer> {
  return sharp({
    create: {
      width: longEdge,
      height: Math.round(longEdge * 1.3),
      channels: 3,
      background: { r: 30, g: 60, b: 90 },
    },
  })
    .png()
    .toBuffer();
}

describe("enhancePhoto helpers", () => {
  it("upscales small portraits to the minimum long edge", async () => {
    const source = await createPortrait(240);
    const upscaled = await upscalePhoto(source, 1024);
    const meta = await sharp(upscaled).metadata();
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeGreaterThanOrEqual(1024);
  });

  it("builds a face-protect mask with matching dimensions", async () => {
    const mask = await buildFaceProtectMask(512, 768, getFallbackFaceDetection().head);
    const meta = await sharp(mask).metadata();
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(768);
    expect(meta.hasAlpha).toBe(true);
  });

  it("re-pastes the original head region unchanged", async () => {
    const width = 400;
    const height = 520;
    const faceColor = { r: 220, g: 180, b: 150 };

    const original = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 20, g: 40, b: 80 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 120,
              height: 140,
              channels: 3,
              background: faceColor,
            },
          }).png().toBuffer(),
          left: 140,
          top: 80,
        },
      ])
      .png()
      .toBuffer();

    const fakeAi = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 200, g: 50, b: 50 },
      },
    })
      .png()
      .toBuffer();

    const face = expandHeadBox(getFallbackFaceDetection().head);
    const merged = await repasteOriginalHead(original, fakeAi, face);

    const sample = { left: 198, top: 148, width: 4, height: 4 };
    const originalSample = await sharp(original).extract(sample).raw().toBuffer();
    const mergedSample = await sharp(merged).extract(sample).raw().toBuffer();
    const aiSample = await sharp(fakeAi).extract(sample).raw().toBuffer();

    expect(mergedSample.equals(originalSample)).toBe(true);
    expect(mergedSample.equals(aiSample)).toBe(false);
  });
});
