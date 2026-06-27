import { composeCard } from "@/shared/lib/cardArt/composeCard";
import { enhancePhoto } from "@/shared/lib/cardArt/enhancePhoto";
import type {
  GeneratePlayerCardOptions,
  GeneratePlayerCardResult,
  PlayerCardMeta,
} from "@/shared/lib/cardArt/types";
import { getFlagCode } from "@/shared/lib/teamFlags";
import sharp from "sharp";

function withDefaults(meta: PlayerCardMeta): PlayerCardMeta {
  return {
    ...meta,
    flagCode: meta.flagCode ?? getFlagCode(meta.teamName),
  };
}

export async function generatePlayerCard(
  photoBytes: Buffer,
  meta: PlayerCardMeta,
  options: GeneratePlayerCardOptions = {},
): Promise<GeneratePlayerCardResult> {
  const resolvedMeta = withDefaults(meta);

  const enhancement = await enhancePhoto(photoBytes, {
    skipAiEnhancement: options.skipAiEnhancement,
    minLongEdge: options.enhanceLongEdge,
    imageModel: options.imageModel,
    visionModel: options.visionModel,
  });

  const enhancedPhotoWebp = await sharp(enhancement.enhancedPng)
    .webp({ quality: 90 })
    .toBuffer();

  const cardWebp = await composeCard(enhancement.enhancedPng, resolvedMeta, {
    outputWidth: options.outputWidth,
    outputHeight: options.outputHeight,
  });

  return {
    cardWebp,
    enhancedPhotoWebp,
    faceReused: enhancement.faceReused,
    usedAiEnhancement: enhancement.usedAiEnhancement,
  };
}
